# How to Add Images to Blog Posts

## Quick Guide

You can add images to your blog posts in two ways:

### 1. Featured Image (Main Blog Image)
- This appears at the top of the blog post and in the blog listing
- Add the image URL in the **"Featured Image URL"** field
- Recommended size: 1200x630 pixels
- Example: `https://images.unsplash.com/photo-1234567890`

### 2. Images in Content (Within the Article)
- Add images directly in the HTML content using `<img>` tags
- Images will be automatically styled with rounded corners and proper spacing

## Methods to Get Image URLs

### Option 1: Use Free Image Services
1. **Unsplash** (Recommended)
   - Go to https://unsplash.com
   - Search for images (e.g., "astrology", "stars", "moon")
   - Click on an image → Click "Download" → Right-click → "Copy image address"
   - Use the URL in your blog

2. **Pexels**
   - Go to https://pexels.com
   - Search and download images
   - Upload to Imgur or use direct links

3. **Imgur**
   - Go to https://imgur.com
   - Upload your image
   - Right-click the image → "Copy image address"
   - Use the direct link (ends with .jpg, .png, etc.)

### Option 2: Upload to Firebase Storage
1. Go to Firebase Console → Storage
2. Upload your image
3. Get the download URL
4. Use that URL in your blog

### Option 3: Use Your Own CDN
- If you have images hosted elsewhere, use those URLs directly

## How to Add Images in Content

### Basic Image Tag
```html
<img src="https://example.com/image.jpg" alt="Description of the image" />
```

### Image with Caption (Using Figure)
```html
<figure>
  <img src="https://example.com/image.jpg" alt="Astrology chart showing planetary positions" />
  <figcaption>Planetary positions in a birth chart</figcaption>
</figure>
```

### Centered Image
```html
<div style="text-align: center;">
  <img src="https://example.com/image.jpg" alt="Description" />
</div>
```

### Image with Specific Width
```html
<img src="https://example.com/image.jpg" alt="Description" style="max-width: 600px; width: 100%;" />
```

## Complete Example Blog Content

```html
<h2>Introduction to Vedic Astrology</h2>

<p>Vedic astrology, also known as Jyotish, is an ancient system of astrology that originated in India thousands of years ago.</p>

<img src="https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4" alt="Night sky with stars and constellations" />

<h2>Understanding Planetary Positions</h2>

<p>The positions of planets at the time of your birth play a crucial role in determining your astrological chart.</p>

<figure>
  <img src="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06" alt="Astronomical chart" />
  <figcaption>An example of a Vedic astrological chart showing planetary positions</figcaption>
</figure>

<h3>The Nine Planets</h3>

<p>In Vedic astrology, we consider nine planets:</p>

<ul>
  <li>Sun (Surya)</li>
  <li>Moon (Chandra)</li>
  <li>Mars (Mangal)</li>
  <li>Mercury (Budh)</li>
  <li>Jupiter (Guru)</li>
  <li>Venus (Shukra)</li>
  <li>Saturn (Shani)</li>
  <li>Rahu (North Node)</li>
  <li>Ketu (South Node)</li>
</ul>

<h2>Conclusion</h2>

<p>Understanding these planetary influences can help you navigate life's challenges with greater wisdom.</p>
```

## Best Practices

1. **Always include alt text** - This helps with SEO and accessibility
   - Good: `<img src="..." alt="Astrology chart showing Rahu and Ketu positions" />`
   - Bad: `<img src="..." alt="image" />`

2. **Use high-quality images** - Aim for at least 800px width for content images

3. **Optimize image sizes** - Large images slow down page loading
   - Use image compression tools if needed
   - Consider using WebP format for better compression

4. **Use relevant images** - Images should relate to your content

5. **Don't use copyrighted images** - Use free stock photos or your own images

## Troubleshooting

### Image Not Showing?
- Check that the URL is correct and accessible
- Make sure the URL starts with `http://` or `https://`
- Some image hosts require direct links (not gallery pages)

### Image Too Large?
- Add style attribute: `style="max-width: 100%; height: auto;"`
- Or specify width: `style="max-width: 600px;"`

### Image Not Centered?
- Wrap in a div: `<div style="text-align: center;"><img src="..." alt="..." /></div>`
- Or use figure tag (automatically centered)

## Quick Image Sources

- **Unsplash**: https://unsplash.com (Free, high-quality photos)
- **Pexels**: https://pexels.com (Free stock photos)
- **Pixabay**: https://pixabay.com (Free images and vectors)
- **Imgur**: https://imgur.com (Free image hosting)

