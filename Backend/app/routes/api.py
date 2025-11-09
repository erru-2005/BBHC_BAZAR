"""
Main API routes
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

api_bp = Blueprint('api', __name__)


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'API is running'
    }), 200


@api_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'message': 'Backend API is working!'
    }), 200


@api_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    """Protected endpoint - requires JWT token"""
    current_user_id = get_jwt_identity()
    return jsonify({
        'message': 'This is a protected route',
        'user_id': current_user_id
    }), 200

