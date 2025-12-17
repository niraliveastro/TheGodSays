import { getFirestore } from './firebase-admin'
import { WalletService } from './wallet'

/**
 * ConversationService
 * Manages AI chat conversations in Firestore
 * Supports two chat types: 'prediction' and 'matchmaking'
 */
export class ConversationService {
  /**
   * Get or create active conversation for a user and chatType
   * @param {string} userId - User ID (or null for guest)
   * @param {string} chatType - 'prediction' or 'matchmaking'
   * @returns {Promise<Object>} Conversation document
   */
  static async getActiveConversation(userId, chatType) {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      if (!userId) {
        // Guest users don't have persistent conversations
        return null
      }

      // Find active conversation for this user and chatType
      const conversationsRef = db.collection('conversations')
      const snapshot = await conversationsRef
        .where('userId', '==', userId)
        .where('chatType', '==', chatType)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get()

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return {
          id: doc.id,
          ...doc.data()
        }
      }

      // No active conversation found, return null
      return null
    } catch (error) {
      console.error('Error getting active conversation:', error)
      throw error
    }
  }

  /**
   * Create a new conversation
   * @param {string} userId - User ID
   * @param {string} chatType - 'prediction' or 'matchmaking'
   * @param {Array} initialMessages - Initial messages array
   * @returns {Promise<Object>} Created conversation
   */
  static async createConversation(userId, chatType, initialMessages = []) {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      // Deactivate any existing active conversations for this user and chatType
      await this.deactivateAllConversations(userId, chatType)

      const conversationRef = db.collection('conversations').doc()
      const now = new Date()

      const conversationData = {
        userId,
        chatType,
        messages: initialMessages,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      await conversationRef.set(conversationData)

      return {
        id: conversationRef.id,
        ...conversationData
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  /**
   * Update conversation with new messages
   * @param {string} conversationId - Conversation document ID
   * @param {Array} messages - Updated messages array
   * @returns {Promise<void>}
   */
  static async updateConversation(conversationId, messages) {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const conversationRef = db.collection('conversations').doc(conversationId)
      await conversationRef.update({
        messages,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating conversation:', error)
      throw error
    }
  }

  /**
   * Deactivate all active conversations for a user and chatType
   * @param {string} userId - User ID
   * @param {string} chatType - 'prediction' or 'matchmaking'
   * @returns {Promise<void>}
   */
  static async deactivateAllConversations(userId, chatType) {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const conversationsRef = db.collection('conversations')
      const snapshot = await conversationsRef
        .where('userId', '==', userId)
        .where('chatType', '==', chatType)
        .where('isActive', '==', true)
        .get()

      const batch = db.batch()
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false })
      })

      if (snapshot.docs.length > 0) {
        await batch.commit()
      }
    } catch (error) {
      console.error('Error deactivating conversations:', error)
      throw error
    }
  }

  /**
   * Migrate guest conversation to user account
   * Merges guest messages into user's active conversation or creates new one
   * @param {string} userId - User ID (logged in user)
   * @param {string} chatType - 'prediction' or 'matchmaking'
   * @param {Array} guestMessages - Messages from guest session
   * @returns {Promise<Object>} Updated or created conversation
   */
  static async migrateGuestConversation(userId, chatType, guestMessages = []) {
    try {
      if (!guestMessages || guestMessages.length === 0) {
        // No guest messages to migrate
        return await this.getActiveConversation(userId, chatType)
      }

      const existingConversation = await this.getActiveConversation(userId, chatType)

      if (existingConversation) {
        // Merge guest messages into existing conversation
        // Only add messages that don't already exist (avoid duplicates)
        const existingMessageTexts = new Set(
          existingConversation.messages.map(msg => 
            `${msg.text || msg.content}-${msg.isUser || msg.role === 'user'}`
          )
        )

        const newMessages = guestMessages.filter(msg => {
          const msgKey = `${msg.text || msg.content}-${msg.isUser || msg.role === 'user'}`
          return !existingMessageTexts.has(msgKey)
        })

        if (newMessages.length > 0) {
          const mergedMessages = [...existingConversation.messages, ...newMessages]
          await this.updateConversation(existingConversation.id, mergedMessages)
          return {
            ...existingConversation,
            messages: mergedMessages
          }
        }

        return existingConversation
      } else {
        // Create new conversation with guest messages
        return await this.createConversation(userId, chatType, guestMessages)
      }
    } catch (error) {
      console.error('Error migrating guest conversation:', error)
      throw error
    }
  }

  /**
   * Get conversation by ID
   * @param {string} conversationId - Conversation document ID
   * @returns {Promise<Object|null>} Conversation or null
   */
  static async getConversationById(conversationId) {
    try {
      const db = getFirestore()
      if (!db) {
        throw new Error('Firestore not initialized')
      }

      const conversationRef = db.collection('conversations').doc(conversationId)
      const doc = await conversationRef.get()

      if (!doc.exists) {
        return null
      }

      return {
        id: doc.id,
        ...doc.data()
      }
    } catch (error) {
      console.error('Error getting conversation by ID:', error)
      throw error
    }
  }
}
