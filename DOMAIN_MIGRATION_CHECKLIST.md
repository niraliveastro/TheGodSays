# Domain Migration Checklist: rahunow.com → niraliveastro.com

## ✅ Code Changes (COMPLETED)
All code has been updated to use `niraliveastro.com`:
- ✅ All SITE_URL fallbacks updated
- ✅ All meta tags and SEO metadata updated
- ✅ robots.txt updated
- ✅ sitemap.js updated
- ✅ All layout files updated

## 🔧 Manual Actions Required

### 1. Environment Variables ⚠️ CRITICAL

#### Local Development (.env file)
Update your `.env` file:
```env
NEXT_PUBLIC_SITE_URL=https://niraliveastro.com
```

#### Production Hosting (Vercel/Firebase/etc.)
Set environment variable in your hosting platform:
- **Vercel**: Settings → Environment Variables → Add `NEXT_PUBLIC_SITE_URL=https://niraliveastro.com`
- **Firebase**: Functions → Environment Configuration
- **Netlify**: Site settings → Environment variables

**After updating, REDEPLOY your application!**

---

### 2. Firebase Authentication ⚠️ CRITICAL (Required for Google Sign-In)

#### A. Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `thegodsays-newer`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add: `niraliveastro.com`
6. Add: `www.niraliveastro.com` (if using www subdomain)
7. Click **Save**

#### B. Google Cloud Console (OAuth 2.0)
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your Firebase project (`thegodsays-newer`)
3. Find and click your **OAuth 2.0 Client ID**
4. Under **"Authorized JavaScript origins"**, add:
   - `https://niraliveastro.com`
   - `https://www.niraliveastro.com`
5. Under **"Authorized redirect URIs"**, add:
   - `https://niraliveastro.com/__/auth/handler`
   - `https://www.niraliveastro.com/__/auth/handler`
6. Click **Save**

**Note:** Keep `rahunow.com` entries if you want backward compatibility during migration.

---

### 3. DNS & Hosting Configuration

If `niraliveastro.com` is not already configured:

#### For Firebase Hosting:
1. Firebase Console → Hosting
2. Add custom domain: `niraliveastro.com`
3. Follow DNS setup instructions
4. Wait for SSL certificate provisioning

#### For Vercel:
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `niraliveastro.com`
3. Configure DNS as instructed
4. Wait for SSL certificate

#### For Other Hosting:
- Follow your hosting provider's instructions for adding custom domains
- Ensure SSL certificate is configured

---

### 4. Google Search Console 📊

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add new property: `https://niraliveastro.com`
3. Verify ownership (DNS record or HTML file)
4. Submit new sitemap: `https://niraliveastro.com/sitemap.xml`
5. Request indexing for key pages

**Keep the old property** (`rahunow.com`) if you're maintaining both domains.

---

### 5. Google Analytics 📈 (If Used)

#### Option A: Update Existing Property
1. Admin → Property Settings
2. Update default URL to `https://niraliveastro.com`
3. Add new hostname if tracking multiple domains

#### Option B: Create New Property (Recommended)
1. Create new GA4 property for `niraliveastro.com`
2. Update tracking code in your application
3. Set up data streams for the new domain

---

### 6. Social Media & Third-Party Services 🔗

#### Facebook/Meta Business (If applicable)
- Update domain in Facebook Pixel/Meta Business settings
- Update Open Graph domain verification

#### Twitter/X (If applicable)
- Update website URL in Twitter profile
- Update Twitter Card domain verification

#### Other Services:
- Email service providers (SendGrid, Mailchimp, etc.)
- Payment gateways (Razorpay, Stripe, etc.) - update return URLs
- Analytics tools (if domain-specific)
- API services that require domain whitelisting

---

### 7. Build & Deploy 🚀

After all configurations:

```bash
# Test locally first
npm run build
npm start

# Verify SEO tags
# Visit http://localhost:3000
# View page source → Check meta tags, canonical URLs

# Deploy to production
# (Use your deployment method: vercel, firebase deploy, etc.)
```

---

### 8. Post-Deployment Verification ✅

After deployment, verify:

1. **Sitemap**: `https://niraliveastro.com/sitemap.xml`
2. **Robots.txt**: `https://niraliveastro.com/robots.txt`
3. **Homepage Meta Tags**: View source, check:
   - `<title>` tag
   - `<meta property="og:url">`
   - Canonical URL
   - JSON-LD structured data
4. **Google Sign-In**: Test authentication on new domain
5. **All Pages**: Verify canonical URLs on all pages
6. **Social Sharing**: Test share buttons (Facebook, Twitter, etc.)

---

### 9. Optional: Backward Compatibility 🔄

If you want to keep `rahunow.com` working during transition:

- ✅ Code already includes both domains in `next.config.mjs`
- ✅ Firebase authorized domains: Keep both domains
- ✅ Set up redirects: 301 redirect from `rahunow.com` to `niraliveastro.com` (in hosting/DNS)

---

## ⏱️ Timeline Recommendation

1. **Week 1**: Complete environment variables + Firebase setup
2. **Week 2**: DNS/hosting configuration + deploy
3. **Week 3**: Search Console + Analytics setup
4. **Week 4**: Monitor and verify all services working

---

## 🆘 Troubleshooting

### Google Sign-In Not Working?
- Wait 5-10 minutes after Firebase/Cloud Console changes
- Clear browser cache
- Check browser console for specific errors
- Verify domain is listed in both Firebase and Google Cloud Console

### SEO Tags Not Updating?
- Clear build cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check environment variable is set correctly
- Verify `NEXT_PUBLIC_SITE_URL` in hosting platform

### Images Not Loading?
- Check `next.config.mjs` domains array includes both domains
- Verify image URLs are using correct domain
- Check browser network tab for failed requests

---

## 📝 Notes

- Code changes are **COMPLETE** ✅
- All hardcoded domain references updated ✅
- Environment variable in `.env.local` already set ✅
- **YOU MUST**: Update `.env`, Firebase, Google Cloud, and hosting platform ⚠️
