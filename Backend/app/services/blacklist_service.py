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
    def is_blacklisted(user_id, user_type='seller'):
        """Check if a user (seller or outlet_man) is blacklisted"""
        try:
            # Support both new format (user_id + user_type) and legacy format (seller_id)
            query = {'user_id': ObjectId(user_id), 'user_type': user_type}
            if user_type == 'seller':
                # Also check legacy format for backward compatibility
                legacy_query = {'seller_id': ObjectId(user_id)}
                blacklist_doc = mongo.db.blacklist.find_one({'$or': [query, legacy_query]})
            else:
                blacklist_doc = mongo.db.blacklist.find_one(query)
            return blacklist_doc is not None
        except Exception:
            return False
    
    @staticmethod
    def get_blacklist_by_user_id(user_id, user_type='seller'):
        """Get blacklist entry by user ID"""
        try:
            query = {'user_id': ObjectId(user_id), 'user_type': user_type}
            if user_type == 'seller':
                legacy_query = {'seller_id': ObjectId(user_id)}
                blacklist_doc = mongo.db.blacklist.find_one({'$or': [query, legacy_query]})
            else:
                blacklist_doc = mongo.db.blacklist.find_one(query)
            return Blacklist.from_bson(blacklist_doc) if blacklist_doc else None
        except Exception:
            return None
    
    @staticmethod
    def blacklist_user(user_id, user_type, blacklisted_by, reason=None):
        """Blacklist a user (seller or outlet_man)"""
        try:
            # Check if already blacklisted
            if BlacklistService.is_blacklisted(user_id, user_type):
                raise ValueError(f"{user_type.replace('_', ' ').title()} is already blacklisted")
            
            # Create blacklist entry
            blacklist = Blacklist(
                user_id=ObjectId(user_id),
                user_type=user_type,
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
            raise Exception(f"Error blacklisting {user_type}: {str(e)}")
    
    @staticmethod
    def blacklist_seller(seller_id, blacklisted_by, reason=None):
        """Blacklist a seller (backward compatibility)"""
        return BlacklistService.blacklist_user(seller_id, 'seller', blacklisted_by, reason)
    
    @staticmethod
    def unblacklist_user(user_id, user_type='seller'):
        """Remove user from blacklist"""
        try:
            query = {'user_id': ObjectId(user_id), 'user_type': user_type}
            if user_type == 'seller':
                # Also check legacy format
                legacy_query = {'seller_id': ObjectId(user_id)}
                result = mongo.db.blacklist.delete_one({'$or': [query, legacy_query]})
            else:
                result = mongo.db.blacklist.delete_one(query)
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error unblacklisting {user_type}: {str(e)}")
    
    @staticmethod
    def unblacklist_seller(seller_id):
        """Remove seller from blacklist (backward compatibility)"""
        return BlacklistService.unblacklist_user(seller_id, 'seller')
    
    @staticmethod
    def get_all_blacklisted_ids(user_type=None):
        """Get all blacklisted user IDs, optionally filtered by user_type"""
        try:
            if user_type:
                query = {'user_type': user_type}
            else:
                # Include legacy entries (seller_id without user_type) when no filter
                query = {'$or': [
                    {'user_type': {'$exists': True}},
                    {'seller_id': {'$exists': True}, 'user_type': {'$exists': False}}
                ]}
            
            blacklist_docs = mongo.db.blacklist.find(query, {'user_id': 1, 'seller_id': 1, 'user_type': 1})
            ids = []
            for doc in blacklist_docs:
                # Support both new and legacy format
                if 'user_id' in doc:
                    ids.append(str(doc['user_id']))
                elif 'seller_id' in doc:
                    ids.append(str(doc['seller_id']))
            return ids
        except Exception:
            return []
    
    @staticmethod
    def get_all_blacklisted_seller_ids():
        """Get all blacklisted seller IDs (backward compatibility)"""
        return BlacklistService.get_all_blacklisted_ids('seller')

    @staticmethod
    def get_all_blacklisted_entries(user_type=None):
        """Get full blacklist entries, optionally filtered by user_type"""
        try:
            if user_type:
                query = {'user_type': user_type}
            else:
                # Include legacy entries (seller_id without user_type) when no filter
                query = {'$or': [
                    {'user_type': {'$exists': True}},
                    {'seller_id': {'$exists': True}, 'user_type': {'$exists': False}}
                ]}
            
            blacklist_docs = mongo.db.blacklist.find(query)
            return [Blacklist.from_bson(doc) for doc in blacklist_docs]
        except Exception:
            return []

