import sys
import os
import re
from bson import ObjectId

# Add parent directory to path to import app and utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, mongo
from app.utils.image_handler import save_base64_image

def migrate():
    # We need the app context to access mongo
    app, _ = create_app()
    with app.app_context():
        print("Starting image migration...")
        
        # Migrate Products
        products = mongo.db.products.find({})
        p_count = 0
        for p in products:
            p_id = p['_id']
            updates = {}
            
            # Thumbnail
            if 'thumbnail' in p and p['thumbnail'] and p['thumbnail'].startswith('data:image'):
                print(f"Migrating product thumbnail: {p_id}")
                new_url = save_base64_image(p['thumbnail'], str(p_id), 0, 'products')
                updates['thumbnail'] = new_url
            
            # Gallery
            if 'gallery' in p and p['gallery']:
                new_gallery = []
                changed = False
                for i, img in enumerate(p['gallery']):
                    if isinstance(img, str) and img.startswith('data:image'):
                        print(f"Migrating product gallery item {i}: {p_id}")
                        new_url = save_base64_image(img, str(p_id), i + 1, 'products')
                        new_gallery.append(new_url)
                        changed = True
                    else:
                        new_gallery.append(img)
                if changed:
                    updates['gallery'] = new_gallery
            
            if updates:
                mongo.db.products.update_one({'_id': p_id}, {'$set': updates})
                p_count += 1
        
        print(f"Migrated {p_count} products.")

        # Migrate Services
        services = mongo.db.services.find({})
        s_count = 0
        for s in services:
            s_id = s['_id']
            updates = {}
            
            # Thumbnail
            if 'thumbnail' in s and s['thumbnail'] and s['thumbnail'].startswith('data:image'):
                print(f"Migrating service thumbnail: {s_id}")
                new_url = save_base64_image(s['thumbnail'], str(s_id), 0, 'services')
                updates['thumbnail'] = new_url
            
            # Gallery
            if 'gallery' in s and s['gallery']:
                new_gallery = []
                changed = False
                for i, img in enumerate(s['gallery']):
                    if isinstance(img, str) and img.startswith('data:image'):
                        print(f"Migrating service gallery item {i}: {s_id}")
                        new_url = save_base64_image(img, str(s_id), i + 1, 'services')
                        new_gallery.append(new_url)
                        changed = True
                    else:
                        new_gallery.append(img)
                if changed:
                    updates['gallery'] = new_gallery
            
            if updates:
                mongo.db.services.update_one({'_id': s_id}, {'$set': updates})
                s_count += 1
        
        print(f"Migrated {s_count} services.")
        print("Migration complete!")

if __name__ == "__main__":
    migrate()
