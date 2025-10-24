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

      // Create call billing record
      const db = getDb()
      const billingRef = db.collection('call_billing').doc(callId)
      await billingRef.set({
        callId,
        userId,
        astrologerId,
        pricing: pricing,
        status: 'active',
        startTime: new Date(),
        endTime: null,
        initialHoldAmount: holdAmount,
        totalCost: 0,
        finalAmount: 0,
        durationMinutes: 0,
        billingType: pricing.pricingType,
        estimatedMinutes: pricing.pricingType === 'per_minute' ? 5 : pricing.callDurationMins || 30,
        createdAt: new Date(),
        updatedAt: new Date()
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

       if (!billingDoc.exists) {
         throw new Error('Call billing record not found')
       }

       const billingData = billingDoc.data()
       const { userId, initialHoldAmount } = billingData

       // Release held money (full refund for cancelled calls)
       await WalletService.releaseHold(userId, callId)

       // Update billing record
       await billingRef.update({
         status: 'cancelled',
         endTime: new Date(),
         updatedAt: new Date()
       })

       return {
         success: true,
         releasedAmount: initialHoldAmount
       }
     } catch (error) {
       console.error('Error cancelling call billing:', error)
       throw new Error('Failed to cancel call billing')
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
         throw new Error('Call billing record not found')
       }

       const billingData = billingDoc.data()
       const { userId, astrologerId, pricing, initialHoldAmount } = billingData

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
         await WalletService.addMoney(userId, refundAmount, `refund-hold-${callId}`, `Refund of unused hold amount for call ${callId}`)
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
      let earningsQuery = db.collection('call_billing')
        .where('astrologerId', '==', astrologerId)
        .where('status', '==', 'completed')

      if (startDate && endDate) {
        earningsQuery = earningsQuery
          .where('endTime', '>=', startDate)
          .where('endTime', '<=', endDate)
      }

      const earningsSnapshot = await earningsQuery.get()
      let totalEarnings = 0
      const completedCalls = []

      earningsSnapshot.forEach((doc) => {
        const data = doc.data()
        totalEarnings += data.finalAmount
        completedCalls.push({
          id: doc.id,
          ...data
        })
      })

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
}