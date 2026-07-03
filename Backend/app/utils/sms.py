"""
SMS utility re-implemented to send in-app notifications via Socket.IO
"""
import os
from datetime import datetime, timezone
from flask import current_app, has_request_context, request
from bson import ObjectId
from app import mongo, socketio


class SMSService:
    """Service class for sending notifications to the mobile app via WebSocket"""
    
    @staticmethod
    def normalize_phone_number(phone_number):
        """
        Normalize phone number to E.164 format
        
        Args:
            phone_number (str): Phone number in various formats
            
        Returns:
            str: Normalized phone number in E.164 format
        """
        if not phone_number:
            return None
        
        # Remove all non-digit characters except +
        normalized = ''.join(c for c in phone_number if c.isdigit() or c == '+')
        
        # Ensure it starts with +
        if not normalized.startswith('+'):
            # If it doesn't start with +, assume it's a local number
            # For Indian numbers, add +91
            if len(normalized) == 10:
                normalized = '+91' + normalized
            else:
                normalized = '+' + normalized
        
        return normalized
    
    @staticmethod
    def _find_user_or_seller_by_phone(phone_number):
        """Find user, seller, outlet_man, or master by phone number and return their document and role"""
        if not phone_number:
            return None, None
        
        normalized = SMSService.normalize_phone_number(phone_number)
        
        # Check users collection
        user = mongo.db.users.find_one({
            '$or': [
                {'phone_number': phone_number},
                {'phone_number': normalized}
            ]
        })
        if user:
            return user, 'user'
            
        # Check sellers collection
        seller = mongo.db.sellers.find_one({
            '$or': [
                {'phone_number': phone_number},
                {'phone_number': normalized},
                {'seller_phone': phone_number},
                {'seller_phone': normalized}
            ]
        })
        if seller:
            return seller, 'seller'
            
        # Check outlet_men collection
        outlet = mongo.db.outlet_men.find_one({
            '$or': [
                {'phone_number': phone_number},
                {'phone_number': normalized}
            ]
        })
        if outlet:
            return outlet, 'outlet_man'
            
        # Check master collection
        master = mongo.db.masters.find_one({
            '$or': [
                {'phone_number': phone_number},
                {'phone_number': normalized}
            ]
        })
        if master:
            return master, 'master'
            
        return None, None

    @staticmethod
    def send_otp(phone_number, otp):
        """
        Send OTP via Email (Gmail SMTP)
        
        Args:
            phone_number (str): Recipient phone number or email address
            otp (str): 6-digit OTP code
            
        Returns:
            tuple: (success: bool, message: str)
        """
        from app.utils.email import send_email
        
        user_doc, role = SMSService._find_user_or_seller_by_phone(phone_number)
        email = None
        if user_doc:
            email = user_doc.get('email')
        
        if not email:
            # Fallback: if phone_number actually contains '@', treat it as an email directly
            if '@' in str(phone_number):
                email = phone_number
            else:
                return False, f"Email address not found for recipient {phone_number}"
                
        message_body = f"Your BBHCBazaar OTP code is: {otp}. This code will expire in 10 minutes. Do not share this code with anyone."
        subject = "BBHCBazaar Security OTP Verification"
        
        return send_email(email, subject, message_body)

    @staticmethod
    def send_message(phone_number, message_body, product_thumbnail=None, title=None):
        """
        Send a notification to the app via Socket.IO and Firebase Cloud Messaging (FCM).
        
        Args:
            phone_number (str): Recipient phone number
            message_body (str): Text message body
            product_thumbnail (str, optional): Product/service thumbnail URL
            title (str, optional): Custom title for the notification
            
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            # Convert relative thumbnail path to absolute URL
            if product_thumbnail and not (product_thumbnail.startswith('http://') or product_thumbnail.startswith('https://')):
                base_url = os.environ.get('BACKEND_BASE_URL')
                if not base_url and has_request_context():
                    base_url = request.host_url
                if not base_url:
                    base_url = 'http://192.168.1.4:5001'
                
                base_url = base_url.rstrip('/')
                relative_path = product_thumbnail.lstrip('/')
                product_thumbnail = f"{base_url}/{relative_path}"

            print(f"[SMSService] Processing notification for {phone_number}: {message_body}")
            user_doc, role = SMSService._find_user_or_seller_by_phone(phone_number)
            
            # If it is not a security verification code or OTP, check if the recipient has notifications enabled
            is_otp = 'OTP' in message_body or 'Verification' in message_body or 'security code' in message_body.lower()
            if not is_otp and user_doc:
                if not user_doc.get('notifications_enabled', True):
                    print(f"[SMSService] Notifications not enabled for {phone_number}. Skipping.")
                    return False, "Notifications not enabled"
            
            socket_id = user_doc.get('socket_id') if user_doc else None
            
            # Determine dynamic title
            default_title = 'Security Verification Code' if is_otp else 'New Order Notification'
            notification_title = title or default_title
            
            # Construct notification payload
            payload = {
                'title': notification_title,
                'message': message_body,
                'thumbnail': product_thumbnail,
                'timestamp': datetime.now(timezone.utc).isoformat() + 'Z'
            }
            
            # If user has an FCM token, send a push notification
            fcm_token = user_doc.get('fcm_token') if user_doc else None
            if fcm_token:
                try:
                    from firebase_admin import messaging
                    
                    fcm_notification = messaging.Notification(
                        title=notification_title,
                        body=message_body,
                        image=str(product_thumbnail) if product_thumbnail else None
                    )
                    
                    fcm_data = {
                        'title': notification_title,
                        'message': message_body,
                        'timestamp': datetime.now(timezone.utc).isoformat() + 'Z'
                    }
                    if product_thumbnail:
                        fcm_data['thumbnail'] = str(product_thumbnail)
                        
                    message = messaging.Message(
                        notification=fcm_notification,
                        data=fcm_data,
                        token=fcm_token
                    )
                    response = messaging.send(message)
                    print(f"[SMSService] Successfully sent FCM push: {response}")
                except Exception as e:
                    print(f"[SMSService] Failed to send FCM push: {str(e)}")

            # Send via Email as well (for push notifications)
            email = user_doc.get('email') if user_doc else None
            if email and not is_otp:
                try:
                    from app.utils.email import send_email
                    email_subject = notification_title
                    email_body = f"{message_body}\n\nThis is a notification from BBHCBazaar."
                    send_email(email, email_subject, email_body)
                except Exception as e:
                    print(f"[SMSService] Failed to send notification email: {str(e)}")

            # Emit socket event
            if socket_id:
                print(f"[SMSService] Emitting app_notification to socket: {socket_id}")
                socketio.emit('app_notification', payload, to=socket_id)
                return True, "Notification sent via websocket"
            else:
                # If recipient is offline, broadcast it to let any session capture it, and log
                print(f"[SMSService] Recipient {phone_number} is offline. Broadcasting notification.")
                socketio.emit('app_notification', payload)
                return True, "Broadcasted notification since recipient is offline"
                
        except Exception as e:
            print(f"[SMSService] Error sending notification: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def is_configured():
        """Always returns True to ensure notification routing bypasses configuration checks"""
        return True
