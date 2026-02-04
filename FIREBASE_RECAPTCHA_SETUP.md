# Firebase reCAPTCHA Setup Guide for Phone Authentication

This guide will help you set up reCAPTCHA in Firebase Console, which is **required** for Firebase Phone Authentication (OTP) to work.

## Why reCAPTCHA is Required

Firebase Phone Authentication uses reCAPTCHA to protect against SMS toll fraud (SMS pumping attacks). Without reCAPTCHA configured, you'll get the `auth/invalid-app-credential` error.

## Prerequisites

- ✅ Firebase SDK version 11+ (You have version 12.3.0 - ✅ Good!)
- ✅ Firebase project with Authentication enabled
- ✅ Access to Firebase Console

## Step-by-Step Setup

### Step 1: Navigate to reCAPTCHA Settings

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **NiraLiveAstro-Prod**
3. Navigate to **Authentication** → **Settings** → **reCAPTCHA** (under "Fraud prevention")

### Step 2: Set Up reCAPTCHA Site Keys

1. Click the **"Manage reCAPTCHA"** button (bottom right)
2. This will take you to Google Cloud Console → reCAPTCHA Enterprise

### Step 3: Create reCAPTCHA Keys

#### Option A: Using reCAPTCHA Enterprise (Recommended)

1. In Google Cloud Console, go to **Security** → **reCAPTCHA Enterprise**
2. Click **"Create Key"**
3. Choose **"reCAPTCHA v3"** or **"reCAPTCHA v2 (Invisible)"**
   - For Firebase Phone Auth, **Invisible reCAPTCHA** is recommended
4. Add your domains:
   - `localhost` (for development - **IMPORTANT!**)
   - `127.0.0.1` (optional, for local development)
   - Your production domains (e.g., `rahunow.com`, `www.rahunow.com`, `niraliveastro.com`)
   - **Note:** Make sure to add `localhost` so you can test locally!
5. Review the summary on the right side
6. Click **"Create key"** button (bottom left)
7. **IMPORTANT:** Copy both keys immediately:
   - **Site Key** (public key - starts with something like `6L...`)
   - **Secret Key** (private key - keep this secure!)

#### Option B: Using reCAPTCHA Admin API (Alternative)

If you prefer to use the Firebase Admin API:

1. Go to Firebase Console → **Project Settings** → **Service Accounts**
2. Generate a new private key if needed
3. Use the Admin SDK to configure reCAPTCHA

### Step 4: Get Your Keys

After creating the key, you'll see:

1. **Site Key** (Public Key):
   - Visible on the "Integration" or "Overview" tab
   - Example: `6LfKDBV`
   - Click the copy icon to copy it
   - This is safe to expose in client-side code

2. **Secret Key** (Private Key):
   - Usually shown on the "Overview" tab or when you first create the key
   - **Keep this secret!** Never expose it in client-side code
   - Copy it immediately (you may not be able to see it again)

### Step 5: Configure reCAPTCHA in Firebase Console

**Important:** Firebase Phone Authentication with reCAPTCHA Enterprise works differently:
- You **only need to configure the Site Key** (public key)
- Firebase automatically handles the Secret Key verification on the backend
- No need to paste a Secret Key in Firebase Console!

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **NiraLiveAstro-Prod**
3. Navigate to **Authentication** → **Settings** → **reCAPTCHA** (under "Fraud prevention")
4. Click **"Configure site keys"** button (top right of the "Configured platform site keys" section)
5. For **Web platform**, select or add your reCAPTCHA key:
   - If you see your key "niraliveastro" in the list, select it
   - If not, you may need to link it (Firebase should auto-detect keys from the same project)
6. Click **"Save"** or **"Done"**

**Note:** 
- If your key "niraliveastro" is already showing in the list, Firebase may have auto-linked it
- You can verify by checking if the "Assessment count" increases after testing
- You don't need to manually add reCAPTCHA script tags to your HTML
- Firebase handles reCAPTCHA automatically through the `RecaptchaVerifier` class

### Step 6: Enable Phone Authentication

1. Go to **Authentication** → **Sign-in method**
2. Find **"Phone"** in the list
3. Click on it and **Enable** it
4. Configure any additional settings (test phone numbers, etc.)
5. Click **"Save"**

### Step 7: Verify Configuration

After setup, the reCAPTCHA page should show:
- ✅ reCAPTCHA is configured
- ✅ Site keys are set
- ✅ Status: Active

## Testing

1. **Restart your development server** (if running):
   ```bash
   npm run dev
   ```

2. **Test Phone Authentication**:
   - Go to `/auth/user`
   - Select "Phone" authentication method
   - Enter a phone number with country code (e.g., `+919305897506`)
   - Click "Send OTP"
   - You should receive an OTP via SMS (no more `auth/invalid-app-credential` error!)

## Troubleshooting

### Error: `auth/invalid-app-credential`

**Causes:**
- reCAPTCHA not configured in Firebase Console
- reCAPTCHA site keys not set correctly
- Domain not added to reCAPTCHA allowed domains

**Solutions:**
1. Verify reCAPTCHA is configured in Firebase Console
2. Check that your domain is added to reCAPTCHA allowed domains
3. Ensure reCAPTCHA keys are correct
4. Wait a few minutes for changes to propagate

### Error: `reCAPTCHA expired`

**Solution:** The reCAPTCHA token expired. The code will automatically retry. If it persists, refresh the page.

### Phone Authentication Not Enabled

**Solution:** 
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Phone" provider
3. Save changes

### reCAPTCHA Container Not Found

**Solution:** The code automatically creates the container if missing. If you see this error, check browser console for details.

## Domain Configuration

Make sure to add these domains to your reCAPTCHA configuration:

- **Development:**
  - `localhost`
  - `127.0.0.1`

- **Production:**
  - `rahunow.com`
  - `www.rahunow.com`
  - Your Vercel deployment URL (if using Vercel)

## Additional Notes

- **reCAPTCHA v3** or **Invisible reCAPTCHA** is recommended for better UX
- The code uses **invisible reCAPTCHA** by default
- Changes may take a few minutes to propagate
- Test with a real phone number (Firebase may have quotas for test numbers)

## Verification Checklist

After setup, verify:

- [ ] reCAPTCHA is configured in Firebase Console
- [ ] Site keys are set correctly
- [ ] Phone authentication is enabled
- [ ] Domains are added to reCAPTCHA allowed list
- [ ] Test phone authentication works
- [ ] No `auth/invalid-app-credential` errors

## Support

If you continue to experience issues:

1. Check Firebase Console → Authentication → Settings → reCAPTCHA status
2. Verify Firebase SDK version (should be 11+)
3. Check browser console for detailed error messages
4. Review Firebase documentation: https://firebase.google.com/docs/auth/web/phone-auth

## Quick Reference

- **Firebase Console:** https://console.firebase.google.com/
- **reCAPTCHA Enterprise:** https://console.cloud.google.com/security/recaptcha
- **Firebase Phone Auth Docs:** https://firebase.google.com/docs/auth/web/phone-auth
