from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Hardcoded from config.py since I can't easily import it without setup
MONGODB_URI = 'mongodb+srv://errualmeida2005:LPeUzlZepxpVqT5q@cluster0.czrkk.mongodb.net/BBHC-BAZAR?retryWrites=true&w=majority&appName=Cluster0'
MONGODB_DB = 'BBHC-BAZAR'

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]

print(f"Checking database: {MONGODB_DB}")

sellers = list(db.sellers.find({}, {"name": 1, "trade_id": 1}))
print(f"Total Sellers found: {len(sellers)}")
for s in sellers:
    print(f"Seller: {s.get('name')} | TradeID: {s.get('trade_id')} | ID: {s.get('_id')}")

products = list(db.products.find({}, {"name": 1, "seller_id": 1}).limit(5))
print(f"Products samples: {products}")

orders = list(db.orders.find({}).limit(5))
print(f"Orders samples (first 5): {len(orders)} found")
for o in orders:
    print(f"Order: {o.get('orderNumber')} | SellerID: {o.get('seller_id')} | Status: {o.get('status')}")
