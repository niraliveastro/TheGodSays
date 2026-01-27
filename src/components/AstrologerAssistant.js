"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Chat from './Chat';
import './AstrologerAssistant.css';

/**
 * AstrologerAssistant - Floating popup card component
 * Displays as a minimized button that expands into a full chat interface
 * Matches the design shown in the reference images
 */
export default function AstrologerAssistant({
  pageTitle,
  initialData,
  chatType,
  shouldReset,
  formDataHash,
  chatSessionId,
  show = true, // Always show the minimized button
  hasData = false // New prop to check if data/results exist
}) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(null);
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10 });
  const [remainingGuestQuestions, setRemainingGuestQuestions] = useState(null);
  const isGuest = !user;

  // Drag and resize state
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      // Position so bottom aligns with minimized button
      // Minimized button is at bottom: 24px from bottom, height ~60px
      // So we want expanded window bottom at same position
      const bottomOffset = 24; // Same as minimized button's bottom position
      const expandedHeight = 600;
      const topPosition = window.innerHeight - expandedHeight - bottomOffset;
      
      return { 
        x: window.innerWidth - 420 - 24, // Start from right side
        y: Math.max(24, topPosition) // Ensure it doesn't go above viewport
      };
    }
    return { x: 24, y: 24 };
  });
  const [size, setSize] = useState({ width: 420, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Fetch wallet balance and pricing
  const fetchWalletBalance = useCallback(async () => {
    if (user) {
      try {
        const userId = user.uid;
        const walletRes = await fetch('/api/payments/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-balance', userId })
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletBalance(walletData.wallet?.balance || 0);
        }
      } catch (error) {
        console.error('Error fetching wallet:', error);
      }
    } else {
      // Update guest questions count
      const guestUsageKey = 'guestChatUsage';
      const stored = localStorage.getItem(guestUsageKey);
      if (stored) {
        try {
          const usage = JSON.parse(stored);
          const remaining = Math.max(0, (pricing.maxFreeQuestionsForGuests || 3) - (usage.count || 0));
          setRemainingGuestQuestions(remaining);
        } catch (e) {
          setRemainingGuestQuestions(pricing.maxFreeQuestionsForGuests || 3);
        }
      } else {
        setRemainingGuestQuestions(pricing.maxFreeQuestionsForGuests || 3);
      }
    }
  }, [user, pricing.maxFreeQuestionsForGuests]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pricing
        const pricingRes = await fetch('/api/pricing/public');
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          setPricing(pricingData);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      }
    };

    fetchData();
  }, []);

  // Fetch wallet/guest data whenever user changes
  useEffect(() => {
    fetchWalletBalance();
  }, [user, fetchWalletBalance]);

  // Custom event listener for wallet updates
  useEffect(() => {
    const handleWalletUpdate = () => {
      fetchWalletBalance();
    };

    window.addEventListener('chatMessageSent', handleWalletUpdate);
    return () => window.removeEventListener('chatMessageSent', handleWalletUpdate);
  }, [fetchWalletBalance]);

  // Auto-expand when new data is loaded
  useEffect(() => {
    if (hasData && initialData) {
      setIsMinimized(false);
    }
  }, [hasData, initialData]);

  const handleToggle = () => {
    // Only allow expansion if data exists
    if (isMinimized && !hasData) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    setIsMinimized(!isMinimized);
  };

  if (!show) {
    return null;
  }

  // Drag handlers
  const handleDragStart = (e) => {
    if (isMobile) return; // Disable drag on mobile
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleDrag = useCallback((e) => {
    if (!isDragging || isMobile) return;
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - size.width - 24;
    const maxY = window.innerHeight - size.height - 24;
    
    setPosition({
      x: Math.max(24, Math.min(newX, maxX)),
      y: Math.max(24, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart, size, isMobile]);

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Resize handlers
  const handleResizeStart = (e) => {
    if (isMobile) return; // Disable resize on mobile
    e.stopPropagation();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    setIsResizing(true);
    setResizeStart({
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleResize = useCallback((e) => {
    if (!isResizing || isMobile) return;
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - resizeStart.x;
    const deltaY = clientY - resizeStart.y;
    
    const newWidth = Math.max(320, Math.min(800, resizeStart.width + deltaX));
    const newHeight = Math.max(400, Math.min(window.innerHeight - 100, resizeStart.height + deltaY));
    
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, resizeStart, isMobile]);

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // Mouse/touch event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResize);
      window.addEventListener('touchend', handleResizeEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResize);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize]);

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="astrologer-toast">
          Form Submission Required!
        </div>
      )}

      {/* Backdrop overlay when expanded on mobile */}
      {!isMinimized && (
        <div 
          className="astrologer-backdrop"
          onClick={() => setIsMinimized(true)}
        />
      )}

      {/* Floating card */}
      <div 
        ref={containerRef}
        className={`astrologer-assistant-container ${isMinimized ? 'minimized' : 'expanded'} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
        style={!isMinimized && !isMobile ? {
          right: 'auto',
          bottom: 'auto',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`
        } : undefined}
      >
        {isMinimized ? (
          // Minimized state - compact button
          <button
            onClick={handleToggle}
            className="astrologer-minimized-button"
          >
            <div className="astrologer-icon">
              <img 
                src="/infinity-symbol.svg" 
                alt="Infinity" 
                style={{
                  width: "24px",
                  height: "24px",
                  filter: "brightness(0) invert(1)",
                  transform: "rotate(-45deg)"
                }}
              />
            </div>
            <div className="astrologer-info">
              <div className="astrologer-title">Astrologer Assistant</div>
              <div className="astrologer-status">
                <span className="status-dot"></span>
                <span className="status-text">Online</span>
              </div>
            </div>
            <div className="expand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </div>
          </button>
        ) : (
          // Expanded state - full chat interface
          <div className="astrologer-expanded-card">
            {/* Header */}
            <div 
              className="astrologer-header"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              style={{ cursor: isMobile ? 'default' : 'move' }}
            >
              <div className="astrologer-header-content">
                <div className="astrologer-header-left">
                  <div className="astrologer-icon-large">
                    <img 
                      src="/infinity-symbol.svg" 
                      alt="Infinity" 
                      style={{
                        width: "28px",
                        height: "28px",
                        filter: "brightness(0) invert(1)",
                        transform: "rotate(-45deg)"
                      }}
                    />
                  </div>
                  <div className="astrologer-header-info">
                    <div className="astrologer-header-title">Astrologer Assistant</div>
                    <div className="astrologer-header-status">
                      <span className="status-dot-white"></span>
                      <span className="status-text-white">Online</span>
                    </div>
                  </div>
                </div>
                <div className="astrologer-header-actions">
                  {/* Credits Display - Compact */}
                  {isGuest ? (
                    <div className="astrologer-credits-compact">
                      <span className="credits-value">
                        {remainingGuestQuestions !== null ? `${remainingGuestQuestions}` : '3'} free
                      </span>
                    </div>
                  ) : walletBalance !== null && (
                    <div className="astrologer-credits-compact">
                      <span className="credits-value">{walletBalance.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleToggle}
                    className="astrologer-action-button"
                    title="Minimize"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="astrologer-chat-content">
              <Chat
                key={`assistant-chat-${chatSessionId}-${formDataHash || 'new'}`}
                pageTitle={pageTitle}
                initialData={initialData}
                chatType={chatType}
                shouldReset={shouldReset}
                formDataHash={formDataHash}
                onClose={null} // No close button, only minimize
                embedded={true} // Tell Chat component it's embedded in a card
                onMessageSent={fetchWalletBalance} // Update wallet after each message
              />
            </div>

            {/* Resize Handle - Top Right */}
            {!isMobile && (
              <div
                className="astrologer-resize-handle"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                title="Resize"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
