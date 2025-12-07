# Quick Start: Account Setup for RahuNow.com

Follow these steps in order to get your SEO accounts set up.

## 🚀 Step 1: Environment Variable (5 minutes)

### Create `.env.local` file:

1. In your project root folder, create a new file named `.env.local`
2. Add this line:

```env
NEXT_PUBLIC_SITE_URL=https://rahunow.com
```

3. Save the file
4. **Important:** Restart your development server if it's running

**That's it for Step 1!** ✅

---

## 🔍 Step 2: Google Search Console (15 minutes)

### Part A: Add Your Property

1. Go to: **https://search.google.com/search-console**
2. Click **"Add Property"**
3. Select **"URL prefix"**
4. Enter: `https://rahunow.com`
5. Click **"Continue"**

### Part B: Verify Ownership

**Easiest Method (HTML Meta Tag):**

1. Google will show you a meta tag like:
   ```
   <meta name="google-site-verification" content="ABC123xyz..." />
   ```

2. Copy only the code part: `ABC123xyz...` (the value inside content="")

3. Open this file: `src/app/layout.js`

4. Find line 117 (looks like this):
   ```javascript
   // google: "your-google-verification-code",
   ```

5. Change it to:
   ```javascript
   google: "ABC123xyz...", // Paste your actual code here
   ```

6. Save the file, deploy your site

7. Go back to Google Search Console and click **"Verify"**

### Part C: Submit Sitemap

1. Once verified, click **"Sitemaps"** in the left menu
2. Enter: `sitemap.xml`
3. Click **"Submit"**

**Done with Step 2!** ✅

---

## 📊 Step 3: Google Analytics (Optional - 10 minutes)

1. Go to: **https://analytics.google.com/**
2. Create account → Set up property for `rahunow.com`
3. Get your Measurement ID (looks like `G-XXXXXXXXXX`)
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
5. Restart server

**Done!** ✅

---

## ✅ Step 4: Test Everything

After deploying:

1. **Check Sitemap:** Visit `https://rahunow.com/sitemap.xml`
2. **Check Robots:** Visit `https://rahunow.com/robots.txt`
3. **Test SEO:** Visit https://search.google.com/test/rich-results
   - Enter: `https://rahunow.com`
   - Should show no errors

---

## 📋 What You Need

### Accounts to Create:
- ✅ Google account (for Search Console)
- ⏳ Google Analytics account (optional)

### Codes You'll Get:
- Google Search Console verification code
- Google Analytics Measurement ID (if using)

### Files You'll Edit:
- `.env.local` (create this file)
- `src/app/layout.js` (add verification code)

---

## 🎯 Priority Order

**Do These First:**
1. ✅ Environment variable (`.env.local`)
2. ✅ Google Search Console (most important!)

**Do These Later:**
3. ⏳ Google Analytics (optional)
4. ⏳ Social media accounts (optional)

---

## 🆘 Quick Help

**"Where do I create .env.local?"**
- Same folder as `package.json`
- Project root directory

**"Where do I add the verification code?"**
- File: `src/app/layout.js`
- Line: around 117
- Look for: `verification: { ... }`

**"The verification isn't working!"**
- Make sure you deployed your site after adding the code
- Try the HTML file method instead (see full guide)

---

**Start with Step 1, then move to Step 2. That's all you need to get going!** 🚀

For detailed instructions, see `ACCOUNT_SETUP_GUIDE.md`

