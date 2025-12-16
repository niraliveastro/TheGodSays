# Blog System - Quick Start Checklist

Use this checklist to get your blog up and running quickly.

## 🚀 Initial Setup (5 minutes)

- [ ] **Step 1:** Start your development server
  ```bash
  npm run dev
  ```

- [ ] **Step 2:** Visit the blog page to trigger index creation
  - Go to: `http://localhost:3000/blog`
  - Check browser console (F12) for any index errors

- [ ] **Step 3:** Create Firebase Index (if needed)
  - If you see an index error, click the link in the error
  - OR manually create in Firebase Console:
    - Collection: `blogs`
    - Fields: `status` (Ascending), `publishedAt` (Descending)
  - Wait 2-5 minutes for index to build

- [ ] **Step 4:** Verify index is ready
  - Refresh `http://localhost:3000/blog`
  - Should see "No blog posts yet" (no errors)

## ✍️ Create Your First Post (10 minutes)

- [ ] **Step 1:** Go to admin panel
  - URL: `http://localhost:3000/admin/blog`

- [ ] **Step 2:** Fill out the form:
  ```
  Title: Test Blog Post
  Content: <h2>Hello World</h2><p>This is my first blog post!</p>
  Tags: test, getting started
  Status: Published
  ```

- [ ] **Step 3:** Click "Create Blog"

- [ ] **Step 4:** Verify it works
  - Click "View" button
  - Should see your post at `/blog/test-blog-post`

## ✅ Testing Checklist

- [ ] Can access `/admin/blog`
- [ ] Can create a blog post
- [ ] Post appears in the list
- [ ] Can view published post
- [ ] Can edit a post
- [ ] Can delete a post
- [ ] Blog listing page shows the post
- [ ] Individual blog page loads correctly

## 📝 Sample Blog Post Template

Copy this template to create your first real blog post:

**Title:** Understanding Rahu in Vedic Astrology

**Slug:** understanding-rahu-in-vedic-astrology

**Content:**
```html
<h2>Introduction to Rahu</h2>
<p>Rahu is one of the most important shadow planets in Vedic astrology...</p>

<h2>What Does Rahu Represent?</h2>
<p>Rahu represents material desires, ambition, and worldly pursuits...</p>

<h2>Rahu's Effects</h2>
<p>When Rahu is strong in your birth chart, you may experience...</p>

<h2>Remedies for Rahu</h2>
<p>There are several powerful remedies to balance Rahu's energy...</p>

<h2>Conclusion</h2>
<p>Understanding Rahu helps you navigate life's challenges with wisdom...</p>
```

**Meta Title:** Rahu in Vedic Astrology: Complete Guide & Remedies

**Meta Description:** Learn about Rahu, the shadow planet in Vedic astrology. Discover its meaning, effects, and powerful remedies for a balanced life.

**Tags:** rahu, vedic astrology, shadow planets, remedies, jyotish

**Featured Image:** (Add a URL to an image about Rahu)

**Status:** Published

## 🎯 Next Steps

1. Create 3-5 quality blog posts
2. Test SEO metadata (see BLOG_SETUP_GUIDE.md)
3. Submit sitemap to Google Search Console
4. Share on social media to test Open Graph tags

## 📚 Full Documentation

For detailed instructions, see: **BLOG_SETUP_GUIDE.md**
