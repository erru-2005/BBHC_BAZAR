"""
Debug routes for active counter system
"""
from flask import Blueprint, jsonify
from app.utils.active_counters import get_all_counts, reset_all_counters
from flask_jwt_extended import jwt_required

debug_bp = Blueprint('debug', __name__)


@debug_bp.route('/active-counts', methods=['GET'])
def get_active_counts_debug():
    """Debug endpoint to get current active counts"""
    counts = get_all_counts()
    return jsonify({
        'success': True,
        'counts': counts,
        'message': f'Active Users: {counts["users"]}, Active Sellers: {counts["sellers"]}, Active Masters: {counts["masters"]}, Active Outlets: {counts["outlets"]}'
    })


@debug_bp.route('/reset-counters', methods=['POST'])
@jwt_required()
def reset_counters_debug():
    """Debug endpoint to reset all counters (requires auth)"""
    reset_all_counters()
    return jsonify({
        'success': True,
        'message': 'All counters reset'
    })

