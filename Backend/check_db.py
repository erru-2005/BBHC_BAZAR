from app import create_app, mongo
import os
from bson import ObjectId

app, socketio = create_app()
with app.app_context():
    # 1. Distinct statuses in DB
    statuses = list(mongo.db.orders.distinct('status'))
    print(f"STATUSES IN DB: {statuses}")
    
    # 2. Categories in orders
    # Check both items list and product_snapshot
    pipeline_items = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product.category", "total": {"$sum": 1}}}
    ]
    categories_items = list(mongo.db.orders.aggregate(pipeline_items))
    print(f"CATEGORIES IN ORDER ITEMS: {categories_items}")
    
    pipeline_snapshot = [
        {"$group": {"_id": "$product_snapshot.categories", "total": {"$sum": 1}}}
    ]
    categories_snapshot = list(mongo.db.orders.aggregate(pipeline_snapshot))
    print(f"CATEGORIES IN PRODUCT SNAPSHOT: {categories_snapshot}")
    
    # 3. Categories in categories collection
    cat_coll = list(mongo.db.categories.find({}))
    print(f"CATEGORIES IN COLLECTION: {[c['name'] for c in cat_coll]}")
