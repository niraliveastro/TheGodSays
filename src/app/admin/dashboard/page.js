'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  Search,
  RefreshCw,
  Settings,
  BookOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  CreditCard,
  Download,
  Lock,
  TicketPercent,
  Plus,
  X,
  Map,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './admin-dashboard.css'

// Cache keys
const CACHE_KEYS = {
  STATS: 'admin:stats',
  CALLS: 'admin:calls',
  BLOGS: 'admin:blogs',
  PRICING: 'admin:pricing',
  CHAT_PRICING: 'admin:chat_pricing',
}

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000

// Admin Passcode
const ADMIN_PASSCODE = 'Spacenos.nxt@global'
const PASSCODE_STORAGE_KEY = 'admin_passcode_verified'

// Cache helper functions
const getCachedData = (key) => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

const setCachedData = (key, data) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch {
    // Ignore storage errors
  }
}

const clearCachedData = (key) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage errors
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('calls')
  const [stats, setStats] = useState(null)
  const [calls, setCalls] = useState([])
  const [filteredCalls, setFilteredCalls] = useState([])
  const [blogs, setBlogs] = useState([])
  const [publishedBlogs, setPublishedBlogs] = useState([])
  const [draftBlogs, setDraftBlogs] = useState([])
  const [blogActiveTab, setBlogActiveTab] = useState('published') // 'published' or 'drafts'
  const [searchTerm, setSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [callTypeFilter, setCallTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState('desc')
  const [pricingData, setPricingData] = useState([])
  const [chatPricing, setChatPricing] = useState(null)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [showChatPricingModal, setShowChatPricingModal] = useState(false)
  const [selectedAstrologer, setSelectedAstrologer] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const [pricingForm, setPricingForm] = useState({
    pricingType: 'per_minute',
    basePrice: '',
    discountPercent: '0',
    callDurationMins: '30',
  })
  const [chatPricingForm, setChatPricingForm] = useState({
    creditsPerQuestion: '',
  })
  const [astrologers, setAstrologers] = useState([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [editingPricing, setEditingPricing] = useState(null)
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false)
  // Coupon management states
  const [coupons, setCoupons] = useState([])
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'once_per_user',
    amount: '',
    maxUses: '',
    expiresAt: '',
    active: true,
    description: '',
  })
  const [sitemapPages, setSitemapPages] = useState([])
  const [sitemapLoading, setSitemapLoading] = useState(false)

  // Check passcode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if passcode is already verified in this session
    const verified = sessionStorage.getItem(PASSCODE_STORAGE_KEY)
    if (verified === 'true') {
      setIsPasscodeVerified(true)
    } else {
      setShowPasscodeModal(true)
    }
  }, [])

  // Load cached data on mount (only after passcode verification)
  useEffect(() => {
    if (typeof window === 'undefined' || !isPasscodeVerified) return
    
    // Load from cache immediately
    const cachedStats = getCachedData(CACHE_KEYS.STATS)
    const cachedCalls = getCachedData(CACHE_KEYS.CALLS)
    const cachedBlogs = getCachedData(CACHE_KEYS.BLOGS)
    const cachedPricing = getCachedData(CACHE_KEYS.PRICING)
    const cachedChatPricing = getCachedData(CACHE_KEYS.CHAT_PRICING)
    
    if (cachedStats) setStats(cachedStats)
    if (cachedCalls) {
      setCalls(cachedCalls)
      setFilteredCalls(cachedCalls)
    }
    if (cachedBlogs) {
      setBlogs(cachedBlogs)
      // Separate published and drafts from cached data
      const published = cachedBlogs.filter(b => b.status === 'published')
      const drafts = cachedBlogs.filter(b => b.status === 'draft')
      setPublishedBlogs(published)
      setDraftBlogs(drafts)
    }
    if (cachedPricing) setPricingData(cachedPricing)
    if (cachedChatPricing) setChatPricing(cachedChatPricing)
    
    // If we have cached data, show UI immediately
    if (cachedStats || cachedCalls || cachedBlogs) {
      setLoading(false)
    }
  }, [isPasscodeVerified])

  // Check if user is admin (only after passcode verification)
  useEffect(() => {
    if (!isPasscodeVerified) return
    if (authLoading) return
    if (!user) {
      router.push('/auth/user')
      return
    }
    // Always fetch fresh stats for real-time data
    fetchData(false)
    fixPendingCalls()
  }, [user, authLoading, router, isPasscodeVerified])

  // Function to fetch only blogs (without other data)
  const fetchBlogsOnly = useCallback(async () => {
    try {
      const ADMIN_PASSCODE = 'Spacenos.nxt@global'
      const fetchWithTimeout = (url, timeout = 10000) => {
        return Promise.race([
          fetch(url, { 
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${ADMIN_PASSCODE}`,
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      }

      const [publishedBlogsRes, draftBlogsRes] = await Promise.allSettled([
        fetchWithTimeout('/api/blog?status=published', 10000),
        fetchWithTimeout('/api/blog?status=draft', 10000),
      ])

      // Process published blogs
      let publishedArray = []
      if (publishedBlogsRes.status === 'fulfilled' && publishedBlogsRes.value.ok) {
        try {
          const blogsData = await publishedBlogsRes.value.json()
          if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
            publishedArray = blogsData.blogs
          } else if (Array.isArray(blogsData)) {
            publishedArray = blogsData
          }
          setPublishedBlogs(publishedArray)
          console.log('Published blogs refreshed:', publishedArray.length)
        } catch (parseError) {
          console.error('Error parsing published blogs response:', parseError)
        }
      }

      // Process draft blogs
      let draftArray = []
      if (draftBlogsRes.status === 'fulfilled' && draftBlogsRes.value.ok) {
        try {
          const blogsData = await draftBlogsRes.value.json()
          if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
            draftArray = blogsData.blogs
          } else if (Array.isArray(blogsData)) {
            draftArray = blogsData
          }
          setDraftBlogs(draftArray)
          console.log('Draft blogs refreshed:', draftArray.length)
        } catch (parseError) {
          console.error('Error parsing draft blogs response:', parseError)
        }
      }

      // Update combined blogs and cache
      const allBlogs = [...publishedArray, ...draftArray]
      setBlogs(allBlogs)
      setCachedData(CACHE_KEYS.BLOGS, allBlogs)
    } catch (error) {
      console.error('Error refreshing blogs:', error)
    }
  }, [])

  // Refresh blogs when blog tab is activated
  useEffect(() => {
    if (activeTab === 'blog' && isPasscodeVerified) {
      // Refresh blogs when switching to blog tab
      fetchBlogsOnly()
    }
  }, [activeTab, isPasscodeVerified, fetchBlogsOnly])

  // Fetch sitemap pages (discovery + blog); call on tab open or when "Recrawl site" is clicked
  const fetchSitemapPages = useCallback(() => {
    setSitemapLoading(true)
    fetch('/api/admin/sitemap', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { pages: [] })
      .then((data) => setSitemapPages(data.pages || []))
      .catch(() => setSitemapPages([]))
      .finally(() => setSitemapLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'sitemap' && isPasscodeVerified) fetchSitemapPages()
  }, [activeTab, isPasscodeVerified, fetchSitemapPages])

  // Fix pending calls that timed out
  const fixPendingCalls = useCallback(async () => {
    try {
      await fetch('/api/admin/fix-pending-calls', { method: 'POST' })
    } catch (error) {
      console.error('Error fixing pending calls:', error)
    }
  }, [])

  // Optimized data fetching with caching
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (refreshing && !forceRefresh) return
    
    setRefreshing(true)
    if (forceRefresh) {
      setLoading(true)
      // Clear stats cache on force refresh to ensure fresh data
      clearCachedData(CACHE_KEYS.STATS)
    }
    
    try {
      // Fetch stats first (lightweight) - always fetch fresh, no cache
      const statsRes = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.success) {
          setStats(statsData.stats)
          setCachedData(CACHE_KEYS.STATS, statsData.stats)
          if (forceRefresh) setLoading(false)
        }
      }

      // Fetch other data in parallel with timeout
      // Calls API needs more time due to nested data fetching
      const fetchWithTimeout = (url, timeout = 10000, headers = {}) => {
        return Promise.race([
          fetch(url, { 
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${ADMIN_PASSCODE}`,
              ...headers
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      }

      setLoadingCalls(true)
      const [callsRes, publishedBlogsRes, draftBlogsRes, pricingRes, chatPricingRes, astrologersRes] = await Promise.allSettled([
        fetchWithTimeout('/api/admin/calls?limit=500', 30000), // 30 seconds for calls
        fetchWithTimeout('/api/blog?status=published', 10000),
        fetchWithTimeout('/api/blog?status=draft', 10000),
        fetchWithTimeout('/api/pricing?action=get-all-pricing', 10000),
        fetchWithTimeout('/api/admin/pricing', 10000),
        fetchWithTimeout('/api/admin/astrologers', 10000),
      ])

      // Process calls
      if (callsRes.status === 'fulfilled' && callsRes.value.ok) {
        try {
          const callsData = await callsRes.value.json()
          console.log('Calls API response:', { success: callsData.success, count: callsData.calls?.length })
          if (callsData.success && callsData.calls && Array.isArray(callsData.calls)) {
            const processedCalls = callsData.calls.map(call => {
              if (call.status === 'pending') {
                const createdAt = new Date(call.createdAt)
                const now = new Date()
                const minutesSinceCreation = (now - createdAt) / (1000 * 60)
                if (minutesSinceCreation > 2) {
                  return { ...call, status: 'cancelled' }
                }
              }
              return call
            })
            setCalls(processedCalls)
            setFilteredCalls(processedCalls)
            setCachedData(CACHE_KEYS.CALLS, processedCalls)
            console.log('Calls loaded:', processedCalls.length)
          } else {
            console.warn('Calls data format unexpected:', callsData)
            // Try to use cached calls if available
            const cachedCalls = getCachedData(CACHE_KEYS.CALLS)
            if (cachedCalls) {
              setCalls(cachedCalls)
              setFilteredCalls(cachedCalls)
            }
          }
        } catch (parseError) {
          console.error('Error parsing calls response:', parseError)
          // Try to use cached calls if available
          const cachedCalls = getCachedData(CACHE_KEYS.CALLS)
          if (cachedCalls) {
            setCalls(cachedCalls)
            setFilteredCalls(cachedCalls)
          }
        }
      } else {
        const errorMsg = callsRes.status === 'rejected' ? callsRes.reason?.message : 'Unknown error'
        console.error('Failed to fetch calls:', errorMsg)
        // Try to use cached calls if available
        const cachedCalls = getCachedData(CACHE_KEYS.CALLS)
        if (cachedCalls) {
          setCalls(cachedCalls)
          setFilteredCalls(cachedCalls)
        }
      }

      // Process published blogs
      let publishedArray = []
      if (publishedBlogsRes.status === 'fulfilled' && publishedBlogsRes.value.ok) {
        try {
          const blogsData = await publishedBlogsRes.value.json()
          if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
            publishedArray = blogsData.blogs
          } else if (Array.isArray(blogsData)) {
            publishedArray = blogsData
          }
          setPublishedBlogs(publishedArray)
          console.log('Published blogs loaded:', publishedArray.length)
        } catch (parseError) {
          console.error('Error parsing published blogs response:', parseError)
          setPublishedBlogs([])
        }
      } else {
        console.error('Failed to fetch published blogs')
        setPublishedBlogs([])
      }

      // Process draft blogs
      let draftArray = []
      if (draftBlogsRes.status === 'fulfilled' && draftBlogsRes.value.ok) {
        try {
          const blogsData = await draftBlogsRes.value.json()
          console.log('Draft blogs API response:', blogsData)
          if (blogsData.blogs && Array.isArray(blogsData.blogs)) {
            draftArray = blogsData.blogs
          } else if (Array.isArray(blogsData)) {
            draftArray = blogsData
          }
          setDraftBlogs(draftArray)
          console.log('Draft blogs loaded:', draftArray.length)
        } catch (parseError) {
          console.error('Error parsing draft blogs response:', parseError)
          setDraftBlogs([])
        }
      } else {
        const errorMsg = draftBlogsRes.status === 'rejected' ? draftBlogsRes.reason?.message : 'Unknown error'
        const responseStatus = draftBlogsRes.status === 'fulfilled' ? draftBlogsRes.value.status : 'N/A'
        console.error('Failed to fetch draft blogs:', {
          status: draftBlogsRes.status,
          responseStatus,
          error: errorMsg,
          reason: draftBlogsRes.reason
        })
        // Try to get error details from response if available
        if (draftBlogsRes.status === 'fulfilled' && !draftBlogsRes.value.ok) {
          try {
            const errorData = await draftBlogsRes.value.json()
            console.error('Draft blogs error details:', errorData)
          } catch (e) {
            console.error('Could not parse error response')
          }
        }
        setDraftBlogs([])
      }

      // Combine for backward compatibility
      const allBlogs = [...publishedArray, ...draftArray]
      setBlogs(allBlogs)
      setCachedData(CACHE_KEYS.BLOGS, allBlogs)

      // Process pricing
      let fetchedPricingArray = []
      if (pricingRes.status === 'fulfilled' && pricingRes.value.ok) {
        const pricingData = await pricingRes.value.json()
        if (pricingData.success && pricingData.pricing) {
          fetchedPricingArray = Array.isArray(pricingData.pricing) ? pricingData.pricing : []
          setPricingData(fetchedPricingArray)
          setCachedData(CACHE_KEYS.PRICING, fetchedPricingArray)
        }
      } else {
        // Use cached pricing if fetch failed
        const cachedPricing = getCachedData(CACHE_KEYS.PRICING)
        if (cachedPricing) {
          fetchedPricingArray = cachedPricing
        }
      }

      // Process chat pricing
      if (chatPricingRes.status === 'fulfilled' && chatPricingRes.value.ok) {
        const chatPricingData = await chatPricingRes.value.json()
        if (chatPricingData.pricing) {
          setChatPricing(chatPricingData.pricing)
          setCachedData(CACHE_KEYS.CHAT_PRICING, chatPricingData.pricing)
        }
      }

      // Process astrologers (after pricing is processed)
      if (astrologersRes.status === 'fulfilled' && astrologersRes.value.ok) {
        try {
          const astrologersData = await astrologersRes.value.json()
          if (astrologersData.success && astrologersData.astrologers) {
            // Merge with pricing data
            const astrologersWithPricing = astrologersData.astrologers.map(astro => {
              const pricing = fetchedPricingArray.find(p => p.astrologerId === astro.id)
              return {
                ...astro,
                pricing: pricing || null
              }
            })
            setAstrologers(astrologersWithPricing)
          }
        } catch (parseError) {
          console.error('Error parsing astrologers response:', parseError)
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
      setLoadingCalls(false)
      setRefreshing(false)
    }
  }, [refreshing])

  // Generate search suggestions
  const generateSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) {
      return []
    }
    
    const term = searchTerm.toLowerCase()
    const suggestions = []
    const seen = new Set()
    
    calls.forEach(call => {
      if (call.userName?.toLowerCase().includes(term) && !seen.has(call.userName)) {
        suggestions.push({ type: 'user', value: call.userName, id: call.userId })
        seen.add(call.userName)
      }
      if (call.astrologerName?.toLowerCase().includes(term) && !seen.has(call.astrologerName)) {
        suggestions.push({ type: 'astrologer', value: call.astrologerName, id: call.astrologerId })
        seen.add(call.astrologerName)
      }
      if (call.id?.toLowerCase().includes(term) && !seen.has(call.id)) {
        suggestions.push({ type: 'call', value: call.id, id: call.id })
        seen.add(call.id)
      }
    })
    
    return suggestions.slice(0, 5)
  }, [searchTerm, calls])

  useEffect(() => {
    setSearchSuggestions(generateSuggestions)
    setShowSuggestions(generateSuggestions.length > 0 && searchTerm.length >= 2)
  }, [generateSuggestions, searchTerm])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.value)
    setShowSuggestions(false)
  }

  // Sorting and filtering with pagination
  const sortedAndFilteredCalls = useMemo(() => {
    let filtered = [...calls]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        call =>
          call.userName?.toLowerCase().includes(term) ||
          call.astrologerName?.toLowerCase().includes(term) ||
          call.userEmail?.toLowerCase().includes(term) ||
          call.id?.toLowerCase().includes(term)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter)
    }

    if (callTypeFilter !== 'all') {
      filtered = filtered.filter(call => call.callType === callTypeFilter)
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      let cutoffDate = new Date()
      if (dateFilter === 'today') {
        cutoffDate.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        cutoffDate.setDate(now.getDate() - 7)
      } else if (dateFilter === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1)
      }
      filtered = filtered.filter(call => {
        if (!call.createdAt) return false
        const callDate = new Date(call.createdAt)
        return callDate >= cutoffDate
      })
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === 'createdAt' || sortField === 'endTime') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      if (sortField === 'cost' || sortField === 'durationMinutes') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })

    return filtered
  }, [calls, searchTerm, statusFilter, callTypeFilter, dateFilter, sortField, sortDirection])

  const paginatedCalls = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedAndFilteredCalls.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedAndFilteredCalls, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedAndFilteredCalls.length / itemsPerPage)

  useEffect(() => {
    setFilteredCalls(sortedAndFilteredCalls)
    setCurrentPage(1)
  }, [sortedAndFilteredCalls])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="sort-icon" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="sort-icon active" />
    ) : (
      <ArrowDown size={14} className="sort-icon active" />
    )
  }

  const formatCurrency = (amount) => {
    return `₹${Number(amount).toFixed(2)}`
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min'
    const hrs = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins} min`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePasscodeSubmit = (e) => {
    e.preventDefault()
    setPasscodeError('')
    
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsPasscodeVerified(true)
      setShowPasscodeModal(false)
      sessionStorage.setItem(PASSCODE_STORAGE_KEY, 'true')
      setPasscodeInput('')
    } else {
      setPasscodeError('Incorrect passcode. Please try again.')
      setPasscodeInput('')
    }
  }

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('landscape', 'pt', 'a4')
      
      // Add title
      doc.setFontSize(18)
      doc.setTextColor(212, 175, 55) // Golden color
      doc.text('Call Logs Report', 40, 40)
      
      // Add date and filters info
      doc.setFontSize(10)
      doc.setTextColor(107, 114, 128) // Gray color
      const now = new Date()
      doc.text(`Generated: ${now.toLocaleString('en-IN')}`, 40, 60)
      
      // Add filter info if any filters are active
      const filterInfo = []
      if (statusFilter !== 'all') filterInfo.push(`Status: ${statusFilter}`)
      if (callTypeFilter !== 'all') filterInfo.push(`Type: ${callTypeFilter}`)
      if (dateFilter !== 'all') filterInfo.push(`Date: ${dateFilter}`)
      if (searchTerm) filterInfo.push(`Search: ${searchTerm}`)
      
      if (filterInfo.length > 0) {
        doc.text(`Filters: ${filterInfo.join(', ')}`, 40, 75)
      }
      
      doc.text(`Total Records: ${sortedAndFilteredCalls.length}`, 40, 90)
      
      // Prepare table data
      const tableData = sortedAndFilteredCalls.map(call => [
        call.id.substring(0, 12) + '...',
        call.userName || 'N/A',
        call.astrologerName || 'N/A',
        call.callType || 'N/A',
        call.status || 'N/A',
        formatDuration(call.durationMinutes),
        formatCurrency(call.cost),
        formatDate(call.createdAt),
      ])
      
      // Add table
      autoTable(doc, {
        startY: 110,
        head: [['Call ID', 'User', 'Astrologer', 'Type', 'Status', 'Duration', 'Cost', 'Date']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [212, 175, 55], // Golden background
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [31, 41, 55], // Dark gray text
        },
        alternateRowStyles: {
          fillColor: [253, 251, 247], // Light beige
        },
        styles: {
          cellPadding: 4,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 80 }, // Call ID
          1: { cellWidth: 100 }, // User
          2: { cellWidth: 100 }, // Astrologer
          3: { cellWidth: 60 }, // Type
          4: { cellWidth: 70 }, // Status
          5: { cellWidth: 70 }, // Duration
          6: { cellWidth: 70 }, // Cost
          7: { cellWidth: 120 }, // Date
        },
        margin: { top: 110, left: 40, right: 40 },
      })
      
      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(107, 114, 128)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        )
      }
      
      // Generate filename with timestamp
      const timestamp = now.toISOString().split('T')[0]
      const filename = `call-logs-${timestamp}.pdf`
      
      // Save PDF
      doc.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleUpdatePricing = async (astrologerId) => {
    try {
      const existing = pricingData.find(p => p.astrologerId === astrologerId)
      const action = existing ? 'update-pricing' : 'set-pricing'
      
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          astrologerId,
          pricingType: pricingForm.pricingType,
          basePrice: parseFloat(pricingForm.basePrice),
          discountPercent: parseFloat(pricingForm.discountPercent),
          callDurationMins:
            pricingForm.pricingType === 'per_call'
              ? parseInt(pricingForm.callDurationMins)
              : null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert('Pricing updated successfully!')
        setShowPricingModal(false)
        await fetchData(true)
      } else {
        alert('Failed to update pricing: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating pricing:', error)
      alert('Error updating pricing')
    }
  }

  const handleUpdateChatPricing = async () => {
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditsPerQuestion: parseInt(chatPricingForm.creditsPerQuestion),
        }),
      })

      const data = await res.json()
      if (data.pricing) {
        alert('Chat pricing updated successfully!')
        setShowChatPricingModal(false)
        setChatPricing(data.pricing)
        setCachedData(CACHE_KEYS.CHAT_PRICING, data.pricing)
      } else {
        alert('Failed to update chat pricing: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating chat pricing:', error)
      alert('Error updating chat pricing')
    }
  }

  const openPricingModal = (astrologer) => {
    setSelectedAstrologer(astrologer)
    const existing = pricingData.find(p => p.astrologerId === astrologer.id)
    if (existing) {
      setPricingForm({
        pricingType: existing.pricingType || 'per_minute',
        basePrice: existing.basePrice?.toString() || '',
        discountPercent: existing.discountPercent?.toString() || '0',
        callDurationMins: existing.callDurationMins?.toString() || '30',
      })
    } else {
      setPricingForm({
        pricingType: 'per_minute',
        basePrice: '',
        discountPercent: '0',
        callDurationMins: '30',
      })
    }
    setShowPricingModal(true)
  }

  const openChatPricingModal = () => {
    if (chatPricing) {
      setChatPricingForm({
        creditsPerQuestion: chatPricing.creditsPerQuestion?.toString() || '1',
      })
    } else {
      setChatPricingForm({
        creditsPerQuestion: '1',
      })
    }
    setShowChatPricingModal(true)
  }

  const handleDeleteBlog = async (blogId) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return
    
    try {
      const res = await fetch(`/api/blog/${blogId}`, { method: 'DELETE' })
      if (res.ok) {
        setBlogs(blogs.filter(b => b.id !== blogId))
        setCachedData(CACHE_KEYS.BLOGS, blogs.filter(b => b.id !== blogId))
        alert('Blog deleted successfully!')
      } else {
        alert('Failed to delete blog')
      }
    } catch (error) {
      console.error('Error deleting blog:', error)
      alert('Error deleting blog')
    }
  }

  // Coupon management functions
  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coupons')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCoupons(data.coupons || [])
        }
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'coupons' && isPasscodeVerified) {
      fetchCoupons()
    }
  }, [activeTab, isPasscodeVerified, fetchCoupons])

  const openCouponModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon)
      setCouponForm({
        code: coupon.code || '',
        type: coupon.type || 'once_per_user',
        amount: coupon.amount?.toString() || '',
        maxUses: (coupon.maxUses || coupon.maxUsesPerUser)?.toString() || '',
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
        active: coupon.active !== undefined ? coupon.active : true,
        description: coupon.description || '',
      })
    } else {
      setEditingCoupon(null)
      setCouponForm({
        code: '',
        type: 'once_per_user',
        amount: '',
        maxUses: '',
        expiresAt: '',
        active: true,
        description: '',
      })
    }
    setShowCouponModal(true)
  }

  const handleSaveCoupon = async () => {
    try {
      if (!couponForm.code || !couponForm.amount) {
        alert('Please fill in required fields (Code and Amount)')
        return
      }

      const url = '/api/admin/coupons'
      const method = editingCoupon ? 'PUT' : 'POST'
      const body = {
        ...(editingCoupon ? { id: editingCoupon.id } : {}),
        code: couponForm.code.toUpperCase(),
        type: couponForm.type,
        amount: parseFloat(couponForm.amount),
        active: couponForm.active,
        description: couponForm.description,
        ...(couponForm.type === 'limited_total' && couponForm.maxUses ? { maxUses: parseInt(couponForm.maxUses) } : {}),
        ...(couponForm.type === 'multiple_per_user' && couponForm.maxUses ? { maxUsesPerUser: parseInt(couponForm.maxUses) } : {}),
        ...(couponForm.expiresAt ? { expiresAt: couponForm.expiresAt } : {}),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert(editingCoupon ? 'Coupon updated successfully!' : 'Coupon created successfully!')
        setShowCouponModal(false)
        fetchCoupons()
      } else {
        const errorMsg = data.error || `Failed to ${editingCoupon ? 'update' : 'create'} coupon`
        console.error('Coupon save error:', data)
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Error saving coupon:', error)
      alert('Error saving coupon')
    }
  }

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return
    
    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success || res.ok) {
        alert('Coupon deleted successfully!')
        fetchCoupons()
      } else {
        alert(data.error || 'Failed to delete coupon')
      }
    } catch (error) {
      console.error('Error deleting coupon:', error)
      alert('Error deleting coupon')
    }
  }

  // Show passcode modal if not verified
  if (showPasscodeModal) {
    return (
      <div className="admin-dashboard">
        <div className="admin-passcode-modal-overlay">
          <div className="admin-passcode-modal">
            <div className="admin-passcode-header">
              <Lock size={32} className="admin-passcode-icon" />
              <h2>Admin Access Required</h2>
              <p>Please enter the security passcode to access the admin dashboard</p>
            </div>
            <form onSubmit={handlePasscodeSubmit} className="admin-passcode-form">
              <div className="admin-form-group">
                <label htmlFor="passcode">Security Passcode</label>
                <input
                  id="passcode"
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value)
                    setPasscodeError('')
                  }}
                  className={`admin-input ${passcodeError ? 'admin-input-error' : ''}`}
                  placeholder="Enter passcode"
                  autoFocus
                  autoComplete="off"
                />
                {passcodeError && (
                  <p className="admin-error-message">{passcodeError}</p>
                )}
              </div>
              <button type="submit" className="admin-btn admin-btn-primary admin-btn-full">
                Verify & Access
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (authLoading || (loading && !stats && !calls.length && !blogs.length && isPasscodeVerified)) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-spinner"></div>
        <p>{authLoading ? 'Checking authentication...' : 'Loading admin dashboard...'}</p>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-container">
        {/* Merged Header with Stats */}
        <div className="admin-dashboard-header-merged">
          <div className="admin-header-content">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Monitor calls, revenue, manage pricing, and blog posts</p>
            </div>
            <button 
              onClick={() => fetchData(true)} 
              className="admin-refresh-btn-icon"
              title="Refresh"
              disabled={refreshing}
            >
              <RefreshCw size={18} className={refreshing ? 'rotating-icon' : ''} />
              <span className="admin-refresh-btn-text">Refresh</span>
            </button>
          </div>
          
          {/* Stats Cards in Header */}
          {stats && (
            <div className="admin-stats-grid-merged">
              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Phone />
                </div>
                <div className="admin-stat-content">
                  <h3>Total Calls</h3>
                  <p className="admin-stat-value">{stats.totalCalls}</p>
                  <span className="admin-stat-sub">
                    {stats.completedCalls} completed
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon revenue">
                  <DollarSign />
                </div>
                <div className="admin-stat-content">
                  <h3>Total Revenue</h3>
                  <p className="admin-stat-value">{formatCurrency(stats.totalRevenue)}</p>
                  <span className="admin-stat-sub">
                    {formatCurrency(stats.monthRevenue)} this month
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon users">
                  <Users />
                </div>
                <div className="admin-stat-content">
                  <h3>Active Users</h3>
                  <p className="admin-stat-value">{stats.uniqueUsers}</p>
                  <span className="admin-stat-sub">
                    {stats.uniqueAstrologers} astrologers
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon duration">
                  <Clock />
                </div>
                <div className="admin-stat-content">
                  <h3>Avg Duration</h3>
                  <p className="admin-stat-value">{formatDuration(stats.avgDuration)}</p>
                  <span className="admin-stat-sub">
                    {formatCurrency(stats.avgCost)} avg cost
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon today">
                  <Calendar />
                </div>
                <div className="admin-stat-content">
                  <h3>Today</h3>
                  <p className="admin-stat-value">{stats.todayCalls}</p>
                  <span className="admin-stat-sub">
                    {formatCurrency(stats.todayRevenue)} revenue
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-icon month">
                  <TrendingUp />
                </div>
                <div className="admin-stat-content">
                  <h3>This Month</h3>
                  <p className="admin-stat-value">{stats.monthCalls}</p>
                  <span className="admin-stat-sub">
                    {formatCurrency(stats.monthRevenue)} revenue
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            <Phone size={18} />
            Call Logs
          </button>
          <button
            className={`admin-tab ${activeTab === 'blog' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('blog')
              // Refresh blogs when switching to blog tab
              if (isPasscodeVerified) {
                setTimeout(() => fetchBlogsOnly(), 100)
              }
            }}
          >
            <BookOpen size={18} />
            Blog Management
          </button>
          <button
            className={`admin-tab ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <CreditCard size={18} />
            Pricing
          </button>
          <button
            className={`admin-tab ${activeTab === 'coupons' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('coupons')
              if (isPasscodeVerified) {
                setTimeout(() => fetchCoupons(), 100)
              }
            }}
          >
            <TicketPercent size={18} />
            Coupons
          </button>
          <button
            className={`admin-tab ${activeTab === 'sitemap' ? 'active' : ''}`}
            onClick={() => setActiveTab('sitemap')}
          >
            <Map size={18} />
            SiteMap
          </button>
        </div>

        {/* Call Logs Tab */}
        {activeTab === 'calls' && (
          <>
            {/* Filters - Side by Side */}
            <div className="admin-filters">
              <div className="admin-search-box-wrapper">
                <div className="admin-search-box">
                  <Search size={18} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by user, astrologer, or call ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                  />
                </div>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div ref={suggestionsRef} className="admin-search-suggestions">
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="admin-suggestion-item"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Search size={14} />
                        <span>{suggestion.value}</span>
                        <span className="admin-suggestion-type">{suggestion.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-filter-buttons">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={callTypeFilter}
                  onChange={(e) => setCallTypeFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="video">Video</option>
                  <option value="voice">Voice</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Call Logs Table */}
            <div className="admin-table-container">
              <div className="admin-table-header">
                <h2>Call Logs ({sortedAndFilteredCalls.length})</h2>
                <button
                  className="admin-download-btn"
                  onClick={handleDownloadPDF}
                  title="Download PDF"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>
              {loadingCalls && (
                <div className="admin-loading-spinner-container">
                  <div className="admin-loading-spinner"></div>
                </div>
              )}
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th 
                        onClick={() => handleSort('id')} 
                        className={`sortable ${sortField === 'id' ? 'active' : ''}`}
                      >
                        <span>Call ID</span> <SortIcon field="id" />
                      </th>
                      <th 
                        onClick={() => handleSort('userName')} 
                        className={`sortable ${sortField === 'userName' ? 'active' : ''}`}
                      >
                        <span>User</span> <SortIcon field="userName" />
                      </th>
                      <th 
                        onClick={() => handleSort('astrologerName')} 
                        className={`sortable ${sortField === 'astrologerName' ? 'active' : ''}`}
                      >
                        <span>Astrologer</span> <SortIcon field="astrologerName" />
                      </th>
                      <th 
                        onClick={() => handleSort('callType')} 
                        className={`sortable ${sortField === 'callType' ? 'active' : ''}`}
                      >
                        <span>Type</span> <SortIcon field="callType" />
                      </th>
                      <th 
                        onClick={() => handleSort('status')} 
                        className={`sortable ${sortField === 'status' ? 'active' : ''}`}
                      >
                        <span>Status</span> <SortIcon field="status" />
                      </th>
                      <th 
                        onClick={() => handleSort('durationMinutes')} 
                        className={`sortable ${sortField === 'durationMinutes' ? 'active' : ''}`}
                      >
                        <span>Duration</span> <SortIcon field="durationMinutes" />
                      </th>
                      <th 
                        onClick={() => handleSort('cost')} 
                        className={`sortable ${sortField === 'cost' ? 'active' : ''}`}
                      >
                        <span>Cost</span> <SortIcon field="cost" />
                      </th>
                      <th 
                        onClick={() => handleSort('createdAt')} 
                        className={`sortable ${sortField === 'createdAt' ? 'active' : ''}`}
                      >
                        <span>Date</span> <SortIcon field="createdAt" />
                      </th>
                      <th className="admin-table-actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCalls.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="admin-table-empty">
                          No calls found
                        </td>
                      </tr>
                    ) : (
                      paginatedCalls.map((call) => (
                        <tr key={call.id}>
                          <td className="admin-table-id">{call.id.substring(0, 8)}...</td>
                          <td>
                            <div>
                              <div className="admin-table-name">{call.userName}</div>
                              <div className="admin-table-email">{call.userEmail}</div>
                            </div>
                          </td>
                          <td>{call.astrologerName}</td>
                          <td>
                            <span className={`admin-badge ${call.callType}`}>
                              {call.callType}
                            </span>
                          </td>
                          <td>
                            <span className={`admin-badge status-${call.status}`}>
                              {call.status}
                            </span>
                          </td>
                          <td>{formatDuration(call.durationMinutes)}</td>
                          <td className="admin-table-cost">
                            {formatCurrency(call.cost)}
                          </td>
                          <td className="admin-table-date">
                            {formatDate(call.createdAt)}
                          </td>
                          <td className="admin-table-actions-cell">
                            <button
                              className="admin-action-btn"
                              onClick={() => openPricingModal({ id: call.astrologerId, name: call.astrologerName })}
                              title="Update Pricing"
                            >
                              <Settings size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="admin-pagination">
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="admin-pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="admin-pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Blog Management Tab */}
        {activeTab === 'blog' && (
          <div className="admin-blog-section">
            <div className="admin-blog-header">
              <h2>Blog Posts ({blogActiveTab === 'published' ? publishedBlogs.length : draftBlogs.length})</h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setBlogActiveTab('published')}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      background: blogActiveTab === 'published' ? '#d4af37' : 'white',
                      color: blogActiveTab === 'published' ? 'white' : '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Published ({publishedBlogs.length})
                  </button>
                  <button
                    onClick={() => setBlogActiveTab('drafts')}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      background: blogActiveTab === 'drafts' ? '#d4af37' : 'white',
                      color: blogActiveTab === 'drafts' ? 'white' : '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Drafts ({draftBlogs.length})
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    fetchBlogsOnly()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    background: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                  }}
                  title="Refresh Blogs"
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/admin/blog')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    background: 'linear-gradient(135deg, #d4af37, #b8972e)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(212, 175, 55, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(212, 175, 55, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(212, 175, 55, 0.3)'
                  }}
                  title="Create Post"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Post
                </button>
              </div>
            </div>
            <div className="admin-blog-grid">
              {blogActiveTab === 'published' && publishedBlogs.length === 0 ? (
                <div className="admin-empty-state">
                  <BookOpen size={48} />
                  <p>No published blog posts yet</p>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => router.push('/admin/blog')}
                  >
                    Create First Post
                  </button>
                </div>
              ) : blogActiveTab === 'drafts' && draftBlogs.length === 0 ? (
                <div className="admin-empty-state">
                  <BookOpen size={48} />
                  <p>No draft blog posts yet</p>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => router.push('/admin/blog')}
                  >
                    Create First Post
                  </button>
                </div>
              ) : (
                (blogActiveTab === 'published' ? publishedBlogs : draftBlogs).map((blog) => (
                  <div 
                    key={blog.id} 
                    className="admin-blog-card admin-blog-card-clickable"
                    onClick={() => {
                      // Only navigate to blog if published, drafts can't be viewed publicly
                      if (blog.status === 'published') {
                        router.push(`/blog/${blog.slug}`)
                      }
                    }}
                  >
                    {blog.featuredImage && (
                      <img
                        src={blog.featuredImage}
                        alt={blog.title}
                        className="admin-blog-image"
                      />
                    )}
                    <div className="admin-blog-content">
                      <div className="admin-blog-status">
                        <span className={`admin-badge status-${blog.status}`}>
                          {blog.status}
                        </span>
                      </div>
                      <h3>{blog.title}</h3>
                      <p className="admin-blog-meta">
                        {blog.author} • {blog.publishedAt ? formatDate(blog.publishedAt) : 'Draft'}
                      </p>
                      <div className="admin-blog-actions">
                        {blog.status === 'published' && (
                          <button
                            className="admin-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/blog/${blog.slug}`)
                            }}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          className="admin-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/blog?edit=${blog.id}`)
                          }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="admin-action-btn admin-action-btn-danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBlog(blog.id)
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pricing Management Tab */}
        {activeTab === 'pricing' && (
          <div className="admin-pricing-section">
            <div className="admin-pricing-header">
              <h2>Pricing Management</h2>
            </div>
            
            <div className="admin-pricing-grid">
              {/* Chat Credits Pricing */}
              <div className="admin-pricing-card">
                <div className="admin-pricing-card-header">
                  <div className="admin-pricing-icon chat">
                    <MessageSquare />
                  </div>
                  <div>
                    <h3>Chat Credits</h3>
                    <p>Manage AI chat pricing</p>
                  </div>
                </div>
                <div className="admin-pricing-card-content">
                  <div className="admin-pricing-info">
                    <span className="admin-pricing-label">Credits per Question:</span>
                    <span className="admin-pricing-value">
                      {chatPricing?.creditsPerQuestion || 'Not set'}
                    </span>
                  </div>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={openChatPricingModal}
                  >
                    <Settings size={16} />
                    Update Chat Pricing
                  </button>
                </div>
              </div>

              {/* Call Pricing Summary */}
              <div className="admin-pricing-card admin-pricing-card-full">
                <div className="admin-pricing-card-header">
                  <div className="admin-pricing-icon call">
                    <Phone />
                  </div>
                  <div>
                    <h3>Call Pricing</h3>
                    <p>Manage astrologer call rates</p>
                  </div>
                </div>
                <div className="admin-pricing-card-content">
                  <div className="admin-astrologers-pricing-list">
                    {astrologers.length === 0 ? (
                      <p className="admin-pricing-note">Loading astrologers...</p>
                    ) : (
                      <table className="admin-pricing-table">
                        <thead>
                          <tr>
                            <th>Astrologer</th>
                            <th>Type</th>
                            <th>Base Price</th>
                            <th>Discount</th>
                            <th>Final Price</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {astrologers.map((astro) => (
                            <tr key={astro.id}>
                              <td>{astro.name || 'Unknown'}</td>
                              <td>
                                {editingPricing === astro.id ? (
                                  <select
                                    value={pricingForm.pricingType}
                                    onChange={(e) =>
                                      setPricingForm({ ...pricingForm, pricingType: e.target.value })
                                    }
                                    className="admin-pricing-input-small"
                                  >
                                    <option value="per_minute">Per Minute</option>
                                    <option value="per_call">Per Call</option>
                                  </select>
                                ) : (
                                  <span className="admin-badge">
                                    {astro.pricing?.pricingType || 'Not set'}
                                  </span>
                                )}
                              </td>
                              <td>
                                {editingPricing === astro.id ? (
                                  <input
                                    type="number"
                                    value={pricingForm.basePrice}
                                    onChange={(e) =>
                                      setPricingForm({ ...pricingForm, basePrice: e.target.value })
                                    }
                                    className="admin-pricing-input-small"
                                    placeholder="50"
                                    min="0"
                                    step="0.01"
                                  />
                                ) : (
                                  `₹${astro.pricing?.basePrice || '0'}`
                                )}
                              </td>
                              <td>
                                {editingPricing === astro.id ? (
                                  <input
                                    type="number"
                                    value={pricingForm.discountPercent}
                                    onChange={(e) =>
                                      setPricingForm({ ...pricingForm, discountPercent: e.target.value })
                                    }
                                    className="admin-pricing-input-small"
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                  />
                                ) : (
                                  `${astro.pricing?.discountPercent || 0}%`
                                )}
                              </td>
                              <td>
                                <strong>₹{astro.pricing?.finalPrice || '0'}</strong>
                              </td>
                              <td>
                                {editingPricing === astro.id ? (
                                  <div className="admin-pricing-actions-inline">
                                    <button
                                      className="admin-action-btn-small admin-action-btn-success"
                                      onClick={async () => {
                                        await handleUpdatePricing(astro.id)
                                        setEditingPricing(null)
                                      }}
                                      title="Save"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      className="admin-action-btn-small admin-action-btn-danger"
                                      onClick={() => {
                                        setEditingPricing(null)
                                        setPricingForm({
                                          pricingType: 'per_minute',
                                          basePrice: '',
                                          discountPercent: '0',
                                          callDurationMins: '30',
                                        })
                                      }}
                                      title="Cancel"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="admin-action-btn-small"
                                    onClick={() => {
                                      setEditingPricing(astro.id)
                                      setSelectedAstrologer({ id: astro.id, name: astro.name })
                                      if (astro.pricing) {
                                        setPricingForm({
                                          pricingType: astro.pricing.pricingType || 'per_minute',
                                          basePrice: astro.pricing.basePrice?.toString() || '',
                                          discountPercent: astro.pricing.discountPercent?.toString() || '0',
                                          callDurationMins: astro.pricing.callDurationMins?.toString() || '30',
                                        })
                                      } else {
                                        setPricingForm({
                                          pricingType: 'per_minute',
                                          basePrice: '',
                                          discountPercent: '0',
                                          callDurationMins: '30',
                                        })
                                      }
                                    }}
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Modal */}
        {showPricingModal && (
          <div className="admin-modal-overlay" onClick={() => setShowPricingModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>Update Pricing - {selectedAstrologer?.name}</h2>
                <button
                  className="admin-modal-close"
                  onClick={() => setShowPricingModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="admin-modal-content">
                <div className="admin-form-group">
                  <label>Pricing Type</label>
                  <select
                    value={pricingForm.pricingType}
                    onChange={(e) =>
                      setPricingForm({ ...pricingForm, pricingType: e.target.value })
                    }
                    className="admin-input"
                  >
                    <option value="per_minute">Per Minute</option>
                    <option value="per_call">Per Call</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Base Price (₹)</label>
                  <input
                    type="number"
                    value={pricingForm.basePrice}
                    onChange={(e) =>
                      setPricingForm({ ...pricingForm, basePrice: e.target.value })
                    }
                    className="admin-input"
                    placeholder="e.g., 50"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Discount (%)</label>
                  <input
                    type="number"
                    value={pricingForm.discountPercent}
                    onChange={(e) =>
                      setPricingForm({ ...pricingForm, discountPercent: e.target.value })
                    }
                    className="admin-input"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>

                {pricingForm.pricingType === 'per_call' && (
                  <div className="admin-form-group">
                    <label>Call Duration (minutes)</label>
                    <input
                      type="number"
                      value={pricingForm.callDurationMins}
                      onChange={(e) =>
                        setPricingForm({ ...pricingForm, callDurationMins: e.target.value })
                      }
                      className="admin-input"
                      placeholder="30"
                      min="1"
                    />
                  </div>
                )}

                <div className="admin-modal-actions">
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => handleUpdatePricing(selectedAstrologer.id)}
                  >
                    Update Pricing
                  </button>
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowPricingModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Pricing Modal */}
        {showChatPricingModal && (
          <div className="admin-modal-overlay" onClick={() => setShowChatPricingModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>Update Chat Credits Pricing</h2>
                <button
                  className="admin-modal-close"
                  onClick={() => setShowChatPricingModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="admin-modal-content">
                <div className="admin-form-group">
                  <label>Credits per Question</label>
                  <input
                    type="number"
                    value={chatPricingForm.creditsPerQuestion}
                    onChange={(e) =>
                      setChatPricingForm({ ...chatPricingForm, creditsPerQuestion: e.target.value })
                    }
                    className="admin-input"
                    placeholder="e.g., 1"
                    min="1"
                    step="1"
                  />
                  <p className="admin-form-help">
                    Number of credits deducted per AI chat question
                  </p>
                </div>

                <div className="admin-modal-actions">
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleUpdateChatPricing}
                  >
                    Update Chat Pricing
                  </button>
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowChatPricingModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupon Management Tab */}
        {activeTab === 'coupons' && (
          <div className="admin-pricing-section">
            <div className="admin-pricing-header">
              <h2>Coupon Management</h2>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => openCouponModal(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} />
                Create Coupon
              </button>
            </div>

            <div className="admin-astrologers-pricing-list">
              {coupons.length === 0 ? (
                <div className="admin-empty-state">
                  <TicketPercent size={48} />
                  <p>No coupons created yet</p>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => openCouponModal(null)}
                  >
                    Create First Coupon
                  </button>
                </div>
              ) : (
                <table className="admin-pricing-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Amount (₹)</th>
                      <th>Status</th>
                      <th>Used</th>
                      <th>Expires</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td><strong>{coupon.code}</strong></td>
                        <td>
                          <span className="admin-badge">
                            {coupon.type === 'once_per_user' ? 'Once Per User' :
                             coupon.type === 'multiple_per_user' ? 'Multiple Per User' :
                             coupon.type === 'one_time_global' ? 'One-Time Global' :
                             coupon.type === 'limited_total' ? 'Limited Total' :
                             coupon.type === 'first_time_only' ? 'First-Time Only' :
                             coupon.type || 'Unknown'}
                          </span>
                        </td>
                        <td>₹{coupon.amount?.toFixed(2) || '0.00'}</td>
                        <td>
                          <span className={`admin-badge ${coupon.active ? 'status-published' : 'status-draft'}`}>
                            {coupon.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {coupon.type === 'limited_total' ? (
                            `${coupon.usedCount || 0}${coupon.maxUses ? ` / ${coupon.maxUses}` : ''}`
                          ) : coupon.type === 'one_time_global' ? (
                            coupon.usedCount > 0 ? 'Used' : 'Available'
                          ) : (
                            `${coupon.usedCount || 0} uses`
                          )}
                        </td>
                        <td>{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {coupon.description || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="admin-action-btn-small"
                              onClick={() => openCouponModal(coupon)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="admin-action-btn-small admin-action-btn-danger"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SiteMap Tab - auto-lists all sitemap pages (discovered from src/app + blog); new pages auto-appear */}
        {activeTab === 'sitemap' && (
          <div className="admin-pricing-section">
            <div className="admin-pricing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h2>Site Map</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {!sitemapLoading && sitemapPages.length > 0 && (
                  <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
                    Total: {sitemapPages.length} page{sitemapPages.length !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  type="button"
                  onClick={fetchSitemapPages}
                  disabled={sitemapLoading}
                  className="admin-btn admin-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  title="Re-scan src/app and blogs to refresh the list"
                >
                  <RefreshCw size={16} className={sitemapLoading ? 'rotating-icon' : ''} />
                  Recrawl site
                </button>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Map size={18} />
                  Open Sitemap (XML)
                </a>
              </div>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
              All pages listed below are included in the sitemap. New pages under <code style={{ background: 'rgba(212,175,55,0.1)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>src/app</code> are auto-discovered; new blog posts appear automatically. Use <code style={{ background: 'rgba(212,175,55,0.1)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>src/lib/sitemap-config.js</code> only to override priority/change frequency.
            </p>
            {sitemapLoading ? (
              <div className="admin-loading-spinner-container">
                <div className="admin-loading-spinner" />
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading sitemap pages…</p>
              </div>
            ) : sitemapPages.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '2rem' }}>
                <Map size={48} />
                <p>No sitemap pages found or failed to load.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="admin-pricing-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>URL / Path</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Change freq.</th>
                      <th>Last modified</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitemapPages.map((page, idx) => (
                      <tr key={page.url || idx}>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={page.url}>
                          {page.path || page.url}
                        </td>
                        <td>
                          <span className={`admin-badge ${page.type === 'blog' ? 'status-published' : ''}`}>
                            {page.type === 'blog' ? 'Blog' : 'Static'}
                          </span>
                        </td>
                        <td>{page.priority}</td>
                        <td>{page.changeFrequency}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#6b7280' }}>
                          {page.lastModified ? new Date(page.lastModified).toLocaleDateString() : '–'}
                        </td>
                        <td>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-action-btn"
                            title="Open in new tab"
                          >
                            <Eye size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Coupon Modal */}
        {showCouponModal && (
          <div className="admin-modal-overlay" onClick={() => setShowCouponModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="admin-modal-header">
                <h2>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
                <button
                  className="admin-modal-close"
                  onClick={() => setShowCouponModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="admin-modal-content">
                <div className="admin-form-group">
                  <label>Coupon Code *</label>
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                    }
                    className="admin-input"
                    placeholder="e.g., WELCOME50"
                    disabled={!!editingCoupon}
                  />
                  <p className="admin-form-help">
                    {editingCoupon ? 'Code cannot be changed after creation' : 'Enter a unique coupon code (will be converted to uppercase)'}
                  </p>
                </div>

                <div className="admin-form-group">
                  <label>Type *</label>
                  <select
                    value={couponForm.type}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, type: e.target.value })
                    }
                    className="admin-input"
                  >
                    <option value="once_per_user">Once Per User (Each user can use once, unlimited users)</option>
                    <option value="multiple_per_user">Multiple Per User (Same user can use multiple times)</option>
                    <option value="one_time_global">One-Time Global (Only one person can ever use it)</option>
                    <option value="limited_total">Limited Total (Limited uses across all users)</option>
                    <option value="first_time_only">First-Time Only (Only for new users)</option>
                  </select>
                  <p className="admin-form-help">
                    Choose how the coupon can be redeemed
                  </p>
                </div>

                <div className="admin-form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    value={couponForm.amount}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, amount: e.target.value })
                    }
                    className="admin-input"
                    placeholder="e.g., 100"
                    min="0"
                    step="0.01"
                  />
                  <p className="admin-form-help">
                    Amount to add to user's wallet when coupon is redeemed
                  </p>
                </div>

                {(couponForm.type === 'limited_total' || couponForm.type === 'multiple_per_user') && (
                  <div className="admin-form-group">
                    <label>
                      {couponForm.type === 'limited_total' ? 'Max Total Uses' : 'Max Uses Per User'} (Optional)
                    </label>
                    <input
                      type="number"
                      value={couponForm.maxUses}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, maxUses: e.target.value })
                      }
                      className="admin-input"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                    <p className="admin-form-help">
                      {couponForm.type === 'limited_total' 
                        ? 'Maximum total number of times this coupon can be used across all users (leave empty for unlimited)'
                        : 'Maximum number of times the same user can use this coupon (leave empty for unlimited)'}
                    </p>
                  </div>
                )}

                <div className="admin-form-group">
                  <label>Expiry Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={couponForm.expiresAt}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, expiresAt: e.target.value })
                    }
                    className="admin-input"
                  />
                  <p className="admin-form-help">
                    Leave empty for no expiration date
                  </p>
                </div>

                <div className="admin-form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={couponForm.description}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, description: e.target.value })
                    }
                    className="admin-input"
                    placeholder="e.g., Welcome bonus for new users"
                    rows="3"
                  />
                </div>

                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={couponForm.active}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, active: e.target.checked })
                      }
                    />
                    Active
                  </label>
                  <p className="admin-form-help">
                    Inactive coupons cannot be redeemed
                  </p>
                </div>

                <div className="admin-modal-actions">
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleSaveCoupon}
                  >
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setShowCouponModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
