from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app import mongo

class SecurityService:
    @staticmethod
    def get_client_ip(request):
        """Extract IP address preferring X-Forwarded-For if available."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr

    @staticmethod
    def check_login_allowed(ip_address, user_collection_name, user_identifier_field, user_identifier_value):
        """
        Check if the IP or User is blocked from logging in.
        Returns (is_allowed, error_message).
        """
        now = datetime.now(timezone.utc)
        
        # 1. Check IP block
        ip_record = mongo.db.ip_security.find_one({'ip_address': ip_address})
        if ip_record:
            if ip_record.get('is_permanently_blocked'):
                return False, "PAUSED: This IP address has been paused by the system."
            if ip_record.get('blocked_until') and ip_record['blocked_until'].replace(tzinfo=timezone.utc) > now:
                return False, f"BLOCKED_UNTIL:{ip_record['blocked_until'].replace(tzinfo=timezone.utc).isoformat()}"
            
            # Reset IP count if 30 mins have passed since last failure
            if ip_record.get('last_failed_at'):
                last_failed = ip_record['last_failed_at'].replace(tzinfo=timezone.utc)
                if now - last_failed > timedelta(hours=1):
                    mongo.db.ip_security.update_one(
                        {'_id': ip_record['_id']},
                        {'$set': {'failed_count': 0, 'blocked_until': None}}
                    )

        # 2. Check User block
        user = mongo.db[user_collection_name].find_one({user_identifier_field: user_identifier_value})
        if user:
            if user.get('is_permanently_blocked'):
                return False, "PAUSED: This account has been paused by the system."
            if user.get('blocked_until') and user['blocked_until'].replace(tzinfo=timezone.utc) > now:
                return False, f"BLOCKED_UNTIL:{user['blocked_until'].replace(tzinfo=timezone.utc).isoformat()}"
            
            # Reset user count if 30 mins have passed
            if user.get('last_failed_login_at'):
                last_failed = user['last_failed_login_at'].replace(tzinfo=timezone.utc)
                if now - last_failed > timedelta(hours=1):
                    mongo.db[user_collection_name].update_one(
                        {'_id': user['_id']},
                        {'$set': {'failed_login_count': 0, 'blocked_until': None}}
                    )

        return True, None

    @staticmethod
    def record_failed_login(ip_address, user_collection_name, user_identifier_field, user_identifier_value):
        """
        Increment failed count for both IP and User. Apply blocks if thresholds reached.
        IP threshold = 15
        User threshold = 5
        Block duration = 15 mins
        """
        now = datetime.now(timezone.utc)
        block_duration = timedelta(minutes=15)
        
        # 1. Update IP Security
        ip_record = mongo.db.ip_security.find_one({'ip_address': ip_address})
        if not ip_record:
            mongo.db.ip_security.insert_one({
                'ip_address': ip_address,
                'failed_count': 1,
                'last_failed_at': now,
                'blocked_until': None,
                'total_blocks': 0,
                'is_permanently_blocked': False
            })
        else:
            new_count = ip_record.get('failed_count', 0) + 1
            update_data = {
                'failed_count': new_count,
                'last_failed_at': now
            }
            if new_count >= 15:
                update_data['blocked_until'] = now + block_duration
                update_data['failed_count'] = 0 # reset count but apply block
                new_total_blocks = ip_record.get('total_blocks', 0) + 1
                update_data['total_blocks'] = new_total_blocks
                if new_total_blocks > 1:
                    update_data['is_permanently_blocked'] = True
            mongo.db.ip_security.update_one({'_id': ip_record['_id']}, {'$set': update_data})

        # 2. Update User Security
        user = mongo.db[user_collection_name].find_one({user_identifier_field: user_identifier_value})
        if user:
            new_count = user.get('failed_login_count', 0) + 1
            update_data = {
                'failed_login_count': new_count,
                'last_failed_login_at': now
            }
            if new_count >= 5:
                update_data['blocked_until'] = now + block_duration
                update_data['failed_login_count'] = 0
                update_data['total_blocks'] = user.get('total_blocks', 0) + 1
                
                today_date = now.strftime('%Y-%m-%d')
                if user.get('last_block_date') != today_date:
                    daily_blocks = 1
                else:
                    daily_blocks = user.get('daily_blocks', 0) + 1
                    
                update_data['daily_blocks'] = daily_blocks
                update_data['last_block_date'] = today_date
                
                if daily_blocks > 3:
                    update_data['is_permanently_blocked'] = True
            
            mongo.db[user_collection_name].update_one({'_id': user['_id']}, {'$set': update_data})

    @staticmethod
    def record_successful_login(ip_address, user_collection_name, user_identifier_field, user_identifier_value):
        """Reset failed counts to 0 for IP and User on successful login."""
        # 1. Reset IP
        mongo.db.ip_security.update_one(
            {'ip_address': ip_address},
            {'$set': {'failed_count': 0, 'blocked_until': None}}
        )
        
        # 2. Reset User
        mongo.db[user_collection_name].update_one(
            {user_identifier_field: user_identifier_value},
            {'$set': {'failed_login_count': 0, 'blocked_until': None}}
        )
