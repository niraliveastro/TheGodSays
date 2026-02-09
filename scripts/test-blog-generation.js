/**
 * Test Script for Blog Generation
 * 
 * Usage:
 *   node scripts/test-blog-generation.js [options]
 * 
 * Options:
 *   --max=5          Maximum blogs to generate (default: 2)
 *   --dry-run        Test without creating blogs
 *   --help           Show help
 */

import { generateBlogs } from '../src/lib/blog-generator/blog-generator-service.js'

const args = process.argv.slice(2)
const options = {
  maxBlogs: 2,
  dryRun: false,
}

// Parse arguments
args.forEach(arg => {
  if (arg === '--dry-run') {
    options.dryRun = true
  } else if (arg.startsWith('--max=')) {
    options.maxBlogs = parseInt(arg.split('=')[1]) || 2
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Test Blog Generation Script

Usage:
  node scripts/test-blog-generation.js [options]

Options:
  --max=N          Maximum blogs to generate (default: 2)
  --dry-run        Test without creating blogs
  --help           Show this help

Examples:
  node scripts/test-blog-generation.js --max=5
  node scripts/test-blog-generation.js --dry-run
  node scripts/test-blog-generation.js --max=3 --dry-run
`)
    process.exit(0)
  }
})

console.log('🧪 Testing Blog Generation System\n')
console.log(`Configuration:`)
console.log(`  Max Blogs: ${options.maxBlogs}`)
console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`)

// Run generation
generateBlogs(options)
  .then(result => {
    console.log('\n📊 Results:')
    console.log(`  Success: ${result.success}`)
    console.log(`  Generated: ${result.generated || 0}`)
    console.log(`  Skipped: ${result.skipped || 0}`)
    console.log(`  Errors: ${result.errors?.length || 0}`)
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.keyword || 'Unknown'}: ${error.error || error}`)
      })
    }
    
    if (result.blogs && result.blogs.length > 0) {
      console.log('\n✅ Generated Blogs:')
      result.blogs.forEach((blog, i) => {
        console.log(`  ${i + 1}. ${blog.title}`)
        console.log(`     Slug: ${blog.slug}`)
        console.log(`     ID: ${blog.id}`)
      })
    }
    
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('\n❌ Fatal Error:', error)
    process.exit(1)
  })
