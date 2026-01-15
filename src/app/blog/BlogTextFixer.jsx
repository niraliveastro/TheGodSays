'use client'

import { useEffect } from 'react'

/**
 * NUCLEAR OPTION: Force proper text alignment after navigation
 * Fixes text spreading issue when returning from blog detail pages
 */
export default function BlogTextFixer() {
  useEffect(() => {
    // Ultra-aggressive text reset
    const forceTextReset = () => {
      const blogPage = document.querySelector('.blog-listing-page')
      if (!blogPage) return
      
      // Force immediate reflow
      void blogPage.offsetHeight
      
      // Nuclear reset - remove ALL computed spacing
      const style = document.createElement('style')
      style.id = 'blog-text-fixer-emergency'
      style.textContent = `
        .blog-listing-page *,
        .blog-listing-page .blog-card *,
        .blog-listing-page .blog-title,
        .blog-listing-page .blog-excerpt,
        .blog-listing-page .blog-meta-date,
        .blog-listing-page .blog-meta-author,
        .blog-listing-page p,
        .blog-listing-page h2,
        .blog-listing-page span {
          text-align: left !important;
          text-align-last: left !important;
          text-justify: none !important;
          word-spacing: 0px !important;
          letter-spacing: 0px !important;
          hyphens: none !important;
          -webkit-hyphens: none !important;
          text-rendering: optimizeLegibility !important;
          font-feature-settings: normal !important;
        }
        
        .blog-listing-page .blog-meta-author {
          text-align: right !important;
        }
        
        .blog-listing-page .blog-hero,
        .blog-listing-page .blog-hero * {
          text-align: center !important;
        }
      `
      
      // Remove old style if exists
      const oldStyle = document.getElementById('blog-text-fixer-emergency')
      if (oldStyle) {
        oldStyle.remove()
      }
      
      // Inject new style at the END of head (highest priority)
      document.head.appendChild(style)
      
      // Also set inline styles as backup
      const targets = blogPage.querySelectorAll('.blog-title, .blog-excerpt, .blog-meta-date, .blog-meta-author, .blog-content p, .blog-content h2, .blog-content span')
      targets.forEach(el => {
        el.style.setProperty('word-spacing', '0px', 'important')
        el.style.setProperty('letter-spacing', '0px', 'important')
        el.style.setProperty('text-align', 'left', 'important')
        el.style.setProperty('text-justify', 'none', 'important')
      })
      
      // Force another reflow
      void blogPage.offsetHeight
    }
    
    // Execute multiple times to ensure it sticks
    forceTextReset()
    setTimeout(forceTextReset, 50)
    setTimeout(forceTextReset, 150)
    setTimeout(forceTextReset, 300)
    
    // Also run on any DOM mutations (in case React re-renders)
    const observer = new MutationObserver(() => {
      forceTextReset()
    })
    
    const blogPage = document.querySelector('.blog-listing-page')
    if (blogPage) {
      observer.observe(blogPage, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      })
    }
    
    return () => {
      observer.disconnect()
      const style = document.getElementById('blog-text-fixer-emergency')
      if (style) style.remove()
    }
  }, [])
  
  return null
}
