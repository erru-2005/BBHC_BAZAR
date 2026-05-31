"""
Razorpay payment routes for seller wallet recharge.
"""
import uuid
from datetime import datetime, timezone

import razorpay
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import mongo
from app.services.seller_service import SellerService

payment_bp = Blueprint('payment', __name__)


def _get_razorpay_client():
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if not key_id or not key_secret:
        raise ValueError('Razorpay is not configured on the server')
    return razorpay.Client(auth=(key_id, key_secret))


@payment_bp.route('/payments/razorpay/create-order', methods=['POST'])
@jwt_required()
def create_razorpay_order():
    """Create a Razorpay order for seller credit recharge."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can recharge wallet credits'}), 403

        seller_id = str(get_jwt_identity())
        data = request.get_json() or {}
        credits = int(data.get('amount', 0))
        if credits <= 0:
            return jsonify({'error': 'Amount must be greater than zero'}), 400
        if credits > 100000:
            return jsonify({'error': 'Maximum recharge amount is 100000 credits'}), 400

        seller = SellerService.get_seller_by_id(seller_id)
        if not seller:
            return jsonify({'error': 'Seller not found'}), 404

        amount_paise = credits * 100
        receipt = f"bbhc_credits_{seller_id[:8]}_{uuid.uuid4().hex[:10]}"

        client = _get_razorpay_client()
        order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': receipt,
            'notes': {
                'seller_id': seller_id,
                'credits': str(credits),
                'purpose': 'wallet_recharge'
            }
        })

        now = datetime.now(timezone.utc)
        mongo.db.credit_payments.insert_one({
            'seller_id': seller_id,
            'credits': credits,
            'amount_paise': amount_paise,
            'currency': 'INR',
            'razorpay_order_id': order['id'],
            'receipt': receipt,
            'status': 'created',
            'created_at': now,
            'updated_at': now
        })

        seller_name = ' '.join(
            part for part in [seller.first_name, seller.last_name] if part
        ).strip() or seller.trade_id

        return jsonify({
            'key_id': current_app.config.get('RAZORPAY_KEY_ID'),
            'order_id': order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'credits': credits,
            'seller_name': seller_name,
            'seller_email': seller.email,
            'seller_phone': seller.phone_number
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create payment order: {str(e)}'}), 500


@payment_bp.route('/payments/razorpay/verify', methods=['POST'])
@jwt_required()
def verify_razorpay_payment():
    """Verify Razorpay payment signature and credit seller wallet."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can verify wallet payments'}), 403

        seller_id = str(get_jwt_identity())
        data = request.get_json() or {}
        order_id = data.get('razorpay_order_id')
        payment_id = data.get('razorpay_payment_id')
        signature = data.get('razorpay_signature')

        if not order_id or not payment_id or not signature:
            return jsonify({'error': 'Payment verification data is incomplete'}), 400

        payment_record = mongo.db.credit_payments.find_one({
            'razorpay_order_id': order_id,
            'seller_id': seller_id
        })
        if not payment_record:
            return jsonify({'error': 'Payment record not found'}), 404

        if payment_record.get('status') == 'paid':
            seller = SellerService.get_seller_by_id(seller_id)
            return jsonify({
                'message': 'Payment already processed',
                'credits': seller.credits if seller else payment_record.get('credits'),
                'already_processed': True
            }), 200

        client = _get_razorpay_client()
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })

        credits = int(payment_record.get('credits', 0))
        seller_before = SellerService.get_seller_by_id(seller_id)
        balance_before = int(seller_before.credits or 0) if seller_before else 0

        updated_seller = SellerService.add_credits(seller_id, credits)
        if not updated_seller:
            return jsonify({'error': 'Seller not found after payment'}), 404

        from app.services.wallet_transaction_service import WalletTransactionService

        now = datetime.now(timezone.utc)
        WalletTransactionService.record_transaction(
            seller_id=seller_id,
            seller_trade_id=updated_seller.trade_id,
            transaction_type='razorpay_recharge',
            amount=credits,
            balance_before=balance_before,
            balance_after=updated_seller.credits,
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            amount_inr_paise=payment_record.get('amount_paise'),
            notes='Razorpay wallet recharge',
            metadata={'receipt': payment_record.get('receipt')},
            request=request,
        )

        mongo.db.credit_payments.update_one(
            {'_id': payment_record['_id']},
            {
                '$set': {
                    'status': 'paid',
                    'razorpay_payment_id': payment_id,
                    'razorpay_signature': signature,
                    'paid_at': now,
                    'updated_at': now
                }
            }
        )

        return jsonify({
            'message': f'Successfully added {credits} credits',
            'credits': updated_seller.credits,
            'seller': updated_seller.to_dict()
        }), 200
    except razorpay.errors.SignatureVerificationError:
        return jsonify({'error': 'Payment verification failed. Invalid signature.'}), 400
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Payment verification failed: {str(e)}'}), 500


@payment_bp.route('/seller/wallet-transactions', methods=['GET'])
@jwt_required()
def seller_wallet_transactions():
    """Seller: list own wallet transaction history."""
    try:
        from app.services.wallet_transaction_service import WalletTransactionService

        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can view wallet transactions'}), 403

        seller_id = str(get_jwt_identity())
        skip = request.args.get('skip', 0, type=int)
        limit = min(request.args.get('limit', 50, type=int), 100)
        items, total = WalletTransactionService.list_for_seller(
            seller_id, skip=skip, limit=limit, types=['razorpay_recharge']
        )
        seller = SellerService.get_seller_by_id(seller_id)

        return jsonify({
            'transactions': items,
            'count': len(items),
            'total': total,
            'credits': seller.credits if seller else 0,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
