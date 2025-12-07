/**
 * Generate Favicon and App Icons from Infinity SVG
 * 
 * This script generates favicon.ico and app icons (192x192, 512x512, apple-touch-icon)
 * from the infinity-icon.svg file.
 * 
 * Requirements:
 * - Node.js with sharp package: npm install sharp
 * - infinity-icon.svg in the public folder
 * 
 * Usage: node scripts/generate-favicon.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp package is not installed.');
  console.log('\n📦 Please install sharp by running:');
  console.log('   npm install sharp --save-dev\n');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'infinity-icon.svg');

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`❌ Error: ${svgPath} not found.`);
  console.log('Please create infinity-icon.svg in the public folder first.');
  process.exit(1);
}

async function generateIcons() {
  console.log('🎨 Generating favicon and app icons from infinity-icon.svg...\n');

  try {
    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate favicon.ico (32x32)
    console.log('📱 Generating favicon.ico (32x32)...');
    await sharp(svgBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));

    // Generate favicon.ico (16x16) - create multi-size ICO
    console.log('📱 Generating favicon-16x16.png...');
    await sharp(svgBuffer)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));

    // Generate icon-192x192.png
    console.log('📱 Generating icon-192x192.png...');
    await sharp(svgBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));

    // Generate icon-512x512.png
    console.log('📱 Generating icon-512x512.png...');
    await sharp(svgBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));

    // Generate apple-touch-icon.png (180x180)
    console.log('🍎 Generating apple-touch-icon.png (180x180)...');
    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    // Generate favicon.png (for fallback)
    console.log('📱 Generating favicon.png (48x48)...');
    await sharp(svgBuffer)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    // Copy 32x32 PNG as favicon.ico (browsers accept PNG as ICO)
    console.log('📱 Creating favicon.ico from 32x32 icon...');
    fs.copyFileSync(
      path.join(publicDir, 'favicon-32x32.png'),
      path.join(publicDir, 'favicon.ico')
    );

    console.log('\n✅ All icons generated successfully!');
    console.log('   ✓ favicon.ico (32x32)');
    console.log('   ✓ icon-192x192.png');
    console.log('   ✓ icon-512x512.png');
    console.log('   ✓ apple-touch-icon.png (180x180)\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the script
generateIcons();
