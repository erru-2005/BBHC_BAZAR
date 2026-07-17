from flask import Blueprint, jsonify
from app.services.slot_service import SlotService
from flask_jwt_extended import jwt_required

slot_bp = Blueprint('slot', __name__)

@slot_bp.route('/slots', methods=['GET'])
@jwt_required()
def get_slots():
    try:
        slots = SlotService.get_enriched_slots()
        return jsonify({'slots': slots}), 200
    except Exception as e:
        print(f"Error fetching slots: {e}")
        return jsonify({'error': str(e)}), 500

@slot_bp.route('/slots/<int:slot_number>/free', methods=['POST'])
@jwt_required()
def free_slot(slot_number):
    try:
        success = SlotService.free_slot(slot_number)
        if success:
            return jsonify({'message': f'Slot {slot_number} freed successfully'}), 200
        return jsonify({'error': f'Slot {slot_number} not found or already free'}), 404
    except Exception as e:
        print(f"Error freeing slot: {e}")
        return jsonify({'error': str(e)}), 500
