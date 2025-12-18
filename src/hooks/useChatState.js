import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getGuestUsage, 
  incrementGuestUsage, 
  canGuestAskQuestion,
  getRemainingGuestQuestions 
} from '@/lib/guest-usage'

/**
 * Custom hook for managing chat state with credits and guest tracking
 * @param {string} chatType - 'prediction' or 'matchmaking'
 * @param {boolean} shouldReset - Flag to reset conversation (e.g., on new form submission)
 * @param {string} formDataHash - Hash of form data to identify unique form submissions
 */
export function useChatState(chatType, shouldReset = false, formDataHash = null) {
  const { user, getUserId } = useAuth()
  const userId = getUserId()
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10 })
  const [walletBalance, setWalletBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const resetTriggerRef = useRef(false)
  const previousFormDataHashRef = useRef(null)

  // Track if this is a guest user
  const isGuest = !userId

  // Guest usage tracking
  const guestUsage = isGuest ? getGuestUsage(chatType) : 0
  const canAsk = isGuest ? canGuestAskQuestion(chatType) : true
  const remainingGuestQuestions = isGuest ? getRemainingGuestQuestions(chatType) : null

  // Define loadConversation function before useEffects that use it
  const loadConversation = async (forceNew = false, hashToUse = formDataHash) => {
    try {
      setLoading(true)

      if (!userId || forceNew) {
        // Guest or force new conversation - start fresh
        setMessages([])
        setConversationId(null)
        setLoading(false)
        return
      }

      // If formDataHash is provided, only load conversation with matching hash
      // This ensures each unique form submission has its own conversation
      const url = `/api/conversations?userId=${userId}&chatType=${chatType}${hashToUse ? `&formDataHash=${hashToUse}` : ''}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.conversation && data.conversation.messages) {
        // Only load if formDataHash matches (if formDataHash is provided)
        // If formDataHash is null, load any conversation (backward compatibility)
        if (!hashToUse || data.conversation.formDataHash === hashToUse) {
          setMessages(data.conversation.messages)
          setConversationId(data.conversation.id)
        } else {
          // Form data changed, start fresh - don't load old conversation
          console.log('[useChatState] Form data hash mismatch, starting fresh conversation:', {
            expectedHash: hashToUse,
            conversationHash: data.conversation.formDataHash
          })
          setMessages([])
          setConversationId(null)
        }
      } else {
        // No conversation found for this formDataHash, start fresh
        setMessages([])
        setConversationId(null)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      setMessages([])
      setConversationId(null)
    } finally {
      setLoading(false)
    }
  }

  // Load conversation from Firestore on mount or when userId changes
  useEffect(() => {
    if (shouldReset && !resetTriggerRef.current) {
      // Reset conversation on new form submission
      resetTriggerRef.current = true
      setMessages([])
      setConversationId(null)
      loadConversation(true) // Force new conversation
    } else if (!shouldReset && resetTriggerRef.current) {
      // Reset the trigger when shouldReset becomes false
      resetTriggerRef.current = false
    }
  }, [shouldReset])
  
  // Detect formDataHash changes and reset conversation
  useEffect(() => {
    if (formDataHash && previousFormDataHashRef.current !== null && previousFormDataHashRef.current !== formDataHash) {
      // Form data hash changed, reset conversation
      console.log('[useChatState] Form data hash changed, resetting conversation:', {
        previousHash: previousFormDataHashRef.current,
        newHash: formDataHash
      })
      setMessages([])
      setConversationId(null)
      loadConversation(true, formDataHash) // Force new conversation with new hash
    }
    previousFormDataHashRef.current = formDataHash
  }, [formDataHash])

  // Load conversation and pricing
  useEffect(() => {
    loadConversation()
    loadPricing()
    if (userId) {
      loadWalletBalance()
    } else {
      setWalletBalance(null)
    }
  }, [userId, chatType, formDataHash])

  const loadPricing = async () => {
    try {
      const response = await fetch('/api/pricing/public')
      if (response.ok) {
        const data = await response.json()
        if (data.pricing) {
          setPricing(data.pricing)
          return
        }
      }
      // Fallback to default
      setPricing({ creditsPerQuestion: 10 })
    } catch (error) {
      console.error('Error loading pricing:', error)
      // Use default pricing on error
      setPricing({ creditsPerQuestion: 10 })
    }
  }

  const loadWalletBalance = async () => {
    try {
      const response = await fetch('/api/payments/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-balance', userId })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.wallet) {
          setWalletBalance(data.wallet.balance || 0)
        }
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error)
    }
  }

  // Save conversation to Firestore
  const saveConversation = async (updatedMessages) => {
    if (!userId) {
      // Guest users - save to sessionStorage as backup (with formDataHash if provided)
      try {
        const key = `tgs:guest_chat:${chatType}${formDataHash ? `:${formDataHash}` : ''}`
        sessionStorage.setItem(key, JSON.stringify(updatedMessages))
      } catch (error) {
        console.error('Error saving guest chat to sessionStorage:', error)
      }
      return
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatType,
          messages: updatedMessages,
          formDataHash: formDataHash || null
        })
      })

      const data = await response.json()
      if (data.conversation) {
        setConversationId(data.conversation.id)
      }
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  // Check if user can ask a question
  const canSendMessage = () => {
    if (isGuest) {
      return canAsk
    } else {
      // Check wallet balance
      return walletBalance !== null && walletBalance >= pricing.creditsPerQuestion
    }
  }

  // Get error message if cannot send
  const getBlockedReason = () => {
    if (isGuest) {
      if (!canAsk) {
        return {
          type: 'guest_limit',
          message: "You've used your 2 free questions. Please log in to continue this conversation."
        }
      }
    } else {
      if (walletBalance === null) {
        return { type: 'loading', message: 'Loading wallet balance...' }
      }
      if (walletBalance < pricing.creditsPerQuestion) {
        return {
          type: 'insufficient_credits',
          message: `Insufficient credits. Required: ${pricing.creditsPerQuestion}, Available: ${walletBalance}`,
          creditsRequired: pricing.creditsPerQuestion,
          availableCredits: walletBalance
        }
      }
    }
    return null
  }

  return {
    messages,
    setMessages,
    conversationId,
    pricing,
    walletBalance,
    loading,
    isGuest,
    guestUsage,
    remainingGuestQuestions,
    canAsk,
    canSendMessage,
    getBlockedReason,
    saveConversation,
    loadWalletBalance,
    refreshConversation: () => loadConversation()
  }
}
