import admin from 'firebase-admin'
import { WalletService } from './wallet'
import { PricingService } from './pricing'

// Get Firestore instance (server-side)
const getDb = () => {
  try {
    return admin.firestore()
  } catch (error) {
    console.error('Failed to get Firestore instance:', error)
    throw new Error('Database connection failed')
  }
}

export class BillingService {
  /**
   * Validate if user has sufficient balance for a call
   */
  static async validateBalanceForCall(userId, astrologerId, estimatedDurationMinutes = 5) {
    try {
      // Get user's wallet balance
      const wallet = await WalletService.getWallet(userId)

      // Get astrologer's pricing
      const pricing = await PricingService.getPricing(astrologerId)

      // Calculate minimum required balance
      const minimumBalance = PricingService.getMinimumBalanceRequired(pricing, estimatedDurationMinutes)

      return {
        hasBalance: wallet.balance >= minimumBalance,
        currentBalance: wallet.balance,
        minimumRequired: minimumBalance,
        shortfall: Math.max(0, minimumBalance - wallet.balance)
      }
    } catch (error) {
      console.error('Error validating balance:', error)
      throw new Error('Failed to validate balance')
    }
  }

  /**
   * Initialize call billing - hold money for the call
   */
  static async initializeCallBilling(callId, userId, astrologerId) {
    try {
      // Get astrologer's pricing
      const pricing = await PricingService.getPricing(astrologerId)

      // Calculate initial hold amount (5 minutes for per_minute, full amount for per_call)
      let holdAmount
      if (pricing.pricingType === 'per_minute') {
        holdAmount = pricing.finalPrice * 5 // Hold for 5 minutes initially
      } else {
        holdAmount = pricing.finalPrice // Hold full amount for per_call
      }

      // Hold money in wallet
      await WalletService.holdMoney(userId, holdAmount, callId)

      // Create call billing record with connectedAt timestamp
      const db = getDb()
      const billingRef = db.collection('call_billing').doc(callId)
      await billingRef.set({
        callId,
        userId,
        astrologerId,
        pricing: pricing,
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp for accuracy
        connectedAt: admin.firestore.FieldValue.serverTimestamp(), // Track when billing actually started
        endTime: null,
        initialHoldAmount: holdAmount,
        totalCost: 0,
        finalAmount: 0,
        durationMinutes: 0,
        billingType: pricing.pricingType,
        estimatedMinutes: pricing.pricingType === 'per_minute' ? 5 : pricing.callDurationMins || 30,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        success: true,
        holdAmount,
        pricing,
        callId,
        estimatedMinutes: pricing.pricingType === 'per_minute' ? 5 : pricing.callDurationMins || 30
      }
    } catch (error) {
      console.error('Error initializing call billing:', error)
      if (error.message === 'Insufficient balance') {
        throw error
      }
      throw new Error('Failed to initialize call billing')
    }
  }

  /**
   * Update call duration and calculate running cost
   */
  static async updateCallDuration(callId, currentDurationMinutes) {
    try {
      const db = getDb()
      const billingRef = db.collection('call_billing').doc(callId)
      const billingDoc = await billingRef.get()

      if (!billingDoc.exists) {
        throw new Error('Call billing record not found')
      }

      const billingData = billingDoc.data()
      const { pricing } = billingData

      // Calculate current cost based on duration
      const costCalculation = PricingService.calculateCallCost(pricing, currentDurationMinutes)

      // Update billing record
      await billingRef.update({
        durationMinutes: currentDurationMinutes,
        totalCost: costCalculation.totalCost,
        updatedAt: new Date()
      })

      return {
        durationMinutes: currentDurationMinutes,
        currentCost: costCalculation.totalCost,
        breakdown: costCalculation.breakdown
      }
    } catch (error) {
      console.error('Error updating call duration:', error)
      throw new Error('Failed to update call duration')
    }
  }

  /**
    * Finalize call billing - calculate final cost and settle payment with immediate refund
    */
  static async finalizeCallBilling(callId, actualDurationMinutes) {
     try {
       const db = getDb()
       const billingRef = db.collection('call_billing').doc(callId)
       const billingDoc = await billingRef.get()

       if (!billingDoc.exists) {
         throw new Error('Call billing record not found')
       }

       const billingData = billingDoc.data()
       const { userId, astrologerId, pricing, initialHoldAmount } = billingData

       // Calculate final cost based on actual duration
       const costCalculation = PricingService.calculateCallCost(pricing, actualDurationMinutes)
       const finalAmount = costCalculation.totalCost

       // Calculate the difference between held amount and final amount
       const difference = finalAmount - initialHoldAmount

       // Update billing record
       await billingRef.update({
         endTime: new Date(),
         durationMinutes: actualDurationMinutes,
         totalCost: finalAmount,
         finalAmount,
         status: 'completed',
         updatedAt: new Date()
       })

       // Immediate settlement: deduct actual cost and refund remaining hold amount
       // Note: The hold amount was already deducted when holdMoney() was called
       // So we need to account for that in our calculations

      console.log(`Immediate settlement for call ${callId}:`, {
         initialHoldAmount,
         finalAmount,
         actualDurationMinutes,
         costBreakdown: costCalculation.breakdown
       })

       // Get balance before settlement
       const walletBefore = await WalletService.getWallet(userId)
       console.log(`Balance before settlement: ${walletBefore.balance}`)

       // Calculate refund: the hold amount minus the actual cost
       // Since the hold was already deducted, we refund the unused portion
       const refundAmount = Math.max(0, initialHoldAmount - finalAmount)
       if (refundAmount > 0) {
         await WalletService.addMoney(userId, refundAmount, `refund-hold-${callId}`, `Refund of unused hold amount for call ${callId}`)
       }

       // Get balance after settlement
       const walletAfter = await WalletService.getWallet(userId)
       console.log(`Balance after settlement: ${walletAfter.balance}, Refund amount: ${refundAmount}`)

       // Note: Don't call releaseHold() here as we've already handled the refund manually
       // releaseHold() should only be used for cancelled calls, not completed calls

       return {
         success: true,
         finalAmount,
         durationMinutes: actualDurationMinutes,
         breakdown: costCalculation.breakdown,
         initialHoldAmount,
         refundAmount,
         actualCost: finalAmount
       }
     } catch (error) {
       console.error('Error finalizing call billing:', error)
       throw new Error('Failed to finalize call billing')
     }
   }

  /**
    * Cancel call billing - release held money
    */
   static async cancelCallBilling(callId) {
     try {
       const db = getDb()
      const billingRef = db.collection('call_billing').doc(callId)
      const billingDoc = await billingRef.get()

      // If billing record doesn't exist, it's already cancelled or never initialized
      // Return success (idempotent operation)
      if (!billingDoc.exists) {
        console.log(`Billing record not found for call ${callId}, assuming already cancelled or never initialized`)
        return {
          success: true,
          releasedAmount: 0,
          message: 'No billing record found - call may have been cancelled before billing initialization'
        }
      }

      const billingData = billingDoc.data()
      
      // If already cancelled, return success (idempotent)
      if (billingData.status === 'cancelled') {
        console.log(`Billing record for call ${callId} is already cancelled`)
        return {
          success: true,
          releasedAmount: billingData.initialHoldAmount || 0,
          message: 'Billing already cancelled'
        }
      }

      const { userId, initialHoldAmount } = billingData

      // Release held money (full refund for cancelled calls)
      // Only release if there's actually a hold
      if (initialHoldAmount && initialHoldAmount > 0) {
        try {
          await WalletService.releaseHold(userId, callId)
        } catch (walletError) {
          // If hold doesn't exist, log but don't fail - the call might have been cancelled before hold
          console.warn(`Could not release hold for call ${callId}:`, walletError.message)
        }
      }

      // Update billing record
      await billingRef.update({
        status: 'cancelled',
        endTime: new Date(),
        updatedAt: new Date()
      })

      return {
        success: true,
        releasedAmount: initialHoldAmount || 0
      }
    } catch (error) {
      console.error('Error cancelling call billing:', error)
      // Don't throw - return error response instead
      return {
        success: false,
        error: error.message || 'Failed to cancel call billing',
        releasedAmount: 0
      }
    }
   }

  /**
    * Immediate settlement for completed calls with duration-based charging
    */
  static async immediateCallSettlement(callId, actualDurationMinutes) {
     try {
       const db = getDb()
       const billingRef = db.collection('call_billing').doc(callId)
       const billingDoc = await billingRef.get()

       if (!billingDoc.exists) {
         console.warn(`Call billing record not found for callId: ${callId}. Creating minimal settlement.`)
         return {
           success: true,
           finalAmount: 0,
           durationMinutes: actualDurationMinutes,
           breakdown: 'No billing record found - no charges applied',
           initialHoldAmount: 0,
           refundAmount: 0,
           actualCost: 0
         }
       }

       const billingData = billingDoc.data()
       const { userId, astrologerId, pricing, initialHoldAmount, status } = billingData

       // Check if already completed to prevent duplicate processing
       if (status === 'completed') {
         console.log(`Call ${callId} already completed, skipping duplicate processing`)
         return {
           success: true,
           finalAmount: billingData.finalAmount || 0,
           durationMinutes: billingData.durationMinutes || actualDurationMinutes,
           breakdown: 'Already processed',
           initialHoldAmount: billingData.initialHoldAmount || 0,
           refundAmount: billingData.refundAmount || 0,
           actualCost: billingData.finalAmount || 0
         }
       }

       // Calculate final cost based on actual duration
       const costCalculation = PricingService.calculateCallCost(pricing, actualDurationMinutes)
       const finalAmount = costCalculation.totalCost

       // Update billing record
       await billingRef.update({
         endTime: new Date(),
         durationMinutes: actualDurationMinutes,
         totalCost: finalAmount,
         finalAmount,
         status: 'completed',
         updatedAt: new Date()
       })

       // Immediate settlement: deduct actual cost and refund remaining hold amount
       // Note: The hold amount was already deducted when holdMoney() was called
       // So we need to account for that in our calculations

       console.log(`Finalize call billing for call ${callId}:`, {
         initialHoldAmount,
         finalAmount,
         actualDurationMinutes,
         costBreakdown: costCalculation.breakdown
       })

       // Get balance before settlement
       const walletBefore = await WalletService.getWallet(userId)
       console.log(`Balance before finalize settlement: ${walletBefore.balance}`)

       // Calculate refund: the hold amount minus the actual cost
       // Since the hold was already deducted, we refund the unused portion
       const refundAmount = Math.max(0, initialHoldAmount - finalAmount)
       if (refundAmount > 0) {
         const refundTransactionId = `refund-hold-${callId}-${Date.now()}`
         await WalletService.addMoney(userId, refundAmount, refundTransactionId, `Refund of unused hold amount for call ${callId}`)
       }

       // Get balance after settlement
       const walletAfter = await WalletService.getWallet(userId)
       console.log(`Balance after finalize settlement: ${walletAfter.balance}, Refund amount: ${refundAmount}`)

       // Note: Don't call releaseHold() here as we've already handled the refund manually
       // releaseHold() should only be used for cancelled calls, not completed calls

       return {
        success: true,
         finalAmount,
         durationMinutes: actualDurationMinutes,
         breakdown: costCalculation.breakdown,
         initialHoldAmount,
         refundAmount,
         actualCost: finalAmount
       }
     } catch (error) {
       console.error('Error in immediate call settlement:', error)
       throw new Error('Failed to complete immediate call settlement')
     }
   }

  /**
   * Get call billing details
   */
  static async getCallBilling(callId) {
    try {
      const db = getDb()
      const billingRef = db.collection('call_billing').doc(callId)
      const billingDoc = await billingRef.get()

      if (!billingDoc.exists) {
        return null
      }

      return billingDoc.data()
    } catch (error) {
      console.error('Error getting call billing:', error)
      throw new Error('Failed to fetch call billing')
    }
  }

  /**
   * Get user's call history with billing details
   */
  static async getUserCallHistory(userId, limitCount = 20) {
    try {
      const db = getDb()
      const billingSnapshot = await db.collection('call_billing')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get()

      const callHistory = []
      billingSnapshot.forEach((doc) => {
        callHistory.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return callHistory
    } catch (error) {
      console.error('Error getting user call history:', error)
      throw new Error('Failed to fetch call history')
    }
  }

  /**
   * Get astrologer's earnings from calls
   */
  static async getAstrologerEarnings(astrologerId, startDate, endDate) {
    try {
      const db = getDb()
      // NEW: Read from calls collection instead of call_billing
      let earningsQuery = db.collection('calls')
        .where('astrologerId', '==', astrologerId)
        .where('status', '==', 'completed')

      if (startDate && endDate) {
        earningsQuery = earningsQuery
          .where('callEndTime', '>=', startDate)
          .where('callEndTime', '<=', endDate)
      }

      const earningsSnapshot = await earningsQuery.get()
      let totalEarnings = 0
      const completedCalls = []

      earningsSnapshot.forEach((doc) => {
        const data = doc.data()
        const earnings = data.astrologerEarning || 0 // NEW: Use astrologerEarning field
        totalEarnings += earnings
        completedCalls.push({
          id: doc.id,
          ...data
        })
      })

      console.log(`✅ Fetched earnings for astrologer ${astrologerId}: ₹${totalEarnings} from ${completedCalls.length} completed calls`)

      return {
        totalEarnings,
        completedCalls: completedCalls.length,
        calls: completedCalls
      }
    } catch (error) {
      console.error('Error getting astrologer earnings:', error)
      throw new Error('Failed to fetch earnings')
    }
  }

  /**
   * Get astrologer's earnings with detailed transaction history
   */
  static async getAstrologerEarningsWithHistory(astrologerId, limitCount = 50) {
    try {
      const db = getDb()
      // NEW: Read from calls collection instead of call_billing
      const earningsSnapshot = await db.collection('calls')
        .where('astrologerId', '==', astrologerId)
        .where('status', '==', 'completed')
        .orderBy('callEndTime', 'desc')
        .limit(limitCount)
        .get()

      let totalEarnings = 0
      const transactions = []

      earningsSnapshot.forEach((doc) => {
        const data = doc.data()
        const earnings = data.astrologerEarning || 0 // NEW: Use astrologerEarning field
        totalEarnings += earnings
        
        // Parse callEndTime safely
        let endTime = null
        if (data.callEndTime) {
          if (data.callEndTime.toDate) {
            endTime = data.callEndTime.toDate()
          } else if (typeof data.callEndTime === 'string') {
            endTime = new Date(data.callEndTime)
          } else if (data.callEndTime.seconds) {
            endTime = new Date(data.callEndTime.seconds * 1000)
          }
        }

        // Calculate duration in minutes from seconds (keep decimal for mm:ss formatting)
        const durationMinutes = data.actualDurationSeconds ? data.actualDurationSeconds / 60 : 0
        const durationForDisplay = durationMinutes > 0 
          ? `${Math.floor(durationMinutes)}:${Math.round((durationMinutes - Math.floor(durationMinutes)) * 60).toString().padStart(2, '0')}`
          : '0:00'
        
        transactions.push({
          id: doc.id,
          type: 'earnings',
          amount: earnings,
          callId: doc.id, // Use document ID as callId
          userId: data.userId,
          durationMinutes, // Keep as decimal (e.g., 1.5 for 1 minute 30 seconds)
          durationSeconds: data.actualDurationSeconds || 0,
          callType: data.callType || 'video',
          timestamp: endTime || data.createdAt || new Date(),
          status: 'completed',
          description: `Earnings from ${data.callType || 'voice'} call (${durationForDisplay})`
        })
      })

      // Get redeemed transactions from astrologer_earnings collection if it exists
      try {
        const redeemedSnapshot = await db.collection('astrologer_earnings')
          .where('astrologerId', '==', astrologerId)
          .where('type', '==', 'redemption')
          .orderBy('timestamp', 'desc')
          .limit(limitCount)
          .get()

        let redeemedAmount = 0
        redeemedSnapshot.forEach((doc) => {
          const data = doc.data()
          redeemedAmount += data.amount || 0
          
          let timestamp = null
          if (data.timestamp) {
            if (data.timestamp.toDate) {
              timestamp = data.timestamp.toDate()
            } else if (typeof data.timestamp === 'string') {
              timestamp = new Date(data.timestamp)
            } else if (data.timestamp.seconds) {
              timestamp = new Date(data.timestamp.seconds * 1000)
            }
          }

          transactions.push({
            id: doc.id,
            type: 'redemption',
            amount: -(data.amount || 0),
            timestamp: timestamp || new Date(),
            status: data.status || 'completed',
            description: data.description || 'Earnings redemption',
            redemptionId: data.redemptionId
          })
        })

        const availableEarnings = totalEarnings - redeemedAmount

        return {
          totalEarnings,
          availableEarnings: Math.max(0, availableEarnings),
          redeemedEarnings: redeemedAmount,
          transactions: transactions.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
            return timeB - timeA
          })
        }
      } catch (redeemedError) {
        // If astrologer_earnings collection doesn't exist, return without redemption data
        console.log('No redemption history found, returning earnings only')
        return {
          totalEarnings,
          availableEarnings: totalEarnings,
          redeemedEarnings: 0,
          transactions
        }
      }
    } catch (error) {
      console.error('Error getting astrologer earnings with history:', error)
      throw new Error('Failed to fetch earnings history')
    }
  }

  /**
   * Redeem astrologer earnings (withdraw to bank/wallet)
   */
  static async redeemAstrologerEarnings(astrologerId, amount, bankDetails) {
    try {
      const db = getDb()
      
      // Get current earnings
      const earningsData = await this.getAstrologerEarningsWithHistory(astrologerId)
      
      if (earningsData.availableEarnings < amount) {
        throw new Error('Insufficient earnings to redeem')
      }

      const MINIMUM_REDEMPTION = 500 // Minimum ₹500
      if (amount < MINIMUM_REDEMPTION) {
        throw new Error(`Minimum redemption amount is ₹${MINIMUM_REDEMPTION}`)
      }

      // Create redemption record
      const redemptionId = `redeem_${astrologerId}_${Date.now()}`
      const redemptionRef = db.collection('astrologer_earnings').doc(redemptionId)
      
      await redemptionRef.set({
        astrologerId,
        type: 'redemption',
        amount,
        status: 'pending', // Will be updated to 'completed' when processed
        bankDetails: {
          accountNumber: bankDetails.accountNumber?.replace(/\d(?=\d{4})/g, '*'), // Mask account number
          ifscCode: bankDetails.ifscCode,
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        redemptionId
      })

      return {
        success: true,
        redemptionId,
        amount,
        message: 'Redemption request submitted successfully. It will be processed within 3-5 business days.'
      }
    } catch (error) {
      console.error('Error redeeming astrologer earnings:', error)
      throw error
    }
  }
}