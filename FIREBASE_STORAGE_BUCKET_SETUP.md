# How to Find and Set Firebase Storage Bucket Name

## Step 1: Find Your Firebase Storage Bucket Name

### Method 1: From Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click on **Storage** in the left sidebar
4. If Storage is not enabled yet:
   - Click **Get Started**
   - Choose your security rules (start in test mode for now)
   - Select a location for your storage bucket
   - Click **Done**
5. Once Storage is enabled, you'll see your bucket name at the top
   - It will look like: `your-project-id.appspot.com` or `gs://your-project-id.appspot.com`

### Method 2: From Firebase Project Settings

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. Look for **Storage bucket** - it will show something like:
   - `your-project-id.appspot.com`
   - Or `gs://your-project-id.appspot.com`

### Method 3: From Firebase Config (If you have it)

If you have your Firebase web app config, the `storageBucket` field contains the bucket name:
```javascript
storageBucket: "your-project-id.appspot.com"
```

## Step 2: Add to Your Environment File

### For Local Development (.env.local)

1. Create a file named `.env.local` in the root of your project (same folder as `package.json`)
2. Add the following line:

```env
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**Important Notes:**
- Replace `your-project-id.appspot.com` with your actual bucket name
- Do NOT include `gs://` prefix - just use the bucket name
- Example: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thegodsays-newer.appspot.com`

### Example .env.local file:

```env
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## Step 3: Restart Your Development Server

After adding the environment variable:

1. Stop your development server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 4: For Production (Vercel)

If you're deploying to Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - **Value:** `your-project-id.appspot.com` (your actual bucket name)
   - **Environments:** Select Production, Preview, and Development
4. Click **Save**
5. Redeploy your application

## Common Bucket Name Formats

- `{project-id}.appspot.com` (most common)
- `{project-id}.firebasestorage.app` (newer projects)
- Custom bucket names (if you created a custom one)

## Verify It's Working

After setting up, try uploading an image in the blog admin panel (`/admin/blog`). If it works, you'll see the image URL in the format:
```
https://storage.googleapis.com/your-project-id.appspot.com/blog/timestamp-random.jpg
```

## Troubleshooting

### Error: "Storage bucket not configured"
- Make sure `.env.local` exists in the project root
- Make sure the variable name is exactly: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- Restart your dev server after adding the variable
- Check that there are no typos in the bucket name

### Error: "Bucket name not specified or invalid"
- Verify the bucket name doesn't include `gs://` prefix
- Make sure the bucket exists in Firebase Console
- Check that Storage is enabled for your Firebase project

### Images not uploading
- Check Firebase Storage security rules allow uploads
- Verify your Firebase Admin credentials are correct
- Check browser console for detailed error messages
