from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.wishlist_item import WishlistItem
from app.services.product_service import ProductService


class WishlistService:
  """
  Service for managing user wishlists.
  """

  @staticmethod
  def _collection():
      return mongo.db.wishlist_items

  @staticmethod
  def ensure_indexes():
      col = WishlistService._collection()
      col.create_index([("user_id", 1), ("product_id", 1)], unique=True)
      col.create_index([("user_id", 1), ("created_at", -1)])

  @staticmethod
  def add_to_wishlist(user_id, product_id, metadata=None):
      if not user_id or not product_id:
          raise ValueError("user_id and product_id are required")

      user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
      prod_oid = ObjectId(product_id) if not isinstance(product_id, ObjectId) else product_id

      # Get a lightweight snapshot of the product for quick display
      product = ProductService.get_product_by_id(str(prod_oid))
      product_snapshot = {}
      if product:
          prod = product.to_dict()
          product_snapshot = {
              "id": prod.get("id") or prod.get("_id"),
              "product_name": prod.get("product_name"),
              "thumbnail": prod.get("thumbnail"),
              "selling_price": prod.get("selling_price"),
              "max_price": prod.get("max_price"),
              "categories": prod.get("categories"),
              "rating": prod.get("rating"),
              "reviews": prod.get("reviews"),
          }

      doc = {
          "user_id": user_oid,
          "product_id": prod_oid,
          "created_at": datetime.utcnow(),
          "product_snapshot": product_snapshot,
          "metadata": metadata or {},
      }

      col = WishlistService._collection()
      result = col.update_one(
          {"user_id": user_oid, "product_id": prod_oid},
          {"$set": doc},
          upsert=True,
      )

      stored = col.find_one({"user_id": user_oid, "product_id": prod_oid})
      return WishlistItem.from_bson(stored)

  @staticmethod
  def remove_from_wishlist(user_id, product_id):
      if not user_id or not product_id:
          raise ValueError("user_id and product_id are required")

      user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
      prod_oid = ObjectId(product_id) if not isinstance(product_id, ObjectId) else product_id
      result = WishlistService._collection().delete_one({"user_id": user_oid, "product_id": prod_oid})
      return result.deleted_count > 0

  @staticmethod
  def list_wishlist(user_id, limit=50, skip=0):
      if not user_id:
          raise ValueError("user_id is required")

      user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
      cursor = (
          WishlistService._collection()
          .find({"user_id": user_oid})
          .sort("created_at", -1)
          .skip(skip)
          .limit(limit)
      )
      items = [WishlistItem.from_bson(doc) for doc in cursor]
      return items

  @staticmethod
  def get_product_ids_for_user(user_id):
      if not user_id:
          return []
      user_oid = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
      cursor = WishlistService._collection().find(
          {"user_id": user_oid}, {"product_id": 1}
      )
      return [str(doc["product_id"]) for doc in cursor]


