# Firebase Admin Deployment Fix

## Issue
"Firebase Admin not initialized" error after deployment.

## Root Cause
The required environment variables are not set in your production deployment platform (Vercel, Netlify, etc.).

## Required Environment Variables

You need to set these environment variables in your deployment platform:

### Required Variables:
1. **`FIREBASE_PRIVATE_KEY`** - Your Firebase service account private key
   - Get this from Firebase Console → Project Settings → Service Accounts
   - Download the JSON key file
   - Copy the `private_key` value (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines)
   - **Important**: In deployment platforms, you may need to replace actual newlines with `\n` or keep it as a single line

2. **`FIREBASE_CLIENT_EMAIL`** - Your Firebase service account email
   - Found in the same JSON key file as `client_email`
   - Format: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`

3. **`NEXT_PUBLIC_FIREBASE_PROJECT_ID`** - Your Firebase project ID
   - Found in Firebase Console → Project Settings → General
   - This should already be set if your frontend Firebase works

### Optional Variables:
- `FIREBASE_PRIVATE_KEY_ID` - Usually not needed, defaults to 'fbsvc'
- `FIREBASE_CLIENT_ID` - Usually not needed, has a default value

## How to Set Environment Variables

### For Vercel:
1. Go to your project dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each variable:
   - Name: `FIREBASE_PRIVATE_KEY`
   - Value: Your private key (paste the entire key including BEGIN/END lines)
   - Environment: Production, Preview, Development (select all)
4. Repeat for `FIREBASE_CLIENT_EMAIL` and verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set
5. **Redeploy** your application after adding variables

### For Netlify:
1. Go to Site settings → Build & deploy → Environment
2. Add each variable with the same values
3. Redeploy

### For Other Platforms:
Follow your platform's documentation for setting environment variables.

## Important Notes:

1. **Private Key Formatting**:
   - The private key should include the BEGIN and END lines
   - In some platforms, you may need to replace actual newlines with `\n`
   - The code now handles both formats automatically

2. **Security**:
   - Never commit these variables to Git
   - Only set them in your deployment platform's environment variables
   - The `FIREBASE_PRIVATE_KEY` is sensitive - keep it secure

3. **After Setting Variables**:
   - You MUST redeploy for changes to take effect
   - Environment variables are only loaded at build/runtime, not on existing deployments

## Verification

After setting the variables and redeploying, check:
1. The error should disappear
2. Check your deployment logs for "Firebase Admin initialized successfully"
3. Try creating a blog post - it should work

## Troubleshooting

If it still doesn't work:
1. Check deployment logs for specific error messages
2. Verify all three required variables are set
3. Ensure the private key is correctly formatted
4. Check that `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your Firebase project

