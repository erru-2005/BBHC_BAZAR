from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app import mongo
from bson import ObjectId
from datetime import datetime, timezone

security_admin_bp = Blueprint('security_admin', __name__)

def check_master_access():
    claims = get_jwt()
    if claims.get('user_type') != 'master':
        return jsonify({'error': 'Unauthorized. Master access required.'}), 403
    return None

@security_admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_blocked_users():
    """Get users who have been blocked more than 3 times or are permanently blocked"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        # Get users with total_blocks >= 3 or is_permanently_blocked = True
        query = {
            '$or': [
                {'total_blocks': {'$gte': 3}},
                {'is_permanently_blocked': True}
            ]
        }
        
        users = list(mongo.db.users.find(query, {
            'password_hash': 0
        }))
        
        # Convert ObjectId to string
        for user in users:
            user['_id'] = str(user['_id'])
            
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@security_admin_bp.route('/users/<user_id>/block', methods=['POST'])
@jwt_required()
def block_user(user_id):
    """Permanently block a user"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'is_permanently_blocked': True}}
        )
        if result.modified_count == 0:
            return jsonify({'error': 'User not found or already blocked'}), 404
            
        return jsonify({'message': 'User permanently blocked successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@security_admin_bp.route('/users/<user_id>/unblock', methods=['POST'])
@jwt_required()
def unblock_user(user_id):
    """Unblock a user and reset their counters"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'is_permanently_blocked': False,
                'blocked_until': None,
                'failed_login_count': 0,
                'total_blocks': 0
            }}
        )
        if result.modified_count == 0:
            return jsonify({'error': 'User not found or already unblocked'}), 404
            
        return jsonify({'message': 'User unblocked successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@security_admin_bp.route('/ips', methods=['GET'])
@jwt_required()
def get_blocked_ips():
    """Get IPs that have been blocked or permanently blocked"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        now = datetime.now(timezone.utc)
        query = {
            '$or': [
                {'blocked_until': {'$gt': now}},
                {'is_permanently_blocked': True},
                {'failed_count': {'$gt': 0}},
                {'total_blocks': {'$gt': 0}}
            ]
        }
        
        ips = list(mongo.db.ip_security.find(query))
        
        # Convert ObjectId to string
        for ip in ips:
            ip['_id'] = str(ip['_id'])
            
        return jsonify(ips), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@security_admin_bp.route('/ips/<ip_address>/block', methods=['POST'])
@jwt_required()
def block_ip(ip_address):
    """Permanently block an IP"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        result = mongo.db.ip_security.update_one(
            {'ip_address': ip_address},
            {'$set': {'is_permanently_blocked': True}}
        )
        if result.modified_count == 0:
            return jsonify({'error': 'IP not found or already blocked'}), 404
            
        return jsonify({'message': 'IP permanently blocked successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@security_admin_bp.route('/ips/<ip_address>/unblock', methods=['POST'])
@jwt_required()
def unblock_ip(ip_address):
    """Unblock an IP and reset counters"""
    auth_err = check_master_access()
    if auth_err: return auth_err
    
    try:
        result = mongo.db.ip_security.update_one(
            {'ip_address': ip_address},
            {'$set': {
                'is_permanently_blocked': False,
                'blocked_until': None,
                'failed_count': 0
            }}
        )
        if result.modified_count == 0:
            return jsonify({'error': 'IP not found or already unblocked'}), 404
            
        return jsonify({'message': 'IP unblocked successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
