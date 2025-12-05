# 📊 Analytics Setup Guide - Google Analytics & Microsoft Clarity

This guide will help you set up Google Analytics and Microsoft Clarity for your TheGodSays application.

## ✅ Implementation Complete!

The following files have been created/updated:
- ✅ `src/components/GoogleAnalytics.js` - Google Analytics component
- ✅ `src/components/MicrosoftClarity.js` - Microsoft Clarity component
- ✅ `src/app/layout.js` - Updated to include both analytics
- ✅ `src/lib/analytics.js` - Utility functions for tracking custom events

---

## 🔧 Step 1: Get Your Google Analytics Measurement ID

1. **Go to Google Analytics**
   - Visit: https://analytics.google.com/
   - Sign in with your Google account

2. **Create a Property (if you don't have one)**
   - Click "Admin" (gear icon) in the bottom left
   - Click "Create Property"
   - Fill in your property details:
     - Property name: "TheGodSays"
     - Time zone: Your timezone
     - Currency: Your currency
   - Click "Next" and complete the setup

3. **Get Your Measurement ID**
   - In Admin → Data Streams
   - Click on your web stream (or create one)
   - You'll see your **Measurement ID** (format: `G-XXXXXXXXXX`)
   - Copy this ID

---

## 🔍 Step 2: Get Your Microsoft Clarity Project ID

1. **Go to Microsoft Clarity**
   - Visit: https://clarity.microsoft.com/
   - Sign in with your Microsoft account (or create one)

2. **Create a New Project**
   - Click "New Project"
   - Project name: "TheGodSays"
   - Website URL: Your website URL (e.g., `https://thegodsays.com`)
   - Click "Create Project"

3. **Get Your Project ID**
   - After creating the project, you'll see a setup page
   - Look for the **Project ID** in the code snippet
   - It's a long alphanumeric string (e.g., `abc123def456ghi789`)
   - Copy this ID

---

## 📝 Step 3: Create Environment File

1. **Create `.env.local` file** in your project root (same level as `package.json`)

2. **Add your IDs** to the file:

```env
# Google Analytics Configuration
# Get your Measurement ID from: https://analytics.google.com/
# Format: G-XXXXXXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Microsoft Clarity Configuration
# Get your Project ID from: https://clarity.microsoft.com/
# Format: alphanumeric string
NEXT_PUBLIC_CLARITY_ID=your-clarity-project-id
```

3. **Replace the placeholder values** with your actual IDs:
   - Replace `G-XXXXXXXXXX` with your actual Google Analytics Measurement ID
   - Replace `your-clarity-project-id` with your actual Microsoft Clarity Project ID

**Example:**
```env
NEXT_PUBLIC_GA_ID=G-ABC123XYZ789
NEXT_PUBLIC_CLARITY_ID=abc123def456ghi789
```

---

## 🚀 Step 4: Restart Your Development Server

After creating/updating `.env.local`:

1. **Stop your current dev server** (Ctrl+C in terminal)

2. **Start it again:**
   ```bash
   npm run dev
   ```

   ⚠️ **Important:** Environment variables are only loaded when the server starts, so you MUST restart!

---

## ✅ Step 5: Verify It's Working

### Google Analytics Verification:

1. **Open your app** in the browser (http://localhost:3000 or your URL)

2. **Open Browser DevTools** (F12)

3. **Go to Network tab** and filter by "gtag" or "analytics"

4. **You should see requests** to `googletagmanager.com` and `google-analytics.com`

5. **Check Google Analytics Dashboard:**
   - Go to https://analytics.google.com/
   - Navigate to Reports → Realtime
   - You should see your visit appear (may take 30-60 seconds)

### Microsoft Clarity Verification:

1. **Open your app** in the browser

2. **Open Browser DevTools** (F12)

3. **Go to Network tab** and filter by "clarity"

4. **You should see requests** to `clarity.ms`

5. **Check Clarity Dashboard:**
   - Go to https://clarity.microsoft.com/
   - Click on your project
   - You should see sessions appearing (may take a few minutes)

---

## 🎯 Step 6: Test in Production

⚠️ **Important Notes:**

- Analytics work best in **production builds**, not development mode
- To test properly, build and run production:

```bash
npm run build
npm start
```

- Then visit your production URL and check the dashboards

---

## 📚 Using Custom Event Tracking

You can track custom events throughout your app using the utility functions in `src/lib/analytics.js`.

### Example Usage:

```javascript
import { trackEvent, trackActionStart, trackActionComplete } from '@/lib/analytics';

// Track a button click
const handleButtonClick = () => {
  trackEvent('button_click', {
    button_name: 'talk_to_astrologer',
    page: '/talk-to-astrologer'
  });
};

// Track a booking flow
const handleBookingStart = () => {
  trackActionStart('astrologer_booking');
};

const handleBookingComplete = (astrologerId, amount) => {
  trackActionComplete('astrologer_booking', {
    astrologer_id: astrologerId,
    amount: amount
  });
};
```

### Common Events to Track:

- **Wallet Recharge**: `trackEvent('wallet_recharge', { amount: 500 })`
- **Astrologer Booking**: `trackEvent('astrologer_booking', { astrologer_id: '123' })`
- **Form Submission**: `trackEvent('form_submit', { form_name: 'kundali' })`
- **Payment Success**: `trackEvent('payment_success', { amount: 1000, method: 'razorpay' })`

---

## 🔒 Security Notes

- ✅ `.env.local` is already in `.gitignore` - your IDs won't be committed
- ✅ Only `NEXT_PUBLIC_*` variables are exposed to the browser (this is safe for analytics IDs)
- ✅ Never commit your `.env.local` file to git

---

## 🐛 Troubleshooting

### Analytics not showing up?

1. **Check environment variables:**
   - Make sure `.env.local` exists in project root
   - Make sure variable names are exactly: `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_CLARITY_ID`
   - Make sure you restarted the dev server after creating `.env.local`

2. **Check browser console:**
   - Open DevTools → Console
   - Look for any errors related to analytics

3. **Check Network tab:**
   - Open DevTools → Network
   - Filter by "gtag" or "clarity"
   - You should see requests being made

4. **Verify IDs:**
   - Double-check your IDs are correct (no extra spaces, correct format)

### Still not working?

- Make sure you're testing in production build (`npm run build && npm start`)
- Analytics may take a few minutes to appear in dashboards
- Some ad blockers may block analytics scripts (test in incognito mode)

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Verify your IDs are correct
3. Make sure you restarted the dev server
4. Test in production build mode

---

## ✨ You're All Set!

Once you've added your IDs to `.env.local` and restarted your server, analytics will start tracking automatically. No additional code changes needed!

Happy tracking! 📊🎉

