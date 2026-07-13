"""
Advertisement model for MongoDB
"""
from datetime import datetime, timezone
from bson import ObjectId


class Advertisement:
    """Represents a spotlight advertisement"""

    def __init__(self, media_url, media_type, link, title='', created_by='system', is_active=True, created_at=None, _id=None):
        self._id = _id or ObjectId()
        self.media_url = media_url
        self.media_type = media_type
        self.link = link
        self.title = title
        self.created_by = created_by
        self.is_active = is_active
        self.created_at = created_at or datetime.now(timezone.utc)

    def to_dict(self):
        return {
            'id': str(self._id),
            'media_url': self.media_url,
            'media_type': self.media_type,
            'link': self.link,
            'title': self.title,
            'created_by': self.created_by,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }

    def to_bson(self):
        return {
            '_id': self._id,
            'media_url': self.media_url,
            'media_type': self.media_type,
            'link': self.link,
            'title': self.title,
            'created_by': self.created_by,
            'is_active': self.is_active,
            'created_at': self.created_at
        }

    @classmethod
    def from_bson(cls, bson_doc):
        if not bson_doc:
            return None
        return cls(
            _id=bson_doc.get('_id'),
            media_url=bson_doc.get('media_url'),
            media_type=bson_doc.get('media_type'),
            link=bson_doc.get('link'),
            title=bson_doc.get('title', ''),
            created_by=bson_doc.get('created_by', 'system'),
            is_active=bson_doc.get('is_active', True),
            created_at=bson_doc.get('created_at')
        )

    def __repr__(self):
        return f'<Advertisement {self.title or self._id}>'
