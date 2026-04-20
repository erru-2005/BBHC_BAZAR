from marshmallow import Schema, fields, validate

class MasterRegistrationSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=100))
    phone_number = fields.Str(required=True, validate=validate.Length(min=8, max=20))
    address = fields.Str(required=False, allow_none=True)

class SellerRegistrationSchema(Schema):
    trade_id = fields.Str(
        required=True, 
        validate=[
            validate.Length(min=1, max=100),
            validate.Regexp(
                r'^[\w-]+$', 
                error='Trade ID must contain only alphanumeric characters, hyphens, and underscores'
            )
        ]
    )
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=100))
    phone_number = fields.Str(required=False, allow_none=True, validate=validate.Length(min=8, max=20))
    first_name = fields.Str(required=False, allow_none=True, validate=validate.Length(max=100))
    last_name = fields.Str(required=False, allow_none=True, validate=validate.Length(max=100))
