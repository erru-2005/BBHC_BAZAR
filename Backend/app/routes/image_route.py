"""
Multipart image uploads (WebP on disk). No base64 in API payloads.
"""
import os
from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.utils.image_handler import save_image_file, save_avatar_file

image_bp = Blueprint('images', __name__)

ALLOWED_ENTITY_TYPES = {'products', 'services', 'avatars'}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


@image_bp.route('/images/upload', methods=['POST'])
@jwt_required()
def upload_image():
    """
    Form fields:
      - file (required)
      - entity_type: products | services | avatars
      - entity_id: optional for products/services (generated if missing)
      - index: gallery index, default 0 (thumbnail)
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if not file or not file.filename:
            return jsonify({'error': 'No selected file'}), 400

        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > MAX_UPLOAD_BYTES:
            return jsonify({'error': 'File too large (max 8MB)'}), 400

        entity_type = (request.form.get('entity_type') or 'products').strip().lower()
        if entity_type not in ALLOWED_ENTITY_TYPES:
            return jsonify({'error': 'Invalid entity_type'}), 400

        claims = get_jwt()
        user_id = str(get_jwt_identity())

        if entity_type == 'avatars':
            if claims.get('user_type') not in ('seller', 'master', 'user'):
                return jsonify({'error': 'Unauthorized'}), 403
            entity_id = request.form.get('entity_id') or user_id
            if claims.get('user_type') != 'master' and str(entity_id) != user_id:
                return jsonify({'error': 'You can only upload your own avatar'}), 403
            url = save_avatar_file(file, entity_id)
            return jsonify({
                'message': 'Avatar uploaded',
                'url': url,
                'entity_id': str(entity_id),
            }), 201

        entity_id = request.form.get('entity_id') or str(ObjectId())
        try:
            index = int(request.form.get('index', 0))
        except (TypeError, ValueError):
            index = 0

        url = save_image_file(file, entity_id, index, entity_type)
        return jsonify({
            'message': 'Image uploaded',
            'url': url,
            'entity_id': str(entity_id),
            'index': index,
        }), 201
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': f'Upload failed: {exc}'}), 500


@image_bp.route('/images/reserve-id', methods=['POST'])
@jwt_required()
def reserve_entity_id():
    """Reserve a Mongo-style id folder name before product/service create."""
    entity_type = (request.get_json(silent=True) or {}).get('entity_type') or 'products'
    entity_type = str(entity_type).strip().lower()
    if entity_type not in ('products', 'services'):
        return jsonify({'error': 'entity_type must be products or services'}), 400
    return jsonify({'entity_id': str(ObjectId())}), 200
