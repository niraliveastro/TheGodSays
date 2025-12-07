# Generate Brand Assets Script

This script generates all required icons and favicons for RahuNow.com from SVG templates.

## 📋 What It Generates

- `favicon.ico` (32×32) - Browser tab icon
- `icon-192x192.png` (192×192) - PWA icon (small)
- `icon-512x512.png` (512×512) - PWA icon (large)
- `apple-touch-icon.png` (180×180) - iOS home screen icon

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd scripts
pip install -r requirements.txt
```

Or install manually:
```bash
pip install cairosvg Pillow
```

### 2. Run the Script

```bash
python generate_icons.py
```

The script will automatically:
- Create files in the `public/` directory
- Generate all required sizes
- Save files with proper naming

### 3. Verify Output

Check that these files were created in `public/`:
- ✅ `favicon.ico`
- ✅ `icon-192x192.png`
- ✅ `icon-512x512.png`
- ✅ `apple-touch-icon.png`

## 📝 Notes

- The script uses your logo design (infinity symbol + "rahunow" text)
- All images use the gold gradient theme
- Files are saved directly to `public/` folder
- You can run this script anytime to regenerate icons

## ⚠️ Important

**Note about Open Graph Image:** This script does NOT generate the Open Graph image (`og-image.png`). You need to:
- Create `og-image.png` manually at **1200×630 pixels**
- Use your full logo with tagline "VEDIC WISDOM MEETS MODERN PRECISION"
- Save it as `public/og-image.png`

## 🛠️ Troubleshooting

### Error: "No module named 'cairosvg'"
**Solution:** Install dependencies:
```bash
pip install cairosvg Pillow
```

### Error: "cairosvg installation failed"
**Solution:** On Windows, you may need:
```bash
pip install cairosvg --upgrade
```

On macOS/Linux, you might need:
```bash
brew install cairo  # macOS
sudo apt-get install libcairo2-dev  # Ubuntu/Debian
```

### Files not appearing in public folder
**Solution:** 
- Make sure you're running from the project root
- Check that the `public/` folder exists
- Verify the script output shows the correct path


