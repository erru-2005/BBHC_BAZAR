"""
Seller service - Business logic for seller operations with MongoDB
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.seller import Seller
from app.services.blacklist_service import BlacklistService


class SellerService:
    """Service class for seller-related business logic"""
    
    @staticmethod
    def get_seller_by_id(seller_id, include_blacklisted=False):
        """Get seller by ID (excludes blacklisted by default)"""
        try:
            seller_doc = mongo.db.sellers.find_one({'_id': ObjectId(seller_id)})
            if not seller_doc:
                return None
            
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(seller_id):
                return None
            
            return Seller.from_bson(seller_doc)
        except Exception:
            return None
    
    @staticmethod
    def get_seller_by_email(email, include_blacklisted=False):
        """Get seller by email (excludes blacklisted by default)"""
        try:
            seller_doc = mongo.db.sellers.find_one({'email': email})
            if not seller_doc:
                return None
            
            seller_id = str(seller_doc.get('_id'))
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(seller_id):
                return None
            
            return Seller.from_bson(seller_doc)
        except Exception:
            return None
    
    @staticmethod
    def get_seller_by_trade_id(trade_id, include_blacklisted=False):
        """Get seller by trade ID (excludes blacklisted by default)"""
        try:
            seller_doc = mongo.db.sellers.find_one({'trade_id': trade_id})
            if not seller_doc:
                return None
            
            seller_id = str(seller_doc.get('_id'))
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(seller_id):
                return None
            
            return Seller.from_bson(seller_doc)
        except Exception:
            return None
    
    @staticmethod
    def create_seller(seller_data):
        """Create a new seller"""
        try:
            # Hash password if provided
            if 'password' in seller_data:
                seller_data['password_hash'] = Seller.set_password(seller_data.pop('password'))
            
            # Validate required fields
            required_fields = ['trade_id', 'email', 'password_hash']
            for field in required_fields:
                if field not in seller_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create seller instance
            seller = Seller(
                trade_id=seller_data.get('trade_id'),
                email=seller_data.get('email'),
                password_hash=seller_data.get('password_hash'),
                phone_number=seller_data.get('phone_number'),
                first_name=seller_data.get('first_name'),
                last_name=seller_data.get('last_name'),
                is_active=seller_data.get('is_active', False),
                created_by=seller_data.get('created_by', 'system'),
                created_at=seller_data.get('created_at')
            )
            
            # Check if email or trade_id already exists
            if SellerService.get_seller_by_email(seller.email):
                raise ValueError("Seller with this email already exists")
            
            if SellerService.get_seller_by_trade_id(seller.trade_id):
                raise ValueError("Seller with this trade ID already exists")
            
            # Store additional metadata in BSON
            seller_bson = seller.to_bson()
            # Add metadata fields
            if 'created_by_user_id' in seller_data:
                seller_bson['created_by_user_id'] = seller_data['created_by_user_id']
            if 'created_by_user_type' in seller_data:
                seller_bson['created_by_user_type'] = seller_data['created_by_user_type']
            if 'registration_ip' in seller_data:
                seller_bson['registration_ip'] = seller_data['registration_ip']
            if 'registration_user_agent' in seller_data:
                seller_bson['registration_user_agent'] = seller_data['registration_user_agent']
            
            # Insert into MongoDB sellers collection
            result = mongo.db.sellers.insert_one(seller_bson)
            seller._id = result.inserted_id
            
            return seller
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating seller: {str(e)}")
    
    @staticmethod
    def update_seller(seller_id, seller_data):
        """Update seller information"""
        try:
            # Remove None values
            update_data = {k: v for k, v in seller_data.items() if v is not None}
            
            # Hash password if provided
            if 'password' in update_data:
                update_data['password_hash'] = Seller.set_password(update_data.pop('password'))
            
            # Update in MongoDB
            result = mongo.db.sellers.update_one(
                {'_id': ObjectId(seller_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return None
            
            # Return updated seller
            return SellerService.get_seller_by_id(seller_id)
        except Exception as e:
            raise Exception(f"Error updating seller: {str(e)}")
    
    @staticmethod
    def get_all_sellers(skip=0, limit=20, include_blacklisted=False):
        """Get all sellers with pagination (excludes blacklisted by default)"""
        try:
            # Get all blacklisted seller IDs
            blacklisted_ids = []
            if not include_blacklisted:
                blacklisted_ids = [ObjectId(sid) for sid in BlacklistService.get_all_blacklisted_seller_ids()]
            
            # Build query to exclude blacklisted sellers
            query = {}
            if blacklisted_ids:
                query['_id'] = {'$nin': blacklisted_ids}
            
            sellers = mongo.db.sellers.find(query).skip(skip).limit(limit)
            return [Seller.from_bson(seller_doc) for seller_doc in sellers]
        except Exception:
            return []

