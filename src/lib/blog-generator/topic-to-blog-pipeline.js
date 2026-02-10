/**
 * Topic-to-Blog Pipeline
 * Converts raw admin natural-language topic into publish-ready blog JSON.
 * Compatible with existing blog DB and UI. Fully automated.
 */

import { getFirestore } from '@/lib/firebase-admin'
import { getBlogGenerationConfig } from './config'
import { ZODIAC_SIGNS, TOPICS } from './keyword-generator'

const BLOGS_COLLECTION = 'blogs'

/**
 * Get all existing blog slugs from database (for internal linking)
 * @returns {Promise<Array<string>>}
 */
async function getExistingSlugs() {
  try {
    const db = getFirestore()
    if (!db || typeof db.collection !== 'function') return []
    const snapshot = await db.collection(BLOGS_COLLECTION).get()
    const slugs = []
    snapshot.forEach((doc) => {
      const s = doc.data().slug
      if (s) slugs.push(s)
    })
    return slugs
  } catch (e) {
    console.error('Error fetching existing slugs:', e)
    return []
  }
}

/**
 * Normalize slug: lowercase, hyphenated, no stop-word stuffing
 * @param {string} slug
 * @returns {string}
 */
function normalizeSlug(slug) {
  if (!slug || typeof slug !== 'string') return ''
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Build internal links from existing slugs and topic context
 * @param {string} title - Blog title
 * @param {string} category - Category
 * @param {Array<string>} tags - Tags (may include zodiac, topic)
 * @param {Array<string>} existingSlugs
 * @returns {Array<{ anchor: string, url: string }>}
 */
function buildInternalLinks(title, category, tags = [], existingSlugs) {
  const links = []
  const used = new Set()

  // Prefer same-category or same-topic slugs
  const topicLower = (category || '').toLowerCase()
  const tagSet = new Set((tags || []).map((t) => (t || '').toLowerCase()))

  for (const slug of existingSlugs) {
    if (links.length >= 6) break
    if (used.has(slug)) continue
    const slugLower = slug.toLowerCase()
    let anchor = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const match =
      tagSet.has(slugLower.split('-')[0]) ||
      (topicLower && slugLower.includes(topicLower)) ||
      ZODIAC_SIGNS.some((z) => slugLower.includes(z.toLowerCase()))
    if (match || links.length < 3) {
      links.push({ anchor, url: `/blog/${slug}` })
      used.add(slug)
    }
  }

  // If not enough, add any remaining up to 6
  for (const slug of existingSlugs) {
    if (links.length >= 6) break
    if (used.has(slug)) continue
    const anchor = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    links.push({ anchor, url: `/blog/${slug}` })
    used.add(slug)
  }

  return links.slice(0, 6)
}

/**
 * Inject "Related Articles" block into content_html
 * @param {string} contentHtml
 * @param {Array<{ anchor: string, url: string }>} internalLinks
 * @returns {string}
 */
function injectInternalLinks(contentHtml, internalLinks) {
  if (!internalLinks || internalLinks.length === 0) return contentHtml
  const block = `
<div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
  <h3>Related Articles</h3>
  <ul style="list-style: none; padding: 0;">
    ${internalLinks.map((l) => `<li style="margin: 10px 0;"><a href="${l.url}" style="color: #0066cc; text-decoration: none;">${l.anchor}</a></li>`).join('')}
  </ul>
</div>`
  if (contentHtml.includes('</h2>')) {
    const last = contentHtml.lastIndexOf('</h2>')
    return contentHtml.slice(0, last + 5) + block + contentHtml.slice(last + 5)
  }
  return contentHtml + block
}

/**
 * Call OpenAI for topic-to-blog generation (intent + SEO + content + images)
 * @param {string} topicInput - Raw admin input
 * @param {Object} options - { model, temperature }
 * @returns {Promise<Object>} Parsed blog JSON
 */
async function generateBlogFromTopicWithAI(topicInput, options = {}) {
  const config = getBlogGenerationConfig()
  const model = options.model || config.aiModel || 'gpt-4o-mini'
  const temperature = options.temperature ?? 0.7

  const systemPrompt = `You are a senior full-stack engineer, SEO strategist, and editorial AI for an astrology content platform.
Your job is to convert a raw topic (natural language) into a single publish-ready blog JSON.

RULES:
1. Content type: Choose ONE of: astrology prediction, informational article, listicle, comparison, educational guide — based on the topic.
2. Core entities: Extract zodiac sign (if any), topic (career, love, marriage, astrologers, horoscope, etc.), timeframe (year, month, or general).
3. Search intent: informational, exploratory, authority-based (for lists), or advisory.
4. Structure content by intent — no generic layouts. Listicles: each item has short intro, why notable, neutral tone.
5. Astrology safety: Use "may indicate", "is often associated with", "can suggest". No medical/legal/financial promises or guarantees.
6. Length: 800–1500 words (unless listicle; listicles can be shorter per item but total substantial).
7. Content must be genuinely unique and non-repetitive. Do not reuse paragraphs, sentences, or structures from any generic template; write it as if it is the only article on this topic on the site.
8. Images: Provide exactly 2–4 image specs. Each image MUST be highly relevant:
   - Zodiac → zodiac symbols/constellations/astrology art (use type "generated" with an AI image prompt).
   - Career → symbolic career visuals, not random people (generated or fetched).
   - Astrologers list → abstract astrology concepts, NOT real faces (generated or fetched).
   - Love/marriage → symbolic astrology visuals.
   Never use copyrighted photos, brand logos, or irrelevant stock people.
   For each image give: type ("generated" or "fetched"), prompt_or_query (AI prompt or search query), alt_text (SEO), intent (one line).
9. Slug: lowercase, hyphenated, no stop-word stuffing. Examples:
   "aries career problems in 2026" → career-aries-2026-problems
   "top 10 astrologers of india" → astrologers-top-10-astrologers-india
   "love marriage chances for virgo female" → love-marriage-virgo-female-chances
10. Meta title ≤60 chars, meta description ≤160 chars.
11. Return ONLY valid JSON, no markdown or explanation.`

  const userPrompt = `Convert this topic into the exact JSON structure below.

Topic: "${topicInput}"

Output ONLY this JSON (no other text):
{
  "title": "H1 Blog Title (natural, human-written)",
  "slug": "lowercase-hyphenated-slug",
  "meta_title": "Meta Title (≤60 chars)",
  "meta_description": "Meta Description (≤160 chars)",
  "content_html": "<h2>Section</h2><p>...</p>... (full HTML, 800-1500 words, proper H2/H3)",
  "images": [
    { "type": "generated", "prompt_or_query": "AI image prompt", "alt_text": "SEO alt", "intent": "why this image" },
    { "type": "fetched", "prompt_or_query": "royalty-free search query", "alt_text": "SEO alt", "intent": "why this image" }
  ],
  "category": "e.g. Career, Love, Astrologers",
  "tags": ["tag1", "tag2", "tag3"]
}

Ensure content_html is valid HTML. Include 2-4 images in images array. No internal_links in JSON (added server-side).`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  let raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('No content from OpenAI')

  raw = raw.trim()
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = codeBlock ? codeBlock[1].trim() : raw
  let out
  try {
    out = JSON.parse(jsonStr)
  } catch (e) {
    throw new Error('Invalid JSON from AI: ' + e.message)
  }

  if (!out.title || !out.content_html) throw new Error('Missing title or content_html in AI response')
  out.slug = normalizeSlug(out.slug || out.title)
  out.meta_title = (out.meta_title || out.title).slice(0, 60)
  out.meta_description = (out.meta_description || '').slice(0, 160)
  out.images = Array.isArray(out.images) ? out.images.slice(0, 4) : []
  out.category = out.category || 'Astrology'
  out.tags = Array.isArray(out.tags) ? out.tags : []
  return out
}

/**
 * Run full pipeline: AI generation + internal links injection
 * @param {string} topicInput - Raw admin topic
 * @param {Object} options - { model, temperature }
 * @returns {Promise<Object>} Final JSON: title, slug, meta_title, meta_description, content_html, images, internal_links, category, tags
 */
export async function runTopicToBlogPipeline(topicInput, options = {}) {
  if (!topicInput || typeof topicInput !== 'string') {
    throw new Error('Topic input is required')
  }
  const trimmed = topicInput.trim()
  if (!trimmed) throw new Error('Topic input is required')

  const [blogPayload, existingSlugs] = await Promise.all([
    generateBlogFromTopicWithAI(trimmed, options),
    getExistingSlugs(),
  ])

  const internalLinks = buildInternalLinks(
    blogPayload.title,
    blogPayload.category,
    blogPayload.tags,
    existingSlugs
  )
  const contentWithLinks = injectInternalLinks(blogPayload.content_html, internalLinks)

  return {
    title: blogPayload.title,
    slug: blogPayload.slug,
    meta_title: blogPayload.meta_title,
    meta_description: blogPayload.meta_description,
    content_html: contentWithLinks,
    images: blogPayload.images,
    internal_links: internalLinks,
    category: blogPayload.category,
    tags: blogPayload.tags,
  }
}
