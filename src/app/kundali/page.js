'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Globe, User, MapPin, Languages, ShieldCheck } from 'lucide-react'
import astrologyAPI from '@/lib/api'

// Helper lists for time inputs
const hours12 = Array.from({ length: 12 }, (_, i) => i + 1)
const minutes = Array.from({ length: 60 }, (_, i) => i)

export default function KundaliPage() {
  const [form, setForm] = useState({
    name: '',
    gender: 'male',
    birthDate: new Date().toISOString().split('T')[0],
    hour: 10,
    minute: 30,
    ampm: 'AM',
    place: '',
    language: 'English',
    latitude: null,
    longitude: null
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const suggestTimeout = useRef(null)
  const [svgOutput, setSvgOutput] = useState('')
  const [genError, setGenError] = useState('')

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.place.trim()) e.place = 'Please enter place of birth'
    if (!form.birthDate) e.birthDate = 'Please select your birth date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Debounced location suggestions using OpenStreetMap Nominatim
  useEffect(() => {
    const q = form.place.trim()
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current)
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    suggestTimeout.current = setTimeout(async () => {
      try {
        setLoadingSuggest(true)
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          }
        })
        const data = await res.json()
        setSuggestions(data || [])
      } catch (err) {
        setSuggestions([])
      } finally {
        setLoadingSuggest(false)
      }
    }, 350)
    return () => suggestTimeout.current && clearTimeout(suggestTimeout.current)
  }, [form.place])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      setGenError('')
      // Build ISO datetime based on 12h inputs
      const hr24 = (Number(form.hour) % 12) + (form.ampm === 'PM' ? 12 : 0)
      const [y, m, d] = (form.birthDate || '').split('-').map(Number)
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hr24, Number(form.minute), 0))

      // Payload shape ready for API consumption when you wire it
      const payload = {
        name: form.name.trim(),
        gender: form.gender,
        year: dt.getUTCFullYear(),
        month: dt.getUTCMonth() + 1,
        date: dt.getUTCDate(),
        hours: dt.getUTCHours(),
        minutes: dt.getUTCMinutes(),
        seconds: 0,
        place: form.place.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        timezone: new Date().getTimezoneOffset() / -60,
        config: {
          observation_point: 'topocentric',
          ayanamsha: 'lahiri',
          language: (form.language || 'English').toLowerCase().startsWith('hi') ? 'te' : 'en'
        },
        chart_config: {
          font_family: 'Mallanna',
          hide_time_location: 'False',
          hide_outer_planets: 'False',
          chart_style: 'north_india',
          native_name: form.name || 'Native',
          native_name_font_size: '20px',
          native_details_font_size: '15px',
          chart_border_width: 1,
          planet_name_font_size: '20px',
          chart_heading_font_size: '25px',
          chart_background_color: '#FEE1C7',
          chart_border_color: '#B5A886',
          native_details_font_color: '#000',
          native_name_font_color: '#231F20',
          planet_name_font_color: '#BC412B',
          chart_heading_font_color: '#2D3319'
        }
      }

      // Call API to generate SVG
      const res = await astrologyAPI.getSingleCalculation('horoscope-chart-svg-code', payload)
      if (res && res.output) {
        setSvgOutput(res.output)
      } else {
        setGenError('Unexpected response from API')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-indigo-50/40">
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-sm flex flex-col items-center lg:min-h-[calc(100vh-4rem)] lg:justify-center">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Get Your Janam Kundali</h1>
          <p className="text-gray-600 mt-1 text-sm">Enter your birth details to generate a personalized chart.</p>
        </div>

        <Card className="mx-auto max-w-sm border border-gray-200 shadow-xl ring-1 ring-black/5 rounded-2xl overflow-hidden backdrop-blur bg-white/90">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
            <CardTitle className="flex items-center gap-2 justify-center text-amber-900 text-base font-semibold">
              <ShieldCheck className="w-5 h-5" /> Enter Birth Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Enter your name"
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="gender" checked={form.gender==='male'} onChange={() => setField('gender','male')} />
                    <span>Male</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="gender" checked={form.gender==='female'} onChange={() => setField('gender','female')} />
                    <span>Female</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="gender" checked={form.gender==='other'} onChange={() => setField('gender','other')} />
                    <span>Other</span>
                  </label>
                </div>
              </div>

              {/* Birth Date (Calendar) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setField('birthDate', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {errors.birthDate && <p className="mt-1 text-sm text-red-600">{errors.birthDate}</p>}
              </div>

              {/* Birth Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Time</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  <select value={form.hour} onChange={(e)=>setField('hour', Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {hours12.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                  </select>
                  <select value={form.minute} onChange={(e)=>setField('minute', Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {minutes.map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                  </select>
                  <select value={form.ampm} onChange={(e)=>setField('ampm', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 col-span-1 sm:col-span-1">
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                  <div className="hidden sm:flex items-center text-gray-500 gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">12-hour format</span>
                  </div>
                </div>
              </div>

              {/* Place with Auto-complete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.place}
                    onChange={(e) => {
                      setField('place', e.target.value)
                      // reset lat/lon if user edits
                      setField('latitude', null)
                      setField('longitude', null)
                    }}
                    placeholder="Enter place name"
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.place ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                </div>
                {errors.place && <p className="mt-1 text-sm text-red-600">{errors.place}</p>}

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-56 overflow-auto">
                    {suggestions.map((sug) => {
                      const label = sug.display_name
                      return (
                        <li
                          key={`${sug.place_id}`}
                          className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setField('place', label)
                            setField('latitude', Number(sug.lat))
                            setField('longitude', Number(sug.lon))
                            setSuggestions([])
                          }}
                        >
                          {label}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select value={form.language} onChange={(e)=>setField('language', e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Gujarati</option>
                  <option>Marathi</option>
                  <option>Bengali</option>
                  <option>Tamil</option>
                  <option>Telugu</option>
                </select>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 rounded-lg">
                  {submitting ? 'Processing…' : 'Get Kundali'}
                </Button>
              </div>
            </form>

            {/* Helpful note */}
            <div className="mt-5 text-xs text-gray-500 flex items-center gap-2 justify-center">
              <Globe className="w-4 h-4" />
              <p>Your time and date are converted to UTC internally for accurate calculations.</p>
            </div>
          </CardContent>
        </Card>

        {/* SVG Output */}
        {(svgOutput || genError) && (
          <Card className="mx-auto max-w-sm mt-6 border border-gray-200 shadow-md overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-gray-800 text-base font-semibold">Chart Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {genError ? (
                <p className="text-sm text-red-600">{genError}</p>
              ) : (
                <div className="w-full overflow-auto border rounded-md">
                  <div dangerouslySetInnerHTML={{ __html: svgOutput }} />
                </div>
              )}
              {!genError && svgOutput && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'kundali-chart.svg'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Download SVG
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
