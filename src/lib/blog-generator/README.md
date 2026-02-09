# Blog Generator Module

Automated blog generation system for astrology content.

## Files

- **`keyword-generator.js`** - Generates keyword combinations (Zodiac × Topic × Time)
- **`content-generator.js`** - AI-powered content generation using OpenAI
- **`blog-generator-service.js`** - Main orchestration service
- **`config.js`** - Configuration management

## Usage

```javascript
import { generateBlogs } from '@/lib/blog-generator/blog-generator-service'

const result = await generateBlogs({
  maxBlogs: 10,
  dryRun: false,
})
```

## API Endpoint

`/api/cron/generate-blogs` - Cron endpoint for automated generation

## Configuration

See `AUTOMATED_BLOG_GENERATION.md` for complete documentation.

## Key Functions

### Keyword Generation
```javascript
import { generateKeywords } from './keyword-generator'

const keywords = generateKeywords({
  currentYear: 2026,
  monthsAhead: 3,
  includeYearly: true,
  includeMonthly: true,
})
```

### Content Generation
```javascript
import { generateBlogContent } from './content-generator'

const content = await generateBlogContent(keyword, {
  useHighLevelModel: true,
  model: 'gpt-4o-mini',
})
```

### Blog Creation
```javascript
import { generateBlogs } from './blog-generator-service'

const result = await generateBlogs({
  maxBlogs: 10,
})
```

## Notes

- Uses GPT-4o-mini by default (cost-effective high-quality model)
- Automatically filters duplicate blogs
- Includes internal linking
- SEO-optimized content
- Auto-publishes to Firestore
