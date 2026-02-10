/**
 * Blog Image Service
 * Generates topic-relevant images for blogs using AI image models.
 * No local project images are used; everything is generated from prompts.
 */

// Strong default; can be overridden with BLOG_IMAGE_MODEL in env
const OPENAI_IMAGE_MODEL = process.env.BLOG_IMAGE_MODEL || 'dall-e-3'

/**
 * Low-level helper to call OpenAI Images API.
 * @param {string} prompt
 * @returns {Promise<string|null>} image URL or null on failure
 */
async function generateImageUrl(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[blog-image-service] OPENAI_API_KEY not set; skipping image generation')
    return null
  }

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[blog-image-service] OpenAI image error:', res.status, err)
      return null
    }

    const data = await res.json()
    const url = data?.data?.[0]?.url
    return typeof url === 'string' ? url : null
  } catch (e) {
    console.error('[blog-image-service] Error generating image:', e)
    return null
  }
}

/**
 * Build a safe, topic-aware image prompt from keyword data.
 * Ensures: no people, no faces, no text, no logos.
 * - For \"top astrologers\" style content: focus on abstract astrology tools, charts, temples.
 * - For career/finance: focus on symbolic paths, charts, work symbolism (not zodiac icons).
 * - For love/marriage: focus on relationship symbolism with subtle zodiac hints.
 * - For generic predictions: can emphasize the specific zodiac sign.
 */
function buildKeywordImagePrompt(keyword) {
  const { zodiac, topic, year, month, timeType } = keyword || {}

  const topicLower = (topic || '').toLowerCase()

  let timePhrase = ''
  if (timeType === 'yearly' && year) timePhrase = `for the year ${year}`
  else if (timeType === 'monthly' && year && month) timePhrase = `for ${month} ${year}`
  else if (timeType === 'this-year' && year) timePhrase = `for this year (${year})`

  // Base safety tail
  const safetyTail = [
    'professional, modern, mystical, detailed lighting',
    'no people, no faces, no text, no logos, no brands',
  ].join(', ')

  // 1) Astrologer / authority list vibes
  if (topicLower.includes('astrologer')) {
    return [
      'High-quality digital illustration of an astrology consultation desk with open Vedic astrology books, charts and yantras',
      'focus on tools, charts, spiritual ambience, no specific human faces',
      'soft warm lighting, traditional Indian astrology decor',
      safetyTail,
    ].join(', ')
  }

  // 2) Career / business / finance
  if (
    topicLower.includes('career') ||
    topicLower.includes('job') ||
    topicLower.includes('business') ||
    topicLower.includes('profession') ||
    topicLower.includes('finance') ||
    topicLower.includes('money')
  ) {
    const zPart = zodiac ? `${zodiac} symbol subtly in the background` : 'subtle zodiac wheel in the background'
    return [
      'Symbolic illustration of a person choosing between different career and business paths shown as glowing roads and doors',
      zPart,
      'astrology chart overlay, planets indicating decisions',
      safetyTail,
    ].join(', ')
  }

  // 3) Love / marriage / relationships
  if (
    topicLower.includes('love') ||
    topicLower.includes('relationship') ||
    topicLower.includes('marriage') ||
    topicLower.includes('compatibility')
  ) {
    const zPart = zodiac ? `${zodiac} symbol intertwined with another zodiac symbol` : 'two intertwined zodiac symbols'
    return [
      `Romantic astrology illustration with ${zPart}`,
      'soft cosmic background, stars forming a heart-like pattern',
      'kundli-style chart elements suggesting compatibility analysis',
      safetyTail,
    ].join(', ')
  }

  // 4) Health / wellbeing
  if (topicLower.includes('health') || topicLower.includes('wellbeing')) {
    const zPart = zodiac ? `${zodiac} symbol near a glowing human aura` : 'zodiac wheel near a glowing human aura'
    return [
      'Illustration of human aura and chakras connected to planetary positions and houses',
      zPart,
      'gentle healing colours, spiritual wellness theme',
      safetyTail,
    ].join(', ')
  }

  // 5) Generic prediction / horoscope
  const zodiacPart = zodiac ? `${zodiac} zodiac symbol at the center of an astrology chart` : 'zodiac wheel at the center of an astrology chart'
  return [
    `High-quality digital illustration of ${zodiacPart} ${timePhrase}`.trim(),
    'cosmic background, stars and constellations, Vedic astrology chart elements',
    safetyTail,
  ].join(', ')
}

/**
 * Generate a featured image URL for an automated keyword-based blog.
 * @param {Object} keyword
 * @returns {Promise<string|null>}
 */
export async function generateFeaturedImageForKeyword(keyword = {}) {
  const prompt = buildKeywordImagePrompt(keyword)
  return await generateImageUrl(prompt)
}

/**
 * Build an image prompt from topic-based pipeline output.
 * Prefers the first AI-generated image spec if available, but adapts by topic:
 * - \"top 20 astrologers\" → tools, charts, spiritual ambience, no faces.
 * - career vs business → paths, doors, money symbolism.
 * - love/marriage → compatibility symbolism.
 */
function buildTopicImagePrompt(pipelineResult) {
  const title = (pipelineResult?.title || '').toLowerCase()
  const category = (pipelineResult?.category || '').toLowerCase()
  const tagsArr = Array.isArray(pipelineResult?.tags) ? pipelineResult.tags : []
  const tags = tagsArr.join(', ').toLowerCase()

  const text = [title, category, tags].join(' ')

  // If the pipeline already provided a generated image spec and it is clearly topic-focused, reuse it
  const images = Array.isArray(pipelineResult?.images) ? pipelineResult.images : []
  const generatedSpec =
    images.find((img) => img.type === 'generated' && img.prompt_or_query) ||
    images[0]

  // Astrologer lists / authority content
  if (text.includes('top') && text.includes('astrologer')) {
    return [
      'High-quality digital illustration of a Vedic astrology study desk with multiple open kundli charts, books and yantras',
      'focus on tools and sacred objects, representing many expert astrologers without showing faces',
      'warm temple-like lighting, subtle Indian traditional motifs',
      'no people, no faces, no text, no logos, no brands',
    ].join(', ')
  }

  // Career vs business / career choices
  if (text.includes('career') || text.includes('business')) {
    return [
      'Symbolic astrology illustration of diverging glowing paths labelled by planets and houses, representing different career and business choices',
      'cosmic background with subtle zodiac wheel, focus on decisions and opportunity',
      'professional, modern, mystical, detailed lighting',
      'no people, no faces, no text, no logos, no brands',
    ].join(', ')
  }

  // Love, marriage, relationship guidance
  if (
    text.includes('love') ||
    text.includes('marriage') ||
    text.includes('relationship') ||
    text.includes('compatibility')
  ) {
    return [
      'Romantic astrology illustration with two intertwined zodiac symbols above a glowing kundli chart',
      'soft cosmic background, starlight forming subtle heart shapes',
      'warm, hopeful, spiritual tone, Vedic astrology style',
      'no people, no faces, no text, no logos, no brands',
    ].join(', ')
  }

  // Health / wellbeing content
  if (text.includes('health') || text.includes('wellbeing')) {
    return [
      'Spiritual illustration of human aura and chakras linked to planetary positions in a Vedic astrology chart',
      'gentle healing colours, peaceful cosmic background',
      'no people, no faces, no text, no logos, no brands',
    ].join(', ')
  }

  // If we have a generatedSpec prompt from the pipeline, extend it with safety tail
  if (generatedSpec?.prompt_or_query) {
    return [
      generatedSpec.prompt_or_query,
      'cosmic background, stars and constellations, astrology chart elements',
      'professional, modern, mystical, detailed lighting',
      'no people, no faces, no text, no logos, no brands',
    ].join(', ')
  }

  // Fallback: generic astrology illustration tuned to article metadata
  const fallbackTitle = pipelineResult?.title || 'astrology article'
  return [
    `High-quality digital illustration for an astrology article titled "${fallbackTitle}"`,
    'cosmic background, stars and constellations, Vedic astrology chart and planetary symbols',
    'professional, modern, mystical, detailed lighting',
    'no people, no faces, no text, no logos, no brands',
  ].join(', ')
}

/**
 * Generate a featured image URL for a topic-based blog payload.
 * @param {Object} pipelineResult
 * @returns {Promise<string|null>}
 */
export async function generateFeaturedImageForTopicBlog(pipelineResult) {
  const prompt = buildTopicImagePrompt(pipelineResult)
  return await generateImageUrl(prompt)
}

