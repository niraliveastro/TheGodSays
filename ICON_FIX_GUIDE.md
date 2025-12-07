# Fix: PWA Icon Showing Old Clock Icon (icon.svg)

## Problem

The PWA/app install prompt is showing the old clock icon from `icon.svg` instead of your new RahuNow logo.

## Why This Happens

1. **Browser Cache** - Browser cached the old `icon.svg` file
2. **Old icon.svg exists** - The old clock icon file is still in `public/icon.svg`
3. **Service Worker Cache** - PWA service worker might have cached the old icon

## Solution Steps

### Step 1: Replace/Remove Old icon.svg

**Option A: Delete the old icon.svg** (if not needed):
```bash
# Delete the old clock icon
# File: public/icon.svg
```

**Option B: Replace it with your logo** (recommended):
- Replace `public/icon.svg` with an SVG version of your RahuNow logo

### Step 2: Clear Browser Cache

**For Chrome/Edge:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Or manually:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **"Clear site data"** button
4. Check all boxes
5. Click **"Clear"**
6. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Step 3: Unregister Service Worker

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **"Service Workers"** in left sidebar
4. Click **"Unregister"** for your site
5. Refresh the page

### Step 4: Test in Incognito

After clearing cache:
1. Open site in **Incognito/Private mode**
2. Check PWA install prompt
3. Should now show new RahuNow logo

## What I've Updated

✅ **layout.js** - Removed icon.svg reference, using PNG icons now  
✅ **manifest.json** - Updated to use RahuNow branding  
✅ Icon references point to:
   - `/favicon.ico`
   - `/icon-192x192.png`
   - `/icon-512x512.png`
   - `/apple-touch-icon.png`

## After Fix

1. **Delete or replace** `public/icon.svg`
2. **Clear browser cache**
3. **Unregister service worker**
4. **Test in incognito mode**
5. PWA should show your new RahuNow logo ✅

## Quick Fix

```bash
# 1. Delete old icon (or replace it)
rm public/icon.svg  # Or replace with new SVG logo

# 2. Clear browser cache (use DevTools)
# 3. Unregister service worker (use DevTools)
# 4. Hard refresh: Ctrl+Shift+R
```

---

**The main issue is browser cache showing the old icon.svg file. Clear cache and the new icons will appear!**

