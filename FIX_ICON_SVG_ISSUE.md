# Fix: Remove icon.svg from Browser Tab (Keep for Website Use)

## Problem

`icon.svg` is used in your website components, but browsers are auto-detecting it as the favicon/browser tab icon. You want to keep it for website use but remove it from the browser icon.

## Solution: Rename icon.svg

The best solution is to **rename** `icon.svg` to something that browsers won't auto-detect.

### Quick Fix:

**Rename the file:**
- `public/icon.svg` → `public/logo.svg` (or `brand-icon.svg`)

**Why this works:**
- ✅ Browsers won't auto-detect it as favicon
- ✅ You can still use it in your website components
- ✅ Favicon will use `favicon.ico` instead

### Steps:

1. **Rename the file** from `icon.svg` to `logo.svg`
2. **Update any code references** (if any) from `/icon.svg` to `/logo.svg`
3. **Clear browser cache** - The old icon is cached
4. **Test** - Browser tab should show favicon.ico now

### To Find References:

Search for any code using icon.svg:
```bash
# In your code editor, search for:
icon.svg
/icon.svg
```

If found, update those references to the new name.

## Current Setup ✅

Your code is already correct:
- ✅ `layout.js` uses `favicon.ico` and PNG icons (not icon.svg)
- ✅ `manifest.json` uses PNG icons (not icon.svg)
- ❌ Browsers are auto-detecting `icon.svg` file

## After Renaming

1. Browser tab → Shows `favicon.ico` ✅
2. PWA icon → Shows PNG icons from manifest ✅
3. Website components → Still use the renamed logo file ✅

---

**Simple fix: Rename `public/icon.svg` to `public/logo.svg` and update any code references!**

