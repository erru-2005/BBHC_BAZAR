"""
Helper utility functions
"""
from datetime import datetime
from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    """Create a success response"""
    response = {
        'success': True,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), status_code


def error_response(message="Error", status_code=400, errors=None):
    """Create an error response"""
    response = {
        'success': False,
        'message': message
    }
    if errors:
        response['errors'] = errors
    return jsonify(response), status_code


def format_datetime(dt):
    """Format datetime to ISO string"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()

