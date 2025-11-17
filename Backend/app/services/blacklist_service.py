"""
Blacklist service - Business logic for blacklist operations with MongoDB
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.blacklist import Blacklist


class BlacklistService:
    """Service class for blacklist-related business logic"""
    
    @staticmethod
    def is_blacklisted(seller_id):
        """Check if a seller is blacklisted"""
        try:
            blacklist_doc = mongo.db.blacklist.find_one({'seller_id': ObjectId(seller_id)})
            return blacklist_doc is not None
        except Exception:
            return False
    
    @staticmethod
    def get_blacklist_by_seller_id(seller_id):
        """Get blacklist entry by seller ID"""
        try:
            blacklist_doc = mongo.db.blacklist.find_one({'seller_id': ObjectId(seller_id)})
            return Blacklist.from_bson(blacklist_doc) if blacklist_doc else None
        except Exception:
            return None
    
    @staticmethod
    def blacklist_seller(seller_id, blacklisted_by, reason=None):
        """Blacklist a seller"""
        try:
            # Check if already blacklisted
            if BlacklistService.is_blacklisted(seller_id):
                raise ValueError("Seller is already blacklisted")
            
            # Create blacklist entry
            blacklist = Blacklist(
                seller_id=ObjectId(seller_id),
                blacklisted_by=blacklisted_by,
                reason=reason,
                blacklisted_at=datetime.utcnow()
            )
            
            # Insert into MongoDB
            result = mongo.db.blacklist.insert_one(blacklist.to_bson())
            blacklist._id = result.inserted_id
            
            return blacklist
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error blacklisting seller: {str(e)}")
    
    @staticmethod
    def unblacklist_seller(seller_id):
        """Remove seller from blacklist"""
        try:
            result = mongo.db.blacklist.delete_one({'seller_id': ObjectId(seller_id)})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error unblacklisting seller: {str(e)}")
    
    @staticmethod
    def get_all_blacklisted_seller_ids():
        """Get all blacklisted seller IDs"""
        try:
            blacklist_docs = mongo.db.blacklist.find({}, {'seller_id': 1})
            return [str(doc['seller_id']) for doc in blacklist_docs]
        except Exception:
            return []

    @staticmethod
    def get_all_blacklisted_entries():
        """Get full blacklist entries"""
        try:
            blacklist_docs = mongo.db.blacklist.find()
            return [Blacklist.from_bson(doc) for doc in blacklist_docs]
        except Exception:
            return []

