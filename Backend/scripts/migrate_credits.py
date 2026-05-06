import sys
import os
from bson import ObjectId

# Add the parent directory to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, mongo

def migrate_seller_credits():
    app, _ = create_app()
    with app.app_context():
        print("Starting seller credits migration...")
        
        # Find all sellers that don't have the credits field
        sellers_to_update = mongo.db.sellers.find({'credits': {'$exists': False}})
        count = mongo.db.sellers.count_documents({'credits': {'$exists': False}})
        
        print(f"Found {count} sellers to update.")
        
        if count == 0:
            print("No sellers need migration. Checking for sellers with non-default credits...")
            # Optionally check if all have at least 30
            # mongo.db.sellers.update_many({'credits': {'$lt': 30}}, {'$set': {'credits': 30}})
        
        # Update each seller
        result = mongo.db.sellers.update_many(
            {'credits': {'$exists': False}},
            {'$set': {'credits': 30}}
        )
        
        print(f"Migration complete. Updated {result.modified_count} sellers with default 30 credits.")

if __name__ == "__main__":
    migrate_seller_credits()
