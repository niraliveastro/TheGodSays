"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Chat from './Chat';
import './AstrologerAssistantTab.css';

/**
 * AstrologerAssistantTab - LinkedIn-style chat tab component (DEBUGGED VERSION)
 * Displays as a minimized tab at the bottom that expands into a chat interface
 * Shows the names of both individuals in the header
 */
export default function AstrologerAssistantTab({
  pageTitle,
  initialData,
  chatType,
  shouldReset,
  formDataHash,
  chatSessionId,
  show = true,
  hasData = false
}) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(null);
  const [pricing, setPricing] = useState({ creditsPerQuestion: 10 });
  const [remainingGuestQuestions, setRemainingGuestQuestions] = useState(null);
  const isGuest = !user;

  // Extract names from initialData
  const femaleName = initialData?.female?.input?.name || 'Female';
  const maleName = initialData?.male?.input?.name || 'Male';
  const displayName = `${femaleName} + ${maleName}`;

  // DEBUG: Log initialData whenever it changes
  useEffect(() => {
    if (initialData) {
      console.log('='.repeat(80));
      console.log('[AstrologerAssistantTab] 🔍 INITIAL DATA RECEIVED:');
      console.log('='.repeat(80));
      
      // Check match data
      console.log('📊 MATCH DATA:');
      console.log('  Has match:', !!initialData.match);
      if (initialData.match) {
        console.log('  total_score:', initialData.match.total_score);
        console.log('  out_of:', initialData.match.out_of);
        console.log('  Full match object:', JSON.stringify(initialData.match, null, 2));
      } else {
        console.warn('  ⚠️ NO MATCH DATA FOUND!');
      }
      
      // Check female data
      console.log('\n👩 FEMALE DATA:');
      console.log('  Name:', initialData.female?.input?.name);
      console.log('  Has details:', !!initialData.female?.details);
      if (initialData.female?.details) {
        console.log('  Details keys:', Object.keys(initialData.female.details));
        console.log('  Has vimsottari:', !!initialData.female.details.vimsottari);
        console.log('  Has mahaDasas:', !!initialData.female.details.mahaDasas);
        console.log('  Has placements:', !!initialData.female.details.placements);
        console.log('  Has shadbalaRows:', !!initialData.female.details.shadbalaRows);
      }
      
      // Check male data
      console.log('\n👨 MALE DATA:');
      console.log('  Name:', initialData.male?.input?.name);
      console.log('  Has details:', !!initialData.male?.details);
      if (initialData.male?.details) {
        console.log('  Details keys:', Object.keys(initialData.male.details));
        console.log('  Has vimsottari:', !!initialData.male.details.vimsottari);
        console.log('  Has mahaDasas:', !!initialData.male.details.mahaDasas);
        console.log('  Has placements:', !!initialData.male.details.placements);
        console.log('  Has shadbalaRows:', !!initialData.male.details.shadbalaRows);
      }
      
      console.log('='.repeat(80));
    } else {
      console.warn('[AstrologerAssistantTab] ⚠️ No initialData provided!');
    }
  }, [initialData]);

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
      console.log('[AstrologerAssistantTab] 📂 Auto-expanding tab (hasData=true, initialData exists)');
      setIsMinimized(false);
    }
  }, [hasData, initialData]);

  const handleToggle = () => {
    if (isMinimized && !hasData) {
      console.warn('[AstrologerAssistantTab] ⚠️ Tried to expand without data');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    console.log(`[AstrologerAssistantTab] ${isMinimized ? '📂 Expanding' : '📁 Minimizing'} tab`);
    setIsMinimized(!isMinimized);
  };

  if (!show) {
    return null;
  }

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="astrologer-tab-toast">
          Please submit the form first to use the AI assistant
        </div>
      )}

      {/* Backdrop overlay when expanded on mobile */}
      {!isMinimized && (
        <div 
          className="astrologer-tab-backdrop"
          onClick={() => setIsMinimized(true)}
        />
      )}

      {/* LinkedIn-style chat tab */}
      <div className={`astrologer-tab-container ${isMinimized ? 'minimized' : 'expanded'}`}>
        {isMinimized ? (
          // Minimized state - LinkedIn-style tab
          <button
            onClick={handleToggle}
            className="astrologer-tab-minimized"
          >
            <div className="astrologer-tab-avatar">
              <img 
                src="/infinity-symbol.svg" 
                alt="AI Assistant" 
                className="astrologer-tab-avatar-img"
              />
              <span className="astrologer-tab-status-dot"></span>
            </div>
            <div className="astrologer-tab-info">
              <div className="astrologer-tab-name">{displayName}</div>
              <div className="astrologer-tab-subtitle">AI Assistant • Online</div>
            </div>
            <div className="astrologer-tab-toggle-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </div>
          </button>
        ) : (
          // Expanded state - full chat interface
          <div className="astrologer-tab-expanded">
            {/* Header */}
            <div className="astrologer-tab-header">
              <div className="astrologer-tab-header-left">
                <div className="astrologer-tab-avatar-large">
                  <img 
                    src="/infinity-symbol.svg" 
                    alt="AI Assistant" 
                    className="astrologer-tab-avatar-img-large"
                  />
                  <span className="astrologer-tab-status-dot-large"></span>
                </div>
                <div className="astrologer-tab-header-info">
                  <div className="astrologer-tab-header-name">{displayName}</div>
                  <div className="astrologer-tab-header-subtitle">
                    AI Astrologer Assistant • Online
                  </div>
                </div>
              </div>
              <div className="astrologer-tab-header-actions">
                {/* Credits Display */}
                {isGuest ? (
                  <div className="astrologer-tab-credits">
                    <span className="credits-label">Free questions:</span>
                    <span className="credits-value">
                      {remainingGuestQuestions !== null ? remainingGuestQuestions : '3'}
                    </span>
                  </div>
                ) : walletBalance !== null && (
                  <div className="astrologer-tab-credits">
                    <span className="credits-label">Credits:</span>
                    <span className="credits-value">{walletBalance.toFixed(2)}</span>
                  </div>
                )}
                
                <button
                  onClick={handleToggle}
                  className="astrologer-tab-minimize-btn"
                  title="Minimize"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={handleToggle}
                  className="astrologer-tab-close-btn"
                  title="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="astrologer-tab-chat-content">
              {/* Show data status in development mode */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  padding: '8px',
                  background: '#f3f4f6',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#6b7280'
                }}>
                  Data: {initialData?.match?.total_score ? `✓ ${initialData.match.total_score}/${initialData.match.out_of}` : '✗ Missing match data'}
                </div>
              )}
              
              <Chat
                key={`assistant-chat-${chatSessionId}-${formDataHash || 'new'}`}
                pageTitle={pageTitle}
                initialData={initialData}
                chatType={chatType}
                shouldReset={shouldReset}
                formDataHash={formDataHash}
                onClose={null}
                embedded={true}
                onMessageSent={fetchWalletBalance}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}