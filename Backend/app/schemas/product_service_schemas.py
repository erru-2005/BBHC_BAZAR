from marshmallow import Schema, fields, validate, validates_schema, ValidationError, pre_load

class ProductCreationSchema(Schema):
    # Pre-reserved ID from image upload flow (optional; used as MongoDB _id when creating)
    product_id = fields.Str(required=False, allow_none=True)
    product_name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    specification = fields.Str(required=True, validate=validate.Length(min=1))
    points = fields.List(fields.Str(validate=validate.Length(min=1)), required=True, validate=validate.Length(min=1))
    thumbnail = fields.Str(required=True, validate=validate.Length(min=1))
    gallery = fields.List(fields.Str(), required=False, allow_none=True)
    categories = fields.List(fields.Str(), required=False, allow_none=True)
    selling_price = fields.Float(required=True, validate=validate.Range(min=0.01))
    max_price = fields.Float(required=True, validate=validate.Range(min=0.01))
    seller_id = fields.Str(required=False, allow_none=True)
    seller_trade_id = fields.Str(required=False, allow_none=True)
    seller_name = fields.Str(required=False, allow_none=True)
    seller_email = fields.Email(required=False, allow_none=True)
    seller_phone = fields.Str(required=False, allow_none=True)
    commission_rate = fields.Float(required=False, allow_none=True)
    delivery_promise = fields.Str(required=True, validate=validate.Length(min=1))

    @pre_load
    def normalize_optional_fields(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        for key in ('seller_email', 'seller_phone', 'seller_name', 'seller_trade_id', 'seller_id'):
            if key in data and data[key] == '':
                data[key] = None
        return data

    @validates_schema
    def validate_prices(self, data, **kwargs):
        if 'selling_price' in data and 'max_price' in data:
            if data['max_price'] < data['selling_price']:
                raise ValidationError("Max price (MRP) must be greater than or equal to selling price.", field_name="max_price")

class ServiceCreationSchema(Schema):
    # Pre-reserved ID from image upload flow (optional; used as MongoDB _id when creating)
    service_id = fields.Str(required=False, allow_none=True)
    service_name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    description = fields.Str(required=True, validate=validate.Length(min=1))
    points = fields.List(fields.Str(validate=validate.Length(min=1)), required=True, validate=validate.Length(min=1))
    thumbnail = fields.Str(required=True, validate=validate.Length(min=1))
    gallery = fields.List(fields.Str(), required=False, allow_none=True)
    categories = fields.List(fields.Str(), required=False, allow_none=True)
    service_charge = fields.Float(required=True, validate=validate.Range(min=0.01))
    seller_trade_id = fields.Str(required=False, allow_none=True)
    seller_name = fields.Str(required=False, allow_none=True)
    seller_email = fields.Email(required=False, allow_none=True)
    seller_phone = fields.Str(required=False, allow_none=True)
    commission_rate = fields.Float(required=False, allow_none=True)
    availability = fields.Bool(required=False, allow_none=True)
    requires_booking_date = fields.Bool(required=False, allow_none=True)
