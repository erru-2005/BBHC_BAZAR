import sys
import os
from bson import ObjectId

# Add the parent directory to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, mongo

def migrate_delivery_span():
    app, _ = create_app()
    with app.app_context():
        print("Starting product delivery_span migration...")
        
        # Find all products that don't have the delivery_span field
        products_to_update = mongo.db.products.find({'delivery_span': {'$exists': False}})
        count = mongo.db.products.count_documents({'delivery_span': {'$exists': False}})
        
        print(f"Found {count} products to update.")
        
        if count == 0:
            print("No products need migration.")
            return
            
        # Update each product
        result = mongo.db.products.update_many(
            {'delivery_span': {'$exists': False}},
            {'$set': {'delivery_span': 2}}
        )
        
        print(f"Migration complete. Updated {result.modified_count} products with default 2 (tomorrow) delivery span.")

if __name__ == "__main__":
    migrate_delivery_span()
