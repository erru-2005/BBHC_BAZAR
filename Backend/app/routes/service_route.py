"""
Service-specific API routes.
"""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.schemas.product_service_schemas import ServiceCreationSchema
from app.services.seller_service import SellerService
from app.services.service_service import ServiceService
from app.sockets.emitter import emit_service_event

service_bp = Blueprint('service', __name__)


def _service_response(service):
    """Attach item type for clients (user/seller/master)."""
    payload = service.to_dict()
    payload['type'] = 'Service'
    return payload


@service_bp.route('/services', methods=['POST'])
@jwt_required()
def create_service():
    """Create a new service (masters only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_type = claims.get('user_type')
        current_username = claims.get('username') or 'system'

        if current_user_type != 'master':
            return jsonify({'error': 'Only masters can create services'}), 403

        try:
            schema = ServiceCreationSchema()
            data = schema.load(data)
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            if isinstance(first_err_msg, dict):
                first_err_msg = "Invalid format"
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400

        if not data.get('seller_trade_id'):
            return jsonify({'error': 'seller_trade_id is required'}), 400

        service_data = {
            'service_name': data['service_name'],
            'description': data['description'],
            'points': data['points'],
            'thumbnail': data['thumbnail'],
            'service_charge': data['service_charge'],
            'gallery': data.get('gallery', []),
            'categories': data.get('categories', []),
            'created_by': current_username,
            'created_by_user_id': str(current_user_id),
            'created_by_user_type': current_user_type,
            'approval_status': 'approved',
            'availability': True,
            'requires_booking_date': data.get('requires_booking_date', False),
            'seller_trade_id': data.get('seller_trade_id'),
            'seller_name': data.get('seller_name'),
            'seller_email': data.get('seller_email'),
            'seller_phone': data.get('seller_phone'),
            'commission_rate': data.get('commission_rate'),
            'registration_ip': request.remote_addr,
            'registration_user_agent': request.headers.get('User-Agent'),
        }
        if data.get('service_id'):
            service_data['service_id'] = data['service_id']

        service = ServiceService.create_service(service_data)
        service_dict = _service_response(service)
        emit_service_event('service_created', service_dict)

        return jsonify({
            'message': 'Service created successfully',
            'service': service_dict
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create service: {str(e)}'}), 500


@service_bp.route('/services', methods=['GET'])
def get_services():
    """Get all approved services (public)."""
    try:
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        services = ServiceService.get_all_services(skip=skip, limit=limit)
        return jsonify({
            'services': [_service_response(s) for s in services],
            'count': len(services)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get services: {str(e)}'}), 500


@service_bp.route('/services/<service_id>', methods=['GET'])
def get_service_detail(service_id):
    """Get service details by ID."""
    try:
        service = ServiceService.get_service_by_id(service_id)
        if not service:
            return jsonify({'error': 'Service not found'}), 404

        service_dict = _service_response(service)

        # Add seller_id if available for ratings
        if service.seller_trade_id:
            seller = SellerService.get_seller_by_trade_id(service.seller_trade_id)
            if seller:
                service_dict['seller_id'] = str(seller._id)

        return jsonify({'service': service_dict}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get service: {str(e)}'}), 500


@service_bp.route('/services/<service_id>', methods=['PUT'])
@jwt_required()
def update_service(service_id):
    """Update service (masters only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can update services'}), 403

        service = ServiceService.update_service(service_id, data)
        if not service:
            return jsonify({'error': 'Service not found'}), 404

        service_dict = _service_response(service)
        emit_service_event('service_updated', service_dict)
        return jsonify({
            'message': 'Service updated successfully',
            'service': service_dict
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update service: {str(e)}'}), 500


@service_bp.route('/services/<service_id>', methods=['DELETE'])
@jwt_required()
def delete_service(service_id):
    """Delete service (masters only)."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Only masters can delete services'}), 403

        if ServiceService.delete_service(service_id):
            emit_service_event('service_deleted', {'id': service_id})
            return jsonify({'message': 'Service deleted successfully'}), 200
        return jsonify({'error': 'Service not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to delete service: {str(e)}'}), 500


@service_bp.route('/seller/services', methods=['POST'])
@jwt_required()
def seller_create_service():
    """Seller creates a service for approval."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        try:
            schema = ServiceCreationSchema()
            data = schema.load(data)
        except ValidationError as err:
            first_err_field = list(err.messages.keys())[0]
            first_err_msg = err.messages[first_err_field][0]
            if isinstance(first_err_msg, dict):
                first_err_msg = "Invalid format"
            return jsonify({'error': f"{first_err_field}: {first_err_msg}"}), 400

        claims = get_jwt()
        if claims.get('user_type') != 'seller':
            return jsonify({'error': 'Only sellers can access this endpoint'}), 403

        seller_trade_id = claims.get('trade_id')
        seller_user_id = str(get_jwt_identity())

        data['seller_trade_id'] = seller_trade_id
        data['created_by'] = seller_trade_id
        data['created_by_user_id'] = seller_user_id
        data['created_by_user_type'] = 'seller'
        data['approval_status'] = 'pending'

        service = ServiceService.create_service(data)
        service_dict = _service_response(service)
        emit_service_event('service_created', service_dict)

        return jsonify({
            'message': 'Service submitted for approval.',
            'service': service_dict
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to submit service: {str(e)}'}), 500


@service_bp.route('/services/pending', methods=['GET'])
@jwt_required()
def get_pending_services():
    """Get services pending approval (masters only)."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Access denied'}), 403

        services = ServiceService.get_pending_services()
        return jsonify({
            'services': [_service_response(s) for s in services],
            'count': len(services)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@service_bp.route('/services/<service_id>/accept', methods=['POST'])
@jwt_required()
def accept_service(service_id):
    """Approve a pending service (masters only)."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Access denied'}), 403

        service, error = ServiceService.accept_service(service_id)
        if error:
            return jsonify({'error': error}), 400

        service_dict = _service_response(service)
        emit_service_event('service_updated', service_dict)

        # Notify seller
        if service and service.seller_phone:
            try:
                from app.utils.sms import SMSService
                message = f"Your service '{service.service_name}' has been approved and is now active on the store."
                SMSService.send_message(
                    service.seller_phone,
                    message,
                    product_thumbnail=service.thumbnail,
                    title="Service Approved"
                )
            except Exception as ns_err:
                print(f"[Notification] Failed to send service approval push: {str(ns_err)}")

        return jsonify({'message': 'Service approved', 'service': service_dict}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@service_bp.route('/services/<service_id>/reject', methods=['POST'])
@jwt_required()
def reject_service(service_id):
    """Reject a pending service (masters only)."""
    try:
        claims = get_jwt()
        if claims.get('user_type') != 'master':
            return jsonify({'error': 'Access denied'}), 403

        data = request.get_json() or {}
        reason = data.get('reason', 'Rejected by master')

        service = ServiceService.get_service_by_id(service_id)
        if not service:
            return jsonify({'error': 'Service not found'}), 404

        success, error = ServiceService.reject_service(service_id, reason=reason)
        if error:
            return jsonify({'error': error}), 400

        emit_service_event('service_deleted', {'id': service_id, 'reason': reason})

        # Notify seller
        if service.seller_phone:
            try:
                from app.utils.sms import SMSService
                message = f"Your service '{service.service_name}' has been rejected. Reason: {reason}."
                SMSService.send_message(
                    service.seller_phone,
                    message,
                    product_thumbnail=service.thumbnail,
                    title="Service Rejected"
                )
            except Exception as ns_err:
                print(f"[Notification] Failed to send service rejection push: {str(ns_err)}")

        return jsonify({'message': 'Service rejected and moved to bin'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
