import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

const getDb = () => {
  try {
    return getFirestore()
  } catch (error) {
    console.error('Failed to get Firestore instance:', error)
    throw new Error('Database connection failed')
  }
}

/**
 * STRICT CALL STATE MACHINE
 * 
 * States: created -> connected -> billing_active -> completed
 *                              -> failed
 * 
 * Rules:
 * - created: Call created, no participants joined
 * - connected: BOTH user AND astrologer joined
 * - billing_active: Duration + billing started (audio track published)
 * - completed: Billing finalized
 * - failed: Call disconnected before billing started (NO billing)
 */
export class CallStateMachine {
  /**
   * Create a new call with initial state
   */
  static async createCall(callId, userId, astrologerId, callType = 'video') {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      
      const callData = {
        callId,
        userId,
        astrologerId,
        callType,
        status: 'created',
        
        // Participant tracking
        userJoined: false,
        astrologerJoined: false,
        audioTrackPublished: false,
        
        // Billing flags
        billingStarted: false,
        billingFinalized: false,
        
        // Timestamps
        callStartTime: null,
        callEndTime: null,
        
        // Pricing (will be set when billing starts)
        ratePerMinute: null,
        ratePerSecond: null,
        holdAmount: null,
        
        // Duration and billing
        actualDurationSeconds: 0,
        finalAmount: 0,
        astrologerEarning: 0,
        
        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      await callRef.set(callData)
      
      return { success: true, call: callData }
    } catch (error) {
      console.error('Error creating call:', error)
      throw new Error(`Failed to create call: ${error.message}`)
    }
  }

  /**
   * Mark participant as joined (user or astrologer)
   * Returns true if both participants are now joined
   * 
   * Handles migration: If call has old schema, initializes new fields
   */
  static async markParticipantJoined(callId, participantType) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()
      
      if (!callDoc.exists) {
        throw new Error('Call not found')
      }
      
      const callData = callDoc.data()
      
      // Migration: If call has old schema, initialize new fields
      const needsMigration = callData.userJoined === undefined || 
                            callData.astrologerJoined === undefined ||
                            callData.audioTrackPublished === undefined ||
                            callData.billingStarted === undefined
      
      if (needsMigration) {
        console.log(`🔄 Migrating call ${callId} to new schema`)
        const migrationData = {
          userJoined: callData.userJoined || false,
          astrologerJoined: callData.astrologerJoined || false,
          audioTrackPublished: callData.audioTrackPublished || false,
          billingStarted: callData.billingStarted || false,
          billingFinalized: callData.billingFinalized || false,
          callStartTime: callData.callStartTime || null,
          callEndTime: callData.callEndTime || null,
          ratePerMinute: callData.ratePerMinute || null,
          ratePerSecond: callData.ratePerSecond || null,
          holdAmount: callData.holdAmount || null,
          actualDurationSeconds: callData.actualDurationSeconds || 0,
          finalAmount: callData.finalAmount || 0,
          astrologerEarning: callData.astrologerEarning || 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
        await callRef.update(migrationData)
      }
      
      // Idempotency: If already joined, return current state
      if (participantType === 'user' && callData.userJoined) {
        return {
          success: true,
          bothJoined: callData.userJoined && callData.astrologerJoined,
          status: callData.status
        }
      }
      
      if (participantType === 'astrologer' && callData.astrologerJoined) {
        return {
          success: true,
          bothJoined: callData.userJoined && callData.astrologerJoined,
          status: callData.status
        }
      }
      
      // Update participant status
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      if (participantType === 'user') {
        updateData.userJoined = true
      } else if (participantType === 'astrologer') {
        updateData.astrologerJoined = true
      } else {
        throw new Error('Invalid participant type. Must be "user" or "astrologer"')
      }
      
      await callRef.update(updateData)
      
      // Check if both are now joined
      const updatedDoc = await callRef.get()
      const updatedData = updatedDoc.data()
      const bothJoined = updatedData.userJoined && updatedData.astrologerJoined
      
      // If both joined and status allows transition, move to 'connected'
      // Allow transition from: 'created', 'pending', 'queued', 'active'
      const canTransitionToConnected = ['created', 'pending', 'queued', 'active'].includes(updatedData.status)
      
      if (bothJoined && canTransitionToConnected) {
        await callRef.update({
          status: 'connected',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        
        console.log(`✅ Call ${callId} transitioned to 'connected' - both participants joined (from ${updatedData.status})`)
        
        // CRITICAL: Check if we can start billing now
        // This handles the case where audio track was published before both joined
        const finalDoc = await callRef.get()
        const finalData = finalDoc.data()
        const shouldCheckBilling = finalData.audioTrackPublished === true && 
                                   finalData.billingStarted === false
        
        return {
          success: true,
          bothJoined: true,
          status: 'connected',
          shouldCheckBilling
        }
      }
      
      return {
        success: true,
        bothJoined,
        status: updatedData.status
      }
    } catch (error) {
      console.error('Error marking participant joined:', error)
      throw new Error(`Failed to mark participant joined: ${error.message}`)
    }
  }

  /**
   * Mark audio track as published
   * Returns true if billing can start (both joined + audio published)
   * 
   * Handles migration: If call has old schema, initializes new fields
   */
  static async markAudioTrackPublished(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()
      
      if (!callDoc.exists) {
        throw new Error('Call not found')
      }
      
      const callData = callDoc.data()
      
      // Migration: If call has old schema, initialize new fields
      const needsMigration = callData.userJoined === undefined || 
                            callData.astrologerJoined === undefined ||
                            callData.audioTrackPublished === undefined ||
                            callData.billingStarted === undefined
      
      if (needsMigration) {
        console.log(`🔄 Migrating call ${callId} to new schema (in markAudioTrackPublished)`)
        const migrationData = {
          userJoined: callData.userJoined || false,
          astrologerJoined: callData.astrologerJoined || false,
          audioTrackPublished: callData.audioTrackPublished || false,
          billingStarted: callData.billingStarted || false,
          billingFinalized: callData.billingFinalized || false,
          callStartTime: callData.callStartTime || null,
          callEndTime: callData.callEndTime || null,
          ratePerMinute: callData.ratePerMinute || null,
          ratePerSecond: callData.ratePerSecond || null,
          holdAmount: callData.holdAmount || null,
          actualDurationSeconds: callData.actualDurationSeconds || 0,
          finalAmount: callData.finalAmount || 0,
          astrologerEarning: callData.astrologerEarning || 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
        await callRef.update(migrationData)
      }
      
      // Idempotency: If already published, return current state
      if (callData.audioTrackPublished) {
        const canStartBilling = callData.billingStarted === false && 
                               callData.userJoined === true && 
                               callData.astrologerJoined === true &&
                               callData.audioTrackPublished === true &&
                               (callData.status === 'connected' || callData.status === 'active')
        
        console.log(`⚠️ Audio track already published for call ${callId}, checking billing:`, {
          canStartBilling,
          billingStarted: callData.billingStarted,
          userJoined: callData.userJoined,
          astrologerJoined: callData.astrologerJoined,
          audioTrackPublished: callData.audioTrackPublished,
          status: callData.status
        })
        
        return {
          success: true,
          canStartBilling,
          status: callData.status,
          reason: canStartBilling ? 'All conditions met' : 'Some conditions not met',
          callData: callData // Include call data for diagnostics
        }
      }
      
      // Update audio track status
      await callRef.update({
        audioTrackPublished: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Check if billing can start
      const updatedDoc = await callRef.get()
      const updatedData = updatedDoc.data()
      
      // CRITICAL: All conditions must be met:
      // 1. billingStarted must be false
      // 2. userJoined must be true
      // 3. astrologerJoined must be true
      // 4. audioTrackPublished must be true (we just set it)
      // 5. status must be 'connected' or 'active'
      const canStartBilling = !updatedData.billingStarted &&
                              updatedData.userJoined === true &&
                              updatedData.astrologerJoined === true &&
                              updatedData.audioTrackPublished === true &&
                              (updatedData.status === 'connected' || updatedData.status === 'active')
      
      console.log(`🔍 Billing check after audio track published for call ${callId}:`, {
        canStartBilling,
        billingStarted: updatedData.billingStarted,
        userJoined: updatedData.userJoined,
        astrologerJoined: updatedData.astrologerJoined,
        audioTrackPublished: updatedData.audioTrackPublished,
        status: updatedData.status
      })
      
      return {
        success: true,
        canStartBilling,
        status: updatedData.status,
        reason: canStartBilling ? 'All conditions met' : 'Some conditions not met',
        callData: updatedData // Include call data for diagnostics
      }
    } catch (error) {
      console.error('Error marking audio track published:', error)
      throw new Error(`Failed to mark audio track published: ${error.message}`)
    }
  }

  /**
   * Get current call state
   */
  static async getCallState(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()
      
      if (!callDoc.exists) {
        return null
      }
      
      return callDoc.data()
    } catch (error) {
      console.error('Error getting call state:', error)
      throw new Error(`Failed to get call state: ${error.message}`)
    }
  }

  /**
   * Mark participant as left
   * 
   * Logic:
   * 1. Update participant status (userJoined/astrologerJoined to false)
   * 2. If BOTH participants have left AND billing hasn't started → mark as failed
   * 3. If billing has started → trigger finalization
   * 4. If only ONE participant left → wait (don't mark as failed yet, audio track might still publish)
   */
  static async markParticipantLeft(callId, participantType) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()
      
      if (!callDoc.exists) {
        throw new Error('Call not found')
      }
      
      const callData = callDoc.data()
      
      // Migration: Ensure new schema fields exist
      const needsMigration = callData.userJoined === undefined || 
                            callData.astrologerJoined === undefined
      
      if (needsMigration) {
        console.log(`🔄 Migrating call ${callId} to new schema (in markParticipantLeft)`)
        const migrationData = {
          userJoined: callData.userJoined !== false,
          astrologerJoined: callData.astrologerJoined !== false,
          audioTrackPublished: callData.audioTrackPublished || false,
          billingStarted: callData.billingStarted || false,
          billingFinalized: callData.billingFinalized || false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
        await callRef.update(migrationData)
        // Refresh call data
        const updatedDoc = await callRef.get()
        Object.assign(callData, updatedDoc.data())
      }
      
      // Update participant status (mark as left)
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      if (participantType === 'user') {
        updateData.userJoined = false
      } else if (participantType === 'astrologer') {
        updateData.astrologerJoined = false
      } else {
        throw new Error('Invalid participant type. Must be "user" or "astrologer"')
      }
      
      await callRef.update(updateData)
      
      // Get updated state
      const updatedDoc = await callRef.get()
      const updatedData = updatedDoc.data()
      
      const bothLeft = !updatedData.userJoined && !updatedData.astrologerJoined
      const billingStarted = updatedData.billingStarted === true
      const billingFinalized = updatedData.billingFinalized === true
      
      console.log(`📊 Participant ${participantType} left call ${callId}:`, {
        userJoined: updatedData.userJoined,
        astrologerJoined: updatedData.astrologerJoined,
        bothLeft,
        billingStarted,
        billingFinalized,
        status: updatedData.status
      })
      
      // If BOTH participants have left AND billing hasn't started → mark as failed
      if (bothLeft && !billingStarted) {
        await callRef.update({
          status: 'failed',
          callEndTime: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        
        console.log(`⚠️ Call ${callId} marked as failed - both participants left before billing started`)
        
        return {
          success: true,
          status: 'failed',
          shouldFinalize: false
        }
      }
      
      // If billing has started but not finalized, trigger finalization
      if (billingStarted && !billingFinalized) {
        console.log(`✅ Call ${callId} billing active, will finalize on participant leave`)
        return {
          success: true,
          status: updatedData.status,
          shouldFinalize: true
        }
      }
      
      // If only ONE participant left and billing hasn't started:
      // Don't mark as failed yet - the other participant might still be there
      // and audio track might still publish
      if (!bothLeft && !billingStarted) {
        console.log(`ℹ️ Only one participant left call ${callId}, waiting for other participant or audio track...`)
        return {
          success: true,
          status: updatedData.status,
          shouldFinalize: false,
          waitingForOtherParticipant: true
        }
      }
      
      // Already finalized or other state
      return {
        success: true,
        status: updatedData.status,
        shouldFinalize: false
      }
    } catch (error) {
      console.error('Error marking participant left:', error)
      throw new Error(`Failed to mark participant left: ${error.message}`)
    }
  }

  /**
   * Check if billing can start
   * Requirements: userJoined, astrologerJoined, audioTrackPublished OR grace period passed, status === 'connected' or 'active', billingStarted === false
   */
  static async canStartBilling(callId) {
    try {
      const callData = await this.getCallState(callId)
      
      if (!callData) {
        return { canStart: false, reason: 'Call not found' }
      }
      
      // FALLBACK MECHANISM: If call has been 'connected' for more than 15 seconds, allow billing without explicit audio track
      const now = Date.now()
      const createdAt = callData.createdAt ? (callData.createdAt.toMillis ? callData.createdAt.toMillis() : new Date(callData.createdAt).getTime()) : now
      const age = now - createdAt
      const gracePeriodPassed = age > 15000 // 15 seconds
      
      // Check each condition and provide detailed reason
      const checks = {
        userJoined: callData.userJoined === true,
        astrologerJoined: callData.astrologerJoined === true,
        audioTrackPublished: callData.audioTrackPublished === true,
        audioTrackOrGracePeriod: callData.audioTrackPublished === true || gracePeriodPassed,
        statusConnected: callData.status === 'connected' || callData.status === 'active',
        billingNotStarted: callData.billingStarted !== true,
        gracePeriodPassed: gracePeriodPassed
      }
      
      // MODIFIED LOGIC: Allow billing if audio track published OR grace period passed (15 seconds)
      const canStart = checks.userJoined &&
                       checks.astrologerJoined &&
                       checks.audioTrackOrGracePeriod &&
                       checks.statusConnected &&
                       checks.billingNotStarted
      
      // Build detailed reason
      const missingChecks = []
      if (!checks.userJoined) missingChecks.push('userJoined')
      if (!checks.astrologerJoined) missingChecks.push('astrologerJoined')
      if (!checks.audioTrackPublished && !gracePeriodPassed) {
        missingChecks.push('audioTrackPublished (waiting for grace period)')
      }
      if (!checks.statusConnected) missingChecks.push('statusConnected')
      if (!checks.billingNotStarted) missingChecks.push('billingAlreadyStarted')
      
      let reason = canStart ? 'All conditions met' : `Missing: ${missingChecks.join(', ')}`
      
      if (gracePeriodPassed && !callData.audioTrackPublished) {
        reason += ' (grace period bypass active)'
      }
      
      console.log(`🔍 Billing check for call ${callId}:`, {
        canStart,
        reason,
        checks,
        currentStatus: callData.status,
        callAge: Math.round(age / 1000) + 's',
        gracePeriodPassed: gracePeriodPassed ? 'YES - billing allowed without audio track' : 'NO'
      })
      
      return {
        canStart,
        reason,
        callData,
        checks
      }
    } catch (error) {
      console.error('Error checking if billing can start:', error)
      return { canStart: false, reason: error.message }
    }
  }
}

