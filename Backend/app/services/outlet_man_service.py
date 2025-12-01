"""
Outlet Man service - Business logic for outlet man operations with MongoDB
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.outlet_man import OutletMan
from app.services.blacklist_service import BlacklistService


class OutletManService:
    """Service class for outlet man-related business logic"""
    
    @staticmethod
    def get_outlet_man_by_id(outlet_man_id, include_blacklisted=False):
        """Get outlet man by ID (excludes blacklisted by default)"""
        try:
            outlet_man_doc = mongo.db.outlet_men.find_one({'_id': ObjectId(outlet_man_id)})
            if not outlet_man_doc:
                return None
            
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(outlet_man_id, 'outlet_man'):
                return None
            
            return OutletMan.from_bson(outlet_man_doc)
        except Exception:
            return None
    
    @staticmethod
    def get_outlet_man_by_email(email, include_blacklisted=False):
        """Get outlet man by email (excludes blacklisted by default)"""
        try:
            outlet_man_doc = mongo.db.outlet_men.find_one({'email': email})
            if not outlet_man_doc:
                return None
            
            outlet_man_id = str(outlet_man_doc.get('_id'))
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(outlet_man_id, 'outlet_man'):
                return None
            
            return OutletMan.from_bson(outlet_man_doc)
        except Exception:
            return None
    
    @staticmethod
    def get_outlet_man_by_access_code(outlet_access_code, include_blacklisted=False):
        """Get outlet man by access code (excludes blacklisted by default)"""
        try:
            outlet_man_doc = mongo.db.outlet_men.find_one({'outlet_access_code': outlet_access_code})
            if not outlet_man_doc:
                return None
            
            outlet_man_id = str(outlet_man_doc.get('_id'))
            # Check if blacklisted (unless explicitly including blacklisted)
            if not include_blacklisted and BlacklistService.is_blacklisted(outlet_man_id, 'outlet_man'):
                return None
            
            return OutletMan.from_bson(outlet_man_doc)
        except Exception:
            return None
    
    @staticmethod
    def create_outlet_man(outlet_man_data):
        """Create a new outlet man"""
        try:
            outlet_access_code = outlet_man_data.get('outlet_access_code', '').strip()
            email = outlet_man_data.get('email', '').strip()
            password = outlet_man_data.get('password', '')
            
            if not outlet_access_code:
                raise ValueError("Outlet Access Code is required")
            if not email:
                raise ValueError("Email is required")
            if not password:
                raise ValueError("Password is required")
            
            # Check if outlet access code already exists
            existing = OutletManService.get_outlet_man_by_access_code(outlet_access_code, include_blacklisted=True)
            if existing:
                raise ValueError("Outlet Access Code already exists")
            
            # Check if email already exists
            existing_email = OutletManService.get_outlet_man_by_email(email, include_blacklisted=True)
            if existing_email:
                raise ValueError("Email already exists")
            
            # Hash password
            password_hash = OutletMan.set_password(password)
            
            # Create outlet man
            outlet_man = OutletMan(
                outlet_access_code=outlet_access_code,
                email=email,
                password_hash=password_hash,
                phone_number=outlet_man_data.get('phone_number'),
                first_name=outlet_man_data.get('first_name'),
                last_name=outlet_man_data.get('last_name'),
                is_active=outlet_man_data.get('is_active', False),
                created_by=outlet_man_data.get('created_by', 'system'),
                created_at=outlet_man_data.get('created_at') or datetime.utcnow()
            )
            
            # Insert into MongoDB
            result = mongo.db.outlet_men.insert_one(outlet_man.to_bson())
            outlet_man._id = result.inserted_id
            
            return outlet_man
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating outlet man: {str(e)}")
    
    @staticmethod
    def get_all_outlet_men(skip=0, limit=100, include_blacklisted=False):
        """Get all outlet men (excludes blacklisted by default)"""
        try:
            outlet_men_docs = mongo.db.outlet_men.find().sort('created_at', -1).skip(skip).limit(limit)
            outlet_men = [OutletMan.from_bson(doc) for doc in outlet_men_docs if doc]
            
            if not include_blacklisted:
                # Filter out blacklisted outlet men
                blacklisted_ids = BlacklistService.get_all_blacklisted_ids('outlet_man')
                outlet_men = [om for om in outlet_men if str(om._id) not in blacklisted_ids]
            
            return outlet_men
        except Exception:
            return []
    
    @staticmethod
    def update_outlet_man(outlet_man_id, update_data):
        """Update outlet man"""
        try:
            outlet_man = OutletManService.get_outlet_man_by_id(outlet_man_id, include_blacklisted=True)
            if not outlet_man:
                return None
            
            # Update fields
            if 'email' in update_data:
                # Check if new email already exists
                existing = OutletManService.get_outlet_man_by_email(update_data['email'], include_blacklisted=True)
                if existing and str(existing._id) != outlet_man_id:
                    raise ValueError("Email already exists")
                outlet_man.email = update_data['email']
            
            if 'phone_number' in update_data:
                outlet_man.phone_number = update_data['phone_number']
            if 'first_name' in update_data:
                outlet_man.first_name = update_data['first_name']
            if 'last_name' in update_data:
                outlet_man.last_name = update_data['last_name']
            if 'is_active' in update_data:
                outlet_man.is_active = update_data['is_active']
            
            # Update in MongoDB
            mongo.db.outlet_men.update_one(
                {'_id': outlet_man._id},
                {'$set': outlet_man.to_bson()}
            )
            
            return outlet_man
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error updating outlet man: {str(e)}")
    
    @staticmethod
    def delete_outlet_man(outlet_man_id):
        """Delete outlet man"""
        try:
            result = mongo.db.outlet_men.delete_one({'_id': ObjectId(outlet_man_id)})
            return result.deleted_count > 0
        except Exception:
            return False

