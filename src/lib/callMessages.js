/**
 * Call Messages Service
 * 
 * Manages real-time chat messages during video/voice calls using Firestore.
 * Messages persist even if participants leave and rejoin.
 */

import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

const MESSAGES_COLLECTION = 'call_messages';

/**
 * Send a message in a call
 * @param {string} callId - The call ID
 * @param {string} senderId - User or Astrologer ID
 * @param {string} senderName - Sender's display name
 * @param {string} message - Message content
 * @param {boolean} isAstrologer - Whether sender is astrologer
 * @returns {Promise} - Promise resolving to the message document
 */
export async function sendMessage(callId, senderId, senderName, message, isAstrologer = false) {
  try {
    // Ensure we use the actual Firebase auth UID
    let actualSenderId = senderId;
    if (auth && auth.currentUser) {
      actualSenderId = auth.currentUser.uid;
    } else if (!actualSenderId) {
      throw new Error('User not authenticated');
    }

    const messageData = {
      callId,
      senderId: actualSenderId,
      senderName,
      message: message.trim(),
      isAstrologer,
      timestamp: serverTimestamp(),
      read: false, // Initially unread
    };

    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
    console.log('✅ Message sent to Firestore:', docRef.id);
    return { id: docRef.id, ...messageData };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

/**
 * Subscribe to messages for a specific call
 * @param {string} callId - The call ID
 * @param {function} onMessagesUpdate - Callback when messages change
 * @returns {function} - Unsubscribe function
 */
export function subscribeToMessages(callId, onMessagesUpdate) {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('callId', '==', callId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        });
      });

      console.log(`📨 Received ${messages.length} messages for call ${callId}`);
      onMessagesUpdate(messages);
    }, (error) => {
      console.error('❌ Error in message subscription:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to messages:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Mark messages as read for a specific user
 * @param {string} callId - The call ID
 * @param {string} userId - ID of user marking messages as read
 * @returns {Promise}
 */
export async function markMessagesAsRead(callId, userId) {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('callId', '==', callId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No unread messages to mark');
      return;
    }

    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    console.log(`✅ Marked ${snapshot.size} messages as read`);
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
  }
}

/**
 * Get unread message count for a specific user in a call
 * @param {string} callId - The call ID  
 * @param {string} userId - ID of user checking unread count
 * @param {function} onCountUpdate - Callback when count changes
 * @returns {function} - Unsubscribe function
 */
export function subscribeToUnreadCount(callId, userId, onCountUpdate) {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('callId', '==', callId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      console.log(`📬 Unread messages: ${count}`);
      onCountUpdate(count);
    }, (error) => {
      console.error('❌ Error in unread count subscription:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to unread count:', error);
    return () => {};
  }
}

/**
 * Clear all messages for a call (optional cleanup)
 * @param {string} callId - The call ID
 * @returns {Promise}
 */
export async function clearCallMessages(callId) {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('callId', '==', callId)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Cleared ${snapshot.size} messages for call ${callId}`);
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
  }
}
