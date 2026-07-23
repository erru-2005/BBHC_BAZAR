import io
import os
import shutil
from PIL import Image

# Google Drive imports
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
PRODUCTS_DIR = os.path.join(STATIC_ROOT, 'products')
SERVICES_DIR = os.path.join(STATIC_ROOT, 'services')
AVATARS_DIR = os.path.join(STATIC_ROOT, 'avatars')

AVATAR_MAX_SIZE = 256
PRODUCT_WEBP_QUALITY = 80


# ── Singleton Drive service & folder ID cache ───────────────────────────────
_drive_service = None
_folder_cache: dict = {}   # key: (parent_id, folder_name) → folder_id


def _get_drive_service():
    """Return a cached authenticated Google Drive service client."""
    global _drive_service
    if _drive_service is not None:
        return _drive_service

    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    refresh_token = os.environ.get('GOOGLE_REFRESH_TOKEN')

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError(
            "Google Drive credentials missing. "
            "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env"
        )

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri='https://oauth2.googleapis.com/token',
        scopes=['https://www.googleapis.com/auth/drive']
    )
    _drive_service = build('drive', 'v3', credentials=creds, cache_discovery=False)
    return _drive_service


def _get_or_create_folder(service, folder_name, parent_id):
    """Return the Drive folder ID for folder_name inside parent_id (cached)."""
    cache_key = (parent_id, folder_name)
    if cache_key in _folder_cache:
        return _folder_cache[cache_key]

    query = (
        f"name='{folder_name}' and "
        f"'{parent_id}' in parents and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"trashed=false"
    )
    results = service.files().list(q=query, fields='files(id)').execute()
    files = results.get('files', [])
    if files:
        _folder_cache[cache_key] = files[0]['id']
        return files[0]['id']

    # Create the folder
    meta = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    folder = service.files().create(body=meta, fields='id').execute()
    _folder_cache[cache_key] = folder['id']
    return folder['id']


def _make_file_public(service, file_id):
    """Grant anyone-with-the-link read access to the file."""
    service.permissions().create(
        fileId=file_id,
        body={'role': 'reader', 'type': 'anyone'}
    ).execute()


def _drive_public_url(file_id):
    """Return an embeddable thumbnail URL for the given Drive file ID.
    Using /thumbnail?id=... instead of /uc?export=view because browsers allow
    the thumbnail endpoint to be used as <img src> without being blocked.
    """
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w600"


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
    # Deprecated for local storage, kept for migration script
    ensure_dir(os.path.dirname(filepath))
    image = _prepare_image(image)
    image.save(filepath, 'WEBP', quality=quality, method=4)


def save_image_file(file_storage, entity_id, index, entity_type='products'):
    """Upload a file to Google Drive. Returns a public URL."""
    if not file_storage:
        raise ValueError('No image file provided')

    root_folder_id = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
    if not root_folder_id:
        raise ValueError('GOOGLE_DRIVE_FOLDER_ID not set in environment')

    try:
        service = _get_drive_service()

        # Build subfolder structure: root / entity_type / entity_id
        type_folder_id = _get_or_create_folder(service, entity_type, root_folder_id)
        entity_folder_id = _get_or_create_folder(service, str(entity_id), type_folder_id)

        # Convert image to WebP in memory
        image = Image.open(file_storage)
        if entity_type == 'avatars':
            image.thumbnail((AVATAR_MAX_SIZE, AVATAR_MAX_SIZE))
        image = _prepare_image(image)

        buf = io.BytesIO()
        image.save(buf, format='WEBP', quality=PRODUCT_WEBP_QUALITY, method=4)
        buf.seek(0)

        file_name = f"{index}.webp"
        file_metadata = {
            'name': file_name,
            'parents': [entity_folder_id]
        }
        media = MediaIoBaseUpload(buf, mimetype='image/webp', resumable=False)
        uploaded = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        file_id = uploaded.get('id')
        _make_file_public(service, file_id)

        return _drive_public_url(file_id)

    except Exception as e:
        print(f"[ERROR] Google Drive upload failed: {e}")
        raise ValueError(f"Failed to upload image to Google Drive: {str(e)}")


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
    """Delete all Drive files for the given entity, then clean up local legacy files."""
    root_folder_id = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
    if root_folder_id:
        try:
            service = _get_drive_service()
            # Find entity folder
            type_folder_results = service.files().list(
                q=(f"name='{entity_type}' and '{root_folder_id}' in parents and "
                   f"mimeType='application/vnd.google-apps.folder' and trashed=false"),
                fields='files(id)'
            ).execute()
            type_folders = type_folder_results.get('files', [])

            for tf in type_folders:
                entity_folder_results = service.files().list(
                    q=(f"name='{entity_id}' and '{tf['id']}' in parents and "
                       f"mimeType='application/vnd.google-apps.folder' and trashed=false"),
                    fields='files(id)'
                ).execute()
                entity_folders = entity_folder_results.get('files', [])

                for ef in entity_folders:
                    # Delete all files inside
                    files_in_folder = service.files().list(
                        q=f"'{ef['id']}' in parents and trashed=false",
                        fields='files(id)'
                    ).execute().get('files', [])
                    for f in files_in_folder:
                        service.files().delete(fileId=f['id']).execute()
                    # Delete the folder itself
                    service.files().delete(fileId=ef['id']).execute()

        except Exception as e:
            print(f"[WARN] Failed to delete Google Drive folder for {entity_type}/{entity_id}: {e}")

    # Also clean up local if it exists (legacy)
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
