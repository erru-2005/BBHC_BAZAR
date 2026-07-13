"""
Advertisement API Routes
"""
import os
import uuid
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.utils import secure_filename
from bson import ObjectId

from app import mongo
from app.models.advertisement import Advertisement
from datetime import datetime, timezone

advertisement_bp = Blueprint('advertisements', __name__)


def _is_master_request():
    """Check if the current user is a master"""
    claims = get_jwt()
    return claims.get('user_type') == 'master'


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'ogg'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@advertisement_bp.route('/advertisements', methods=['GET'])
def get_advertisements():
    """Fetch all active advertisements"""
    try:
        # Sort by created_at descending
        ads_cursor = mongo.db.advertisements.find({'is_active': True}).sort('created_at', -1)
        ads = [Advertisement.from_bson(doc).to_dict() for doc in ads_cursor]
        return jsonify(ads), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@advertisement_bp.route('/advertisements', methods=['POST'])
@jwt_required()
def create_advertisement():
    """Create a new advertisement (Master only)"""
    if not _is_master_request():
        return jsonify({'error': 'Unauthorized. Only masters can manage advertisements.'}), 403

    try:
        link = request.form.get('link')
        title = request.form.get('title', '')
        media_type = request.form.get('media_type', 'image')
        media_url = request.form.get('media_url', '')

        if not link:
            return jsonify({'error': 'Link is required'}), 400

        # Handle file upload if present
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower()
                
                # Determine media type automatically if not explicitly provided correctly
                if ext in {'mp4', 'webm', 'ogg'}:
                    media_type = 'video'
                else:
                    media_type = 'image'

                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                
                # Ensure advertisements directory exists
                static_dir = current_app.static_folder
                ads_dir = os.path.join(static_dir, 'advertisements')
                os.makedirs(ads_dir, exist_ok=True)
                
                file_path = os.path.join(ads_dir, unique_filename)
                file.save(file_path)
                
                # The URL path that frontend can use (e.g. /static/advertisements/...)
                media_url = f"/static/advertisements/{unique_filename}"
            else:
                return jsonify({'error': 'Invalid file format'}), 400

        if not media_url:
            return jsonify({'error': 'Media file or URL is required'}), 400

        ad = Advertisement(
            media_url=media_url,
            media_type=media_type,
            link=link,
            title=title,
            created_by=get_jwt().get('sub')
        )
        
        result = mongo.db.advertisements.insert_one(ad.to_bson())
        ad._id = result.inserted_id
        
        return jsonify({
            'message': 'Advertisement created successfully',
            'advertisement': ad.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': f"Failed to create advertisement: {str(e)}"}), 500


@advertisement_bp.route('/advertisements/<ad_id>', methods=['DELETE'])
@jwt_required()
def delete_advertisement(ad_id):
    """Delete an advertisement (Master only)"""
    if not _is_master_request():
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        if not ObjectId.is_valid(ad_id):
            return jsonify({'error': 'Invalid advertisement ID'}), 400

        result = mongo.db.advertisements.delete_one({'_id': ObjectId(ad_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Advertisement not found'}), 404

        return jsonify({'message': 'Advertisement deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
