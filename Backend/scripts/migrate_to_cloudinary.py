import os
import sys
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import create_app, mongo

def migrate_images():
    # Load .env explicitly for script
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)
    
    app, _ = create_app()
    with app.app_context():
        if not app.config.get('CLOUDINARY_CLOUD_NAME'):
            print("ERROR: Cloudinary credentials not found in config.")
            return
            
        print("Starting migration of products...")
        
        products = list(mongo.db.products.find({}))
        for prod in products:
            updated = False
            
            # Thumbnail
            if prod.get('thumbnail') and prod['thumbnail'].startswith('/static/'):
                local_path = os.path.join(os.path.dirname(app.root_path), prod['thumbnail'].lstrip('/'))
                if os.path.exists(local_path):
                    try:
                        res = cloudinary.uploader.upload(local_path, folder=f"bbhc_bazar/products/{prod['_id']}", format='webp')
                        prod['thumbnail'] = res.get('secure_url')
                        updated = True
                        print(f"Uploaded thumbnail for product {prod['_id']}")
                    except Exception as e:
                        print(f"Failed to upload {local_path}: {e}")
                else:
                    print(f"Missing local file: {local_path}")
                        
            # Images array
            if prod.get('images'):
                new_images = []
                for img in prod['images']:
                    if img.startswith('/static/'):
                        local_path = os.path.join(os.path.dirname(app.root_path), img.lstrip('/'))
                        if os.path.exists(local_path):
                            try:
                                res = cloudinary.uploader.upload(local_path, folder=f"bbhc_bazar/products/{prod['_id']}", format='webp')
                                new_images.append(res.get('secure_url'))
                                updated = True
                                print(f"Uploaded extra image for product {prod['_id']}")
                            except Exception as e:
                                print(f"Failed to upload {local_path}: {e}")
                                new_images.append(img)
                        else:
                            print(f"Missing local file: {local_path}")
                            new_images.append(img)
                    else:
                        new_images.append(img)
                prod['images'] = new_images
                
            if updated:
                mongo.db.products.update_one({'_id': prod['_id']}, {'$set': prod})
                print(f"Updated product {prod['_id']} in DB")
                
        print("Migration complete!")

if __name__ == '__main__':
    migrate_images()
