import json
import os
import sys
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
import bcrypt
from datetime import datetime, timezone
import re

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import Config

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def is_valid_email(email):
    if not email:
        return False
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

def migrate_students(json_file_path):
    print(f"Loading students from {json_file_path}...")
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            students = json.load(f)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return

    print(f"Found {len(students)} students. Connecting to MongoDB...")
    
    mongodb_uri = Config.MONGODB_URI
    mongodb_db = Config.MONGODB_DB
    
    if '@' in mongodb_uri:
        after_at = mongodb_uri.split('@', 1)[1]
        if '/' not in after_at.split('?')[0]:
            if not mongodb_uri.endswith('/'):
                mongodb_uri += '/'
            mongodb_uri = f"{mongodb_uri}{mongodb_db}"
    else:
        if not mongodb_uri.endswith('/'):
            mongodb_uri += '/'
            
    client = MongoClient(mongodb_uri)
    db = client[mongodb_db]
    users_col = db.users
    
    new_users = 0
    skipped_users = 0
    
    print("Starting migration...")
    
    existing_usernames = set(doc['username'] for doc in users_col.find({}, {"username": 1}))
    
    for student in students:
        roll_no = student.get('rollNo')
        raw_email = student.get('email')
        dob = student.get('dob')
        
        if not roll_no or not dob:
            continue
            
        username = str(roll_no)
        
        if username in existing_usernames:
            skipped_users += 1
            continue
            
        password_hash = hash_password(dob)
        
        # validate email
        email = raw_email if is_valid_email(raw_email) else f"{username}@bbhcbazaar.local"
        
        new_user = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'first_name': student.get('studentName', ''),
            'last_name': '',
            'phone_number': student.get('studentContact'),
            'address': student.get('address'),
            'date_of_birth': dob,
            'is_active': True,
            'is_admin': False,
            'role': 'student',
            'notifications_enabled': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        try:
            users_col.insert_one(new_user)
            existing_usernames.add(username)
            new_users += 1
            if new_users % 100 == 0:
                print(f"Inserted {new_users} new users...")
        except DuplicateKeyError:
            # Maybe email collided with existing non-student user
            skipped_users += 1
            
    print(f"Migration completed!")
    print(f"Successfully added: {new_users} students")
    print(f"Skipped (already exist): {skipped_users} students")

if __name__ == '__main__':
    json_path = r'c:\D\students.json'
    migrate_students(json_path)
