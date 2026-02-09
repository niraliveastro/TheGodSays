# Automated Blog Generation System

## 🎯 Overview

This system automatically generates and publishes SEO-optimized astrology blogs without manual intervention. It creates unique, high-quality content for various zodiac signs, topics, and time periods.

## 🏗️ Architecture

### Components

1. **Keyword Generator** (`src/lib/blog-generator/keyword-generator.js`)
   - Generates keyword combinations (Zodiac × Topic × Time)
   - Filters out existing blogs
   - Supports yearly, monthly, and "this year" formats

2. **Content Generator** (`src/lib/blog-generator/content-generator.js`)
   - Uses AI (GPT-4o-mini by default) to generate unique content
   - Creates SEO-optimized meta titles and descriptions
   - Generates internal links to related blogs

3. **Blog Generator Service** (`src/lib/blog-generator/blog-generator-service.js`)
   - Orchestrates the entire generation process
   - Creates and publishes blogs to Firestore
   - Manages rate limiting and error handling

4. **Cron API Endpoint** (`src/app/api/cron/generate-blogs/route.js`)
   - Vercel Cron Job endpoint
   - Can be triggered manually or automatically
   - Protected by authentication

5. **Configuration** (`src/lib/blog-generator/config.js`)
   - Centralized configuration
   - Environment variable support
   - Validation

## 📋 Blog Types Generated

### Yearly Blogs
- Format: "Career for Leo in 2026"
- Generated for all 12 zodiac signs × 5 topics = 60 blogs/year

### Monthly Blogs
- Format: "Career for Leo in February 2026"
- Generated for upcoming months (configurable, default: 3 months ahead)
- 12 zodiac signs × 5 topics × months = scalable

### "This Year" Blogs
- Format: "Career for Leo this year"
- Generated for current year
- 12 zodiac signs × 5 topics = 60 blogs

## 🔧 Configuration

### Environment Variables

Add these to your `.env.local` and Vercel environment:

```env
# Blog Generation Settings
BLOG_GEN_CURRENT_YEAR=2026                    # Year to generate blogs for
BLOG_GEN_MONTHS_AHEAD=3                      # Months ahead to generate
BLOG_GEN_INCLUDE_YEARLY=true                 # Include yearly blogs
BLOG_GEN_INCLUDE_MONTHLY=true                # Include monthly blogs
BLOG_GEN_INCLUDE_THIS_YEAR=true              # Include "this year" blogs

# AI Model Settings
BLOG_GEN_USE_HIGH_MODEL=true                 # Use high-level models (GPT-4o-mini)
BLOG_GEN_AI_MODEL=gpt-4o-mini                # AI model to use

# Rate Limiting
BLOG_GEN_DELAY_MS=2000                       # Delay between blog generations (ms)

# Publishing
BLOG_GEN_AUTO_PUBLISH=true                   # Auto-publish blogs
BLOG_GEN_MAX_PER_RUN=10                      # Max blogs per cron run

# Cron Security
CRON_SECRET=your-secret-key-here             # Secret for cron authentication
```

### Vercel Cron Schedule

The cron job runs daily at 2 AM UTC (configured in `vercel.json`):

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

**Schedule Format**: Cron expression (minute hour day month weekday)
- `0 2 * * *` = Daily at 2:00 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday at midnight

## 🚀 Usage

### Automatic Generation (Cron)

Blogs are automatically generated daily based on the cron schedule. No action needed.

### Manual Trigger

#### Via API (Production)

```bash
curl -X GET "https://yourdomain.com/api/cron/generate-blogs?max=5" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Via API (Local Development)

```bash
curl -X GET "http://localhost:3000/api/cron/generate-blogs?max=5"
```

#### Via POST (with options)

```bash
curl -X POST "https://yourdomain.com/api/cron/generate-blogs" \
  -H "Authorization: Bearer YOUR_ADMIN_PASSCODE" \
  -H "Content-Type: application/json" \
  -d '{"max": 5, "dryRun": false}'
```

### Dry Run (Testing)

Test without creating blogs:

```bash
curl -X GET "http://localhost:3000/api/cron/generate-blogs?max=5&dryRun=true"
```

## 📊 Blog Structure

Each generated blog includes:

- **Title**: SEO-optimized (e.g., "Career for Leo in 2026")
- **Slug**: URL-friendly (e.g., "career-for-leo-in-2026")
- **Content**: HTML-formatted, 800-1200 words
  - Proper heading hierarchy (H1, H2, H3)
  - Structured sections
  - Internal links to related blogs
- **Meta Title**: SEO-optimized (e.g., "Leo Career Predictions in 2026 | Vedic Astrology Guide")
- **Meta Description**: 150-160 characters
- **Tags**: Zodiac sign, topic, year/month
- **Status**: Auto-published (`published`)
- **Metadata**: Tracks auto-generation details

## 🔗 Internal Linking Strategy

The system automatically adds internal links to related blogs:

1. **Same Zodiac, Different Topics**: Links to other topics for the same zodiac sign
2. **Same Topic, Related Zodiacs**: Links to adjacent zodiac signs for the same topic

Example: A "Career for Leo in 2026" blog will link to:
- "Love for Leo in 2026"
- "Health for Leo in 2026"
- "Career for Cancer in 2026"
- "Career for Virgo in 2026"

## 🎨 SEO Features

- ✅ Unique, non-repetitive content
- ✅ Proper HTML heading structure
- ✅ SEO-optimized meta titles and descriptions
- ✅ Internal linking
- ✅ Auto-included in sitemap.xml
- ✅ Proper canonical URLs
- ✅ Google Search Console compatible

## 🔒 Security

- Cron endpoint protected by `CRON_SECRET`
- Admin passcode also accepted for manual triggers
- Development mode allows localhost requests
- No public access without authentication

## 📈 Scalability

### Adding New Years

Simply update `BLOG_GEN_CURRENT_YEAR` or add multiple cron jobs for different years.

### Adding New Topics

Edit `TOPICS` array in `src/lib/blog-generator/keyword-generator.js`:

```javascript
export const TOPICS = [
  'Career',
  'Love',
  'Health',
  'Finance',
  'Marriage',
  'Education', // Add new topic
]
```

### Controlling Publishing Rate

Adjust `BLOG_GEN_MAX_PER_RUN` and cron schedule frequency:

- **Daily**: `0 2 * * *` (current)
- **Twice Daily**: `0 2,14 * * *`
- **Every 6 Hours**: `0 */6 * * *`

## 🐛 Troubleshooting

### Blogs Not Generating

1. **Check Cron Secret**: Ensure `CRON_SECRET` is set in Vercel
2. **Check OpenAI API Key**: Verify `OPENAI_API_KEY` is set
3. **Check Firebase**: Ensure Firebase Admin is configured
4. **Check Logs**: View Vercel function logs for errors

### Rate Limiting Issues

- Increase `BLOG_GEN_DELAY_MS` (default: 2000ms)
- Reduce `BLOG_GEN_MAX_PER_RUN` (default: 10)
- Check OpenAI API rate limits

### Duplicate Blogs

The system automatically checks for existing slugs and skips duplicates. If duplicates appear:

1. Check Firestore for existing blogs with same slug
2. Verify slug generation logic
3. Check for race conditions (unlikely with cron)

### Content Quality Issues

- Adjust AI model: Change `BLOG_GEN_AI_MODEL` to `gpt-4o` for higher quality
- Modify prompts in `content-generator.js`
- Review generated content and refine prompts

## 📝 Monitoring

### Check Generation Status

```bash
# View recent generation results
curl "https://yourdomain.com/api/cron/generate-blogs?max=1&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### View Generated Blogs

1. Visit `/admin/blog` to see all blogs
2. Filter by `autoGenerated: true` in Firestore
3. Check blog listing page: `/blog`

## 🎯 Best Practices

1. **Start Small**: Begin with `max=5` to test
2. **Monitor Costs**: Track OpenAI API usage
3. **Review Content**: Periodically review generated blogs
4. **Adjust Schedule**: Find optimal publishing frequency
5. **Update Prompts**: Refine content generation prompts based on results

## 🔄 Workflow Diagram

```
┌─────────────────┐
│  Vercel Cron    │
│  (Daily 2 AM)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  /api/cron/generate-    │
│  blogs                  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Blog Generator Service │
└────────┬────────────────┘
         │
         ├──► Keyword Generator
         │    └──► Filter Existing
         │
         ├──► Content Generator
         │    └──► AI (GPT-4o-mini)
         │
         └──► Create Blog Post
              └──► Firestore
                   └──► Auto-publish
                        └──► Sitemap
```

## 📚 Related Files

- `src/lib/blog-generator/keyword-generator.js` - Keyword generation logic
- `src/lib/blog-generator/content-generator.js` - AI content generation
- `src/lib/blog-generator/blog-generator-service.js` - Main orchestration
- `src/lib/blog-generator/config.js` - Configuration management
- `src/app/api/cron/generate-blogs/route.js` - Cron endpoint
- `vercel.json` - Cron job configuration
- `src/app/sitemap.js` - Auto-includes blogs in sitemap

## ✅ Checklist for Setup

- [ ] Set environment variables in `.env.local` and Vercel
- [ ] Configure `CRON_SECRET` for security
- [ ] Verify OpenAI API key is set
- [ ] Test with dry run: `?dryRun=true`
- [ ] Verify cron job in Vercel dashboard
- [ ] Check first generated blogs in `/admin/blog`
- [ ] Verify blogs appear in sitemap: `/sitemap.xml`
- [ ] Monitor OpenAI API usage
- [ ] Adjust publishing rate as needed

---

**Note**: This system is designed to be production-ready and fully automated. Once configured, it requires no manual intervention.
