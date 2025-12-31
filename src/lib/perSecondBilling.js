import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { WalletService } from './wallet'
import { PricingService } from './pricing'
import { CallStateMachine } from './callStateMachine'

const getDb = () => {
  try {
    return getFirestore()
  } catch (error) {
    console.error('Failed to get Firestore instance:', error)
    throw new Error('Database connection failed')
  }
}

/**
 * In-memory billing state for active calls
 * Key: callId, Value: { lastTick, intervalId, callData }
 */
const activeBillingCalls = new Map()

/**
 * PER-SECOND BILLING SERVICE
 * 
 * Features:
 * - Runs billing every 1 second in memory
 * - Persists to Firestore every 5-10 seconds
 * - Idempotent start/stop
 * - Automatic finalization on disconnect
 */
export class PerSecondBillingService {
  /**
   * Start per-second billing for a call
   * This should ONLY be called when:
   * - userJoined === true
   * - astrologerJoined === true
   * - audioTrackPublished === true
   * - status === 'connected'
   * - billingStarted === false
   */
  static async startBilling(callId) {
    try {
      // Check if billing can start
      const canStart = await CallStateMachine.canStartBilling(callId)
      if (!canStart.canStart) {
        throw new Error(`Cannot start billing: ${canStart.reason}`)
      }
      
      const callData = canStart.callData
      
      // Idempotency: If already started, return
      if (callData.billingStarted) {
        console.log(`⚠️ Billing already started for call ${callId}`)
        return { success: true, alreadyStarted: true }
      }
      
      // Get pricing
      const pricing = await PricingService.getPricing(callData.astrologerId)
      const ratePerMinute = pricing.finalPrice
      const ratePerSecond = ratePerMinute / 60
      
      // Check if user has sufficient balance (5 minutes worth minimum)
      const minBalanceRequired = ratePerMinute * 5
      const userWallet = await WalletService.getWallet(callData.userId)
      
      if (userWallet.balance < minBalanceRequired) {
        throw new Error(`Insufficient balance. Minimum ₹${minBalanceRequired} required.`)
      }
      
      console.log(`✅ User has sufficient balance (₹${userWallet.balance}) for call`)
      
      // Update call document: start billing
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      
      await callRef.update({
        status: 'billing_active',
        billingStarted: true,
        callStartTime: admin.firestore.FieldValue.serverTimestamp(),
        ratePerMinute,
        ratePerSecond,
        actualDurationSeconds: 0,
        finalAmount: 0,
        astrologerEarning: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Start in-memory billing ticker
      const billingState = {
        callId,
        userId: callData.userId,
        astrologerId: callData.astrologerId,
        ratePerSecond,
        lastPersistTime: Date.now(),
        lastTick: Date.now(),
        durationSeconds: 0,
        totalAmount: 0, // Total amount to be charged (calculated at end)
        totalEarning: 0
      }
      
      // Start ticker (every 1 second)
      const intervalId = setInterval(() => {
        this.tickBilling(callId, billingState)
      }, 1000)
      
      billingState.intervalId = intervalId
      activeBillingCalls.set(callId, billingState)
      
      console.log(`✅ Started per-second billing for call ${callId}`)
      
      return {
        success: true,
        ratePerSecond,
        ratePerMinute,
        holdAmount
      }
    } catch (error) {
      console.error('Error starting billing:', error)
      throw new Error(`Failed to start billing: ${error.message}`)
    }
  }

  /**
   * Internal: Process one billing tick (1 second)
   * 
   * SIMPLIFIED APPROACH:
   * - Track per-second in memory ONLY (no deductions during call)
   * - Persist state to Firestore every 5 seconds (for real-time UI updates)
   * - Deduct ONCE at the end when call finalizes
   */
  static async tickBilling(callId, billingState) {
    try {
      // Check if call still exists and is active
      const callData = await CallStateMachine.getCallState(callId)
      if (!callData || callData.status !== 'billing_active' || callData.billingFinalized) {
        // Stop billing
        this.stopBilling(callId)
        return
      }
      
      // Increment duration (per-second accuracy)
      billingState.durationSeconds += 1
      billingState.totalAmount = billingState.durationSeconds * billingState.ratePerSecond
      billingState.totalEarning = billingState.totalAmount // Astrologer gets 100% for now
      
      billingState.lastTick = Date.now()
      
      console.log(`⏱️ Billing tick: call ${callId}, duration=${billingState.durationSeconds}s, amount=₹${billingState.totalAmount.toFixed(2)}`)
      
      // Persist to Firestore every 5 seconds (for real-time UI updates)
      const timeSinceLastPersist = Date.now() - billingState.lastPersistTime
      if (timeSinceLastPersist >= 5000) {
        await this.persistBillingState(callId, billingState)
        billingState.lastPersistTime = Date.now()
      }
    } catch (error) {
      console.error(`Error in billing tick for call ${callId}:`, error)
      // Don't stop billing on transient errors, but log them
    }
  }

  /**
   * Persist current billing state to Firestore
   */
  static async persistBillingState(callId, billingState) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      
      await callRef.update({
        actualDurationSeconds: billingState.durationSeconds,
        finalAmount: billingState.totalAmount,
        astrologerEarning: billingState.totalEarning,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    } catch (error) {
      console.error(`Error persisting billing state for call ${callId}:`, error)
      // Don't throw - this is a periodic update, failures are non-critical
    }
  }

  /**
   * Stop billing for a call (cleanup in-memory state)
   */
  static stopBilling(callId) {
    const billingState = activeBillingCalls.get(callId)
    if (billingState && billingState.intervalId) {
      clearInterval(billingState.intervalId)
      activeBillingCalls.delete(callId)
      console.log(`🛑 Stopped billing ticker for call ${callId}`)
    }
  }

  /**
   * Finalize billing for a call
   * This is idempotent - can be called multiple times safely
   */
  static async finalizeBilling(callId, reason = 'call_ended') {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()
      
      if (!callDoc.exists) {
        throw new Error('Call not found')
      }
      
      const callData = callDoc.data()
      
      // Idempotency: If already finalized, return existing data
      if (callData.billingFinalized) {
        console.log(`⚠️ Billing already finalized for call ${callId}`)
        return {
          success: true,
          alreadyFinalized: true,
          finalAmount: callData.finalAmount,
          astrologerEarning: callData.astrologerEarning,
          actualDurationSeconds: callData.actualDurationSeconds
        }
      }
      
      // CRITICAL: Mark as finalized IMMEDIATELY to prevent race conditions
      await callRef.update({
        billingFinalized: true,
        billingFinalizedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log(`🔒 Locked billing for call ${callId} - marked as finalized`)
      
      // Get final state BEFORE stopping billing (important!)
      const billingState = activeBillingCalls.get(callId)
      
      // Stop in-memory billing (clears the state, so must be done AFTER getting it)
      this.stopBilling(callId)
      let finalDurationSeconds = callData.actualDurationSeconds || 0
      let finalAmount = callData.finalAmount || 0
      let finalEarning = callData.astrologerEarning || 0
      
      if (billingState) {
        // Use in-memory state if available (more accurate)
        finalDurationSeconds = billingState.durationSeconds
        finalAmount = billingState.totalAmount
        finalEarning = billingState.totalEarning
        
        console.log(`✅ Found billing state in memory for call ${callId}: ${finalDurationSeconds}s, ₹${finalAmount}`)
        
        // Persist final state to Firestore
        await this.persistBillingState(callId, billingState)
      } else {
        console.warn(`⚠️ No billing state in memory for call ${callId}! Using values from call document: duration=${finalDurationSeconds}s, amount=₹${finalAmount}`)
        console.warn(`This means billing either never started or was already finalized. Call status: ${callData.status}`)
        
        // If we have no billing state and no saved amounts, this call had no billing
        // This is expected for failed/cancelled calls, but not for completed ones
        if (finalAmount === 0 && finalDurationSeconds === 0 && callData.status === 'completed') {
          console.error(`❌ BILLING ERROR: Call ${callId} is marked completed but has no billing data!`)
          console.error(`Call data:`, {
            userJoined: callData.userJoined,
            astrologerJoined: callData.astrologerJoined,
            audioTrackPublished: callData.audioTrackPublished,
            billingStarted: callData.billingStarted,
            status: callData.status
          })
        }
      }
      
      console.log(`📊 Final billing state for call ${callId}:`, {
        duration: finalDurationSeconds,
        amount: finalAmount,
        earning: finalEarning
      })
      
      // CRITICAL: Deduct the ACTUAL call charges ONCE (no more deductions during call)
      if (finalAmount > 0 && billingState) {
        try {
          console.log(`💰 Deducting final amount ₹${finalAmount} for ${finalDurationSeconds}s call`)
          
          // IDEMPOTENCY: Check if wallet already has this transaction
          const wallet = await WalletService.getWallet(billingState.userId)
          const transactionId = `call-charge-${callId}`
          const existingTransaction = wallet.transactions.find(t => t.id === transactionId)
          
          if (existingTransaction) {
            console.log(`⚠️ Transaction ${transactionId} already exists, skipping deduction`)
          } else {
            await WalletService.deductMoney(
              billingState.userId,
              finalAmount,
              transactionId,
              `Call charges for ${finalDurationSeconds}s`
            )
            console.log(`✅ Successfully deducted ₹${finalAmount} from user wallet`)
          }
        } catch (walletError) {
          console.error(`❌ Could not deduct final amount: ${walletError.message}`)
          // Continue with finalization - track the attempted charge
        }
      } else if (finalAmount > 0 && !billingState) {
        console.error(`❌ Cannot deduct ₹${finalAmount} - no billing state (userId unknown)`)
      }
      
      console.log(`💰 Billing summary for call ${callId}:`, {
        finalAmount,
        finalEarning,
        actualDurationSeconds: finalDurationSeconds
      })
      
      // Credit astrologer earnings (ONCE - idempotent)
      if (finalEarning > 0) {
        await this.creditAstrologerEarning(callData.astrologerId, finalEarning, callId)
      }
      
      // CRITICAL: Reset astrologer status to "online" when call ends
      // This prevents astrologer from being stuck on "busy"
      if (callData.astrologerId) {
        try {
          const astrologerRef = db.collection('astrologers').doc(callData.astrologerId)
          const astrologerDoc = await astrologerRef.get()
          if (astrologerDoc.exists && astrologerDoc.data().status === 'busy') {
            await astrologerRef.update({
              status: 'online',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
            console.log(`✅ Reset astrologer ${callData.astrologerId} status to "online" after call ended`)
          }
        } catch (statusError) {
          console.warn(`⚠️ Could not reset astrologer status:`, statusError.message)
          // Don't fail billing finalization if status update fails
        }
      }
      
      // Update call document: finalize
      // CRITICAL: Only update if we have actual values (not 0)
      const updateData = {
        status: 'completed',
        billingFinalized: true,
        callEndTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      // Only set these if they have real values
      if (finalDurationSeconds > 0) {
        updateData.actualDurationSeconds = finalDurationSeconds
      }
      if (finalAmount > 0) {
        updateData.finalAmount = finalAmount
      }
      if (finalEarning > 0) {
        updateData.astrologerEarning = finalEarning
      }
      
      await callRef.update(updateData)
      
      console.log(`✅ Finalized billing for call ${callId}: ${finalDurationSeconds}s, ₹${finalAmount}, earning: ₹${finalEarning}`)
      
      // Log the actual update data
      console.log(`📝 Updated call document with:`, updateData)
      
      return {
        success: true,
        finalAmount,
        astrologerEarning: finalEarning,
        actualDurationSeconds: finalDurationSeconds
      }
    } catch (error) {
      console.error('Error finalizing billing:', error)
      throw new Error(`Failed to finalize billing: ${error.message}`)
    }
  }

  /**
   * Credit astrologer earnings (idempotent - never decreases)
   */
  static async creditAstrologerEarning(astrologerId, amount, callId) {
    try {
      const db = getDb()
      const earningsRef = db.collection('astrologer_earnings').doc(`${astrologerId}_${callId}`)
      const earningsDoc = await earningsRef.get()
      
      // Idempotency: If already credited, don't credit again
      if (earningsDoc.exists) {
        const existing = earningsDoc.data()
        if (existing.credited) {
          console.log(`⚠️ Earnings already credited for call ${callId}`)
          return { success: true, alreadyCredited: true }
        }
      }
      
      // Credit earnings
      await earningsRef.set({
        astrologerId,
        callId,
        amount,
        credited: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Update astrologer's total earnings (increment only - never decreases)
      const astrologerRef = db.collection('astrologers').doc(astrologerId)
      await astrologerRef.update({
        totalEarnings: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      console.log(`✅ Credited ₹${amount} to astrologer ${astrologerId} for call ${callId}`)
      
      return { success: true }
    } catch (error) {
      console.error('Error crediting astrologer earnings:', error)
      throw new Error(`Failed to credit earnings: ${error.message}`)
    }
  }

  /**
   * Get current billing state for a call (for diagnostics)
   */
  static getBillingState(callId) {
    const state = activeBillingCalls.get(callId)
    if (!state) return null
    
    return {
      durationSeconds: state.durationSeconds,
      totalAmount: state.totalAmount,
      totalEarning: state.totalEarning,
      ratePerSecond: state.ratePerSecond,
      lastTick: state.lastTick,
      isRunning: !!state.intervalId
    }
  }

  /**
   * Cleanup: Stop all active billing (for server shutdown)
   */
  static cleanup() {
    for (const [callId] of activeBillingCalls) {
      this.stopBilling(callId)
    }
  }
}

