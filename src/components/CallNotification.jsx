'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Phone, PhoneOff, X } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function CallNotification({ call, onAccept, onReject, onClose, userName: propUserName }) {
  const [timeLeft, setTimeLeft] = useState(30) // 30 seconds to respond
  const [isVisible, setIsVisible] = useState(true)
  const [userName, setUserName] = useState(propUserName || null)

  // Update userName when prop changes (from GlobalCallNotification)
  useEffect(() => {
    if (propUserName && propUserName !== userName) {
      console.log(`CallNotification: Received name from prop: ${propUserName}`);
      setUserName(propUserName);
    }
  }, [propUserName]);

  // Fetch user name if not provided - with retry logic
  useEffect(() => {
    if (userName || !call?.userId) {
      if (userName) {
        console.log(`CallNotification: Name already set: ${userName}`);
      }
      return;
    }

    console.log(`CallNotification: Fetching name for userId: ${call.userId}`);
    let retryCount = 0;
    const maxRetries = 3;

    const fetchUserName = async () => {
      try {
        const collectionNames = ['users', 'user', 'user_profiles', 'profiles'];
        let foundName = null;

        for (const collectionName of collectionNames) {
          try {
            console.log(`  Checking ${collectionName} for ${call.userId}`);
            const userDoc = await getDoc(doc(db, collectionName, call.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log(`  ✅ Found user in ${collectionName}:`, userData);
              
              foundName = userData.name || 
                         userData.displayName || 
                         userData.fullName || 
                         userData.firstName ||
                         userData.username ||
                         (userData.email ? userData.email.split('@')[0] : null);
              
              if (foundName) {
                console.log(`✅ CallNotification: Found name in ${collectionName}: ${foundName}`);
                setUserName(foundName);
                return; // Success, exit
              } else {
                console.warn(`  ⚠️ User found but no name field. Available fields:`, Object.keys(userData));
              }
            } else {
              console.log(`  ❌ User not found in ${collectionName}`);
            }
          } catch (e) {
            console.warn(`  ⚠️ Error checking ${collectionName}:`, e.message);
            // Continue to next collection
          }
        }

        // If not found and retries left, try again after a delay
        if (!foundName && retryCount < maxRetries) {
          retryCount++;
          console.log(`  🔄 Retrying name fetch (attempt ${retryCount}/${maxRetries})...`);
          setTimeout(fetchUserName, 500 * retryCount); // Exponential backoff
        } else if (!foundName) {
          console.warn(`  ❌ Could not fetch user name after ${maxRetries} retries for ${call.userId}`);
        }
      } catch (error) {
        console.error('❌ Error fetching user name:', error);
      }
    };

    // Initial fetch
    fetchUserName();
  }, [call?.userId, userName]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]" style={{ zIndex: 99999 }}>
      <Card className="card max-w-md w-full mx-4 my-6 bg-white shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex p-8 items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Incoming Call</h3>
                <p className="text-sm text-gray-600">
                  {userName && userName !== `User ${call.userId?.substring(0, 8)}` ? (
                    <>From {userName}</>
                  ) : call.userId ? (
                    <>From User {call.userId.substring(0, 8)}</>
                  ) : (
                    <>From Unknown User</>
                  )}
                </p>
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
              Call started at {new Date(call.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}