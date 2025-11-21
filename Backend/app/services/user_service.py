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
    def get_user_by_phone_number(phone_number):
        """Get user by phone number"""
        try:
            user_doc = mongo.db.users.find_one({'phone_number': phone_number})
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
            
            # For phone-based registration, password is optional
            # Generate a random password if not provided (for phone-based auth)
            if 'password_hash' not in user_data:
                import secrets
                random_password = secrets.token_urlsafe(32)
                user_data['password_hash'] = User.set_password(random_password)
            
            # Validate required fields - email and username are required for traditional registration
            # For phone-based registration, phone_number is required instead
            if 'phone_number' in user_data and user_data['phone_number']:
                # Phone-based registration
                if not user_data.get('phone_number'):
                    raise ValueError("Phone number is required")
                # Generate username from phone if not provided
                if not user_data.get('username'):
                    user_data['username'] = f"user_{user_data['phone_number']}"
                # Generate email from phone if not provided
                if not user_data.get('email'):
                    user_data['email'] = f"{user_data['phone_number']}@bbhcbazaar.local"
            else:
                # Traditional registration
                required_fields = ['username', 'email', 'password_hash']
                for field in required_fields:
                    if field not in user_data:
                        raise ValueError(f"Missing required field: {field}")
            
            # Parse date_of_birth if provided as string (DD-MM-YYYY)
            if 'date_of_birth' in user_data and isinstance(user_data['date_of_birth'], str):
                try:
                    from datetime import datetime
                    user_data['date_of_birth'] = datetime.strptime(user_data['date_of_birth'], '%d-%m-%Y')
                except ValueError:
                    raise ValueError("Invalid date_of_birth format. Use DD-MM-YYYY")
            
            # Create user instance
            user = User(
                username=user_data.get('username'),
                email=user_data.get('email'),
                password_hash=user_data.get('password_hash'),
                first_name=user_data.get('first_name'),
                last_name=user_data.get('last_name'),
                phone_number=user_data.get('phone_number'),
                address=user_data.get('address'),
                date_of_birth=user_data.get('date_of_birth'),
                is_active=user_data.get('is_active', True),
                is_admin=user_data.get('is_admin', False),
                created_at=user_data.get('created_at')
            )
            
            # Check if email or username already exists (only if provided)
            if user.email and UserService.get_user_by_email(user.email):
                raise ValueError("User with this email already exists")
            
            if user.username and UserService.get_user_by_username(user.username):
                raise ValueError("User with this username already exists")
            
            # Check if phone number already exists
            if user.phone_number and UserService.get_user_by_phone_number(user.phone_number):
                raise ValueError("User with this phone number already exists")
            
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

