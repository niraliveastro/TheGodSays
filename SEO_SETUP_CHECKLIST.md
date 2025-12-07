# SEO Setup Checklist for RahuNow.com

Use this checklist to ensure all SEO components are properly configured and working.

## ✅ Immediate Setup (Required)

### 1. Environment Variable
**Status:** ⚠️ **NEEDS SETUP**

Create or update `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SITE_URL=https://rahunow.com
```

**Why:** This ensures all canonical URLs, Open Graph images, and structured data use the correct domain.

**How to do it:**
1. Create a file named `.env.local` in the project root (same level as `package.json`)
2. Add the line above
3. Restart your development server (`npm run dev`) or rebuild your production app

---

### 2. Open Graph Image
**Status:** ✅ **ALREADY EXISTS**

You already have `public/og-image.jpg` in place! However, verify it meets these requirements:

- ✅ Size: 1200x630 pixels (recommended)
- ✅ Format: JPG or PNG
- ✅ Content: Should include your logo and branding
- ✅ File size: Under 1MB for fast loading

**Optional:** If you want to update it, replace `public/og-image.jpg` with a new image matching the specs above.

---

### 3. Build and Deploy
**Status:** ⚠️ **NEEDS ACTION**

After setting up the environment variable:

1. **Test locally:**
   ```bash
   npm run build
   npm start
   ```

2. **Verify SEO tags are working:**
   - Visit `http://localhost:3000` (or your local port)
   - Right-click → "View Page Source"
   - Check for:
     - `<title>` tag with "RahuNow"
     - `<meta property="og:url" content="https://rahunow.com">`
     - JSON-LD structured data in the `<body>`

3. **Deploy to production:**
   - Make sure `.env.local` values are set in your hosting platform (Vercel, Netlify, etc.)
   - Or set environment variables in your hosting platform dashboard
   - Redeploy your application

---

## 🔍 Post-Deployment Verification

### 4. Test Sitemap
**Status:** ⚠️ **VERIFY AFTER DEPLOY**

After deployment, check if sitemap is accessible:

1. Visit: `https://rahunow.com/sitemap.xml`
2. You should see an XML file with all your pages listed
3. Verify URLs are correct (should all be `rahunow.com`)

---

### 5. Test Robots.txt
**Status:** ⚠️ **VERIFY AFTER DEPLOY**

1. Visit: `https://rahunow.com/robots.txt`
2. Verify it shows:
   - `Sitemap: https://rahunow.com/sitemap.xml`
   - Proper allow/disallow rules

---

### 6. Google Search Console Setup
**Status:** ⚠️ **NEEDS SETUP** (Critical for SEO)

1. **Go to Google Search Console:**
   - Visit: https://search.google.com/search-console

2. **Add Property:**
   - Click "Add Property"
   - Select "URL prefix"
   - Enter: `https://rahunow.com`
   - Click "Continue"

3. **Verify Ownership:**
   Choose one of these methods:

   **Option A - HTML File (Easiest):**
   - Download the HTML file Google provides
   - Place it in `public/` folder (e.g., `public/google1234567890.html`)
   - Deploy and verify
   - Delete the file after verification

   **Option B - HTML Tag:**
   - Copy the meta tag Google provides (looks like: `<meta name="google-site-verification" content="..." />`)
   - Open `src/app/layout.js`
   - Find the `verification` section (around line 115-120)
   - Update it:
     ```javascript
     verification: {
       google: "your-verification-code-here", // Just the content value, not the full tag
     },
     ```
   - Deploy and verify

   **Option C - DNS (Most Secure):**
   - Add a TXT record to your DNS
   - Follow Google's instructions for your domain registrar

4. **Submit Sitemap:**
   - Once verified, go to "Sitemaps" in the left menu
   - Enter: `sitemap.xml`
   - Click "Submit"
   - Wait a few hours/days for Google to crawl

---

### 7. Test Structured Data
**Status:** ⚠️ **VERIFY AFTER DEPLOY**

1. **Google Rich Results Test:**
   - Visit: https://search.google.com/test/rich-results
   - Enter your URL: `https://rahunow.com`
   - Check for any errors or warnings
   - You should see Organization, Website, and Service schemas detected

2. **Schema Markup Validator:**
   - Visit: https://validator.schema.org/
   - Enter your URL
   - Verify schemas are recognized

---

### 8. Test Social Media Sharing
**Status:** ⚠️ **VERIFY AFTER DEPLOY**

**Facebook/Instagram:**
1. Visit: https://developers.facebook.com/tools/debug/
2. Enter: `https://rahunow.com`
3. Click "Debug"
4. Verify:
   - OG title shows "RahuNow - Vedic Astrology & Panchang"
   - OG image displays correctly
   - Description is visible
5. If needed, click "Scrape Again" to refresh Facebook's cache

**Twitter:**
1. Visit: https://cards-dev.twitter.com/validator
2. Enter: `https://rahunow.com`
3. Verify Twitter Card preview looks correct

**LinkedIn:**
1. Visit: https://www.linkedin.com/post-inspector/
2. Enter: `https://rahunow.com`
3. Verify preview card

---

## 📊 Monitoring & Maintenance

### 9. Google Analytics (Optional but Recommended)
**Status:** ✅ **ALREADY IMPLEMENTED** (if you have GA ID)

If you have Google Analytics:
1. Make sure `NEXT_PUBLIC_GA_ID` is set in `.env.local`
2. Verify tracking is working in GA dashboard

---

### 10. Monitor Search Performance
**After 1-2 weeks:**

1. **Google Search Console:**
   - Check "Performance" tab
   - Monitor search impressions and clicks
   - Review "Coverage" for indexing issues

2. **Check Indexing:**
   - Search Google for: `site:rahunow.com`
   - Verify your pages are being indexed
   - It may take a few days/weeks for new sites

---

## 🚀 Quick Start Summary

**To get SEO working immediately:**

1. ✅ Create `.env.local` with `NEXT_PUBLIC_SITE_URL=https://rahunow.com`
2. ✅ Restart dev server or rebuild
3. ✅ Deploy to production
4. ✅ Verify sitemap and robots.txt are accessible
5. ✅ Set up Google Search Console and submit sitemap
6. ✅ Test structured data and social sharing

---

## ⚡ Common Issues & Solutions

### Issue: Sitemap not accessible
**Solution:** 
- Make sure `src/app/sitemap.js` exists
- Verify Next.js is configured correctly
- Check build logs for errors

### Issue: Metadata not showing in social previews
**Solution:**
- Clear cache using Facebook/LinkedIn debug tools
- Verify `og-image.jpg` exists and is accessible
- Check browser console for errors

### Issue: Search Console verification fails
**Solution:**
- Double-check verification code is correct
- Make sure file is in `public/` folder or meta tag is in layout
- Wait 24-48 hours for DNS propagation if using DNS method

### Issue: Structured data errors
**Solution:**
- Use Google's Rich Results Test to identify issues
- Check `src/components/SEOStructuredData.js` for syntax errors
- Verify JSON-LD is valid JSON

---

## 📝 Notes

- **Environment Variables:** Never commit `.env.local` to git (should be in `.gitignore`)
- **Production:** Set environment variables in your hosting platform (Vercel, Netlify, etc.)
- **Updates:** After changing metadata, rebuild and redeploy
- **Caching:** Social media platforms cache previews - use their debug tools to refresh

---

## ✅ Final Checklist Before Going Live

- [ ] `.env.local` created with `NEXT_PUBLIC_SITE_URL`
- [ ] Application rebuilt and deployed
- [ ] `https://rahunow.com/sitemap.xml` accessible
- [ ] `https://rahunow.com/robots.txt` accessible
- [ ] Google Search Console verified
- [ ] Sitemap submitted to Google Search Console
- [ ] Structured data tested (no errors)
- [ ] Social media previews tested (Facebook, Twitter, LinkedIn)
- [ ] Open Graph image displays correctly
- [ ] All metadata visible in page source

---

**Once all items are checked, your SEO setup is complete!** 🎉

For detailed information, see `SEO_IMPLEMENTATION_GUIDE.md`

