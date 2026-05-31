"""
Master credit grant: passkey (bcrypt), RS256 authorization token, OTP to acting master only.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import current_app

from app import mongo
from app.utils.otp import OTPManager
from app.utils.sms import SMSService

CREDIT_PASSKEY_DOC_ID = 'master_credit_passkey'
CREDIT_TOKEN_TYP = 'credit_grant'
CREDIT_TOKEN_MINUTES = 10
CREDIT_OTP_PURPOSE = 'master_credit_grant'


class CreditSecurityService:
    @staticmethod
    def _get_rsa_keys():
        private_key = current_app.config.get('JWT_PRIVATE_KEY')
        public_key = current_app.config.get('JWT_PUBLIC_KEY')
        if not private_key or not public_key:
            raise ValueError(
                'RSA keys (private.pem / public.pem) are required for credit authorization.'
            )
        return private_key, public_key

    @staticmethod
    def verify_master_credit_passkey(passkey):
        if not passkey or not str(passkey).strip():
            return False
        doc = mongo.db.system_secrets.find_one({'_id': CREDIT_PASSKEY_DOC_ID})
        if not doc or not doc.get('passkey_hash'):
            raise ValueError(
                'Master credit passkey is not configured. Contact system administrator.'
            )
        stored = doc['passkey_hash']
        if isinstance(stored, str):
            stored = stored.encode('utf-8')
        return bcrypt.checkpw(str(passkey).strip().encode('utf-8'), stored)

    @staticmethod
    def create_credit_grant_token(master_id, seller_id, amount):
        private_key, _ = CreditSecurityService._get_rsa_keys()
        now = datetime.now(timezone.utc)
        payload = {
            'typ': CREDIT_TOKEN_TYP,
            'sub': str(master_id),
            'seller_id': str(seller_id),
            'amount': int(amount),
            'iat': now,
            'exp': now + timedelta(minutes=CREDIT_TOKEN_MINUTES),
        }
        token = jwt.encode(payload, private_key, algorithm='RS256')
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return token

    @staticmethod
    def verify_credit_grant_token(token, master_id, seller_id, amount):
        if not token:
            raise ValueError('Credit authorization token is required.')
        _, public_key = CreditSecurityService._get_rsa_keys()
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={'require': ['exp', 'iat', 'sub', 'seller_id', 'amount', 'typ']},
            )
        except jwt.ExpiredSignatureError:
            raise ValueError('Credit authorization expired. Request a new OTP.')
        except jwt.InvalidTokenError as exc:
            raise ValueError(f'Invalid credit authorization: {exc}')

        if payload.get('typ') != CREDIT_TOKEN_TYP:
            raise ValueError('Invalid credit authorization type.')
        if str(payload.get('sub')) != str(master_id):
            raise ValueError('Credit authorization does not match the current master.')
        if str(payload.get('seller_id')) != str(seller_id):
            raise ValueError('Credit authorization does not match this seller.')
        if int(payload.get('amount')) != int(amount):
            raise ValueError('Credit authorization amount mismatch.')
        return payload

    @staticmethod
    def initiate_master_credit_otp(master, seller_id, amount, passkey):
        """
        After passkey OK: issue RS256 token, store OTP session, SMS OTP to this master only.
        """
        if not CreditSecurityService.verify_master_credit_passkey(passkey):
            raise ValueError('Invalid credit passkey.')

        phone = (master.phone_number or '').strip()
        if not phone:
            raise ValueError(
                'Your master account must have a phone number to receive the credit OTP.'
            )

        credit_token = CreditSecurityService.create_credit_grant_token(
            str(master._id), seller_id, amount
        )
        otp = OTPManager.generate_otp()
        session_id = OTPManager.store_otp(
            str(master._id),
            'master',
            otp,
            phone_number=phone,
            purpose=CREDIT_OTP_PURPOSE,
            metadata={
                'seller_id': str(seller_id),
                'amount': int(amount),
                'credit_authorization': credit_token,
            },
        )

        sms_sent = False
        sms_error = None
        if SMSService.is_configured():
            sms_sent, sms_error = SMSService.send_otp(phone, otp)
        elif current_app.config.get('DEBUG'):
            sms_sent = False
            sms_error = 'Twilio not configured (DEBUG: check server logs for OTP)'
        else:
            raise ValueError(
                'SMS is not configured. Cannot send credit OTP. Configure Twilio in .env.'
            )

        if not sms_sent and not current_app.config.get('DEBUG'):
            raise ValueError(
                sms_error or 'Failed to send OTP to your phone. Credits were not initiated.'
            )

        return {
            'otp_session_id': session_id,
            'credit_authorization': credit_token,
            'sms_sent': sms_sent,
            'sms_error': sms_error,
            'phone_masked': f"***{phone[-4:]}" if len(phone) >= 4 else '****',
        }

    @staticmethod
    def verify_master_credit_otp(master_id, seller_id, amount, otp_session_id, otp, credit_authorization):
        user_info, error = OTPManager.verify_otp(
            otp_session_id, otp, expected_purpose=CREDIT_OTP_PURPOSE
        )
        if error:
            raise ValueError(error)

        if str(user_info.get('user_id')) != str(master_id):
            raise ValueError('OTP session does not belong to the current master.')

        metadata = user_info.get('metadata') or {}
        if str(metadata.get('seller_id')) != str(seller_id):
            raise ValueError('OTP session does not match this seller.')
        if int(metadata.get('amount', 0)) != int(amount):
            raise ValueError('OTP session amount does not match.')

        stored_token = metadata.get('credit_authorization')
        if stored_token != credit_authorization:
            raise ValueError('Credit authorization token mismatch.')

        CreditSecurityService.verify_credit_grant_token(
            credit_authorization, master_id, seller_id, amount
        )
        return True

    @staticmethod
    def notify_masters_credit_alert_best_effort(*, master_username, seller_trade_id, amount):
        """Optional SMS to other masters; failures are ignored."""
        if not SMSService.is_configured():
            return 0

        message = (
            f'BBHC Bazar: {master_username} added {amount} credits to seller {seller_trade_id}.'
        )
        sent = 0
        for doc in mongo.db.master.find({'status': {'$ne': 'inactive'}}):
            phone = (doc.get('phone_number') or '').strip()
            if not phone:
                continue
            ok, _ = SMSService.send_message(phone, message)
            if ok:
                sent += 1
        return sent
