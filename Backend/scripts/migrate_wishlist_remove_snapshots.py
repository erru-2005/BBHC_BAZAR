"""
Migration script to remove product_snapshot from wishlist_items collection.
This script removes the product_snapshot field from all existing wishlist items,
as we now fetch product data dynamically from the product_id reference.

Run this script once after deploying the updated wishlist model.

Usage:
    cd Backend
    python scripts/migrate_wishlist_remove_snapshots.py
    
    OR from project root:
    python Backend/scripts/migrate_wishlist_remove_snapshots.py
"""
import sys
import os

# Get the directory containing this script
script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the Backend directory (parent of scripts)
backend_dir = os.path.dirname(script_dir)
# Get the project root (parent of Backend, if running from root)
project_root = os.path.dirname(backend_dir)

# Add Backend directory to Python path (works from both locations)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Change to Backend directory to ensure relative imports work
os.chdir(backend_dir)

from app import create_app, mongo


def migrate_wishlist_remove_snapshots():
    """Remove product_snapshot field from all wishlist items"""
    try:
        print("Starting migration...")
        app, socketio = create_app()
        
        with app.app_context():
            print("Connected to database")
            collection = mongo.db.wishlist_items
            
            # Count total wishlist items
            total_items = collection.count_documents({})
            print(f"Total wishlist items: {total_items}")
            
            # Count items with product_snapshot
            total_with_snapshot = collection.count_documents({"product_snapshot": {"$exists": True}})
            print(f"Found {total_with_snapshot} wishlist items with product_snapshot")
            
            if total_with_snapshot == 0:
                print("No items to migrate. Migration complete.")
                return
            
            # Remove product_snapshot field from all documents
            print("Removing product_snapshot field...")
            result = collection.update_many(
                {"product_snapshot": {"$exists": True}},
                {"$unset": {"product_snapshot": ""}}
            )
            
            print(f"Successfully removed product_snapshot from {result.modified_count} wishlist items")
            print("Migration complete!")
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("Wishlist Migration Script")
    print("=" * 50)
    migrate_wishlist_remove_snapshots()
    print("=" * 50)
