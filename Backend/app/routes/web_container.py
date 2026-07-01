from flask import Blueprint, jsonify, request, make_response
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from app import mongo
from datetime import datetime, timezone

web_container_bp = Blueprint('web_container', __name__)


@web_container_bp.route('/web-container/url', methods=['GET', 'POST', 'OPTIONS'])
def web_container_url():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response

    if request.method == 'GET':
        doc = mongo.db.web_container.find_one({'_id': 'web_url'})
        url = doc['url'] if doc else ''
        return jsonify({'url': url})

    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get('user_type') != 'master':
        return jsonify({'error': 'Only master can set web container URL'}), 403

    data = request.get_json() or {}
    url = data.get('url', '').strip()

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    mongo.db.web_container.update_one(
        {'_id': 'web_url'},
        {'$set': {
            'url': url,
            'updated_at': datetime.now(timezone.utc),
            'updated_by': claims.get('sub', '')
        }},
        upsert=True
    )

    return jsonify({'message': 'Web container URL updated', 'url': url}), 200
