"""
Product service - handles product persistence and queries
"""
from bson import ObjectId
from datetime import datetime

from app import mongo
from app.models.product import Product


class ProductService:
    """Business logic for product creation and retrieval"""

    @staticmethod
    def create_product(product_data):
        try:
            required_fields = ['product_name', 'specification', 'points', 'thumbnail', 'selling_price', 'max_price', 'quantity', 'seller_trade_id']
            for field in required_fields:
                if field not in product_data or product_data[field] in (None, '', []):
                    raise ValueError(f"Missing required field: {field}")

            points = product_data.get('points')
            if not isinstance(points, list) or not points:
                raise ValueError("Points must be a non-empty list")

            normalized_points = [str(point).strip() for point in points if str(point).strip()]
            if not normalized_points:
                raise ValueError("At least one bullet point is required")

            # Validate pricing
            selling_price = float(product_data.get('selling_price'))
            max_price = float(product_data.get('max_price'))
            if selling_price <= 0 or max_price <= 0:
                raise ValueError("Price values must be greater than zero")
            if max_price < selling_price:
                raise ValueError("Max price (MRP) must be greater than or equal to selling price")

            quantity = int(product_data.get('quantity'))
            if quantity <= 0:
                raise ValueError("Quantity must be greater than zero")

            categories = product_data.get('categories', [])
            if categories and not isinstance(categories, list):
                raise ValueError("Categories must be a list")
            normalized_categories = [str(cat).strip() for cat in categories if str(cat).strip()]

            commission_rate = product_data.get('commission_rate')
            if commission_rate is not None:
                commission_rate = float(commission_rate)
            
            total_selling_price = None
            if commission_rate is not None and commission_rate >= 0:
                total_selling_price = ProductService.calculate_total_selling_price(
                    selling_price, commission_rate
                )

            # Determine approval status - seller products need approval, master products are auto-approved
            approval_status = product_data.get('approval_status')
            if approval_status is None:
                if product_data.get('created_by_user_type') == 'seller':
                    approval_status = 'pending'
                else:
                    approval_status = 'approved'

            product = Product(
                product_name=product_data['product_name'],
                specification=product_data['specification'],
                points=normalized_points,
                thumbnail=product_data['thumbnail'],
                selling_price=selling_price,
                max_price=max_price,
                gallery=product_data.get('gallery', []),
                categories=normalized_categories,
                created_by=product_data.get('created_by', 'system'),
                created_by_user_id=product_data.get('created_by_user_id'),
                created_by_user_type=product_data.get('created_by_user_type'),
                quantity=quantity,
                seller_trade_id=product_data.get('seller_trade_id'),
                seller_name=product_data.get('seller_name'),
                seller_email=product_data.get('seller_email'),
                seller_phone=product_data.get('seller_phone'),
                commission_rate=commission_rate,
                total_selling_price=total_selling_price,
                approval_status=approval_status,
                pending_changes=product_data.get('pending_changes'),
                original_product_id=product_data.get('original_product_id'),
                created_at=product_data.get('created_at') or datetime.utcnow(),
                updated_at=product_data.get('updated_at') or datetime.utcnow(),
                registration_ip=product_data.get('registration_ip'),
                registration_user_agent=product_data.get('registration_user_agent')
            )

            product_bson = product.to_bson()
            result = mongo.db.products.insert_one(product_bson)
            product._id = result.inserted_id
            return product
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error creating product: {str(e)}")

    @staticmethod
    def get_product_by_id(product_id):
        try:
            product_doc = mongo.db.products.find_one({'_id': ObjectId(product_id)})
            if not product_doc:
                return None
            
            product = Product.from_bson(product_doc)
            
            # Ensure total_selling_price is calculated if missing
            if product and product.selling_price and (not product.total_selling_price or product.total_selling_price == 0):
                commission_rate = product.commission_rate
                
                # If no product-level commission, check category-level commission
                if (commission_rate is None or commission_rate == 0) and product.categories:
                    for category in product.categories:
                        category_rate = ProductService.get_category_commission_rate(category)
                        if category_rate:
                            commission_rate = category_rate
                            break
                
                # Calculate total_selling_price with commission
                if commission_rate and commission_rate > 0:
                    product.total_selling_price = ProductService.calculate_total_selling_price(
                        product.selling_price, commission_rate
                    )
                else:
                    # No commission, total_selling_price equals selling_price
                    product.total_selling_price = product.selling_price
            
            return product
        except Exception:
            return None

    @staticmethod
    def get_all_products(skip=0, limit=100, include_pending=False):
        try:
            query = {}
            if not include_pending:
                # Only return approved products or products without approval_status (backward compatibility)
                query = {
                    '$or': [
                        {'approval_status': 'approved'},
                        {'approval_status': {'$exists': False}}
                    ]
                }
            
            products_cursor = (
                mongo.db.products.find(query)
                .sort('created_at', -1)
                .skip(skip)
                .limit(limit)
            )
            
            products = []
            # Get all category commissions once for efficiency
            category_commissions = ProductService.get_all_category_commissions()
            
            for product_doc in products_cursor:
                product = Product.from_bson(product_doc)
                
                # Ensure total_selling_price is calculated if missing
                if product.selling_price and (not product.total_selling_price or product.total_selling_price == 0):
                    commission_rate = product.commission_rate
                    
                    # If no product-level commission, check category-level commission
                    if (commission_rate is None or commission_rate == 0) and product.categories:
                        for category in product.categories:
                            if category in category_commissions:
                                commission_rate = category_commissions[category]
                                break
                    
                    # Calculate total_selling_price with commission
                    if commission_rate and commission_rate > 0:
                        product.total_selling_price = ProductService.calculate_total_selling_price(
                            product.selling_price, commission_rate
                        )
                    else:
                        # No commission, total_selling_price equals selling_price
                        product.total_selling_price = product.selling_price
                
                products.append(product)
            
            return products
        except Exception:
            return []

    @staticmethod
    def update_product(product_id, product_data):
        try:
            update_fields = {}

            for field in ['product_name', 'specification', 'thumbnail', 'selling_price', 'max_price', 'quantity', 'seller_trade_id', 'seller_name', 'seller_email', 'seller_phone', 'commission_rate']:
                if field in product_data and product_data[field] not in (None, ''):
                    if field in ['selling_price', 'max_price', 'commission_rate']:
                        update_fields[field] = float(product_data[field])
                    elif field == 'quantity':
                        update_fields[field] = int(product_data[field])
                    else:
                        update_fields[field] = product_data[field]
            
            # Recalculate total_selling_price if commission_rate or selling_price is updated
            if 'commission_rate' in update_fields or 'selling_price' in update_fields:
                selling_price = update_fields.get('selling_price')
                commission_rate = update_fields.get('commission_rate')
                
                # Get current values if not in update_fields
                if selling_price is None:
                    product = ProductService.get_product_by_id(product_id)
                    if product:
                        selling_price = product.selling_price
                
                if commission_rate is None:
                    product = product or ProductService.get_product_by_id(product_id)
                    if product:
                        commission_rate = product.commission_rate or 0
                
                if selling_price and selling_price > 0:
                    total_selling_price = ProductService.calculate_total_selling_price(
                        selling_price, commission_rate or 0
                    )
                    update_fields['total_selling_price'] = total_selling_price

            if 'points' in product_data:
                points = product_data['points']
                if not isinstance(points, list) or not points:
                    raise ValueError("Points must be a non-empty list")
                normalized_points = [str(point).strip() for point in points if str(point).strip()]
                if not normalized_points:
                    raise ValueError("At least one bullet point is required")
                update_fields['points'] = normalized_points

            if 'categories' in product_data:
                categories = product_data['categories'] or []
                if categories and not isinstance(categories, list):
                    raise ValueError("Categories must be a list")
                update_fields['categories'] = [str(cat).strip() for cat in categories if str(cat).strip()]

            if 'gallery' in product_data:
                update_fields['gallery'] = product_data['gallery']

            if not update_fields:
                raise ValueError("No data provided to update")

            update_fields['updated_at'] = datetime.utcnow()

            result = mongo.db.products.update_one(
                {'_id': ObjectId(product_id)},
                {'$set': update_fields}
            )

            if result.matched_count == 0:
                return None

            return ProductService.get_product_by_id(product_id)
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error updating product: {str(e)}")

    @staticmethod
    def delete_product(product_id):
        try:
            result = mongo.db.products.delete_one({'_id': ObjectId(product_id)})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error deleting product: {str(e)}")

    @staticmethod
    def calculate_total_selling_price(selling_price, commission_rate):
        """Calculate total selling price with commission"""
        if not selling_price or selling_price <= 0:
            return None
        if not commission_rate or commission_rate < 0:
            return selling_price
        commission_amount = (selling_price * commission_rate) / 100
        return round(selling_price + commission_amount, 2)

    @staticmethod
    def apply_commission_to_product(product_id, commission_rate):
        """Apply commission to a specific product"""
        try:
            product = ProductService.get_product_by_id(product_id)
            if not product:
                return None
            
            if not product.selling_price:
                return None
            
            total_selling_price = ProductService.calculate_total_selling_price(
                product.selling_price, commission_rate
            )
            
            result = mongo.db.products.update_one(
                {'_id': ObjectId(product_id)},
                {
                    '$set': {
                        'commission_rate': float(commission_rate),
                        'total_selling_price': total_selling_price,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            
            if result.matched_count == 0:
                return None
            
            return ProductService.get_product_by_id(product_id)
        except Exception as e:
            raise Exception(f"Error applying commission: {str(e)}")

    @staticmethod
    def get_pending_products():
        """Get all products pending approval"""
        try:
            products_cursor = mongo.db.products.find({
                'approval_status': 'pending'
            }).sort('created_at', -1)
            
            products = []
            # Get all category commissions once for efficiency
            category_commissions = ProductService.get_all_category_commissions()
            
            for product_doc in products_cursor:
                product = Product.from_bson(product_doc)
                
                # Ensure total_selling_price is calculated if missing
                if product.selling_price and (not product.total_selling_price or product.total_selling_price == 0):
                    commission_rate = product.commission_rate
                    
                    # If no product-level commission, check category-level commission
                    if (commission_rate is None or commission_rate == 0) and product.categories:
                        for category in product.categories:
                            if category in category_commissions:
                                commission_rate = category_commissions[category]
                                break
                    
                    # Calculate total_selling_price with commission
                    if commission_rate and commission_rate > 0:
                        product.total_selling_price = ProductService.calculate_total_selling_price(
                            product.selling_price, commission_rate
                        )
                    else:
                        # No commission, total_selling_price equals selling_price
                        product.total_selling_price = product.selling_price
                
                products.append(product)
            
            return products
        except Exception:
            return []

    @staticmethod
    def accept_product(product_id):
        """Accept a pending product - move to approved status"""
        try:
            product = ProductService.get_product_by_id(product_id)
            if not product:
                return None, "Product not found"
            
            if product.approval_status != 'pending':
                return None, "Product is not pending approval"
            
            # If this is an edit request, apply the changes to the original product
            if product.original_product_id and product.pending_changes:
                original_product = ProductService.get_product_by_id(product.original_product_id)
                if original_product:
                    # Apply pending changes to original product
                    update_data = product.pending_changes
                    update_data['approval_status'] = 'approved'
                    updated_product = ProductService.update_product(product.original_product_id, update_data)
                    # Delete the pending edit request
                    mongo.db.products.delete_one({'_id': ObjectId(product_id)})
                    return updated_product, None
                else:
                    return None, "Original product not found"
            else:
                # New product - just approve it
                result = mongo.db.products.update_one(
                    {'_id': ObjectId(product_id)},
                    {
                        '$set': {
                            'approval_status': 'approved',
                            'updated_at': datetime.utcnow()
                        }
                    }
                )
                if result.matched_count == 0:
                    return None, "Product not found"
                return ProductService.get_product_by_id(product_id), None
        except Exception as e:
            return None, f"Error accepting product: {str(e)}"

    @staticmethod
    def reject_product(product_id, move_to_bin=True, reason=None, recommendation=None):
        """Reject a pending product - optionally move to bin collection"""
        try:
            product = ProductService.get_product_by_id(product_id)
            if not product:
                return False, "Product not found"
            
            if product.approval_status != 'pending':
                return False, "Product is not pending approval"
            
            if move_to_bin:
                # Move to bin collection with rejection details
                product_bson = product.to_bson()
                product_bson['approval_status'] = 'rejected'
                product_bson['rejected_at'] = datetime.utcnow()
                product_bson['rejection_reason'] = reason
                product_bson['rejection_recommendation'] = recommendation
                mongo.db.bin.insert_one(product_bson)
            
            # Delete from products collection
            result = mongo.db.products.delete_one({'_id': ObjectId(product_id)})
            return result.deleted_count > 0, None
        except Exception as e:
            return False, f"Error rejecting product: {str(e)}"

    @staticmethod
    def set_category_commission_rate(category, commission_rate):
        """Store category commission rate"""
        try:
            mongo.db.category_commissions.update_one(
                {'category': category},
                {
                    '$set': {
                        'category': category,
                        'commission_rate': float(commission_rate),
                        'updated_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            raise Exception(f"Error setting category commission: {str(e)}")

    @staticmethod
    def get_category_commission_rate(category):
        """Get category commission rate"""
        try:
            doc = mongo.db.category_commissions.find_one({'category': category})
            if doc:
                return doc.get('commission_rate')
            return None
        except Exception:
            return None

    @staticmethod
    def get_all_category_commissions():
        """Get all category commission rates"""
        try:
            docs = mongo.db.category_commissions.find()
            return {doc['category']: doc.get('commission_rate') for doc in docs}
        except Exception:
            return {}

    @staticmethod
    def apply_commission_by_category(category, commission_rate):
        """Apply commission to all products in a category (only if product doesn't have specific commission)"""
        try:
            # Store the category commission rate
            ProductService.set_category_commission_rate(category, commission_rate)
            
            products = mongo.db.products.find({'categories': category})
            updated_count = 0
            
            for product_doc in products:
                selling_price = product_doc.get('selling_price')
                # Only apply if product doesn't have a specific commission_rate set
                # Products with specific commission have higher priority
                if selling_price and selling_price > 0 and not product_doc.get('commission_rate'):
                    total_selling_price = ProductService.calculate_total_selling_price(
                        selling_price, commission_rate
                    )
                    
                    mongo.db.products.update_one(
                        {'_id': product_doc['_id']},
                        {
                            '$set': {
                                'commission_rate': float(commission_rate),
                                'total_selling_price': total_selling_price,
                                'updated_at': datetime.utcnow()
                            }
                        }
                    )
                    updated_count += 1
            
            return updated_count
        except Exception as e:
            raise Exception(f"Error applying commission by category: {str(e)}")

    @staticmethod
    def apply_commission_to_all(commission_rate):
        """Apply commission to all products (only if product doesn't have specific or category commission)"""
        try:
            # Get all category commissions
            category_commissions = ProductService.get_all_category_commissions()
            
            products = mongo.db.products.find({'selling_price': {'$gt': 0}})
            updated_count = 0
            
            for product_doc in products:
                selling_price = product_doc.get('selling_price')
                if selling_price and selling_price > 0:
                    # Priority: product-specific > category > general
                    # Only apply general if product has no specific commission
                    if product_doc.get('commission_rate'):
                        continue  # Skip products with specific commission
                    
                    # Check if product has category with commission
                    categories = product_doc.get('categories', [])
                    has_category_commission = False
                    for cat in categories:
                        if cat in category_commissions:
                            has_category_commission = True
                            break
                    
                    # Only apply general commission if no category commission exists
                    if not has_category_commission:
                        total_selling_price = ProductService.calculate_total_selling_price(
                            selling_price, commission_rate
                        )
                        
                        mongo.db.products.update_one(
                            {'_id': product_doc['_id']},
                            {
                                '$set': {
                                    'commission_rate': float(commission_rate),
                                    'total_selling_price': total_selling_price,
                                    'updated_at': datetime.utcnow()
                                }
                            }
                        )
                        updated_count += 1
            
            return updated_count
        except Exception as e:
            raise Exception(f"Error applying commission to all: {str(e)}")

