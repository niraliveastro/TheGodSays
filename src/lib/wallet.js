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

export class WalletService {
  /**
    * Get user's wallet balance and transaction history
    */
   static async getWallet(userId) {
     try {
       const db = getDb()
       const walletRef = db.collection('wallets').doc(userId)
       const walletDoc = await walletRef.get()

       if (!walletDoc.exists) {
         // Create wallet with zero balance if it doesn't exist
        await this.createWallet(userId)
         return { balance: 0, transactions: [] }
       }

       const data = walletDoc.data()
       const transactions = data.transactions || []

       // Calculate balance from transactions
      const calculatedBalance = this.calculateBalanceFromTransactions(transactions)

       return {
         balance: calculatedBalance,
         transactions
       }
     } catch (error) {
       console.error('Error getting wallet:', error)
       throw new Error('Failed to fetch wallet')
     }
   }

  /**
    * Calculate balance from transaction history
    */
   static calculateBalanceFromTransactions(transactions) {
      let balance = 0
      if (!transactions || !Array.isArray(transactions)) {
        return balance
      }

      transactions.forEach(transaction => {
        if (transaction.status === 'completed') {
          switch (transaction.type) {
            case 'credit':
              balance += transaction.amount
              break
            case 'debit':
              balance -= transaction.amount
              break
            case 'hold':
              // Completed hold transactions should be deducted as they represent finalized charges
              balance -= transaction.amount
              break
            default:
              break
          }
        } else if (transaction.status === 'pending' && transaction.type === 'hold') {
          // Pending hold transactions should be deducted from available balance
          // as they represent reserved funds
          balance -= transaction.amount
        }
      })

      return Math.round(balance * 100) / 100 // Round to 2 decimal places
    }

  /**
   * Create a new wallet for user
   */
  static async createWallet(userId) {
    try {
      const db = getDb()
      const walletRef = db.collection('wallets').doc(userId)
      await walletRef.set({
        userId,
        balance: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return { balance: 0, transactions: [] }
    } catch (error) {
      console.error('Error creating wallet:', error)
      throw new Error('Failed to create wallet')
    }
  }

  /**
   * Add money to wallet
   */
  static async addMoney(userId, amount, transactionId, description = 'Wallet recharge') {
    try {
      const db = getDb()
      const walletRef = db.collection('wallets').doc(userId)

      const transaction = {
        id: transactionId,
        type: 'credit',
        amount,
        description,
        timestamp: new Date(),
        status: 'completed'
      }

      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(amount),
        transactions: admin.firestore.FieldValue.arrayUnion(transaction),
        updatedAt: new Date()
      })

      return { success: true, transaction }
    } catch (error) {
      console.error('Error adding money to wallet:', error)
      throw new Error('Failed to add money to wallet')
    }
  }

  /**
   * Deduct money from wallet
   */
  static async deductMoney(userId, amount, transactionId, description = 'Call charges') {
    try {
      const db = getDb()
      const walletRef = db.collection('wallets').doc(userId)
      const wallet = await this.getWallet(userId)

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance')
      }

      const transaction = {
        id: transactionId,
        type: 'debit',
        amount,
        description,
        timestamp: new Date(),
        status: 'completed'
      }

      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(-amount),
        transactions: admin.firestore.FieldValue.arrayUnion(transaction),
        updatedAt: new Date()
      })

      return { success: true, transaction }
    } catch (error) {
      console.error('Error deducting money from wallet:', error)
      if (error.message === 'Insufficient balance') {
        throw error
      }
      throw new Error('Failed to deduct money from wallet')
    }
  }

  /**
   * Hold money for a call (reserve amount)
   */
  static async holdMoney(userId, amount, callId) {
    try {
      const db = getDb()
      const walletRef = db.collection('wallets').doc(userId)
      const wallet = await this.getWallet(userId)

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance')
      }

      const transaction = {
        id: `hold-${callId}`,
        type: 'hold',
        amount,
        description: `Call charges held for call ${callId}`,
        timestamp: new Date(),
        status: 'pending',
        callId
      }

      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(-amount),
        transactions: admin.firestore.FieldValue.arrayUnion(transaction),
        updatedAt: new Date()
      })

      return { success: true, transaction }
    } catch (error) {
      console.error('Error holding money:', error)
      if (error.message === 'Insufficient balance') {
        throw error
      }
      throw new Error('Failed to hold money')
    }
  }

  /**
    * Release held money (return to balance) - Updated for immediate refund system
    */
   static async releaseHold(userId, callId) {
     try {
       const db = getDb()
       const walletRef = db.collection('wallets').doc(userId)
       const wallet = await this.getWallet(userId)

       // Find the hold transaction
       const holdTransaction = wallet.transactions.find(t => t.callId === callId && t.type === 'hold')

      if (!holdTransaction) {
         console.warn(`No hold found for call ${callId}, skipping release`)
         return { success: true, transaction: null }
       }

       const transaction = {
         id: `release-${callId}`,
         type: 'credit',
         amount: holdTransaction.amount,
         description: `Released hold for call ${callId}`,
         timestamp: new Date(),
         status: 'completed',
         callId
       }

       await walletRef.update({
         balance: admin.firestore.FieldValue.increment(holdTransaction.amount),
         transactions: admin.firestore.FieldValue.arrayUnion(transaction),
         updatedAt: new Date()
       })

       return { success: true, transaction }
     } catch (error) {
       console.error('Error releasing hold:', error)
       throw new Error('Failed to release hold')
     }
   }

  /**
   * Confirm held money deduction (finalize the charge)
   */
  static async confirmHold(userId, callId, finalAmount, description) {
    try {
      const db = getDb()
      const walletRef = db.collection('wallets').doc(userId)
      const wallet = await this.getWallet(userId)

      // Find the hold transaction
      const holdTransaction = wallet.transactions.find(t => t.callId === callId && t.type === 'hold')

      if (!holdTransaction) {
        throw new Error('No hold found for this call')
      }

      const difference = finalAmount - holdTransaction.amount

      const transaction = {
        id: `confirm-${callId}`,
        type: difference >= 0 ? 'debit' : 'credit',
        amount: Math.abs(difference),
        description: difference >= 0 ? `Additional charge for ${description}` : `Refund for ${description}`,
        timestamp: new Date(),
        status: 'completed',
        callId
      }

      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(-difference),
        transactions: admin.firestore.FieldValue.arrayUnion(transaction),
        updatedAt: new Date()
      })

      return { success: true, transaction }
    } catch (error) {
      console.error('Error confirming hold:', error)
      throw new Error('Failed to confirm hold')
    }
  }

  /**
    * Get wallet transaction history
    */
   static async getTransactionHistory(userId, limitCount = 20) {
     try {
       const wallet = await this.getWallet(userId)
       return wallet.transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
         .slice(0, limitCount)
     } catch (error) {
       console.error('Error getting transaction history:', error)
       throw new Error('Failed to fetch transaction history')
     }
   }

  /**
   * Debit wallet for AI chat (simplified wrapper)
   * @param {string} userId - User ID
   * @param {number} amount - Amount to deduct
   * @param {Object} metadata - Optional metadata (description, metadata object)
   * @returns {Promise<Object>} Transaction result
   */
  static async debitWallet(userId, amount, metadata = {}) {
    try {
      const transactionId = `ai-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const description = metadata.description || 'AI chat question'
      
      return await this.deductMoney(userId, amount, transactionId, description)
    } catch (error) {
      console.error('Error debiting wallet:', error)
      throw error
    }
  }
}