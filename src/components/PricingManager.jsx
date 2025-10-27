'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign, Settings, Save, Calculator, Loader2 } from 'lucide-react'

export default function PricingManager() {
  const { userProfile, getUserId } = useAuth()
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    pricingType: 'per_minute',
    basePrice: '',
    discountPercent: '',
    callDurationMins: '',
  })

  const astrologerId = getUserId()

  /* ------------------------------------------------------------------ */
  /*  FETCH CURRENT PRICING                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (astrologerId && userProfile?.role === 'astrologer') {
      fetchPricing()
    }
  }, [astrologerId, userProfile])

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-pricing', astrologerId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setPricing(data.pricing)
          setFormData({
            pricingType: data.pricing.pricingType || 'per_minute',
            basePrice: data.pricing.basePrice?.toString() || '',
            discountPercent: data.pricing.discountPercent?.toString() || '',
            callDurationMins: data.pricing.callDurationMins?.toString() || '',
          })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  FORM HANDLERS – FIXED: NO TYPE ANNOTATIONS                       */
  /* ------------------------------------------------------------------ */
  const handleInput = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.basePrice || Number(formData.basePrice) <= 0) {
      alert('Please enter a valid base price')
      return
    }

    setSaving(true)
    try {
      const payload = {
        action: 'set-pricing',
        astrologerId,
        pricingType: formData.pricingType,
        basePrice: parseFloat(formData.basePrice),
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : 0,
        callDurationMins:
          formData.pricingType === 'per_call' && formData.callDurationMins
            ? parseInt(formData.callDurationMins, 10)
            : 30,
      }

      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (res.ok && json.success) {
        setPricing(json.pricing)
        setFormData({
          pricingType: json.pricing.pricingType || 'per_minute',
          basePrice: json.pricing.basePrice?.toString() || '',
          discountPercent: json.pricing.discountPercent?.toString() || '',
          callDurationMins: json.pricing.callDurationMins?.toString() || '',
        })
        alert('Pricing updated successfully!')
      } else {
        alert(`Failed: ${json.error ?? 'unknown error'}`)
      }
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  PREVIEW CALCULATION                                              */
  /* ------------------------------------------------------------------ */
  const preview = (() => {
    if (!formData.basePrice) return null
    const base = parseFloat(formData.basePrice)
    const disc = parseFloat(formData.discountPercent) || 0
    const final = base * (1 - disc / 100)
    return {
      base,
      disc,
      final,
      monthly:
        formData.pricingType === 'per_minute'
          ? 'Varies'
          : `₹${Math.round(final * 30)} / month`,
    }
  })()

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                           */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div
        style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            style={{
              width: '2rem',
              height: '2rem',
              color: 'var(--color-gold)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ marginTop: '0.5rem', color: 'var(--color-gray-600)' }}>
            Loading pricing…
          </p>
        </div>
      </div>
    )
  }

  if (userProfile?.role !== 'astrologer') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--color-gray-500)' }}>
          This feature is only available for astrologers.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto' }}>

      {/* ---------- CURRENT PRICING ---------- */}
      {pricing && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: '#ecfccb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign style={{ width: '1.75rem', height: '1.75rem', color: '#65a30d' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                Current Pricing
              </h2>
              <p style={{ color: 'var(--color-gray-600)' }}>Your active configuration</p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            {[
              { label: 'Pricing Type', value: pricing.pricingType.replace('_', ' ') },
              { label: 'Base Price', value: `₹${pricing.basePrice}` },
              { label: 'Final Price', value: `₹${pricing.finalPrice}` },
            ].map((i) => (
              <div
                key={i.label}
                style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'var(--color-gray-50)',
                  borderRadius: '0.5rem',
                }}
              >
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>{i.label}</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{i.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- UPDATE FORM ---------- */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Settings style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-gray-600)' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Update Pricing</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Pricing Type */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
              Pricing Type
            </label>
            <select
              value={formData.pricingType}
              onChange={(e) => handleInput('pricingType', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
                fontSize: '1rem',
              }}
            >
              <option value="per_minute">Per Minute</option>
              <option value="per_call">Per Call</option>
            </select>
          </div>

          {/* Base Price */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
              Base Price (₹)
            </label>
            <input
              type="number"
              value={formData.basePrice}
              onChange={(e) => handleInput('basePrice', e.target.value)}
              placeholder="e.g. 5.00"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Discount % */}
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
              Discount Percent (optional)
            </label>
            <input
              type="number"
              value={formData.discountPercent}
              onChange={(e) => handleInput('discountPercent', e.target.value)}
              placeholder="e.g. 10"
              min="0"
              max="100"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Call Duration – only for per_call */}
          {formData.pricingType === 'per_call' && (
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                Call Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.callDurationMins}
                onChange={(e) => handleInput('callDurationMins', e.target.value)}
                placeholder="e.g. 30"
                min="1"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--color-gray-300)',
                  borderRadius: '0.5rem',
                  background: 'var(--color-white)',
                  fontSize: '1rem',
                }}
              />
            </div>
          )}

          {/* ---------- PREVIEW ---------- */}
          {preview && (
            <div
              style={{
                padding: '1rem',
                background: '#dbeafe',
                borderRadius: '0.5rem',
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                <span style={{ fontWeight: 600, color: '#1e40af' }}>Price Preview</span>
              </div>

              <div>
                <span style={{ color: 'var(--color-gray-600)' }}>Base:</span>{' '}
                <strong>₹{preview.base}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-gray-600)' }}>Final:</span>{' '}
                <strong>₹{preview.final.toFixed(2)}</strong>
              </div>
              {preview.disc > 0 && (
                <div>
                  <span style={{ color: 'var(--color-gray-600)' }}>Discount:</span>{' '}
                  <strong style={{ color: '#16a34a' }}>{preview.disc}%</strong>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--color-gray-600)' }}>Est. Monthly:</span>{' '}
                <strong>{preview.monthly}</strong>
              </div>
            </div>
          )}

          {/* ---------- SAVE BUTTON ---------- */}
          <button
            onClick={handleSave}
            disabled={saving || !formData.basePrice}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              marginTop: '0.5rem',
            }}
          >
            {saving ? (
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Save style={{ width: '1rem', height: '1rem' }} />
            )}
            <span>{saving ? 'Saving…' : 'Save Pricing'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}