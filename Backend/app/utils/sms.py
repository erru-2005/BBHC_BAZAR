"""
SMS utility for sending OTP via Twilio
"""
import os
from twilio.rest import Client
from flask import current_app


class SMSService:
    """Service class for sending SMS via Twilio"""
    
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
    def send_otp(phone_number, otp):
        """
        Send OTP via SMS using Twilio
        
        Args:
            phone_number (str): Recipient phone number (format: +1234567890)
            otp (str): 6-digit OTP code
            
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            # Get Twilio credentials from config
            account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
            auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
            twilio_phone = current_app.config.get('TWILIO_PHONE_NUMBER')
            
            # Check if Twilio is configured
            if not account_sid or not auth_token or not twilio_phone:
                return False, "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
            
            # Normalize phone number to E.164 format
            normalized_phone = SMSService.normalize_phone_number(phone_number)
            if not normalized_phone:
                return False, "Invalid phone number format"
            
            # Initialize Twilio client
            client = Client(account_sid, auth_token)
            
            # Create message
            message_body = f"Your BBHCBazaar OTP code is: {otp}. This code will expire in 10 minutes. Do not share this code with anyone."
            
            # Send SMS
            message = client.messages.create(
                body=message_body,
                from_=twilio_phone,
                to=normalized_phone
            )
            
            # Check if message was sent successfully
            if message.sid:
                return True, f"SMS sent successfully. Message SID: {message.sid}"
            else:
                return False, "Failed to send SMS"
                
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            
            # Extract more detailed error information from Twilio exceptions
            if hasattr(e, 'msg'):
                error_msg = e.msg
            elif hasattr(e, 'message'):
                error_msg = e.message
            
            # Provide more helpful error messages
            if "21608" in error_msg or "unverified" in error_msg.lower() or "trial" in error_msg.lower():
                return False, f"Twilio Trial Account Restriction: The phone number {phone_number} must be verified in your Twilio Console. Go to Phone Numbers → Verified Caller IDs and add this number. Error: {error_msg}"
            elif "21211" in error_msg or "Invalid" in error_msg:
                return False, f"Invalid phone number format: {phone_number}. Please use E.164 format (e.g., +919538820068). Error: {error_msg}"
            elif "authentication" in error_msg.lower() or "credentials" in error_msg.lower() or "401" in error_msg:
                return False, f"Twilio authentication failed. Please check your credentials. Error: {error_msg}"
            elif "21614" in error_msg:
                return False, f"Twilio phone number not valid for SMS. Please check your TWILIO_PHONE_NUMBER. Error: {error_msg}"
            else:
                return False, f"Error sending SMS to {phone_number}: {error_type} - {error_msg}"

    @staticmethod
    def send_message(phone_number, message_body):
        """
        Send a custom SMS using Twilio.
        Args:
            phone_number (str): Recipient phone number
            message_body (str): Text message body
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
            auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
            twilio_phone = current_app.config.get('TWILIO_PHONE_NUMBER')

            if not account_sid or not auth_token or not twilio_phone:
                return False, "Twilio credentials not configured."

            normalized_phone = SMSService.normalize_phone_number(phone_number)
            if not normalized_phone:
                return False, "Invalid phone number format"

            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=message_body,
                from_=twilio_phone,
                to=normalized_phone
            )

            if message.sid:
                return True, f"SMS sent successfully. Message SID: {message.sid}"
            return False, "Failed to send SMS"
        except Exception as e:
            error_msg = getattr(e, 'msg', None) or getattr(e, 'message', None) or str(e)
            error_type = type(e).__name__
            return False, f"Error sending SMS to {phone_number}: {error_type} - {error_msg}"
    
    @staticmethod
    def is_configured():
        """Check if Twilio is properly configured"""
        try:
            account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
            auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
            twilio_phone = current_app.config.get('TWILIO_PHONE_NUMBER')
            
            return bool(account_sid and auth_token and twilio_phone)
        except Exception:
            return False

