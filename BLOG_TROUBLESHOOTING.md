# Blog System Troubleshooting Guide

## Common Issues and Solutions

### 1. Blogs Not Showing on `/blog` Page

**Symptoms:**
- Blog posts are created successfully in admin panel
- Admin panel shows the posts
- But `/blog` page shows "No blog posts yet"

**Possible Causes & Solutions:**

#### A. Firebase Admin Not Initialized
**Check:**
1. Open browser console (F12) and check for errors
2. Check terminal/command prompt for server errors
3. Look for "Firebase Admin not initialized" errors

**Solution:**
1. Verify `.env.local` file exists in project root
2. Check these environment variables are set:
   ```
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY=your-private-key
   ```
3. Restart development server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

#### B. Blog Status Not Set to "Published"
**Check:**
1. Go to `/admin/blog`
2. Check the status badge on your blog post
3. Should be green "PUBLISHED", not yellow "DRAFT"

**Solution:**
1. Click "Edit" on the blog post
2. Change Status dropdown to "Published"
3. Click "Update Blog"
4. Refresh `/blog` page

#### C. Firebase Index Not Created
**Check:**
1. Visit `/blog` page
2. Check browser console for index errors
3. Look for message like "The query requires an index"

**Solution:**
1. Click the link in the error message (takes you to Firebase Console)
2. OR manually create index:
   - Go to Firebase Console → Firestore → Indexes
   - Create index for collection `blogs`:
     - Field: `status` (Ascending)
     - Field: `publishedAt` (Descending)
   - Wait 2-5 minutes for index to build
3. Refresh `/blog` page

#### D. Data Not in Firestore
**Check:**
1. Go to Firebase Console → Firestore Database
2. Check if `blogs` collection exists
3. Check if documents exist in the collection
4. Verify document has `status: "published"` field

**Solution:**
- If collection doesn't exist, create a blog post via admin panel
- If documents exist but status is wrong, edit via admin panel

---

### 2. Can't Edit Blog Posts

**Symptoms:**
- Click "Edit" button but form doesn't populate
- Form shows but changes don't save
- Error messages appear

**Possible Causes & Solutions:**

#### A. Next.js 15 Params Issue
**Check:**
- Check terminal for errors about `params` needing to be awaited

**Solution:**
- This should be fixed in the latest code
- If still happening, restart dev server

#### B. API Route Error
**Check:**
1. Open browser console (F12)
2. Click "Edit" button
3. Check Network tab for API call to `/api/blog/[id]`
4. Check if request fails or returns error

**Solution:**
1. Check terminal for server errors
2. Verify Firebase Admin is initialized
3. Check that blog ID is correct

#### C. Form Not Populating
**Check:**
1. Click "Edit" button
2. Check if form fields are empty
3. Check browser console for JavaScript errors

**Solution:**
1. Refresh admin page
2. Try editing again
3. Check that blog data exists in Firestore

---

### 3. Delete Not Working / URL Still Visible

**Symptoms:**
- Click "Delete" and confirm
- Blog disappears from admin list
- But URL `/blog/[slug]` still shows the blog post
- Or shows 404 but URL is still accessible

**Possible Causes & Solutions:**

#### A. Next.js Caching
**Check:**
- After deleting, the page might be cached

**Solution:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Try in incognito/private window

#### B. Static Generation Cache
**Check:**
- If using static generation, pages might be pre-rendered

**Solution:**
- The code now includes `export const dynamic = 'force-dynamic'` to prevent caching
- Restart dev server after code changes
- In production, wait for next deployment or clear Vercel cache

#### C. Blog Not Actually Deleted
**Check:**
1. Go to Firebase Console → Firestore Database
2. Check if document still exists in `blogs` collection
3. Verify delete API call succeeded

**Solution:**
1. Check browser console for delete errors
2. Check terminal for server errors
3. Try deleting again
4. If document still exists in Firestore, delete manually from console

---

### 4. Database Question: Do I Need to Create a Database?

**Answer: NO** - The database is already set up!

**How it works:**
1. **Firestore** (Firebase's NoSQL database) is already configured
2. The `blogs` collection is **automatically created** when you create your first blog post
3. You don't need to manually create tables or collections

**To verify:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `thegodsays-newer`
3. Click **Firestore Database** in left sidebar
4. You should see a `blogs` collection (if you've created at least one blog)
5. Click on `blogs` to see your blog documents

**Collection Structure:**
```
blogs/
  └── [auto-generated-id]/
      ├── title: "Your Blog Title"
      ├── slug: "your-blog-slug"
      ├── content: "<h2>Your content...</h2>"
      ├── status: "published" or "draft"
      ├── publishedAt: timestamp
      ├── updatedAt: timestamp
      └── ... (other fields)
```

**Note:** If you don't see the `blogs` collection:
- It will be created automatically when you create your first blog post
- No manual setup needed!

---

## Quick Diagnostic Steps

1. **Check Firebase Admin Initialization:**
   ```bash
   # Check terminal output when starting server
   # Should see: "Firebase Admin initialized successfully"
   # If not, check environment variables
   ```

2. **Check Blog Status:**
   - Go to `/admin/blog`
   - Verify blog status is "PUBLISHED" (green badge)
   - Not "DRAFT" (yellow badge)

3. **Check Firestore:**
   - Go to Firebase Console → Firestore
   - Verify `blogs` collection exists
   - Verify documents have `status: "published"`

4. **Check Browser Console:**
   - Open `/blog` page
   - Press F12 → Console tab
   - Look for errors or logs
   - Should see: `[Blog Page] Fetched X published blogs`

5. **Check Server Logs:**
   - Look at terminal where `npm run dev` is running
   - Check for Firebase errors
   - Check for API route errors

---

## Still Having Issues?

1. **Check all environment variables are set correctly**
2. **Restart development server**
3. **Clear browser cache and hard refresh**
4. **Check Firebase Console for data**
5. **Review terminal and browser console for specific error messages**

---

## Production Deployment

If issues only happen in production (Vercel):

1. **Check Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify all 3 required variables are set:
     - `FIREBASE_PRIVATE_KEY`
     - `FIREBASE_CLIENT_EMAIL`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Make sure they're enabled for **Production** environment

2. **Redeploy:**
   - After adding/changing environment variables, redeploy
   - Go to Deployments → Redeploy

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check for runtime errors

See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed production setup instructions.
