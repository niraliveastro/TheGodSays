# Payment Integration System - Implementation Guide

## Overview

This document describes the complete payment integration system implemented for the astrology platform, including wallet management, Razorpay integration, astrologer pricing, and call billing logic.

## Features Implemented

### ✅ Astrologer Pricing Module
- **Pricing Types**: Per-minute and per-call billing
- **Base Price**: Configurable base rates (₹50/min, ₹300/call, etc.)
- **Discount System**: Optional percentage-based discounts
- **Real-time Updates**: Pricing changes reflect immediately

### ✅ User Wallet System
- **Razorpay Integration**: Secure payment processing
- **Real-time Balance**: Firestore-backed wallet with live updates
- **Transaction History**: Complete transaction tracking
- **Auto-deduction**: Automatic balance deduction during calls

### ✅ Call Billing Logic
- **Per-minute Billing**: Duration-based charging
- **Per-call Billing**: Flat rate with optional extra time charges
- **Balance Validation**: Prevents calls without sufficient balance
- **Hold & Release**: Money holding system for call security

## File Structure

```
src/
├── lib/
│   ├── razorpay.js          # Razorpay configuration & utilities
│   ├── wallet.js            # Wallet management service
│   ├── pricing.js           # Astrologer pricing service
│   ├── billing.js           # Call billing logic
│   └── paymentTest.js       # Testing utilities
├── app/
│   ├── api/
│   │   ├── payments/
│   │   │   ├── wallet/route.js      # Wallet API endpoints
│   │   │   └── verify/route.js      # Payment verification
│   │   ├── billing/route.js         # Billing management API
│   │   └── pricing/route.js         # Pricing management API
│   ├── wallet/page.js               # User wallet page
│   └── astrologer-dashboard/pricing/page.js  # Astrologer pricing page
├── components/
│   ├── Wallet.jsx                   # Wallet UI component
│   └── PricingManager.jsx           # Pricing management UI
└── app/layout.js                    # Updated with Razorpay script
```

## API Endpoints

### Wallet Management (`/api/payments/wallet`)
```javascript
POST /api/payments/wallet
{
  "action": "recharge",
  "userId": "user123",
  "amount": 100
}

{
  "action": "get-balance",
  "userId": "user123"
}

{
  "action": "get-history",
  "userId": "user123"
}
```

### Payment Verification (`/api/payments/verify`)
```javascript
POST /api/payments/verify
{
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_abc",
  "razorpay_signature": "signature_123",
  "userId": "user123"
}
```

### Billing Management (`/api/billing`)
```javascript
POST /api/billing
{
  "action": "validate-balance",
  "userId": "user123",
  "astrologerId": "astro456"
}

{
  "action": "initialize-call",
  "callId": "call789",
  "userId": "user123",
  "astrologerId": "astro456"
}

{
  "action": "immediate-settlement",
  "callId": "call789",
  "durationMinutes": 15
}
```

### Pricing Management (`/api/pricing`)
```javascript
POST /api/pricing
{
  "action": "set-pricing",
  "astrologerId": "astro456",
  "pricingType": "per_minute",
  "basePrice": 50,
  "discountPercent": 10
}

{
  "action": "get-pricing",
  "astrologerId": "astro456"
}
```

## Environment Variables Required

Add these to your `.env.local`:

```env
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Existing Firebase variables (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
```

## Database Schema

### Wallets Collection
```javascript
{
  userId: "string",
  balance: "number",
  transactions: [
    {
      id: "string",
      type: "credit|debit|hold",
      amount: "number",
      description: "string",
      timestamp: "Date",
      status: "completed|pending",
      callId?: "string"
    }
  ],
  createdAt: "Date",
  updatedAt: "Date"
}
```

### Astrologer Pricing Collection
```javascript
{
  astrologerId: "string",
  pricingType: "per_minute|per_call",
  basePrice: "number",
  discountPercent: "number",
  callDurationMins: "number?", // Only for per_call
  finalPrice: "number",
  isActive: "boolean",
  createdAt: "Date",
  updatedAt: "Date"
}
```

### Call Billing Collection
```javascript
{
  callId: "string",
  userId: "string",
  astrologerId: "string",
  pricing: "object",
  status: "active|completed|cancelled",
  startTime: "Date",
  endTime: "Date?",
  initialHoldAmount: "number",
  totalCost: "number",
  finalAmount: "number",
  durationMinutes: "number",
  billingType: "per_minute|per_call",
  createdAt: "Date",
  updatedAt: "Date"
}
```

## Usage Examples

### For Users

1. **Check Wallet Balance**
```javascript
const response = await fetch('/api/payments/wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get-balance',
    userId: 'user123'
  })
})
```

2. **Recharge Wallet**
```javascript
const response = await fetch('/api/payments/wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'recharge',
    userId: 'user123',
    amount: 100
  })
})
```

### For Astrologers

1. **Set Pricing**
```javascript
const response = await fetch('/api/pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'set-pricing',
    astrologerId: 'astro456',
    pricingType: 'per_minute',
    basePrice: 50,
    discountPercent: 10
  })
})
```

### Call Flow Integration

1. **Before Starting Call**
```javascript
// Validate balance
const balanceCheck = await fetch('/api/billing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'validate-balance',
    userId: 'user123',
    astrologerId: 'astro456'
  })
})

// Initialize billing
const billingInit = await fetch('/api/billing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'initialize-call',
    callId: 'call789',
    userId: 'user123',
    astrologerId: 'astro456'
  })
})
```

2. **During Call**
```javascript
// Update duration (call this periodically)
await fetch('/api/billing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update-duration',
    callId: 'call789',
    durationMinutes: 10
  })
})
```

3. **After Call Ends**
```javascript
// Immediate settlement with duration-based charging
await fetch('/api/billing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'immediate-settlement',
    callId: 'call789',
    durationMinutes: 15
  })
})
```

## Testing

### Using Test Utilities

```javascript
import { PaymentTestUtils } from '@/lib/paymentTest.js'

// Run all tests
const results = await PaymentTestUtils.runAllTests('user123', 'astro456')
console.log(results)
```

### Manual Testing Steps

1. **Setup Razorpay Account**
   - Create Razorpay account at https://razorpay.com
   - Get API keys from dashboard
   - Add to environment variables

2. **Test Wallet Operations**
   - Navigate to `/wallet`
   - Try recharging wallet
   - Check transaction history

3. **Test Astrologer Pricing**
   - Login as astrologer
   - Navigate to `/astrologer-dashboard/pricing`
   - Set different pricing configurations

4. **Test Call Flow**
   - Try starting a call from `/talk-to-astrologer`
   - Verify balance validation works
   - Check billing records in database

## Security Features

- **Payment Verification**: All payments verified with Razorpay signatures
- **Balance Validation**: Prevents overspending
- **Transaction Logging**: Complete audit trail
- **Input Sanitization**: All API inputs validated
- **Error Handling**: Comprehensive error management

## Deployment Checklist

- [ ] Set up Razorpay account and get API keys
- [ ] Add environment variables to production
- [ ] Test payment flow in staging environment
- [ ] Verify webhook endpoints (if using)
- [ ] Set up monitoring for failed payments
- [ ] Configure proper error logging

## Troubleshooting

### Common Issues

1. **Razorpay script not loading**
   - Check if script is included in layout.js
   - Verify internet connection

2. **Payment verification failing**
   - Check Razorpay webhook secret
   - Verify payment signature calculation

3. **Balance not updating**
   - Check Firestore security rules
   - Verify API endpoint responses

4. **Pricing not saving**
   - Check astrologer authentication
   - Verify Firestore permissions

## Support

For issues or questions regarding the payment system:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Test API endpoints individually
4. Check Firestore security rules

## Future Enhancements

- Webhook integration for payment status updates
- Multi-currency support
- Advanced analytics and reporting
- Automated refund system
- Integration with more payment gateways