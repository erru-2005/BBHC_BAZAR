"""
Simple API route - Welcome endpoint
"""
from flask import Blueprint, jsonify

api_bp = Blueprint('api', __name__)


@api_bp.route('/', methods=['GET'])
def welcome():
    """Welcome endpoint"""
    return jsonify({
        'message': 'Welcome to BBHC Bazar API'
    }), 200
