/**
 * Analytics utility functions for tracking custom events
 * Use these functions throughout your app to track user interactions
 */

/**
 * Track a custom event in Google Analytics
 * @param {string} eventName - Name of the event (e.g., 'button_click', 'form_submit')
 * @param {object} eventParams - Additional parameters (e.g., { button_name: 'talk_to_astrologer' })
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

/**
 * Track page views manually (usually automatic, but useful for SPA navigation)
 * @param {string} pagePath - The path of the page
 * @param {string} pageTitle - Optional page title
 */
export const trackPageView = (pagePath, pageTitle = '') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

/**
 * Track when a user starts a specific action
 * @param {string} actionName - Name of the action (e.g., 'astrologer_booking', 'wallet_recharge')
 */
export const trackActionStart = (actionName) => {
  trackEvent('action_start', {
    action_name: actionName,
  });
};

/**
 * Track when a user completes a specific action
 * @param {string} actionName - Name of the action
 * @param {object} additionalData - Additional data about the completion
 */
export const trackActionComplete = (actionName, additionalData = {}) => {
  trackEvent('action_complete', {
    action_name: actionName,
    ...additionalData,
  });
};

/**
 * Track when a user abandons a specific action
 * @param {string} actionName - Name of the action
 * @param {string} reason - Optional reason for abandonment
 */
export const trackActionAbandon = (actionName, reason = '') => {
  trackEvent('action_abandon', {
    action_name: actionName,
    reason: reason,
  });
};

// Example usage:
// import { trackEvent, trackActionStart, trackActionComplete } from '@/lib/analytics';
//
// // Track button click
// trackEvent('button_click', { button_name: 'talk_to_astrologer' });
//
// // Track form submission
// trackEvent('form_submit', { form_name: 'kundali_form', success: true });
//
// // Track booking flow
// trackActionStart('astrologer_booking');
// // ... user completes booking ...
// trackActionComplete('astrologer_booking', { astrologer_id: '123', amount: 500 });

