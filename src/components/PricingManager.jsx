'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DollarSign, Settings, Save, Calculator } from 'lucide-react'

export default function PricingManager() {
  const { userProfile, getUserId } = useAuth()
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    pricingType: 'per_minute',
    basePrice: '',
    discountPercent: '',
    callDurationMins: ''
  })

  const astrologerId = getUserId()

  useEffect(() => {
    if (astrologerId && userProfile?.role === 'astrologer') {
      fetchPricing()
    }
  }, [astrologerId, userProfile])

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-pricing', astrologerId })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPricing(data.pricing)
          setFormData({
            pricingType: data.pricing.pricingType || 'per_minute',
            basePrice: data.pricing.basePrice || '',
            discountPercent: data.pricing.discountPercent || '',
            callDurationMins: data.pricing.callDurationMins || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching pricing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!formData.basePrice || formData.basePrice <= 0) {
      alert('Please enter a valid base price')
      return
    }

    setSaving(true)
    try {
      // Prepare the data with proper types
      const submitData = {
        action: 'set-pricing',
        astrologerId,
        pricingType: formData.pricingType,
        basePrice: parseFloat(formData.basePrice),
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : 0,
        callDurationMins: formData.pricingType === 'per_call' && formData.callDurationMins ?
          parseInt(formData.callDurationMins) : 30
      }

      console.log('Submitting pricing data:', submitData)

      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        if (data.success) {
          setPricing(data.pricing)
          alert('Pricing updated successfully!')
          // Refresh the form data with the saved pricing
          setFormData({
            pricingType: data.pricing.pricingType || 'per_minute',
            basePrice: data.pricing.basePrice || '',
            discountPercent: data.pricing.discountPercent || '',
            callDurationMins: data.pricing.callDurationMins || ''
          })
        } else {
          alert(`Failed to update pricing: ${data.error || 'Unknown error'}`)
        }
      } else {
        alert(`Failed to update pricing: ${data.error || 'Server error'}`)
      }
    } catch (error) {
      console.error('Error updating pricing:', error)
      alert(`An error occurred: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const calculatePreview = () => {
    if (!formData.basePrice) return null

    const basePrice = parseFloat(formData.basePrice)
    const discountPercent = parseFloat(formData.discountPercent) || 0
    const finalPrice = basePrice * (1 - discountPercent / 100)

    return {
      basePrice,
      discountPercent,
      finalPrice,
      monthly: formData.pricingType === 'per_minute' ? 'Varies' : `${Math.round(finalPrice * 30)}/month`
    }
  }

  const preview = calculatePreview()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (userProfile?.role !== 'astrologer') {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">This feature is only available for astrologers.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Current Pricing Display */}
      {pricing && (
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Current Pricing</h2>
              <p className="text-gray-600">Your current pricing configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Pricing Type</p>
              <p className="text-lg font-semibold capitalize">{pricing.pricingType.replace('_', ' ')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Base Price</p>
              <p className="text-lg font-semibold">₹{pricing.basePrice}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Final Price</p>
              <p className="text-lg font-semibold">₹{pricing.finalPrice}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pricing Configuration Form */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Update Pricing</h3>
        </div>

        <div className="space-y-4">
          {/* Pricing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pricing Type
            </label>
            <select
              value={formData.pricingType}
              onChange={(e) => handleInputChange('pricingType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="per_minute">Per Minute</option>
              <option value="per_call">Per Call</option>
            </select>
          </div>

          {/* Base Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Price (₹)
            </label>
            <input
              type="number"
              value={formData.basePrice}
              onChange={(e) => handleInputChange('basePrice', e.target.value)}
              placeholder="Enter base price"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          {/* Discount Percent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Percent (Optional)
            </label>
            <input
              type="number"
              value={formData.discountPercent}
              onChange={(e) => handleInputChange('discountPercent', e.target.value)}
              placeholder="Enter discount percentage"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          {/* Call Duration (only for per_call) */}
          {formData.pricingType === 'per_call' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Duration (Minutes)
              </label>
              <input
                type="number"
                value={formData.callDurationMins}
                onChange={(e) => handleInputChange('callDurationMins', e.target.value)}
                placeholder="Enter call duration in minutes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Price Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Base Price: </span>
                  <span className="font-semibold">₹{preview.basePrice}</span>
                </div>
                <div>
                  <span className="text-gray-600">Final Price: </span>
                  <span className="font-semibold">₹{preview.finalPrice.toFixed(2)}</span>
                </div>
                {preview.discountPercent > 0 && (
                  <div>
                    <span className="text-gray-600">Discount: </span>
                    <span className="font-semibold text-green-600">{preview.discountPercent}%</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Est. Monthly: </span>
                  <span className="font-semibold">{preview.monthly}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !formData.basePrice}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Pricing'}</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}