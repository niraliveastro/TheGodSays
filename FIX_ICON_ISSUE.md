# Fix: PWA Icon Showing Old icon.svg

## Problem
The PWA/app install prompt is showing the old `icon.svg` (clock icon) instead of your new RahuNow logo.

## Root Cause
The browser/PWA is using cached icon references or the manifest needs updating.

## Solution

The issue is likely browser cache. Here's how to fix it:

### Step 1: Clear Browser Cache

1. **Clear site data:**
   - Open browser DevTools (F12)
   - Go to Application tab
   - Click "Clear site data"
   - Check all boxes and click "Clear"

2. **Or manually:**
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Step 2: Update manifest.json

Make sure `public/manifest.json` has the correct icons and is updated for RahuNow:

```json
{
  "name": "RahuNow - Vedic Astrology & Panchang",
  "short_name": "RahuNow",
  "description": "Your daily Panchang and personalized astrological insights",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#d4af37",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 3: Verify Icon Files

Make sure these files exist in `public/`:
- ✅ `icon-192x192.png` (your new logo)
- ✅ `icon-512x512.png` (your new logo)
- ✅ `favicon.ico` (your new logo)
- ✅ `apple-touch-icon.png` (your new logo)

### Step 4: Unregister Service Worker

The service worker might be caching the old icon:

1. Open DevTools (F12)
2. Application tab → Service Workers
3. Click "Unregister" for your site
4. Refresh page

### Step 5: Test After Deployment

After clearing cache and deploying:
1. Open site in Incognito/Private mode
2. Check the PWA install prompt
3. Should show new RahuNow logo

## Quick Fix Commands

```bash
# Clear browser cache
# Use DevTools or:
# Chrome: Ctrl+Shift+Delete → Clear browsing data
# Firefox: Ctrl+Shift+Delete → Clear data
```

## After Fix

- The PWA installer should show your new RahuNow logo
- Browser tab should show new favicon
- App icon when installed should be correct

---

**The main issue is browser cache. Clear it and the new icons will appear!**

