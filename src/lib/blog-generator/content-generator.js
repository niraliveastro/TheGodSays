/**
 * AI Content Generator for Astrology Blogs
 * Uses high-level models (like GPT-4) for quality content generation
 * Manages API credits efficiently
 */

/**
 * Generate blog content using AI
 * @param {Object} keyword - Keyword object with title, zodiac, topic, etc.
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated content with title, content, metaTitle, metaDescription
 */
export async function generateBlogContent(keyword, options = {}) {
  const {
    useHighLevelModel = true, // Use GPT-4 or similar high-level model
    model = 'gpt-4o-mini', // Default to cost-effective high-quality model
    temperature = 0.8, // Creative but consistent
  } = options

  const { title, zodiac, topic, timeType, year, month } = keyword

  // Build context-aware prompt
  const prompt = buildContentPrompt(keyword)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: useHighLevelModel ? model : 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert Vedic astrologer and content writer specializing in creating engaging, SEO-optimized astrology blog posts. Your content is:
- Authoritative yet accessible
- Based on Vedic astrology principles
- Practical and actionable
- SEO-friendly with proper heading structure
- Unique and non-repetitive
- Compliant with Google guidelines (no medical/financial guarantees)
- Written in HTML format with proper semantic structure`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 2500, // Sufficient for comprehensive blog posts
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', response.status, errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedContent = data.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error('No content generated from AI')
    }

    // Parse the generated content
    const parsed = parseGeneratedContent(generatedContent, keyword)

    return parsed
  } catch (error) {
    console.error('Error generating blog content:', error)
    throw error
  }
}

/**
 * Build a detailed prompt for content generation
 */
function buildContentPrompt(keyword) {
  const { title, zodiac, topic, timeType, year, month } = keyword
  
  let timeContext = ''
  if (timeType === 'yearly') {
    timeContext = `for the year ${year}`
  } else if (timeType === 'monthly') {
    timeContext = `for ${month} ${year}`
  } else if (timeType === 'this-year') {
    timeContext = `for this year (${year})`
  }

  return `Write a comprehensive, SEO-optimized astrology blog post with the title: "${title}"

Requirements:
1. **Structure**: Use proper HTML heading hierarchy (H1 for title, H2 for main sections, H3 for subsections)
2. **Introduction**: Start with an engaging 2-3 sentence introduction about ${zodiac} and ${topic.toLowerCase()} predictions ${timeContext}
3. **Main Content**: Include 4-6 well-structured sections covering:
   - Key planetary influences affecting ${zodiac} in ${topic.toLowerCase()}
   - Specific predictions and insights
   - Practical advice and recommendations
   - Important dates or periods to watch
4. **Tone**: Professional yet warm, authoritative but not prescriptive
5. **SEO**: Naturally incorporate relevant keywords like "${zodiac} ${topic.toLowerCase()}", "astrology predictions", "Vedic astrology"
6. **Compliance**: Include disclaimer that predictions are for guidance only, not guarantees
7. **Length**: 800-1200 words of unique, valuable content
8. **Format**: Return ONLY valid HTML content (no markdown, no explanations)

Focus on:
- Unique insights specific to ${zodiac} sign
- Actionable advice for ${topic.toLowerCase()}
- Vedic astrology principles (planets, houses, dashas)
- Real-world applicability

Return the HTML content directly, starting with the first H2 section (the title will be added separately).`
}

/**
 * Parse generated content and extract structured data
 */
function parseGeneratedContent(rawContent, keyword) {
  // Clean up the content
  let content = rawContent.trim()
  
  // Remove markdown code blocks if present
  content = content.replace(/```html\n?/g, '').replace(/```\n?/g, '')
  
  // Ensure proper HTML structure
  if (!content.includes('<h2>') && !content.includes('<h1>')) {
    // If no headings, wrap in proper structure
    content = `<h2>Introduction</h2>\n${content}`
  }

  // Generate meta title (optimized for SEO)
  const metaTitle = generateMetaTitle(keyword)
  
  // Generate meta description (150-160 characters)
  const metaDescription = generateMetaDescription(content, keyword)

  return {
    title: keyword.title,
    content: content,
    metaTitle: metaTitle,
    metaDescription: metaDescription,
  }
}

/**
 * Generate SEO-optimized meta title
 */
function generateMetaTitle(keyword) {
  const { zodiac, topic, timeType, year, month } = keyword
  
  let timePart = ''
  if (timeType === 'yearly') {
    timePart = `in ${year}`
  } else if (timeType === 'monthly') {
    timePart = `in ${month} ${year}`
  } else {
    timePart = 'this year'
  }
  
  return `${zodiac} ${topic} Predictions ${timePart} | Vedic Astrology Guide`
}

/**
 * Generate SEO-optimized meta description
 */
function generateMetaDescription(content, keyword) {
  // Extract first meaningful paragraph
  const textContent = content
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  // Get first 150 characters
  let description = textContent.substring(0, 150)
  
  // Try to end at a sentence
  const lastPeriod = description.lastIndexOf('.')
  if (lastPeriod > 100) {
    description = description.substring(0, lastPeriod + 1)
  } else {
    description = description.trim() + '...'
  }
  
  // Add call to action
  if (!description.includes('Discover') && !description.includes('Learn')) {
    description += ' Discover your personalized astrology insights.'
  }
  
  // Ensure it's between 150-160 characters
  if (description.length > 160) {
    description = description.substring(0, 157) + '...'
  }
  
  return description
}

/**
 * Generate internal links to related blogs
 * @param {string} zodiac - Zodiac sign
 * @param {string} topic - Topic
 * @param {Object} keyword - Full keyword object with time info
 * @param {Array<string>} existingSlugs - Existing blog slugs
 * @returns {Array<Object>} Array of link objects
 */
export function generateInternalLinks(zodiac, topic, keyword, existingSlugs) {
  const links = []
  const currentYear = keyword.year || new Date().getFullYear()
  
  // Link to other topics for same zodiac and same time period
  const otherTopics = ['Career', 'Love', 'Health', 'Finance', 'Marriage'].filter(t => t !== topic)
  for (const otherTopic of otherTopics) {
    let potentialSlug = ''
    if (keyword.timeType === 'yearly') {
      potentialSlug = `${otherTopic.toLowerCase()}-for-${zodiac.toLowerCase()}-in-${currentYear}`
    } else if (keyword.timeType === 'monthly' && keyword.month) {
      potentialSlug = `${otherTopic.toLowerCase()}-for-${zodiac.toLowerCase()}-in-${keyword.month.toLowerCase()}-${currentYear}`
    } else if (keyword.timeType === 'this-year') {
      potentialSlug = `${otherTopic.toLowerCase()}-for-${zodiac.toLowerCase()}-this-year`
    }
    
    if (potentialSlug && existingSlugs.includes(potentialSlug)) {
      links.push({
        text: `${zodiac} ${otherTopic} Predictions`,
        url: `/blog/${potentialSlug}`,
      })
    }
  }
  
  // Link to same topic for other zodiacs (limit to 2-3)
  const relatedSigns = getRelatedSigns(zodiac)
  for (const relatedSign of relatedSigns.slice(0, 2)) {
    let potentialSlug = ''
    if (keyword.timeType === 'yearly') {
      potentialSlug = `${topic.toLowerCase()}-for-${relatedSign.toLowerCase()}-in-${currentYear}`
    } else if (keyword.timeType === 'monthly' && keyword.month) {
      potentialSlug = `${topic.toLowerCase()}-for-${relatedSign.toLowerCase()}-in-${keyword.month.toLowerCase()}-${currentYear}`
    } else if (keyword.timeType === 'this-year') {
      potentialSlug = `${topic.toLowerCase()}-for-${relatedSign.toLowerCase()}-this-year`
    }
    
    if (potentialSlug && existingSlugs.includes(potentialSlug)) {
      links.push({
        text: `${relatedSign} ${topic} Predictions`,
        url: `/blog/${potentialSlug}`,
      })
    }
  }
  
  return links
}

/**
 * Get related zodiac signs (for internal linking)
 */
function getRelatedSigns(zodiac) {
  const signIndex = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].indexOf(zodiac)
  
  // Return adjacent signs
  const allSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  
  const related = []
  if (signIndex > 0) related.push(allSigns[signIndex - 1])
  if (signIndex < allSigns.length - 1) related.push(allSigns[signIndex + 1])
  
  return related
}
