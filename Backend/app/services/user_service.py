"""
User service - Business logic for user operations with MongoDB
"""
from bson import ObjectId
from datetime import datetime
from app import mongo
from app.models.user import User


class UserService:
    """Service class for user-related business logic"""
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        try:
            user_doc = mongo.db.users.find_one({'_id': ObjectId(user_id)})
            return User.from_bson(user_doc) if user_doc else None
        except Exception:
            return None
    
    @staticmethod
    def get_user_by_email(email):
        """Get user by email"""
        try:
            user_doc = mongo.db.users.find_one({'email': email})
            return User.from_bson(user_doc) if user_doc else None
        except Exception:
            return None
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        try:
            user_doc = mongo.db.users.find_one({'username': username})
            return User.from_bson(user_doc) if user_doc else None
        except Exception:
            return None
    
    @staticmethod
    def create_user(user_data):
        """Create a new user"""
        try:
            # Hash password if provided
            if 'password' in user_data:
                user_data['password_hash'] = User.set_password(user_data.pop('password'))
            
            # Validate required fields
            required_fields = ['username', 'email', 'password_hash']
            for field in required_fields:
                if field not in user_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create user instance
            user = User(
                username=user_data.get('username'),
                email=user_data.get('email'),
                password_hash=user_data.get('password_hash'),
                first_name=user_data.get('first_name'),
                last_name=user_data.get('last_name'),
                is_active=user_data.get('is_active', False),
                is_admin=user_data.get('is_admin', False),
                created_at=user_data.get('created_at')
            )
            
            # Check if email or username already exists
            if UserService.get_user_by_email(user.email):
                raise ValueError("User with this email already exists")
            
            if UserService.get_user_by_username(user.username):
                raise ValueError("User with this username already exists")
            
            # Store additional metadata in BSON
            user_bson = user.to_bson()
            # Add metadata fields
            if 'created_by' in user_data:
                user_bson['created_by'] = user_data['created_by']
            if 'created_by_user_id' in user_data:
                user_bson['created_by_user_id'] = user_data['created_by_user_id']
            if 'created_by_user_type' in user_data:
                user_bson['created_by_user_type'] = user_data['created_by_user_type']
            if 'registration_ip' in user_data:
                user_bson['registration_ip'] = user_data['registration_ip']
            if 'registration_user_agent' in user_data:
                user_bson['registration_user_agent'] = user_data['registration_user_agent']
            
            # Insert into MongoDB
            result = mongo.db.users.insert_one(user_bson)
            user._id = result.inserted_id
            
            return user
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating user: {str(e)}")
    
    @staticmethod
    def update_user(user_id, user_data):
        """Update user information"""
        try:
            # Remove None values
            update_data = {k: v for k, v in user_data.items() if v is not None}
            
            # Add updated_at timestamp
            update_data['updated_at'] = datetime.utcnow()
            
            # Update in MongoDB
            result = mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return None
            
            # Return updated user
            return UserService.get_user_by_id(user_id)
        except Exception as e:
            raise Exception(f"Error updating user: {str(e)}")
    
    @staticmethod
    def delete_user(user_id):
        """Delete a user"""
        try:
            result = mongo.db.users.delete_one({'_id': ObjectId(user_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    @staticmethod
    def get_all_users(skip=0, limit=20):
        """Get all users with pagination"""
        try:
            users = mongo.db.users.find().skip(skip).limit(limit)
            return [User.from_bson(user_doc) for user_doc in users]
        except Exception:
            return []

