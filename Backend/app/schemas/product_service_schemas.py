from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class ProductCreationSchema(Schema):
    product_name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    specification = fields.Str(required=True, validate=validate.Length(min=1))
    points = fields.List(fields.Str(validate=validate.Length(min=1)), required=True, validate=validate.Length(min=1))
    thumbnail = fields.Str(required=True, validate=validate.Length(min=1))
    gallery = fields.List(fields.Str(), required=False, allow_none=True)
    categories = fields.List(fields.Str(), required=False, allow_none=True)
    selling_price = fields.Float(required=True, validate=validate.Range(min=0.01))
    max_price = fields.Float(required=True, validate=validate.Range(min=0.01))
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    seller_trade_id = fields.Str(required=False, allow_none=True)
    seller_name = fields.Str(required=False, allow_none=True)
    seller_email = fields.Email(required=False, allow_none=True)
    seller_phone = fields.Str(required=False, allow_none=True)
    commission_rate = fields.Float(required=False, allow_none=True)

    @validates_schema
    def validate_prices(self, data, **kwargs):
        if 'selling_price' in data and 'max_price' in data:
            if data['max_price'] < data['selling_price']:
                raise ValidationError("Max price (MRP) must be greater than or equal to selling price.", field_name="max_price")

class ServiceCreationSchema(Schema):
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
