# Adding rahunow.com as Authorized Domain for Google Sign-In

To fix the "unauthorized domain" error for Google sign-in on rahunow.com, you need to add the domain in two places:

## 1. Firebase Console (Required)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firebase project
3. Navigate to **Authentication** > **Settings** > **Authorized domains**
4. Click **"Add domain"**
5. Enter: `rahunow.com`
6. Click **"Add"**

**Note:** You may also want to add `www.rahunow.com` if you use the www subdomain.

## 2. Google Cloud Console (Required for OAuth)

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your Firebase project
3. Find and click on your **OAuth 2.0 Client ID** (usually named something like "Web client (auto created by Google Service)")
4. Under **"Authorized JavaScript origins"**, click **"Add URI"** and add:
   - `https://rahunow.com`
   - `https://www.rahunow.com` (if using www subdomain)
5. Under **"Authorized redirect URIs"**, click **"Add URI"** and add:
   - `https://rahunow.com/__/auth/handler`
   - `https://www.rahunow.com/__/auth/handler` (if using www subdomain)
6. Click **"Save"**

## Verification

After adding the domains:

1. Wait a few minutes for changes to propagate
2. Test Google sign-in on `https://rahunow.com`
3. The "unauthorized domain" error should be resolved

## Troubleshooting

- **Still seeing the error?** Clear browser cache and cookies, then try again
- **Changes not taking effect?** Wait 5-10 minutes for Google's servers to update
- **Multiple projects?** Make sure you're editing the correct Firebase/Google Cloud project

## Current Configuration

Your Firebase project ID is configured in `.env.local`:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

Make sure you're editing the correct project in both Firebase and Google Cloud Console.

