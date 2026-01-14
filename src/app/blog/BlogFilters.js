'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

export default function BlogFilters({ blogs = [] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeFilter, setActiveFilter] = useState('all')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Primary life-based categories (user-first)
  const primaryCategories = [
    'All',
    'Love & Relationships',
    'Marriage & Match Making',
    'Career & Job',
    'Business & Money',
    'Health & Well-Being',
    'Sleep & Mental Peace',
    'Home & Vastu',
    'Spiritual Growth',
    'Daily / Monthly Predictions'
  ]

  // Secondary technical categories (in "More Filters")
  const secondaryCategories = [
    'Astrology Basics',
    'Planets & Grahas',
    'Houses (Bhavas)',
    'Yogas & Doshas',
    'Remedies & Upay',
    'Dasha & Transits',
    'Muhurat & Auspicious Time',
    'Panchang',
    'Festivals & Rituals',
    'Yearly Forecasts'
  ]

  // Extract unique categories from blogs
  const blogCategories = useMemo(() => {
    const allTags = new Set()
    blogs.forEach(blog => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          const normalizedTag = tag?.trim()
          if (normalizedTag && normalizedTag.length > 0) {
            allTags.add(normalizedTag)
          }
        })
      }
    })
    return Array.from(allTags).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
  }, [blogs])

  // Map blog tags to our category structure
  const mapTagToCategory = (tag) => {
    const normalizedTag = tag.toLowerCase().trim()
    
    // Check primary categories first
    for (const category of primaryCategories) {
      if (normalizedTag.includes(category.toLowerCase().replace(/[&/]/g, '').replace(/\s+/g, '')) ||
          category.toLowerCase().replace(/[&/]/g, '').replace(/\s+/g, '').includes(normalizedTag)) {
        return category
      }
    }
    
    // Check secondary categories
    for (const category of secondaryCategories) {
      if (normalizedTag.includes(category.toLowerCase().replace(/[&()]/g, '').replace(/\s+/g, '')) ||
          category.toLowerCase().replace(/[&()]/g, '').replace(/\s+/g, '').includes(normalizedTag)) {
        return category
      }
    }
    
    // Check common mappings
    const mappings = {
      'vastu': 'Home & Vastu',
      'relationship': 'Love & Relationships',
      'marriage': 'Marriage & Match Making',
      'career': 'Career & Job',
      'business': 'Business & Money',
      'health': 'Health & Well-Being',
      'sleep': 'Sleep & Mental Peace',
      'spiritual': 'Spiritual Growth',
      'prediction': 'Daily / Monthly Predictions',
      'astrology': 'Astrology Basics',
      'planet': 'Planets & Grahas',
      'house': 'Houses (Bhavas)',
      'yoga': 'Yogas & Doshas',
      'remedy': 'Remedies & Upay',
      'dasha': 'Dasha & Transits',
      'muhurat': 'Muhurat & Auspicious Time',
      'panchang': 'Panchang',
      'festival': 'Festivals & Rituals'
    }
    
    for (const [key, category] of Object.entries(mappings)) {
      if (normalizedTag.includes(key)) {
        return category
      }
    }
    
    return null
  }

  // Get available categories from blogs
  const availablePrimaryCategories = useMemo(() => {
    const available = new Set(['All'])
    blogCategories.forEach(tag => {
      const category = mapTagToCategory(tag)
      if (category && primaryCategories.includes(category)) {
        available.add(category)
      }
    })
    return Array.from(available)
  }, [blogCategories])

  const availableSecondaryCategories = useMemo(() => {
    const available = new Set()
    blogCategories.forEach(tag => {
      const category = mapTagToCategory(tag)
      if (category && secondaryCategories.includes(category)) {
        available.add(category)
      }
    })
    // Also include all secondary categories that might be used
    secondaryCategories.forEach(cat => {
      if (blogCategories.some(tag => 
        tag.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
      )) {
        available.add(cat)
      }
    })
    return Array.from(available).sort()
  }, [blogCategories])

  // Handle filter click
  const handleFilterClick = (category) => {
    const filterValue = category === 'All' ? 'all' : category.toLowerCase().trim()
    setActiveFilter(filterValue)
    setShowMoreFilters(false) // Close more filters dropdown
    
    // Update URL with filter parameter
    const params = new URLSearchParams(searchParams.toString())
    if (filterValue === 'all') {
      params.delete('category')
      router.push('/blog', { scroll: false })
    } else {
      params.set('category', encodeURIComponent(filterValue))
      router.push(`/blog?${params.toString()}`, { scroll: false })
    }
  }

  // Initialize filter from URL
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      try {
        const decoded = decodeURIComponent(categoryParam).toLowerCase().trim()
        setActiveFilter(decoded)
      } catch (e) {
        setActiveFilter(categoryParam.toLowerCase().trim())
      }
    } else {
      setActiveFilter('all')
    }
  }, [searchParams])

  // Close more filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreFilters && !event.target.closest('.blog-filters-more-container')) {
        setShowMoreFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreFilters])

  return (
    <div className="blog-filters-wrapper">
      <div className="blog-filters">
        {/* Primary Categories */}
        {availablePrimaryCategories.map((category) => {
          const filterValue = category === 'All' ? 'all' : category.toLowerCase().trim()
          const isActive = activeFilter === filterValue || 
                          (category === 'All' && (activeFilter === 'all' || !activeFilter))
          
          return (
            <button
              key={category}
              className={`blog-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleFilterClick(category)}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter by ${category}`}
            >
              {category}
            </button>
          )
        })}

        {/* More Filters Dropdown */}
        {availableSecondaryCategories.length > 0 && (
          <div className="blog-filters-more-container">
            <button
              className={`blog-filter-btn blog-filter-more-btn ${showMoreFilters ? 'active' : ''}`}
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              type="button"
              aria-expanded={showMoreFilters}
              aria-label="More filters"
            >
              More Filters
              <ChevronDown 
                size={16} 
                className={`blog-filter-chevron ${showMoreFilters ? 'rotated' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showMoreFilters && (
              <div className="blog-filters-dropdown">
                {availableSecondaryCategories.map((category) => {
                  const filterValue = category.toLowerCase().trim()
                  const isActive = activeFilter === filterValue
                  
                  return (
                    <button
                      key={category}
                      className={`blog-filter-dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleFilterClick(category)}
                      type="button"
                      aria-pressed={isActive}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
