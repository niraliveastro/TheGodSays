# Fixing Firebase Phone Auth on Localhost

## Issue: `auth/captcha-check-failed` - Hostname match not found

**This error means:** The domain you're accessing the app from (`localhost` or `127.0.0.1`) is not in your reCAPTCHA key's allowed domains list.

## Quick Fix

1. **Check your current hostname:**
   - Are you accessing via `http://localhost:3000`?
   - Or `http://127.0.0.1:3000`?

2. **Add the exact hostname to reCAPTCHA key domains** (see Step 1 below)

3. **Wait 2-5 minutes** for changes to propagate

4. **Clear browser cache** and test again

---

## Issue: `auth/invalid-app-credential` on localhost

Firebase Phone Authentication with reCAPTCHA Enterprise can have issues with localhost. Here's how to fix it:

## Step 1: Add Your Hostname to reCAPTCHA Key Domains

**CRITICAL:** The hostname must match exactly what you see in your browser's address bar!

1. Go to **Google Cloud Console** → **Security** → **reCAPTCHA Enterprise**
2. Click on your key **"niraliveastro"**
3. Click **"Edit key"** (or the pencil icon)
4. Scroll to the **"Domain list"** section
5. **Check what hostname you're using:**
   - Open your app in the browser
   - Look at the address bar
   - Is it `localhost` or `127.0.0.1`?
6. **Add the exact hostname:**
   - Click **"Add a domain"**
   - Enter: `localhost` (if using `http://localhost:3000`)
   - OR enter: `127.0.0.1` (if using `http://127.0.0.1:3000`)
   - Click **"Add"**
7. **Add both for flexibility:**
   - Add `localhost`
   - Add `127.0.0.1`
   - This way both will work
8. **Also add your production domains:**
   - `niraliveastro.com`
   - `rahunow.com`
   - `www.rahunow.com` (if using www)
9. Click **"Save"** or **"Update"**
10. **Wait 2-5 minutes** for changes to propagate

**Important Notes:**
- Don't include the port number (`:3000`) in the domain list
- Just add `localhost` or `127.0.0.1` (without `http://` or port)
- The domain list is case-sensitive, so use lowercase

## Step 2: Verify Firebase Authorized Domains

1. Go to **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**
2. Check if `localhost` is in the list
3. **If missing:**
   - Click **"Add domain"**
   - Enter: `localhost`
   - Click **"Add"**

**Note:** Firebase usually auto-adds `localhost`, but verify it's there.

## Step 3: Try Using 127.0.0.1 Instead

Sometimes `localhost` doesn't work, but `127.0.0.1` does:

1. **Add `127.0.0.1` to reCAPTCHA key domains** (see Step 1)
2. **Access your app via:** `http://127.0.0.1:3000` instead of `http://localhost:3000`
3. Test phone authentication

## Step 4: Check Browser Console for Domain Errors

1. Open browser console (F12)
2. Go to `/auth/user`
3. Select "Phone" authentication
4. Enter phone number and click "Send OTP"
5. Check console for any domain-related errors:
   - `Domain not authorized`
   - `reCAPTCHA domain mismatch`
   - `Invalid domain`

## Step 5: Alternative: Use ngrok or Similar for Testing

If localhost continues to have issues, use a tunnel service:

1. **Install ngrok:** `npm install -g ngrok` or download from ngrok.com
2. **Start your dev server:** `npm run dev` (runs on port 3000)
3. **In another terminal, run:** `ngrok http 3000`
4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)
5. **Add this URL to:**
   - reCAPTCHA key domains (Google Cloud Console)
   - Firebase Authorized Domains
6. **Access your app via the ngrok URL**
7. **Test phone authentication**

## Step 6: Verify reCAPTCHA Key is Active for Web

1. Go to **Firebase Console** → **Authentication** → **Settings** → **reCAPTCHA**
2. Click **"Configure site keys"**
3. Verify **"niraliveastro"** is selected for **Web** platform
4. If not, select it and save

## Common Localhost Issues

### Issue: reCAPTCHA doesn't load on localhost

**Symptoms:**
- No reCAPTCHA challenge appears
- Error: `reCAPTCHA not configured`
- Error: `auth/invalid-app-credential`

**Solutions:**
1. Add `localhost` to reCAPTCHA key domains
2. Add `127.0.0.1` as well
3. Clear browser cache
4. Try accessing via `127.0.0.1` instead of `localhost`

### Issue: Domain verification fails

**Symptoms:**
- Error about domain not being authorized
- reCAPTCHA loads but verification fails

**Solutions:**
1. Verify `localhost` is in Firebase Authorized Domains
2. Verify `localhost` is in reCAPTCHA key domains
3. Wait 2-5 minutes after making changes
4. Clear browser cache

### Issue: Works on production but not localhost

**This is normal!** Some Firebase features work differently on localhost. Solutions:
1. Use ngrok for testing (see Step 5)
2. Deploy to a staging environment
3. Test directly on production (with test phone numbers)

## Quick Test Checklist

- [ ] `localhost` is in reCAPTCHA key domains
- [ ] `127.0.0.1` is in reCAPTCHA key domains (optional)
- [ ] `localhost` is in Firebase Authorized Domains
- [ ] reCAPTCHA key is selected in Firebase Console
- [ ] Phone Authentication is enabled
- [ ] Cleared browser cache
- [ ] Waited 2-5 minutes after changes
- [ ] Tried accessing via `127.0.0.1` instead of `localhost`
- [ ] Checked browser console for domain errors

## Still Not Working?

If localhost still doesn't work after all steps:

1. **Use ngrok** (recommended for testing)
2. **Deploy to staging** and test there
3. **Check Firebase Console logs** for detailed errors
4. **Contact Firebase Support** with:
   - Your project ID
   - Error message
   - Screenshot of reCAPTCHA configuration
   - Screenshot of Authorized Domains

## Production vs Localhost

**Important:** Firebase Phone Authentication works differently on localhost vs production:

- **Localhost:** May have stricter domain verification
- **Production:** Usually works smoothly once configured

If you need to test phone auth locally, consider:
- Using ngrok
- Testing on a staging environment
- Using Firebase test phone numbers (if available)
