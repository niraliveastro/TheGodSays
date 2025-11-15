'use client'

import React from 'react'
import Modal from './Modal'
import { Phone, Video, XCircle } from 'lucide-react'

export default function CallConnectingNotification({ isOpen, type = 'video', onTimeout, status = 'connecting' }) {
  const [timeoutCounter, setTimeoutCounter] = React.useState(60)
  const [isClosing, setIsClosing] = React.useState(false)
  const [message, setMessage] = React.useState({ title: '', body: '' })

  // Handle visibility states and animations
  React.useEffect(() => {
    if (!isOpen) {
      setTimeoutCounter(60)
      setIsClosing(false)
      return
    }

    // Update messages based on status
    switch (status) {
      case 'rejected':
        setMessage({
          title: 'Call Rejected',
          body: 'The astrologer has declined your call request'
        })
        // Start closing animation immediately for rejected state
        setIsClosing(true)
        // Do not call onTimeout here; let parent handle closing after delay
        break
      
      case 'connecting':
      default:
        setMessage({
          title: 'Connecting to Astrologer',
          body: `Please wait while we establish your ${type} call`
        })
        setIsClosing(false)
    }

    // Handle timeout counter only for connecting
    if (status === 'connecting') {
      const timer = setInterval(() => {
        setTimeoutCounter((prev) => {
          if (prev <= 1) {
            onTimeout?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isOpen, status, type, onTimeout])

  return (
    <Modal 
      open={isOpen}
      position="center"
    >
      <div className={`w-[320px] p-6 flex flex-col items-center justify-center space-y-6 transition-all duration-500 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Icon and Spinner */}
        <div className="relative">
          {status === 'rejected' ? (
            <div className="w-16 h-16 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center z-10">
                {type === 'video' ? (
                  <Video className="w-8 h-8 text-indigo-600" />
                ) : (
                  <Phone className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-pulse dark:border-indigo-800"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent dark:border-indigo-400"></div>
              </div>
            </>
          )}
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className={`text-xl font-semibold ${status === 'rejected' ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
            {message.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {message.body}
          </p>
          {status === 'connecting' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Timeout in {timeoutCounter}s
            </p>
          )}
        </div>

        {/* Loading Bar */}
        {status === 'connecting' && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(timeoutCounter / 60) * 100}%` }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}