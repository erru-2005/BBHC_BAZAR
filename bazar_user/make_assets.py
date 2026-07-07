import numpy as np
from PIL import Image
import collections
import os

def flood_fill_background(img_path, output_path, tolerance=65):
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return
        
    print(f"Loading {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    data = np.array(img)
    
    # We will perform flood fill starting from all pixels along the left and right edges.
    # Since the background is a vertical gradient, the left/right edges are 100% background.
    visited = np.zeros((height, width), dtype=bool)
    queue = collections.deque()
    
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
        visited[y, 0] = True
        visited[y, width - 1] = True
        
    while queue:
        cx, cy = queue.popleft()
        # Set alpha to 0 (make transparent)
        data[cy, cx, 3] = 0
        
        # Check 4 direct neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height:
                if not visited[ny, nx]:
                    color = data[ny, nx][:3].astype(float)
                    # The reference background color at this height is data[ny, 0]
                    ref_color = data[ny, 0][:3].astype(float)
                    # Calculate color distance to local background reference
                    dist = np.linalg.norm(color - ref_color)
                    if dist < tolerance:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
                        
    # Pass 2: Clean and feather anti-aliased outer edges to remove the purple/grey fringe
    print("Feathering anti-aliased edges and decontaminating background color bleed...")
    feathered_data = data.copy()
    for y in range(1, height - 1):
        for x in range(1, width - 1):
            if data[y, x, 3] > 0:
                # Check 8 neighbors for transparency
                has_transparent_neighbor = False
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        if data[y + dy, x + dx, 3] == 0:
                            has_transparent_neighbor = True
                            break
                    if has_transparent_neighbor:
                        break
                
                if has_transparent_neighbor:
                    color = data[y, x, :3].astype(float)
                    ref_color = data[y, 0, :3].astype(float)
                    dist = np.linalg.norm(color - ref_color)
                    
                    # If this foreground pixel is close to the background color, it's a blended edge
                    if dist < 115:
                        # Soft transition: interpolate alpha between dist = 65 (fully transparent) and 115 (fully opaque)
                        new_alpha = int(max(0, min(255, (dist - 65) / (115 - 65) * 255)))
                        feathered_data[y, x, 3] = new_alpha
                        
                        # Decontaminate color: blend the edge pixels towards a neutral tone to remove purple tint
                        t = (dist - 65) / (115 - 65)
                        if t < 0.6:
                            mean_val = np.mean(feathered_data[y, x, :3])
                            feathered_data[y, x, :3] = (color * t + mean_val * (1 - t)).astype(np.uint8)
                            
    data = feathered_data

    # Find bounding box of the non-transparent pixels to crop tightly
    non_transparent = np.where(data[:, :, 3] > 0)
    if len(non_transparent[0]) > 0:
        min_y, max_y = np.min(non_transparent[0]), np.max(non_transparent[0])
        min_x, max_x = np.min(non_transparent[1]), np.max(non_transparent[1])
        
        margin = 15
        min_y = max(0, min_y - margin)
        max_y = min(height, max_y + margin)
        min_x = max(0, min_x - margin)
        max_x = min(width, max_x + margin)
        
        cropped = data[min_y:max_y, min_x:max_x]
        print(f"Cropped to bounding box: X({min_x} to {max_x}), Y({min_y} to {max_y})")
    else:
        cropped = data
        print("Warning: Bounding box empty, using original size.")
        
    # Pad to square without stretching (preserves original aspect ratio)
    h, w, _ = cropped.shape
    size = max(h, w)
    square = np.zeros((size, size, 4), dtype=np.uint8)
    
    y_off = (size - h) // 2
    x_off = (size - w) // 2
    square[y_off:y_off+h, x_off:x_off+w] = cropped
    
    out_img = Image.fromarray(square, "RGBA")
    out_img.save(output_path, "PNG")
    print(f"Successfully saved transparent cropped square image to {output_path}!")

def generate_gradient(output_path, width=1080, height=1920, top_color=(121, 180, 252), bottom_color=(255, 255, 255)):
    print(f"Generating vertical gradient {width}x{height} from top {top_color} to bottom {bottom_color}...")
    gradient = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        t = y / (height - 1)
        r = int((1 - t) * top_color[0] + t * bottom_color[0])
        g = int((1 - t) * top_color[1] + t * bottom_color[1])
        b = int((1 - t) * top_color[2] + t * bottom_color[2])
        gradient[y, :, 0] = r
        gradient[y, :, 1] = g
        gradient[y, :, 2] = b
        gradient[y, :, 3] = 255
        
    out_img = Image.fromarray(gradient, "RGBA")
    out_img.save(output_path, "PNG")
    print(f"Successfully saved background gradient to {output_path}!")

def process_avif():
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
        print("pillow_heif registered for AVIF support.")
    except ImportError:
        print("\n" + "="*60)
        print("WARNING: pillow-heif is not installed.")
        print("To process the AVIF electricity graphic, please run:")
        print("  pip install pillow-heif")
        print("="*60 + "\n")
        return False
        
    src_avif = os.path.join("assets", "electricity-3d-composition_1284-24128.avif")
    dest_png = os.path.join("assets", "electricity_clean.png")
    
    if os.path.exists(src_avif):
        print(f"Processing AVIF image: {src_avif}...")
        # Use a tolerance of 75 for AVIF as 3D renders often have wider compression artifact ranges
        flood_fill_background(src_avif, dest_png, tolerance=75)
        return True
    else:
        print(f"AVIF file not found at: {src_avif}")
        return False

if __name__ == "__main__":
    assets_dir = "assets"
    os.makedirs(assets_dir, exist_ok=True)
    
    src_webp = os.path.join(assets_dir, "e-commerce-service_splash-ntive.webp")
    dest_png = os.path.join(assets_dir, "e-commerce-service_splash-ntive.png")
    grad_png = os.path.join(assets_dir, "splash_bg_gradient.png")
    
    # Process transparency with row-based gradient flood fill
    flood_fill_background(src_webp, dest_png)
    
    # Process gradient (#79B4FC to #FFFFFF)
    generate_gradient(grad_png)
    
    # Process AVIF electricity graphic
    process_avif()
