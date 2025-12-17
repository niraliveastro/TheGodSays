'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, DollarSign, AlertCircle, Lock } from 'lucide-react'

const ADMIN_PASSCODE = 'Spacenos.nxt@global'
const PASSCODE_STORAGE_KEY = 'tgs:admin_pricing_passcode'

export default function AdminPricingPage() {
  const router = useRouter()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newPrice, setNewPrice] = useState('')

  // Check if passcode is already verified in session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem(PASSCODE_STORAGE_KEY)
      if (verified === 'true') {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Fetch current pricing only after authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchPricing()
    }
  }, [isAuthenticated])

  const handlePasscodeSubmit = (e) => {
    e.preventDefault()
    setPasscodeError('')
    
    if (passcode === ADMIN_PASSCODE) {
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PASSCODE_STORAGE_KEY, 'true')
      }
      setPasscode('')
    } else {
      setPasscodeError('Incorrect passcode. Please try again.')
      setPasscode('')
    }
  }

  const fetchPricing = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/pricing')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pricing')
      }

      setPricing(data.pricing)
      setNewPrice(data.pricing.creditsPerQuestion.toString())
    } catch (err) {
      console.error('Error fetching pricing:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    const credits = parseFloat(newPrice)
    if (isNaN(credits) || credits < 1) {
      setError('Please enter a valid number (minimum 1)')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditsPerQuestion: Math.round(credits)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update pricing')
      }

      setPricing(data.pricing)
      setNewPrice(data.pricing.creditsPerQuestion.toString())
      setSuccess('Pricing updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving pricing:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Show passcode entry screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Admin Access</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Enter passcode to access pricing settings</p>
          
          {passcodeError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{passcodeError}</p>
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-2">
                Passcode
              </label>
              <input
                type="password"
                id="passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Enter passcode"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Lock className="w-5 h-5" />
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading pricing settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Chat Pricing</h1>
                <p className="text-sm text-gray-500">Set credits required per AI question</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="creditsPerQuestion" className="block text-sm font-medium text-gray-700 mb-2">
                  Credits Per Question
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="creditsPerQuestion"
                    min="1"
                    step="1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="10"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">credits</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Current setting: <span className="font-semibold">{pricing.creditsPerQuestion} credits</span> per AI question
                </p>
                {pricing.updatedAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    Last updated: {new Date(pricing.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving || newPrice === pricing.creditsPerQuestion.toString()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Pricing
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Changes to pricing apply globally to all users immediately. 
                Existing conversations are not affected.
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}
