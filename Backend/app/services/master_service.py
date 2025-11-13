"""
Master service - Business logic for master operations with MongoDB
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.master import Master


class MasterService:
    """Service class for master-related business logic"""
    
    @staticmethod
    def get_master_by_id(master_id):
        """Get master by ID"""
        try:
            master_doc = mongo.db.master.find_one({'_id': ObjectId(master_id)})
            return Master.from_bson(master_doc) if master_doc else None
        except Exception:
            return None
    
    @staticmethod
    def get_master_by_email(email):
        """Get master by email"""
        try:
            master_doc = mongo.db.master.find_one({'email': email})
            return Master.from_bson(master_doc) if master_doc else None
        except Exception:
            return None
    
    @staticmethod
    def get_master_by_username(username):
        """Get master by username"""
        try:
            master_doc = mongo.db.master.find_one({'username': username})
            return Master.from_bson(master_doc) if master_doc else None
        except Exception:
            return None
    
    @staticmethod
    def create_master(master_data):
        """Create a new master"""
        try:
            # Hash password if provided
            if 'password' in master_data:
                master_data['password_hash'] = Master.set_password(master_data.pop('password'))
            
            # Validate required fields
            required_fields = ['name', 'username', 'email', 'password_hash', 'phone_number']
            for field in required_fields:
                if field not in master_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate status enum
            if 'status' in master_data and master_data['status'] not in ['active', 'not_active']:
                raise ValueError("Status must be 'active' or 'not_active'")
            
            # Set defaults
            master_data.setdefault('status', 'active')
            master_data.setdefault('created_by', 'bazar@bbhc')
            
            # Create master instance
            master = Master(
                name=master_data.get('name'),
                username=master_data.get('username'),
                email=master_data.get('email'),
                password_hash=master_data.get('password_hash'),
                phone_number=master_data.get('phone_number'),
                address=master_data.get('address'),
                status=master_data.get('status', 'active'),
                created_by=master_data.get('created_by', 'bazar@bbhc')
            )
            
            # Check if email or username already exists
            if MasterService.get_master_by_email(master.email):
                raise ValueError("Master with this email already exists")
            
            if MasterService.get_master_by_username(master.username):
                raise ValueError("Master with this username already exists")
            
            # Insert into MongoDB
            result = mongo.db.master.insert_one(master.to_bson())
            master._id = result.inserted_id
            
            return master
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating master: {str(e)}")
    
    @staticmethod
    def update_master(master_id, master_data):
        """Update master information"""
        try:
            # Remove None values
            update_data = {k: v for k, v in master_data.items() if v is not None}
            
            # Hash password if provided
            if 'password' in update_data:
                update_data['password_hash'] = Master.set_password(update_data.pop('password'))
            
            # Validate status enum if provided
            if 'status' in update_data and update_data['status'] not in ['active', 'not_active']:
                raise ValueError("Status must be 'active' or 'not_active'")
            
            # Update in MongoDB
            result = mongo.db.master.update_one(
                {'_id': ObjectId(master_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return None
            
            # Return updated master
            return MasterService.get_master_by_id(master_id)
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error updating master: {str(e)}")
    
    @staticmethod
    def get_all_masters(skip=0, limit=20):
        """Get all masters with pagination"""
        try:
            masters = mongo.db.master.find().skip(skip).limit(limit)
            return [Master.from_bson(master_doc) for master_doc in masters]
        except Exception:
            return []

