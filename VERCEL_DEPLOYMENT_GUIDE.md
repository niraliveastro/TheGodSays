# Vercel Deployment Guide for Blog System

This guide explains how to configure your blog system for production deployment on Vercel.

## 🔧 Required Environment Variables

For the blog system to work in production, you **MUST** set these environment variables in your Vercel project:

### Firebase Admin SDK (Required for Blog System)

1. **FIREBASE_PRIVATE_KEY**
   - Your Firebase service account private key
   - Get it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - **Important:** Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - In Vercel, paste it exactly as shown (with newlines)

2. **FIREBASE_CLIENT_EMAIL**
   - Your Firebase service account email
   - Format: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`
   - Found in the same Service Accounts page

3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
   - Your Firebase project ID
   - Example: `thegodsays-newer`
   - Found in Firebase Console → Project Settings → General

### Optional (but recommended)

4. **FIREBASE_PRIVATE_KEY_ID** (optional)
   - Usually auto-detected, but can be set explicitly

5. **FIREBASE_CLIENT_ID** (optional)
   - Usually auto-detected, but can be set explicitly

## 📝 How to Set Environment Variables in Vercel

### Step 1: Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Log in and select your project

### Step 2: Navigate to Settings
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### Step 3: Add Variables
For each variable:

1. Click **Add New**
2. Enter the **Name** (e.g., `FIREBASE_PRIVATE_KEY`)
3. Enter the **Value**
4. Select **Environments**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional, for preview deployments)
5. Click **Save**

### Step 4: Important Notes

**For FIREBASE_PRIVATE_KEY:**
- The private key is a multi-line string
- In Vercel, you can paste it directly - it will preserve newlines
- Make sure to include the BEGIN and END markers
- Example format:
  ```
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
  (multiple lines)
  -----END PRIVATE KEY-----
  ```

**Alternative:** If Vercel doesn't preserve newlines properly:
- Replace actual newlines with `\n` in the value
- The code will automatically convert `\n` back to newlines

## 🔍 How to Get Firebase Service Account Credentials

### Method 1: Generate New Private Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `thegodsays-newer`
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. A JSON file will download
7. Open the JSON file and extract:
   - `private_key` → Use for `FIREBASE_PRIVATE_KEY`
   - `client_email` → Use for `FIREBASE_CLIENT_EMAIL`
   - `project_id` → Use for `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (if different)

### Method 2: Use Existing Service Account

If you already have a service account:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Find your service account email
3. Use that email for `FIREBASE_CLIENT_EMAIL`
4. If you don't have the private key, generate a new one

## ✅ Verification Checklist

After setting environment variables:

- [ ] All 3 required variables are set in Vercel
- [ ] Variables are enabled for **Production** environment
- [ ] `FIREBASE_PRIVATE_KEY` includes BEGIN/END markers
- [ ] `FIREBASE_CLIENT_EMAIL` is in correct format
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your Firebase project
- [ ] Redeployed the application after adding variables

## 🚀 After Deployment

1. **Redeploy your application:**
   - Vercel will automatically redeploy when you add environment variables
   - Or manually trigger: Deployments → Redeploy

2. **Test the blog:**
   - Visit: `https://your-domain.com/blog`
   - Should see "No blog posts yet" (not an error)
   - Visit: `https://your-domain.com/admin/blog`
   - Should be able to create a blog post

3. **Check logs if issues:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment → Functions tab
   - Check for any Firebase Admin initialization errors

## 🐛 Troubleshooting

### Error: "Firebase Admin not initialized"

**Possible causes:**
1. Environment variables not set in Vercel
2. Variables set but not enabled for Production environment
3. Private key format incorrect (newlines not preserved)
4. Application not redeployed after adding variables

**Solution:**
1. Verify all 3 variables are set in Vercel Settings → Environment Variables
2. Make sure they're enabled for **Production**
3. Check the private key format (should include `\n` or actual newlines)
4. Redeploy the application

### Error: "Invalid private key"

**Solution:**
- The private key must include the BEGIN and END markers
- If using `\n` format, make sure each `\n` is actually the characters `\` and `n`, not a newline
- Try copying the key again from Firebase Console

### Blog posts not showing

**Check:**
1. Are posts set to "Published" status?
2. Check Vercel function logs for errors
3. Verify Firebase indexes are created (see BLOG_SETUP_GUIDE.md)
4. Test locally first to ensure it works

## 📚 Related Documentation

- **BLOG_SETUP_GUIDE.md** - Complete setup guide
- **BLOG_QUICK_START.md** - Quick start checklist

## 🔐 Security Notes

- **Never commit** `.env.local` or service account keys to Git
- Environment variables in Vercel are encrypted at rest
- Service account keys should be rotated periodically
- Consider using Vercel's environment variable groups for team access

---

**Need Help?** Check Vercel logs and Firebase Console for detailed error messages.
