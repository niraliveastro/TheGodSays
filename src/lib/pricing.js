import admin from 'firebase-admin'

// Get Firestore instance (server-side)
const getDb = () => {
  try {
    return admin.firestore()
  } catch (error) {
    console.error('Failed to get Firestore instance:', error)
    throw new Error('Database connection failed')
  }
}

export class PricingService {
  /**
   * Set astrologer's pricing configuration
   */
  static async setPricing(astrologerId, pricingConfig) {
    try {
      const { pricingType, basePrice, discountPercent = 0, callDurationMins = 30 } = pricingConfig

      // Validate pricing configuration
      if (!['per_minute', 'per_call'].includes(pricingType)) {
        throw new Error('Invalid pricing type. Must be per_minute or per_call')
      }

      if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
        throw new Error('Base price must be a valid number greater than 0')
      }

      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        throw new Error('Discount percent must be a number between 0 and 100')
      }

      if (pricingType === 'per_call' && (!callDurationMins || isNaN(callDurationMins) || callDurationMins <= 0)) {
        throw new Error('Call duration must be a valid number greater than 0 for per_call pricing')
      }

      const db = getDb()
      const pricingRef = db.collection('astrologer_pricing').doc(astrologerId)

      const pricingData = {
        astrologerId,
        pricingType,
        basePrice: Number(basePrice),
        discountPercent: Number(discountPercent),
        callDurationMins: pricingType === 'per_call' ? Number(callDurationMins) : null,
        finalPrice: this.calculateFinalPrice(Number(basePrice), Number(discountPercent)),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await pricingRef.set(pricingData)
      return { success: true, pricing: pricingData }
    } catch (error) {
      console.error('Error setting pricing:', error)
      throw error
    }
  }

  /**
   * Get astrologer's pricing configuration
   */
  static async getPricing(astrologerId) {
    try {
      const db = getDb()
      const pricingRef = db.collection('astrologer_pricing').doc(astrologerId)
      const pricingDoc = await pricingRef.get()

      if (!pricingDoc.exists) {
        // Return default pricing if not set
        return {
          astrologerId,
          pricingType: 'per_minute',
          basePrice: 50,
          discountPercent: 0,
          finalPrice: 50,
          isActive: true
        }
      }

      return pricingDoc.data()
    } catch (error) {
      console.error('Error getting pricing:', error)
      throw new Error('Failed to fetch pricing')
    }
  }

  /**
   * Update astrologer's pricing configuration
   */
  static async updatePricing(astrologerId, updates) {
    try {
      const db = getDb()
      const pricingRef = db.collection('astrologer_pricing').doc(astrologerId)
      const currentPricing = await this.getPricing(astrologerId)

      const updatedData = {
        ...currentPricing,
        ...updates,
        finalPrice: this.calculateFinalPrice(updates.basePrice || currentPricing.basePrice, updates.discountPercent || currentPricing.discountPercent),
        updatedAt: new Date()
      }

      // Validate updated configuration
      if (updatedData.pricingType && !['per_minute', 'per_call'].includes(updatedData.pricingType)) {
        throw new Error('Invalid pricing type')
      }

      if (updatedData.basePrice && updatedData.basePrice <= 0) {
        throw new Error('Base price must be greater than 0')
      }

      if (updatedData.discountPercent !== undefined && (updatedData.discountPercent < 0 || updatedData.discountPercent > 100)) {
        throw new Error('Discount percent must be between 0 and 100')
      }

      await pricingRef.update(updatedData)
      return { success: true, pricing: updatedData }
    } catch (error) {
      console.error('Error updating pricing:', error)
      throw error
    }
  }

  /**
   * Calculate final price after discount
   */
  static calculateFinalPrice(basePrice, discountPercent) {
    if (discountPercent && discountPercent > 0) {
      return basePrice * (1 - discountPercent / 100)
    }
    return basePrice
  }

  /**
    * Calculate call cost based on pricing type and duration with enhanced granularity
    */
   static calculateCallCost(pricing, durationMinutes) {
     try {
       const { pricingType, finalPrice, callDurationMins } = pricing

       if (pricingType === 'per_minute') {
         // Enhanced per-minute calculation with support for any duration
         const totalCost = finalPrice * durationMinutes
         return {
           totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
           breakdown: `${finalPrice}/min × ${durationMinutes} min = ₹${totalCost.toFixed(2)}`
         }
       } else if (pricingType === 'per_call') {
         // For per_call, check if duration exceeds included time
         if (durationMinutes <= callDurationMins) {
           return {
             totalCost: finalPrice,
             breakdown: `Flat rate for up to ${callDurationMins} min = ₹${finalPrice.toFixed(2)}`
           }
         } else {
           // Additional charges for extra time
           const extraMinutes = durationMinutes - callDurationMins
           const extraCost = finalPrice * 0.5 * extraMinutes // 50% of base rate for extra time
           const totalCost = finalPrice + extraCost

           return {
             totalCost: Math.round(totalCost * 100) / 100,
             breakdown: `Base: ₹${finalPrice} (${callDurationMins} min) + Extra: ₹${extraCost.toFixed(2)} (${extraMinutes} min) = ₹${totalCost.toFixed(2)}`
           }
         }
       }

       throw new Error('Invalid pricing type')
     } catch (error) {
       console.error('Error calculating call cost:', error)
       throw new Error('Failed to calculate call cost')
     }
   }

  /**
   * Get minimum balance required for a call
   */
  static getMinimumBalanceRequired(pricing, estimatedDurationMinutes = 5) {
    try {
      const { pricingType, finalPrice, callDurationMins } = pricing

      if (pricingType === 'per_minute') {
        // Require balance for at least 5 minutes
        return finalPrice * Math.max(estimatedDurationMinutes, 5)
      } else if (pricingType === 'per_call') {
        // For per_call, require full amount upfront
        return finalPrice
      }

      throw new Error('Invalid pricing type')
    } catch (error) {
      console.error('Error calculating minimum balance:', error)
      return 50 // Default minimum
    }
  }

  /**
   * Get all astrologers' pricing (for admin purposes)
   */
  static async getAllPricing() {
    try {
      const db = getDb()
      const pricingSnapshot = await db.collection('astrologer_pricing').get()
      const pricingList = []

      pricingSnapshot.forEach((doc) => {
        pricingList.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return pricingList
    } catch (error) {
      console.error('Error getting all pricing:', error)
      throw new Error('Failed to fetch pricing data')
    }
  }

  /**
   * Deactivate pricing (soft delete)
   */
  static async deactivatePricing(astrologerId) {
    try {
      const db = getDb()
      const pricingRef = db.collection('astrologer_pricing').doc(astrologerId)
      await pricingRef.update({
        isActive: false,
        updatedAt: new Date()
      })
      return { success: true }
    } catch (error) {
      console.error('Error deactivating pricing:', error)
      throw new Error('Failed to deactivate pricing')
    }
  }
}