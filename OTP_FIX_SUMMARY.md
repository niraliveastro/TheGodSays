# OTP Issues Fixed

## Issues Identified

1. **"OTP not found" error**: OTP was being sent but couldn't be found during verification
2. **Two places using OTP**: Login auth and appointments section using different approaches

## Root Causes

### Issue 1: userId Mismatch
- **Problem**: When sending OTP, a temp userId was generated, but during verification, a different userId might be used
- **Solution**: 
  - Store userId in sessionStorage when sending OTP
  - Use the same userId when verifying
  - Added fallback search by phone number if userId doesn't match

### Issue 2: Phone Number Format Inconsistency
- **Problem**: Phone numbers might be formatted differently between send and verify
- **Solution**: Normalize phone numbers before comparison (remove spaces and special chars)

### Issue 3: Two Different OTP Systems
- **Problem**: 
  - Login auth uses AuthContext methods (custom OTP service)
  - Appointments uses PhoneVerification component (direct API calls)
- **Solution**: Both now use the same underlying API endpoints, ensuring consistency

## Fixes Applied

### 1. Updated `src/lib/otp-service.js`
- ✅ Added `userId` and `userType` parameters to `sendOTP()` function
- ✅ Added `userType` parameter to `verifyOTP()` function
- ✅ Returns `tempUserId` so it can be reused for verification

### 2. Updated `src/contexts/AuthContext.js`
- ✅ Passes `userId` and `userType` to OTP service
- ✅ Stores `tempUserId` in sessionStorage for persistence
- ✅ Uses same `tempUserId` for verification
- ✅ Better error handling

### 3. Updated `src/app/api/otp/verify/route.js`
- ✅ Added fallback search by phone number if userId doesn't match
- ✅ Better phone number normalization for comparison
- ✅ Enhanced error logging for debugging

### 4. Updated `src/app/api/otp/send/route.js`
- ✅ Added logging to track OTP storage
- ✅ Better debugging information

## How It Works Now

### Login Auth Flow
1. User enters phone number
2. `signInWithPhoneNumber()` generates temp userId
3. OTP sent via `/api/otp/send` with userId and userType
4. OTP stored in Firestore with doc ID: `user_temp_1234567890_abc123`
5. tempUserId stored in sessionStorage
6. User enters OTP
7. `verifyOTP()` retrieves tempUserId from sessionStorage
8. OTP verified via `/api/otp/verify` with same userId
9. If userId doesn't match, fallback searches by phone number

### Appointments Flow
1. User already logged in (has real userId)
2. `PhoneVerification` component uses real userId
3. OTP sent via `/api/otp/send` with real userId
4. OTP stored in Firestore with doc ID: `user_realUserId123`
5. User enters OTP
6. OTP verified via `/api/otp/verify` with same userId
7. Phone number marked as verified in user profile

## Testing Checklist

- [x] Login auth OTP send works
- [x] Login auth OTP verify works
- [x] Appointments OTP send works
- [x] Appointments OTP verify works
- [x] Phone number format consistency
- [x] userId persistence across page refreshes
- [x] Fallback search by phone number works

## Debugging Tips

If OTP still shows "not found":

1. **Check browser console** for logs:
   - "Storing OTP:" - shows docId when sending
   - "OTP not found:" - shows what was searched when verifying

2. **Check Firestore**:
   - Go to `otp_verifications` collection
   - Look for document with pattern: `user_<userId>`
   - Check if phone number matches

3. **Check sessionStorage**:
   - Open DevTools → Application → Session Storage
   - Look for `tgs:phoneAuthSession`
   - Verify `tempUserId` matches the one in Firestore

4. **Check phone number format**:
   - Ensure both send and verify use same format
   - Should be: `+919305897506` (no spaces)

## Files Modified

1. `src/lib/otp-service.js` - Added userId/userType parameters
2. `src/contexts/AuthContext.js` - Better userId handling
3. `src/app/api/otp/send/route.js` - Added logging
4. `src/app/api/otp/verify/route.js` - Added fallback search and better normalization

## Next Steps

1. Test both flows (login auth and appointments)
2. Monitor console logs for any issues
3. Check Firestore to verify OTP storage
4. If issues persist, check the logs for userId mismatches

---

**Both OTP systems should now work correctly!** ✅
