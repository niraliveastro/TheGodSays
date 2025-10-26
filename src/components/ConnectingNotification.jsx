'use client'

import React from 'react'
import Modal from './Modal'

export default function ConnectingNotification({ isOpen, onClose, type = 'video' }) {
  return (
    <Modal 
      open={isOpen} 
      onClose={onClose}
      position="center"
    >
      <div className="w-[300px] p-6 flex flex-col items-center justify-center space-y-4">
        {/* Loading Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-200 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 rounded-full animate-spin border-t-transparent"></div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Connecting to the astrologer...
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we establish your {type} call
          </p>
        </div>
      </div>
    </Modal>
  )
}