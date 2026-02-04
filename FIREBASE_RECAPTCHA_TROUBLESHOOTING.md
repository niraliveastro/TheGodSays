# Firebase reCAPTCHA Troubleshooting Guide

## Issue: `auth/invalid-app-credential` Error Persists

Even though your reCAPTCHA key "niraliveastro" appears in Firebase Console, you're still getting the error. Here's how to fix it:

## Step-by-Step Fix

### Step 1: Verify Key is Properly Linked

1. Go to **Firebase Console** → **Authentication** → **Settings** → **reCAPTCHA**
2. Look at the **"Configured platform site keys"** section
3. Click **"Configure site keys"** button (top right of that section)
4. A dialog/modal should open showing your keys
5. **Verify that "niraliveastro" is selected/checked** for the **Web** platform
6. If it's not selected, select it
7. Click **"Save"** or **"Done"**

### Step 2: Verify Phone Authentication is Enabled

1. Go to **Authentication** → **Sign-in method**
2. Find **"Phone"** in the list
3. Click on it
4. **Enable** it if it's not already enabled
5. Click **"Save"**

### Step 3: Check reCAPTCHA Enforcement Mode

1. Go back to **Authentication** → **Settings** → **reCAPTCHA**
2. Check **"Phone authentication enforcement mode"**
3. It should be set to **"AUDIT"** or **"ENFORCE"**
   - **AUDIT**: reCAPTCHA is checked but doesn't block (good for testing)
   - **ENFORCE**: reCAPTCHA is required (production)
4. If it's set to something else, click the pencil icon and change it to **"AUDIT"**

### Step 4: Wait for Propagation

- Firebase changes can take **2-5 minutes** to propagate
- After making changes, wait a few minutes before testing

### Step 5: Clear Browser Cache

1. Clear your browser cache
2. Or use **Incognito/Private mode** to test
3. This ensures you're not using cached Firebase config

### Step 6: Verify Domain Configuration

Make sure your reCAPTCHA key has these domains:

1. Go to **Google Cloud Console** → **Security** → **reCAPTCHA Enterprise**
2. Click on your key "niraliveastro"
3. Check the **"Domain list"** section
4. Ensure these domains are added:
   - `localhost` (for development)
   - `127.0.0.1` (optional, for local development)
   - Your production domains (e.g., `rahunow.com`, `niraliveastro.com`)

### Step 7: Test Again

1. **Restart your dev server**: `npm run dev`
2. **Clear browser cache** or use Incognito mode
3. Go to `/auth/user`
4. Select "Phone" authentication
5. Enter phone number: `+919305897506` (or your test number)
6. Click "Send OTP"

## Common Issues and Solutions

### Issue: Key shows in list but error persists

**Solution:**
- Click "Configure site keys" and explicitly select your key
- Make sure it's selected for the correct platform (Web)
- Save the configuration

### Issue: "Assessment count" is 0

**This is normal!** Assessment count only increases after successful reCAPTCHA verifications. It will increase once phone auth starts working.

### Issue: Phone Authentication not enabled

**Solution:**
- Go to Authentication → Sign-in method
- Enable "Phone" provider
- Save changes

### Issue: Wrong enforcement mode

**Solution:**
- Set enforcement mode to "AUDIT" for testing
- Change to "ENFORCE" for production

### Issue: Domain not in reCAPTCHA key

**Solution:**
- Go to Google Cloud Console → reCAPTCHA Enterprise
- Edit your key "niraliveastro"
- Add missing domains (especially `localhost` for development)
- Save changes

## Verification Checklist

After following all steps, verify:

- [ ] reCAPTCHA key "niraliveastro" is selected in Firebase Console
- [ ] Phone Authentication is enabled
- [ ] Enforcement mode is set to "AUDIT" or "ENFORCE"
- [ ] `localhost` is in the reCAPTCHA key domain list
- [ ] Waited 2-5 minutes after making changes
- [ ] Cleared browser cache or using Incognito mode
- [ ] Restarted dev server
- [ ] Tested phone authentication

## Still Not Working?

If you've followed all steps and it's still not working:

1. **Check Firebase Console logs:**
   - Go to Firebase Console → Authentication → Users
   - Check if there are any error logs

2. **Verify Firebase SDK version:**
   - You have Firebase SDK 12.3.0 ✅ (meets requirement of 11+)

3. **Check browser console:**
   - Look for any additional error messages
   - Check if reCAPTCHA is loading properly

4. **Try creating a new reCAPTCHA key:**
   - Sometimes a fresh key resolves configuration issues
   - Create a new key in Google Cloud Console
   - Link it in Firebase Console

5. **Contact Firebase Support:**
   - If nothing works, contact Firebase support with:
     - Your project ID
     - Error message: `auth/invalid-app-credential`
     - Screenshot of reCAPTCHA configuration

## Quick Test

To quickly verify if reCAPTCHA is working:

1. Open browser console (F12)
2. Go to `/auth/user`
3. Select "Phone" authentication
4. Enter a phone number
5. Click "Send OTP"
6. Check console for:
   - ✅ "reCAPTCHA verified" message = Good!
   - ❌ "reCAPTCHA not configured" = Still needs setup
