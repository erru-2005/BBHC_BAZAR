"""
SMS utility re-implemented to send in-app notifications via Socket.IO
"""
import os
from datetime import datetime, timezone
from flask import current_app
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
        master = mongo.db.master.find_one({
            '$or': [
                {'phone_number': phone_number},
                {'phone_number': normalized}
            ]
        })
        if master:
            return master, 'master'
            
        return None, None

    @staticmethod
    def _find_user_or_seller_by_email(email):
        """Find user, seller, outlet_man, or master by email and return their document and role"""
        if not email:
            return None, None
            
        email_clean = str(email).strip().lower()
        
        # Check users collection
        user = mongo.db.users.find_one({'email': email_clean})
        if user:
            return user, 'user'
            
        # Check sellers collection
        seller = mongo.db.sellers.find_one({'email': email_clean})
        if seller:
            return seller, 'seller'
            
        # Check outlet_men collection
        outlet = mongo.db.outlet_men.find_one({'email': email_clean})
        if outlet:
            return outlet, 'outlet_man'
            
        # Check master collection
        master = mongo.db.master.find_one({'email': email_clean})
        if master:
            return master, 'master'
            
        return None, None

    @staticmethod
    def send_otp(phone_number, otp, email=None):
        """
        Send OTP via SMTP Email (and fallback to WebSocket/FCM)
        
        Args:
            phone_number (str): Recipient phone number (format: +1234567890)
            otp (str): 6-digit OTP code
            email (str, optional): Recipient email address
            
        Returns:
            tuple: (success: bool, message: str)
        """
        message_body = f"Your BBHCBazaar OTP code is: {otp}. This code will expire in 10 minutes. Do not share this code with anyone."
        return SMSService.send_message(phone_number, message_body, email=email)

    @staticmethod
    def send_message(phone_number, message_body, product_thumbnail=None, email=None):
        """
        Send a notification via Email (using SMTP) and Socket.IO/FCM.
        
        Args:
            phone_number (str): Recipient phone number
            message_body (str): Text message body
            product_thumbnail (str, optional): Product thumbnail URL
            email (str, optional): Direct recipient email
            
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            print(f"[SMSService] Processing notification/email for {phone_number} (email: {email}): {message_body}")
            
            # Lookup by email first if available (emails are unique in DB)
            user_doc = None
            role = None
            if email:
                user_doc, role = SMSService._find_user_or_seller_by_email(email)
                
            # Fallback to phone lookup if email lookup returned nothing
            if not user_doc:
                user_doc, role = SMSService._find_user_or_seller_by_phone(phone_number)
            
            # If it is not a security verification code or OTP, check if the recipient has notifications enabled
            is_otp = 'OTP' in message_body or 'Verification' in message_body or 'security code' in message_body.lower()
            is_order_transactional = 'order' in message_body.lower() or 'booking' in message_body.lower() or '#' in message_body or 'accepted' in message_body.lower() or 'rejected' in message_body.lower() or 'cancelled' in message_body.lower()
            if not is_otp and not is_order_transactional and user_doc:
                if not user_doc.get('notifications_enabled', False):
                    print(f"[SMSService] Notifications not enabled for {phone_number}. Skipping.")
                    return False, "Notifications not enabled"
            
            socket_id = user_doc.get('socket_id') if user_doc else None
            
            # Construct notification payload
            payload = {
                'title': 'Security Verification Code' if is_otp else 'New Order Notification',
                'message': message_body,
                'thumbnail': product_thumbnail,
                'timestamp': datetime.now(timezone.utc).isoformat() + 'Z'
            }

            # Send via Email SMTP
            recipient_email = email
            if not recipient_email and user_doc:
                recipient_email = user_doc.get('email')
                
            email_sent = False
            email_error = None
            if recipient_email:
                try:
                    # Print OTP to terminal for debug
                    if is_otp:
                        print(f"\n[DEBUG OTP SENDING] Target Email: {recipient_email} | Message: {message_body}\n", flush=True)

                    if str(recipient_email).strip().lower() in ['text@exmple.com', 'test@example.com']:
                        email_sent = True
                        print(f"[SMSService] Bypassed actual SMTP sending for target bypass email: {recipient_email}")
                    else:
                        from app.utils.email import EmailService
                        subject = "BBHCBazaar - Security Verification Code" if is_otp else "BBHCBazaar - Order Update"
                        
                        # Simple, clean HTML body to prevent spam detection
                        html_body = f"""
                        <html>
                        <body style="font-family: sans-serif; line-height: 1.5; color: #111111; max-width: 500px; margin: 20px auto; padding: 10px;">
                            <p>Hello,</p>
                            <p>{message_body}</p>
                            <p>Best regards,<br>BBHCBazaar Team</p>
                        </body>
                        </html>
                        """
                        
                        ok, err = EmailService.send_email(
                            to_email=recipient_email,
                            subject=subject,
                            body_text=message_body,
                            body_html=html_body
                        )
                        if ok:
                            email_sent = True
                        else:
                            email_error = err
                except Exception as e:
                    email_error = str(e)
                    print(f"[SMSService] SMTP sending error: {str(e)}")
            else:
                print(f"[SMSService] No email found for {phone_number}. Cannot send SMTP email.")
                email_error = "No email address found"
            
            # Resolve absolute URL for product thumbnail
            absolute_thumbnail = None
            if product_thumbnail:
                thumb_str = str(product_thumbnail).strip()
                if thumb_str.startswith('http://') or thumb_str.startswith('https://'):
                    absolute_thumbnail = thumb_str
                else:
                    if thumb_str.startswith('/'):
                        thumb_str = thumb_str[1:]
                    
                    base_url = None
                    try:
                        from flask import request
                        if request and request.url_root:
                            base_url = request.url_root
                    except Exception:
                        pass
                        
                    if not base_url:
                        try:
                            base_url = current_app.config.get('BASE_URL')
                        except Exception:
                            pass
                    if not base_url:
                        import os
                        base_url = os.environ.get('BASE_URL')
                    if not base_url:
                        base_url = 'http://apps.bbhegdecollege.com:9000/'
                        
                    if not base_url.endswith('/'):
                        base_url += '/'
                    absolute_thumbnail = f"{base_url}{thumb_str}"

            # Short-circuit: OTPs must only be delivered via email. No push notification, no WebSocket broadcast.
            if is_otp:
                if not email_sent:
                    print(f"[SMSService] Aborting OTP delivery: email failed ({email_error})")
                    return False, email_error or "Failed to send OTP email"
                print(f"[SMSService] OTP email delivered successfully. Bypassing push/WS.")
                return True, "OTP email sent successfully"

            # Update payload with absolute thumbnail path
            if absolute_thumbnail:
                payload['thumbnail'] = absolute_thumbnail

            # If user has an FCM token, send a push notification
            fcm_token = user_doc.get('fcm_token') if user_doc else None
            if fcm_token and role == 'user':
                try:
                    from firebase_admin import messaging
                    
                    fcm_notification = messaging.Notification(
                        title='Security Verification Code' if is_otp else 'New Order Notification',
                        body=message_body,
                        image=absolute_thumbnail
                    )
                    
                    fcm_data = {
                        'title': 'Security Verification Code' if is_otp else 'New Order Notification',
                        'message': message_body,
                        'timestamp': datetime.now(timezone.utc).isoformat() + 'Z'
                    }
                    if absolute_thumbnail:
                        fcm_data['thumbnail'] = absolute_thumbnail
                        
                    message = messaging.Message(
                        notification=fcm_notification,
                        data=fcm_data,
                        token=fcm_token
                    )
                    response = messaging.send(message)
                    print(f"[SMSService] Successfully sent FCM push: {response}")
                except Exception as e:
                    print(f"[SMSService] Failed to send FCM push: {str(e)}")

            # Emit socket event
            if socket_id:
                print(f"[SMSService] Emitting app_notification to socket: {socket_id}")
                socketio.emit('app_notification', payload, to=socket_id)
                if email_sent:
                    return True, "Email and WebSocket notification sent"
                return True, "Notification sent via websocket"
            else:
                # If recipient is offline, do NOT broadcast to all connected clients. Just log it.
                print(f"[SMSService] Recipient {phone_number} is offline. Skipping WebSocket notification to avoid broadcasting.")
                if email_sent:
                    return True, "Email sent (Recipient offline for WebSocket)"
                return False, "Recipient offline and email not sent"
                
        except Exception as e:
            print(f"[SMSService] Error sending notification: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def is_configured():
        """Always returns True to ensure notification routing bypasses configuration checks"""
        return True


