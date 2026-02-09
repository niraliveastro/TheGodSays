# CRON_SECRET Setup Guide

## 🔐 What is CRON_SECRET?

The `CRON_SECRET` is a security token used to authenticate requests to your automated blog generation cron endpoint. It ensures that only legitimate cron jobs (from Vercel) or authorized admins can trigger blog generation.

## 📋 How to Get/Set CRON_SECRET

### Option 1: Generate a Random Secret (Recommended)

You can generate a secure random secret using any of these methods:

#### Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Using OpenSSL
```bash
openssl rand -hex 32
```

#### Using Online Generator
Visit: https://randomkeygen.com/ and use a "CodeIgniter Encryption Keys" (256-bit)

#### Using PowerShell (Windows)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Option 2: Use a Memorable Secret

You can use any strong password/phrase, for example:
```
my-astrology-blog-generation-secret-2026
```

**Important**: Make it long (at least 32 characters) and random for security.

## 🔧 Setting CRON_SECRET

### Step 1: Generate Your Secret

Choose one of the methods above to generate a secret. Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 2: Add to Environment Variables

#### Local Development (.env.local)

Add to your `.env.local` file:

```env
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

#### Vercel Production

1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Name**: `CRON_SECRET`
   - **Value**: Your generated secret (paste it)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
6. Click **Save**

### Step 3: Update Vercel Cron Configuration

In your `vercel.json`, the cron job will automatically use the `CRON_SECRET`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-blogs?max=10",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Vercel automatically adds the `Authorization: Bearer <CRON_SECRET>` header when calling cron endpoints.

### Step 4: Redeploy

After adding the environment variable:

1. **Local**: Restart your dev server
   ```bash
   npm run dev
   ```

2. **Vercel**: Redeploy your project
   - Push a new commit, OR
   - Go to Vercel Dashboard → Deployments → Click "Redeploy"

## ✅ Verify It Works

### Test Locally

```bash
# Test with admin passcode (works in development)
curl "http://localhost:3000/api/cron/generate-blogs?max=1&dryRun=true" \
  -H "Authorization: Bearer YOUR_ADMIN_PASSCODE"
```

### Test in Production

```bash
# Test with CRON_SECRET
curl "https://yourdomain.com/api/cron/generate-blogs?max=1&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test via Admin UI

1. Go to `/admin/blog/generate`
2. Click "Test Generation" or "Generate Blogs"
3. Should work without needing to manually enter CRON_SECRET (uses admin passcode)

## 🔒 Security Best Practices

1. **Never commit CRON_SECRET to Git**
   - Already in `.gitignore` (`.env.local` is ignored)
   - Never push secrets to GitHub/GitLab

2. **Use Different Secrets for Different Environments**
   - Development: `CRON_SECRET_DEV`
   - Production: `CRON_SECRET_PROD`

3. **Rotate Secrets Periodically**
   - Change every 3-6 months
   - Update in Vercel environment variables
   - Redeploy

4. **Keep Secrets Secure**
   - Don't share in chat/email
   - Use password managers
   - Limit access to team members who need it

## 🐛 Troubleshooting

### "Unauthorized" Error

**Problem**: Getting 401 Unauthorized when calling cron endpoint

**Solutions**:
1. Check `CRON_SECRET` is set in environment variables
2. Verify the secret matches in both `.env.local` and Vercel
3. Check Authorization header format: `Bearer <secret>`
4. Redeploy after adding environment variable

### Cron Job Not Running

**Problem**: Vercel cron job not executing

**Solutions**:
1. Verify cron job is configured in `vercel.json`
2. Check Vercel Dashboard → Cron Jobs section
3. Ensure project is deployed (not just preview)
4. Check Vercel function logs for errors
5. Verify `CRON_SECRET` is set in Vercel environment variables

### Admin UI Works But Cron Doesn't

**Problem**: Manual generation works, but scheduled cron fails

**Solutions**:
1. Admin UI uses `ADMIN_PASSCODE` (different from `CRON_SECRET`)
2. Cron jobs use `CRON_SECRET`
3. Make sure `CRON_SECRET` is set in Vercel (not just `.env.local`)
4. Check Vercel cron job logs

## 📝 Quick Reference

### Environment Variables Needed

```env
# Required for blog generation
OPENAI_API_KEY=your-openai-key
CRON_SECRET=your-generated-secret

# Optional (has defaults)
BLOG_GEN_MAX_PER_RUN=10
BLOG_GEN_AI_MODEL=gpt-4o-mini
```

### Where to Set

- **Local**: `.env.local` file
- **Vercel**: Settings → Environment Variables

### How Vercel Cron Works

1. Vercel reads `vercel.json` cron configuration
2. At scheduled time, Vercel calls the endpoint
3. Vercel automatically adds: `Authorization: Bearer <CRON_SECRET>`
4. Your endpoint verifies the secret
5. If valid, blog generation runs

## 🎯 Summary

1. **Generate** a random secret (32+ characters)
2. **Add** to `.env.local` for local development
3. **Add** to Vercel Environment Variables for production
4. **Redeploy** your project
5. **Test** using admin UI or curl command

That's it! Your cron job will now authenticate properly. 🎉
