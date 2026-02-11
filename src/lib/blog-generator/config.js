/**
 * Blog Generation Configuration
 * Controls how blogs are automatically generated
 */

/**
 * Get blog generation configuration
 * Can be overridden via environment variables
 */
export function getBlogGenerationConfig() {
  const currentYear = new Date().getFullYear()
  
  return {
    // Time settings
    currentYear: parseInt(process.env.BLOG_GEN_CURRENT_YEAR) || currentYear,
    monthsAhead: parseInt(process.env.BLOG_GEN_MONTHS_AHEAD) || 3,
    
    // Content types to generate
    includeYearly: process.env.BLOG_GEN_INCLUDE_YEARLY !== 'false',
    includeMonthly: process.env.BLOG_GEN_INCLUDE_MONTHLY !== 'false',
    includeThisYear: process.env.BLOG_GEN_INCLUDE_THIS_YEAR !== 'false',
    includeToday: process.env.BLOG_GEN_INCLUDE_TODAY !== 'false',
    
    // AI settings
    useHighLevelModel: process.env.BLOG_GEN_USE_HIGH_MODEL !== 'false', // Use high-level models by default
    aiModel: process.env.BLOG_GEN_AI_MODEL || 'gpt-4o-mini', // Cost-effective high-quality model
    
    // Rate limiting
    delayBetweenBlogs: parseInt(process.env.BLOG_GEN_DELAY_MS) || 2000, // 2 seconds between blogs
    
    // Publishing settings
    autoPublish: process.env.BLOG_GEN_AUTO_PUBLISH !== 'false', // Auto-publish by default
    
    // Limits
    maxBlogsPerRun: parseInt(process.env.BLOG_GEN_MAX_PER_RUN) || 10, // Max blogs per cron run
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
  const errors = []
  
  if (config.currentYear < 2020 || config.currentYear > 2100) {
    errors.push('Invalid currentYear')
  }
  
  if (config.monthsAhead < 0 || config.monthsAhead > 12) {
    errors.push('monthsAhead must be between 0 and 12')
  }
  
  if (config.delayBetweenBlogs < 0) {
    errors.push('delayBetweenBlogs must be >= 0')
  }
  
  if (config.maxBlogsPerRun < 1) {
    errors.push('maxBlogsPerRun must be >= 1')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
