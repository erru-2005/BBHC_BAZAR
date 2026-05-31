import io
import os
import shutil
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
PRODUCTS_DIR = os.path.join(STATIC_ROOT, 'products')
SERVICES_DIR = os.path.join(STATIC_ROOT, 'services')
AVATARS_DIR = os.path.join(STATIC_ROOT, 'avatars')

AVATAR_MAX_SIZE = 256
PRODUCT_WEBP_QUALITY = 80


def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)


def is_stored_image_url(value):
    if not value or not isinstance(value, str):
        return False
    return value.startswith('/static/') or value.startswith('http://') or value.startswith('https://')


def is_base64_image(value):
    if not value or not isinstance(value, str):
        return False
    return value.startswith('data:image') or (
        len(value) > 200 and not value.startswith('/') and not value.startswith('http')
    )


def normalize_image_reference(value, fallback=None):
    """Return a safe stored URL or fallback. Never return base64 to clients."""
    if not value:
        return fallback
    if is_base64_image(value):
        return fallback
    if is_stored_image_url(value):
        return value
    return fallback


def _prepare_image(image):
    if image.mode in ('RGBA', 'P'):
        return image.convert('RGBA')
    return image.convert('RGB')


def _save_webp(image, filepath, quality=PRODUCT_WEBP_QUALITY):
    ensure_dir(os.path.dirname(filepath))
    image = _prepare_image(image)
    image.save(filepath, 'WEBP', quality=quality, method=4)


def save_image_file(file_storage, entity_id, index, entity_type='products'):
    """Save an uploaded file as WebP. Returns /static/... URL."""
    if not file_storage:
        raise ValueError('No image file provided')

    image = Image.open(file_storage.stream)
    base_dir = _entity_base_dir(entity_type)
    target_dir = os.path.join(base_dir, str(entity_id))
    ensure_dir(target_dir)

    if entity_type == 'avatars':
        filename = 'avatar.webp'
        image.thumbnail((AVATAR_MAX_SIZE, AVATAR_MAX_SIZE), Image.Resampling.LANCZOS)
    else:
        filename = f'{index}.webp'

    filepath = os.path.join(target_dir, filename)
    quality = 78 if entity_type == 'avatars' else PRODUCT_WEBP_QUALITY
    _save_webp(image, filepath, quality=quality)

    static_segment = entity_type if entity_type != 'avatars' else 'avatars'
    return f'/static/{static_segment}/{entity_id}/{filename}'


def save_stored_image_reference(value, entity_id, index, entity_type='products'):
    """
    Accept only existing /static/ (or http) URLs.
    Reject base64 — callers must upload files first.
    """
    if not value:
        return None
    if is_stored_image_url(value):
        return value
    if is_base64_image(value):
        raise ValueError(
            'Base64 images are not supported. Upload files via POST /api/images/upload.'
        )
    raise ValueError('Invalid image reference. Upload an image file first.')


def save_avatar_file(file_storage, user_id):
    return save_image_file(file_storage, str(user_id), 0, entity_type='avatars')


def delete_entity_images(entity_id, entity_type='products'):
    base_dir = _entity_base_dir(entity_type)
    target_dir = os.path.join(base_dir, str(entity_id))
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)


def _entity_base_dir(entity_type):
    if entity_type == 'products':
        return PRODUCTS_DIR
    if entity_type == 'services':
        return SERVICES_DIR
    if entity_type == 'avatars':
        return AVATARS_DIR
    raise ValueError(f'Unknown entity_type: {entity_type}')


def migrate_legacy_base64_to_webp(base64_str, entity_id, index, entity_type='products'):
    """One-off migration helper only (scripts/migrate_images.py)."""
    import base64
    import re

    if not base64_str or is_stored_image_url(base64_str):
        return base64_str
    match = re.match(r'^data:image\/(\w+);base64,(.*)$', base64_str)
    encoded = match.group(2) if match else base64_str
    image_data = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(image_data))
    base_dir = _entity_base_dir(entity_type)
    target_dir = os.path.join(base_dir, str(entity_id))
    ensure_dir(target_dir)
    filename = f'{index}.webp'
    filepath = os.path.join(target_dir, filename)
    _save_webp(image, filepath)
    return f'/static/{entity_type}/{entity_id}/{filename}'
