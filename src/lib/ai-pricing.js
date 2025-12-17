import { getFirestore } from './firebase-admin'

/**
 * AIPricingService
 * Manages AI chat pricing settings (admin-controlled)
 * Stores pricing in app_settings collection
 */
export class AIPricingService {
  /**
   * Get current pricing for AI questions
   * @returns {Promise<Object>} Pricing object with creditsPerQuestion
   */
  static async getPricing() {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const pricingRef = db.collection('app_settings').doc('ai_pricing')
      const doc = await pricingRef.get()

      if (!doc.exists) {
        // Return default pricing if not set
        const defaultPricing = {
          creditsPerQuestion: 10,
          updatedAt: new Date()
        }
        // Set default pricing
        await pricingRef.set(defaultPricing)
        return defaultPricing
      }

      const data = doc.data()
      return {
        creditsPerQuestion: data.creditsPerQuestion || 10,
        updatedAt: data.updatedAt?.toDate() || new Date()
      }
    } catch (error) {
      console.error('Error getting AI pricing:', error)
      // Return default on error
      return {
        creditsPerQuestion: 10,
        updatedAt: new Date()
      }
    }
  }

  /**
   * Set pricing for AI questions (admin only)
   * @param {number} creditsPerQuestion - Credits required per AI question
   * @returns {Promise<Object>} Updated pricing
   */
  static async setPricing(creditsPerQuestion) {
    try {
      if (typeof creditsPerQuestion !== 'number' || creditsPerQuestion < 1) {
        throw new Error('creditsPerQuestion must be a positive number')
      }

      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const pricingRef = db.collection('app_settings').doc('ai_pricing')
      const pricingData = {
        creditsPerQuestion: Math.round(creditsPerQuestion), // Ensure integer
        updatedAt: new Date()
      }

      await pricingRef.set(pricingData, { merge: true })

      return pricingData
    } catch (error) {
      console.error('Error setting AI pricing:', error)
      throw error
    }
  }
}
