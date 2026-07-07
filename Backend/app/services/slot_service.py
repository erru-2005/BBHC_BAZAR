"""
Slot Service for managing outlet slots
"""
from datetime import datetime, timezone
from bson import ObjectId
from app import mongo
from app.models.slot import Slot

class SlotService:
    @staticmethod
    def initialize_slots():
        """Ensure that exactly 10 slots exist in the database."""
        count = mongo.db.slots.count_documents({})
        if count < 10:
            for i in range(1, 11):
                # Only insert if it doesn't exist
                if not mongo.db.slots.find_one({'slot_number': i}):
                    slot = Slot(slot_number=i)
                    mongo.db.slots.insert_one(slot.to_bson())
            print("[SlotService] Initialized 10 slots.")
        
    @staticmethod
    def get_user_slot(user_id):
        """Get the slot assigned to a user, if any."""
        user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        slot_doc = mongo.db.slots.find_one({'user_id': user_obj_id})
        if slot_doc:
            return Slot.from_bson(slot_doc)
        return None

    @staticmethod
    def assign_item_to_slot(user_id):
        """
        Assign an item to a user's slot. If the user doesn't have a slot,
        find the lowest available empty slot and assign it to them.
        Returns (Slot, error_message).
        """
        user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        
        # 1. Check if user already has a slot
        existing_slot = SlotService.get_user_slot(user_obj_id)
        if existing_slot:
            # Increment item count
            mongo.db.slots.update_one(
                {'_id': existing_slot._id},
                {
                    '$inc': {'item_count': 1},
                    '$set': {'updated_at': datetime.now(timezone.utc)}
                }
            )
            return SlotService.get_user_slot(user_obj_id), None

        # 2. Find lowest available slot
        # Sort by slot_number ascending to always reuse lowest available slot
        empty_slot_doc = mongo.db.slots.find_one(
            {'user_id': None},
            sort=[('slot_number', 1)]
        )

        if not empty_slot_doc:
            return None, "Outlet is full. No slots available."

        # 3. Assign slot to user
        mongo.db.slots.update_one(
            {'_id': empty_slot_doc['_id']},
            {
                '$set': {
                    'user_id': user_obj_id,
                    'item_count': 1,
                    'updated_at': datetime.now(timezone.utc)
                }
            }
        )

        return SlotService.get_user_slot(user_obj_id), None

    @staticmethod
    def remove_item_from_slot(user_id):
        """
        Remove one item from the user's slot.
        If item_count reaches 0, free the slot.
        """
        user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
        
        existing_slot = SlotService.get_user_slot(user_obj_id)
        if not existing_slot:
            return None, "User does not have an assigned slot."
        
        if existing_slot.item_count <= 1:
            # Free the slot
            mongo.db.slots.update_one(
                {'_id': existing_slot._id},
                {
                    '$set': {
                        'user_id': None,
                        'item_count': 0,
                        'updated_at': datetime.now(timezone.utc)
                    }
                }
            )
        else:
            # Decrement item count
            mongo.db.slots.update_one(
                {'_id': existing_slot._id},
                {
                    '$inc': {'item_count': -1},
                    '$set': {'updated_at': datetime.now(timezone.utc)}
                }
            )

        return True, None

    @staticmethod
    def get_all_slots():
        """Get all slots ordered by slot number."""
        slots = list(mongo.db.slots.find({}).sort('slot_number', 1))
        return [Slot.from_bson(s) for s in slots]

    @staticmethod
    def get_enriched_slots():
        """Get all slots and enrich occupied ones with user and item details."""
        from app.services.order_service import OrderService
        from app.services.user_service import UserService
        from app.services.seller_service import SellerService
        
        slots = SlotService.get_all_slots()
        enriched_slots = []
        
        for slot in slots:
            slot_data = slot.to_dict()
            slot_data['is_occupied'] = bool(slot.user_id)
            
            if slot.user_id:
                # Fetch user details
                user = UserService.get_user_by_id(slot.user_id)
                slot_data['user_name'] = user.name if user else "Unknown User"
                
                # Fetch items at outlet for this user
                orders, _ = OrderService.get_orders_by_user(slot.user_id, page=1, limit=100)
                items = []
                for order in orders:
                    if order.status == 'handed_over':
                        seller_name = "Unknown Seller"
                        if order.seller_id:
                            seller = SellerService.get_seller_by_id(order.seller_id)
                            if seller:
                                seller_name = getattr(seller, 'name', getattr(seller, 'business_name', 'Unknown Seller'))
                        
                        product_name = order.product_snapshot.get('name', order.product_snapshot.get('product_name', 'Unknown Product'))
                        
                        items.append({
                            'order_number': order.order_number,
                            'product_name': product_name,
                            'seller_name': seller_name
                        })
                
                slot_data['items'] = items
                slot_data['item_count'] = len(items) if items else slot.item_count
            else:
                slot_data['user_name'] = None
                slot_data['items'] = []
                
            enriched_slots.append(slot_data)
            
        return enriched_slots

    @staticmethod
    def resize_slots(new_size):
        """
        Change the total number of slots.
        If new_size > current_size, add new empty slots.
        If new_size < current_size, remove empty slots from the end.
        If slots being removed are occupied, return an error.
        """
        if new_size < 1:
            return False, "Slot size must be at least 1."

        current_size = mongo.db.slots.count_documents({})
        
        if new_size > current_size:
            # Add new slots
            for i in range(current_size + 1, new_size + 1):
                if not mongo.db.slots.find_one({'slot_number': i}):
                    slot = Slot(slot_number=i)
                    mongo.db.slots.insert_one(slot.to_bson())
            return True, None
            
        elif new_size < current_size:
            # Check if any slots beyond new_size are occupied
            occupied_slots = mongo.db.slots.find_one({
                'slot_number': {'$gt': new_size},
                'user_id': {'$ne': None}
            })
            
            if occupied_slots:
                return False, "Cannot shrink slots. Some slots that would be removed are currently occupied."
                
            # Delete empty slots beyond new_size
            mongo.db.slots.delete_many({'slot_number': {'$gt': new_size}})
            return True, None
            
        return True, None
