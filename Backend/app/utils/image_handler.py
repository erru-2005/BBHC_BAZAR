import base64
import os
import io
import re
from PIL import Image

# Define the base directory for static images relative to this file's location
# Path: Backend/app/utils/image_handler.py -> Backend/static
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
PRODUCTS_DIR = os.path.join(STATIC_ROOT, 'products')
SERVICES_DIR = os.path.join(STATIC_ROOT, 'services')

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def save_base64_image(base64_str, entity_id, index, entity_type='products'):
    """
    Saves a base64 image as a WebP file in a subfolder named after the entity_id.
    Returns the relative URL path.
    """
    if not base64_str:
        return None
        
    # If it's already a URL (e.g. starting with /static/), just return it
    if isinstance(base64_str, str) and (base64_str.startswith('/static/') or base64_str.startswith('http')):
        return base64_str

    try:
        # Check if it's a valid data URL
        match = re.match(r'^data:image\/(\w+);base64,(.*)$', base64_str)
        if not match:
            # Maybe it's just raw base64?
            if len(base64_str) > 100: # Heuristic for base64
                encoded = base64_str
            else:
                return base64_str
        else:
            encoded = match.group(2)
            
        image_data = base64.b64decode(encoded)
        
        # Open the image using Pillow
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGBA for WebP if it has transparency, else RGB
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
            
        # Define directory and filename
        base_dir = PRODUCTS_DIR if entity_type == 'products' else SERVICES_DIR
        target_dir = os.path.join(base_dir, str(entity_id))
        ensure_dir(target_dir)
        
        filename = f"{index}.webp"
        filepath = os.path.join(target_dir, filename)
        
        # Save as WebP with compression
        # Quality 75-80 is optimal for WebP
        # method 6 is the slowest but best compression
        image.save(filepath, "WEBP", quality=80, method=6)
        
        # Return relative URL
        return f"/static/{entity_type}/{entity_id}/{filename}"
    except Exception as e:
        print(f"Error saving image for {entity_type} {entity_id}: {e}")
        return base64_str # Fallback

def delete_entity_images(entity_id, entity_type='products'):
    """Deletes the entire folder for an entity when it's deleted"""
    base_dir = PRODUCTS_DIR if entity_type == 'products' else SERVICES_DIR
    target_dir = os.path.join(base_dir, str(entity_id))
    if os.path.exists(target_dir):
        import shutil
        shutil.rmtree(target_dir)
