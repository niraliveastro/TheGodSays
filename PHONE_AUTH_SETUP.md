# Phone Number Authentication with OTP Setup

## Overview
Phone number-based authentication with OTP verification has been successfully implemented in your application. Users can now log in or sign up using their phone number instead of email/password.

## What Was Implemented

### 1. AuthContext Updates (`src/contexts/AuthContext.js`)
- Added `signInWithPhoneNumber()` method to send OTP to phone numbers
- Added `verifyOTP()` method to verify the OTP code
- Integrated Firebase's `RecaptchaVerifier` for phone authentication
- Handles reCAPTCHA setup and cleanup automatically

### 2. User Auth Page Updates (`src/app/auth/user/page.js`)
- Added toggle between Email and Phone authentication methods
- Phone number input field with country code format guidance
- OTP input field (shown after OTP is sent)
- Resend OTP functionality
- Automatic profile creation for new phone users

## How It Works

### User Flow:
1. User selects "Phone" authentication method
2. User enters phone number with country code (e.g., +91XXXXXXXXXX)
3. User clicks "Send OTP"
4. Firebase sends OTP via SMS (reCAPTCHA verification happens automatically)
5. User enters 6-digit OTP
6. User clicks "Verify OTP"
7. User is authenticated and redirected

### Technical Flow:
1. `signInWithPhoneNumber()` sets up invisible reCAPTCHA and sends OTP
2. Confirmation result is stored in module scope
3. `verifyOTP()` uses the confirmation result to verify the code
4. User profile is fetched/created in Firestore
5. User is redirected based on their role

## Firebase Configuration Required

### 1. Enable Phone Authentication in Firebase Console
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Phone" provider
3. Configure reCAPTCHA settings (invisible reCAPTCHA is used)

### 2. Set Up reCAPTCHA (if not already done)
- Firebase will automatically handle reCAPTCHA v3 for phone authentication
- The invisible reCAPTCHA is configured in the code
- No additional setup needed if Firebase project is properly configured

### 3. Test Phone Numbers (for development)
- Firebase provides test phone numbers for development
- Go to Firebase Console → Authentication → Sign-in method → Phone
- Add test phone numbers and OTP codes for testing

## Usage Example

```javascript
// In your component
const { signInWithPhoneNumber, verifyOTP } = useAuth();

// Send OTP
try {
  await signInWithPhoneNumber('+1234567890');
  // OTP sent successfully
} catch (error) {
  console.error('Error:', error);
}

// Verify OTP
try {
  const result = await verifyOTP('123456');
  // User authenticated
} catch (error) {
  console.error('Error:', error);
}
```

## Features

✅ Phone number validation (country code required)  
✅ Automatic OTP sending via Firebase  
✅ 6-digit OTP verification  
✅ Resend OTP functionality  
✅ Automatic user profile creation  
✅ Error handling and user feedback  
✅ Analytics tracking (login attempts/success/failure)  
✅ Role-based redirection after authentication  
✅ Clean reCAPTCHA cleanup on errors  

## Important Notes

1. **Phone Number Format**: Users must include country code (e.g., +91 for India, +1 for USA)
2. **OTP Expiry**: Firebase OTPs expire after a certain time (usually 5-10 minutes)
3. **Rate Limiting**: Firebase has rate limits for OTP sending to prevent abuse
4. **Cost**: Phone authentication uses Firebase's SMS service (may have costs)
5. **Testing**: Use Firebase test phone numbers during development to avoid SMS costs

## Troubleshooting

### reCAPTCHA Errors
- Ensure Firebase project has reCAPTCHA configured
- Check that the container element exists in DOM
- Verify Firebase configuration is correct

### OTP Not Received
- Check phone number format (must include country code)
- Verify Firebase phone authentication is enabled
- Check Firebase console for any errors
- Ensure test mode is configured if testing

### Verification Failed
- OTP might have expired (request new OTP)
- OTP might be incorrect
- Check browser console for detailed error messages

## Next Steps

1. **Enable Phone Auth in Firebase Console** (if not already done)
2. **Test with Firebase test numbers** during development
3. **Configure production SMS settings** if needed
4. **Add phone number to astrologer auth** (if needed) - similar implementation can be added

## Files Modified

- `src/contexts/AuthContext.js` - Added phone auth methods
- `src/app/auth/user/page.js` - Added phone auth UI

## Additional Features You Can Add

- Phone number formatting/validation library (e.g., libphonenumber-js)
- Country code selector dropdown
- SMS retry with exponential backoff
- Phone number linking to existing email accounts
- Two-factor authentication combining email + phone
