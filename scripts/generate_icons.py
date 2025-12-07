import cairosvg
from PIL import Image
import io
import os

def create_brand_assets():
    # Get the project root directory (parent of scripts folder)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    public_dir = os.path.join(project_root, 'public')
    
    # Ensure public directory exists
    os.makedirs(public_dir, exist_ok=True)
    
    print(f"📁 Saving files to: {public_dir}\n")

    # ==========================================
    # 1. Generate Favicon (32x32) - Simplified
    # ==========================================
    favicon_svg = """
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8DB" />
          <stop offset="25%" stop-color="#FDB931" />
          <stop offset="50%" stop-color="#B38728" />
          <stop offset="75%" stop-color="#FDB931" />
          <stop offset="100%" stop-color="#FFF8DB" />
        </linearGradient>
      </defs>
      
      <g transform="translate(16, 16)">
        <g transform="rotate(-45)">
           <path d="M 0,0 C 2,-4 6,-4 6,0 C 6,4 2,4 0,0 C -2,-4 -6,-4 -6,0 C -6,4 -2,4 0,0 Z"
                fill="none" 
                stroke="url(#gold-gradient)" 
                stroke-width="2.5" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                transform="scale(1.8)" />
           <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
    """

    # Convert SVG to PNG in memory
    favicon_png_data = cairosvg.svg2png(bytestring=favicon_svg.encode('utf-8'))
    favicon_image = Image.open(io.BytesIO(favicon_png_data))
    
    # Save as ICO
    favicon_path = os.path.join(public_dir, "favicon.ico")
    favicon_image.save(favicon_path, format='ICO', sizes=[(32, 32)])
    print(f"✅ Created: {favicon_path} (32x32)")

    # ==========================================
    # 2. Generate Icon (192x192)
    # ==========================================
    icon_192_svg = """
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
      <defs>
        <radialGradient id="bg-glow-192" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="#2a2200" />
          <stop offset="100%" stop-color="#000000" />
        </radialGradient>
        <linearGradient id="gold-gradient-192" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8DB" />
          <stop offset="25%" stop-color="#FDB931" />
          <stop offset="50%" stop-color="#B38728" />
          <stop offset="75%" stop-color="#FDB931" />
          <stop offset="100%" stop-color="#FFF8DB" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-glow-192)" rx="30" />
      <g transform="translate(96, 86)">
        <g transform="rotate(-45) scale(0.6)">
          <path d="M 0,0 C 50,-60 130,-60 130,0 C 130,60 50,60 0,0 C -50,-60 -130,-60 -130,0 C -130,60 -50,60 0,0 Z"
                fill="none" 
                stroke="url(#gold-gradient-192)" 
                stroke-width="7" 
                stroke-linecap="round" 
                stroke-linejoin="round" />
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
        </g>
        <g transform="translate(0, 38)">
          <text y="0" fill="url(#gold-gradient-192)" font-size="20px" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">
            <tspan>rahu</tspan><tspan font-weight="300">now</tspan>
          </text>
        </g>
      </g>
    </svg>
    """
    
    icon_192_path = os.path.join(public_dir, "icon-192x192.png")
    cairosvg.svg2png(bytestring=icon_192_svg.encode('utf-8'), write_to=icon_192_path, output_width=192, output_height=192)
    print(f"✅ Created: {icon_192_path} (192x192)")

    # ==========================================
    # 3. Generate Icon (512x512) - Full Logo
    # ==========================================
    icon_svg = """
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <radialGradient id="bg-glow" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="#2a2200" />
          <stop offset="100%" stop-color="#000000" />
        </radialGradient>

        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8DB" />
          <stop offset="25%" stop-color="#FDB931" />
          <stop offset="50%" stop-color="#B38728" />
          <stop offset="75%" stop-color="#FDB931" />
          <stop offset="100%" stop-color="#FFF8DB" />
        </linearGradient>

        <filter id="metallic-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="2" specularConstant="1.2" specularExponent="20" lighting-color="#ffffff" result="specular">
            <fePointLight x="-200" y="-400" z="300" />
          </feSpecularLighting>
          <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularBounded" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specularBounded" />
          </feMerge>
        </filter>
      </defs>

      <rect width="100%" height="100%" fill="url(#bg-glow)" rx="80" />

      <g transform="translate(256, 230)"> <g transform="rotate(-45) scale(0.6)">
          <path d="M 0,0 C 50,-60 130,-60 130,0 C 130,60 50,60 0,0 C -50,-60 -130,-60 -130,0 C -130,60 -50,60 0,0 Z"
                fill="none" 
                stroke="url(#gold-gradient)" 
                stroke-width="18" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                filter="url(#metallic-glow)" />
          <circle cx="0" cy="0" r="7" fill="#FFFFFF" filter="url(#metallic-glow)" />
        </g>

        <g transform="translate(0, 100)" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif">
          <text y="0" fill="url(#gold-gradient)" font-size="52px" letter-spacing="1px" filter="url(#metallic-glow)">
            <tspan font-weight="bold">rahu</tspan><tspan font-weight="300">now</tspan>
          </text>
        </g>
      </g>
    </svg>
    """
    
    icon_512_path = os.path.join(public_dir, "icon-512x512.png")
    cairosvg.svg2png(bytestring=icon_svg.encode('utf-8'), write_to=icon_512_path, output_width=512, output_height=512)
    print(f"✅ Created: {icon_512_path} (512x512)")

    # ==========================================
    # 4. Generate Apple Touch Icon (180x180)
    # ==========================================
    apple_touch_svg = """
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <defs>
        <radialGradient id="bg-glow-apple" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stop-color="#2a2200" />
          <stop offset="100%" stop-color="#000000" />
        </radialGradient>
        <linearGradient id="gold-gradient-apple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8DB" />
          <stop offset="25%" stop-color="#FDB931" />
          <stop offset="50%" stop-color="#B38728" />
          <stop offset="75%" stop-color="#FDB931" />
          <stop offset="100%" stop-color="#FFF8DB" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-glow-apple)" rx="28" />
      <g transform="translate(90, 80)">
        <g transform="rotate(-45) scale(0.55)">
          <path d="M 0,0 C 50,-60 130,-60 130,0 C 130,60 50,60 0,0 C -50,-60 -130,-60 -130,0 C -130,60 -50,60 0,0 Z"
                fill="none" 
                stroke="url(#gold-gradient-apple)" 
                stroke-width="6.5" 
                stroke-linecap="round" 
                stroke-linejoin="round" />
          <circle cx="0" cy="0" r="2.8" fill="#FFFFFF" />
        </g>
        <g transform="translate(0, 36)">
          <text y="0" fill="url(#gold-gradient-apple)" font-size="19px" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">
            <tspan>rahu</tspan><tspan font-weight="300">now</tspan>
          </text>
        </g>
      </g>
    </svg>
    """
    
    apple_touch_path = os.path.join(public_dir, "apple-touch-icon.png")
    cairosvg.svg2png(bytestring=apple_touch_svg.encode('utf-8'), write_to=apple_touch_path, output_width=180, output_height=180)
    print(f"✅ Created: {apple_touch_path} (180x180)")

    print("\n✨ All brand assets generated successfully!")
    print(f"\n📋 Generated files in {public_dir}:")
    print("   - favicon.ico (32x32)")
    print("   - icon-192x192.png (192x192)")
    print("   - icon-512x512.png (512x512)")
    print("   - apple-touch-icon.png (180x180)")

if __name__ == "__main__":
    try:
        create_brand_assets()
    except ImportError as e:
        print("❌ Error: Missing required Python packages.")
        print("\n📦 Please install the required packages:")
        print("   pip install cairosvg pillow")
        print("\nOr create a requirements.txt and run:")
        print("   pip install -r requirements.txt")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

