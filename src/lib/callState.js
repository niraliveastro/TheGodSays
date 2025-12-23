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

// Get Firestore instance (server-side)
const getDb = () => {
  try {
    return getFirestore()
  } catch (error) {
    console.error('Failed to get Firestore instance:', error)
    throw new Error('Database connection failed')
  }
}

/**
 * Professional Call State Management Service
 * Handles call lifecycle, connection tracking, and duration synchronization
 */
export class CallStateService {
  /**
   * Mark call as connected - both parties are in the room
   * This is when billing should actually start
   */
  static async markCallConnected(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()

      if (!callDoc.exists) {
        throw new Error('Call not found')
      }

      const callData = callDoc.data()
      
      // Only mark as connected if status is 'active' and not already connected
      if (callData.status !== 'active') {
        throw new Error(`Cannot mark call as connected. Current status: ${callData.status}`)
      }

      // If already connected, return existing connectedAt
      if (callData.connectedAt) {
        return {
          success: true,
          connectedAt: callData.connectedAt,
          alreadyConnected: true
        }
      }

      // Mark as connected with server timestamp
      const connectedAt = admin.firestore.FieldValue.serverTimestamp()
      await callRef.update({
        connectedAt,
        connectionStatus: 'connected',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      console.log(`✅ Call ${callId} marked as connected at server time`)

      return {
        success: true,
        connectedAt: new Date().toISOString(),
        alreadyConnected: false
      }
    } catch (error) {
      console.error('Error marking call as connected:', error)
      throw new Error(`Failed to mark call as connected: ${error.message}`)
    }
  }

  /**
   * Get current call duration in seconds (server-side calculation)
   * This ensures both parties see the same duration
   */
  static async getCallDuration(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()

      if (!callDoc.exists) {
        throw new Error('Call not found')
      }

      const callData = callDoc.data()
      
      // If call is not connected yet, duration is 0
      if (!callData.connectedAt) {
        return {
          durationSeconds: 0,
          durationMinutes: 0,
          isConnected: false,
          connectedAt: null
        }
      }

      // Convert Firestore timestamp to Date
      let connectedAt
      if (callData.connectedAt && callData.connectedAt.toDate) {
        connectedAt = callData.connectedAt.toDate()
      } else if (callData.connectedAt) {
        connectedAt = new Date(callData.connectedAt)
      } else {
        return {
          durationSeconds: 0,
          durationMinutes: 0,
          isConnected: false,
          connectedAt: null
        }
      }

      // Calculate duration from connectedAt to now (or endTime if completed)
      const now = callData.endTime 
        ? (callData.endTime.toDate ? callData.endTime.toDate() : new Date(callData.endTime))
        : new Date()
      
      const durationMs = Math.max(0, now.getTime() - connectedAt.getTime())
      const durationSeconds = Math.floor(durationMs / 1000)
      const durationMinutes = Math.ceil(durationSeconds / 60)

      return {
        durationSeconds,
        durationMinutes,
        isConnected: callData.status === 'active' && !!callData.connectedAt,
        connectedAt: connectedAt.toISOString(),
        status: callData.status
      }
    } catch (error) {
      console.error('Error getting call duration:', error)
      throw new Error(`Failed to get call duration: ${error.message}`)
    }
  }

  /**
   * Complete call with server-calculated duration
   */
  static async completeCall(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()

      if (!callDoc.exists) {
        throw new Error('Call not found')
      }

      const callData = callDoc.data()
      
      if (callData.status === 'completed') {
        // Already completed, return existing data
        const duration = await this.getCallDuration(callId)
        return {
          success: true,
          alreadyCompleted: true,
          durationSeconds: duration.durationSeconds,
          durationMinutes: duration.durationMinutes
        }
      }

      // Get final duration before marking as completed
      const duration = await this.getCallDuration(callId)
      
      // Mark as completed with server timestamp
      await callRef.update({
        status: 'completed',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        durationSeconds: duration.durationSeconds,
        durationMinutes: duration.durationMinutes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      console.log(`✅ Call ${callId} completed with duration: ${duration.durationSeconds}s (${duration.durationMinutes} min)`)

      return {
        success: true,
        durationSeconds: duration.durationSeconds,
        durationMinutes: duration.durationMinutes,
        alreadyCompleted: false
      }
    } catch (error) {
      console.error('Error completing call:', error)
      throw new Error(`Failed to complete call: ${error.message}`)
    }
  }

  /**
   * Check if both parties are connected to the call
   */
  static async checkConnectionStatus(callId) {
    try {
      const db = getDb()
      const callRef = db.collection('calls').doc(callId)
      const callDoc = await callRef.get()

      if (!callDoc.exists) {
        return { isConnected: false, error: 'Call not found' }
      }

      const callData = callDoc.data()
      
      return {
        isConnected: callData.status === 'active' && !!callData.connectedAt,
        status: callData.status,
        connectedAt: callData.connectedAt 
          ? (callData.connectedAt.toDate ? callData.connectedAt.toDate().toISOString() : callData.connectedAt)
          : null,
        hasConnectedAt: !!callData.connectedAt
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      return { isConnected: false, error: error.message }
    }
  }
}

