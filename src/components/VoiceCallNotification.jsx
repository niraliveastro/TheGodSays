'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Phone, PhoneOff, X, Volume2 } from 'lucide-react'

export default function VoiceCallNotification({ call, onAccept, onReject, onClose }) {
  const [timeLeft, setTimeLeft] = useState(30) // 30 seconds to respond
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoReject()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleAutoReject = () => {
    setIsVisible(false)
    onReject(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  const handleAccept = () => {
    setIsVisible(false)
    onAccept(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  const handleReject = () => {
    setIsVisible(false)
    onReject(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 bg-white shadow-2xl border-2 border-green-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Voice Call</h3>
                <p className="text-sm text-gray-600">From User {call.userId}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReject}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Call Type Indicator */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 text-green-700">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">Voice Consultation</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Audio call without video</p>
          </div>

          {/* Timer */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Auto-reject in:</span>
              <span className="text-lg font-semibold text-red-600">{timeLeft}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-4 h-4 mr-2" />
              Accept
            </Button>
          </div>

          {/* Call Info */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              Voice call started at {new Date(call.createdAt).toISOString()}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}