# Firebase Phone Authentication Setup Guide

## Error: `auth/operation-not-allowed`

This error occurs when **Phone Authentication is not enabled** in your Firebase Console. Follow these steps to enable it:

## Step-by-Step Setup

### 1. Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project (TheGodSays)

### 2. Enable Phone Authentication
1. In the left sidebar, click **"Authentication"**
2. Click on the **"Sign-in method"** tab (or "Get started" if you haven't set up auth yet)
3. Scroll down to find **"Phone"** in the list of sign-in providers
4. Click on **"Phone"** to open its settings
5. Toggle the **"Enable"** switch to **ON**
6. Click **"Save"**

### 3. Configure reCAPTCHA (Important!)
Firebase will automatically use reCAPTCHA for phone authentication. You may see options for:

- **reCAPTCHA verifier**: Choose "Invisible reCAPTCHA" (this is what we're using in the code)
- **reCAPTCHA Enterprise**: If available, you can use this for better protection

**Note**: The code already uses invisible reCAPTCHA, so make sure your Firebase project supports it.

### 4. Set Up Test Phone Numbers (For Development)

To avoid SMS costs during development:

1. In the Phone authentication settings, scroll to **"Phone numbers for testing"**
2. Click **"Add phone number"**
3. Add test phone numbers with their corresponding OTP codes:
   - Phone: `+919305897506` (or your test number)
   - Code: `123456` (or any 6-digit code you want)
4. Click **"Save"**

**Important**: When using test numbers, Firebase will always return the test OTP code you specified, regardless of what SMS would normally be sent.

### 5. Verify Domain (If Required)

If you're using a custom domain:
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Make sure your domain is listed
3. For localhost development, `localhost` should already be there

### 6. Check Firebase Project Settings

1. Go to **Project Settings** (gear icon)
2. Under **"Your apps"**, verify your web app is registered
3. Check that `NEXT_PUBLIC_FIREBASE_API_KEY` and other env variables are correct

## After Enabling

Once phone authentication is enabled:

1. **Refresh your application**
2. Try the phone authentication again
3. The error should be gone

## Common Issues & Solutions

### Issue 1: Still Getting `operation-not-allowed`
- **Solution**: Make sure you clicked "Save" after enabling Phone authentication
- **Solution**: Refresh Firebase Console and verify the toggle is ON
- **Solution**: Wait a few minutes for changes to propagate

### Issue 2: reCAPTCHA Errors
- **Solution**: Ensure your domain is authorized in Firebase Console
- **Solution**: Check browser console for reCAPTCHA-specific errors
- **Solution**: Try clearing browser cache

### Issue 3: OTP Not Received (Production)
- **Solution**: Check Firebase Console → Usage & Billing for SMS quota
- **Solution**: Verify phone number format includes country code (+91)
- **Solution**: Check Firebase Console → Authentication → Users for any errors

### Issue 4: Test Numbers Not Working
- **Solution**: Make sure you're using the exact phone number you added in test numbers
- **Solution**: Use the exact OTP code you specified in test settings
- **Solution**: Test numbers only work in development, not production

## Production Considerations

### SMS Costs
- Firebase charges for SMS sent via phone authentication
- Consider using test numbers during development
- Monitor usage in Firebase Console → Usage & Billing

### Rate Limiting
- Firebase has rate limits to prevent abuse
- Too many requests from same IP may be temporarily blocked
- Use test numbers during development to avoid hitting limits

### Phone Number Format
- Always include country code (e.g., +91 for India)
- Format: `+[country code][number]`
- Examples:
  - India: `+919305897506`
  - USA: `+11234567890`
  - UK: `+441234567890`

## Verification Checklist

After setup, verify:

- [ ] Phone authentication is enabled in Firebase Console
- [ ] reCAPTCHA is configured (invisible)
- [ ] Test phone numbers are added (for development)
- [ ] Domain is authorized (if using custom domain)
- [ ] Firebase environment variables are correct
- [ ] Application is refreshed

## Quick Test

1. Enable phone auth in Firebase Console
2. Add a test phone number: `+919305897506` with code `123456`
3. In your app, enter: `+919305897506`
4. Click "Send OTP"
5. Enter OTP: `123456`
6. Should work! ✅

## Need Help?

If you still encounter issues:

1. Check Firebase Console → Authentication → Users for error logs
2. Check browser console for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure Firebase project has billing enabled (for production SMS)

---

**Once phone authentication is enabled, the `auth/operation-not-allowed` error will disappear!**
