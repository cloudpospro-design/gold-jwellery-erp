#!/usr/bin/env python3
"""
Gold Jewellery ERP Backend API Testing Suite
Tests authentication, user management, and permissions
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class JewelleryERPTester:
    def __init__(self, base_url="https://jewellerp-gst.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.current_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
                
            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_api_health(self):
        """Test if API is accessible"""
        success, response = self.make_request('GET', '', expected_status=200)
        self.log_test(
            "API Health Check", 
            success, 
            f"API endpoint accessible at {self.api_url}",
            response
        )
        return success

    def test_user_registration(self):
        """Test user registration with different roles"""
        test_cases = [
            {
                "role": "admin",
                "email": f"test_admin_{datetime.now().strftime('%H%M%S')}@jewellerp.com",
                "password": "TestAdmin123!",
                "full_name": "Test Admin User"
            },
            {
                "role": "manager", 
                "email": f"test_manager_{datetime.now().strftime('%H%M%S')}@jewellerp.com",
                "password": "TestManager123!",
                "full_name": "Test Manager User"
            },
            {
                "role": "sales",
                "email": f"test_sales_{datetime.now().strftime('%H%M%S')}@jewellerp.com", 
                "password": "TestSales123!",
                "full_name": "Test Sales User"
            }
        ]

        for test_case in test_cases:
            success, response = self.make_request('POST', 'auth/register', test_case, expected_status=201)
            self.log_test(
                f"User Registration - {test_case['role']} role",
                success,
                f"Register user with {test_case['role']} role",
                response if not success else {"user_id": response.get('user', {}).get('id', 'N/A')}
            )

    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        login_data = {
            "email": "admin@jewellerp.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response.get('user')
            
        self.log_test(
            "Login - Valid Credentials",
            success,
            f"Login successful for {login_data['email']}" if success else "Login failed",
            {"has_token": bool(self.token), "user_role": self.current_user.get('role') if self.current_user else None}
        )
        return success

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        invalid_cases = [
            {"email": "admin@jewellerp.com", "password": "wrongpassword", "expected": 401},
            {"email": "nonexistent@jewellerp.com", "password": "admin123", "expected": 401},
            {"email": "invalid-email", "password": "admin123", "expected": 422}  # Validation error
        ]

        for case in invalid_cases:
            success, response = self.make_request('POST', 'auth/login', 
                                                {"email": case["email"], "password": case["password"]}, 
                                                expected_status=case["expected"])
            # For invalid login, we expect the specified error code
            self.log_test(
                f"Login - Invalid Credentials ({case['email']})",
                success,
                "Correctly rejected invalid credentials" if success else "Should have rejected invalid credentials",
                response
            )

    def test_get_current_user(self):
        """Test getting current user info with token"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available for authentication")
            return False
            
        success, response = self.make_request('GET', 'auth/me', expected_status=200)
        self.log_test(
            "Get Current User Info",
            success,
            f"Retrieved user info for {response.get('email', 'N/A')}" if success else "Failed to get user info",
            {"user_id": response.get('id'), "role": response.get('role')} if success else response
        )
        return success

    def test_get_users_list(self):
        """Test getting all users (requires permission)"""
        if not self.token:
            self.log_test("Get Users List", False, "No token available for authentication")
            return False
            
        success, response = self.make_request('GET', 'users', expected_status=200)
        
        if success:
            user_count = len(response) if isinstance(response, list) else 0
            details = f"Retrieved {user_count} users"
        else:
            details = "Failed to retrieve users list"
            
        self.log_test(
            "Get All Users List",
            success,
            details,
            {"user_count": user_count} if success else response
        )
        return success, response if success else []

    def test_toggle_user_status(self):
        """Test toggling user active/inactive status"""
        if not self.token:
            self.log_test("Toggle User Status", False, "No token available for authentication")
            return False

        # First get users list to find a user to toggle
        users_success, users = self.test_get_users_list()
        if not users_success or not users:
            self.log_test("Toggle User Status", False, "No users available to test status toggle")
            return False

        # Find a user that's not the current user
        target_user = None
        for user in users:
            if user.get('id') != self.current_user.get('id'):
                target_user = user
                break

        if not target_user:
            self.log_test("Toggle User Status", False, "No other users found to test status toggle")
            return False

        user_id = target_user['id']
        original_status = target_user.get('is_active', True)
        
        success, response = self.make_request('PATCH', f'users/{user_id}/toggle-active', expected_status=200)
        
        if success:
            new_status = response.get('is_active')
            status_changed = new_status != original_status
            details = f"User {user_id} status changed from {original_status} to {new_status}"
        else:
            status_changed = False
            details = f"Failed to toggle status for user {user_id}"
            
        self.log_test(
            "Toggle User Active Status",
            success and status_changed,
            details,
            {"user_id": user_id, "original_status": original_status, "new_status": response.get('is_active')} if success else response
        )

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.make_request('GET', 'auth/me', expected_status=403)
        
        # Restore token
        self.token = original_token
        
        self.log_test(
            "Unauthorized Access Protection",
            success,
            "Correctly rejected request without token" if success else "Should have rejected request without token",
            response
        )

    # ===== INVENTORY MANAGEMENT TESTS =====
    
    def test_create_categories(self):
        """Test creating product categories"""
        if not self.token:
            self.log_test("Create Categories", False, "No token available for authentication")
            return False
            
        categories = [
            {"name": "Necklace", "description": "Traditional and modern necklaces", "hsn_code": "71131900"},
            {"name": "Ring", "description": "Wedding and engagement rings", "hsn_code": "71131900"},
            {"name": "Bangle", "description": "Gold bangles and bracelets", "hsn_code": "71131900"},
            {"name": "Earring", "description": "Stud and drop earrings", "hsn_code": "71131900"}
        ]
        
        created_categories = []
        for category in categories:
            success, response = self.make_request('POST', 'inventory/categories', category, expected_status=201)
            self.log_test(
                f"Create Category - {category['name']}",
                success,
                f"Created {category['name']} category" if success else f"Failed to create {category['name']} category",
                {"category_id": response.get('id')} if success else response
            )
            if success:
                created_categories.append(response)
        
        return created_categories

    def test_get_categories(self):
        """Test getting all categories"""
        if not self.token:
            self.log_test("Get Categories", False, "No token available for authentication")
            return False, []
            
        success, response = self.make_request('GET', 'inventory/categories', expected_status=200)
        
        if success:
            category_count = len(response) if isinstance(response, list) else 0
            details = f"Retrieved {category_count} categories"
        else:
            details = "Failed to retrieve categories"
            
        self.log_test(
            "Get All Categories",
            success,
            details,
            {"category_count": category_count} if success else response
        )
        return success, response if success else []

    def test_create_product(self):
        """Test creating a product with jewellery attributes"""
        if not self.token:
            self.log_test("Create Product", False, "No token available for authentication")
            return False, None
            
        # First ensure we have categories
        categories_success, categories = self.test_get_categories()
        if not categories_success or not categories:
            self.log_test("Create Product", False, "No categories available for product creation")
            return False, None
            
        # Create a test product
        product_data = {
            "name": "Gold Wedding Ring",
            "sku": f"GWR-{datetime.now().strftime('%H%M%S')}",
            "description": "Beautiful 22K gold wedding ring with intricate design",
            "category": categories[0]['name'] if categories else "Ring",
            "gold_weight": 5.5,
            "purity": "22K",
            "making_charges": 2500.0,
            "stone_weight": 0.25,
            "stone_charges": 1500.0,
            "hallmark_number": "BIS-HM-001",
            "hsn_code": "71131900",
            "base_price": 35000.0,
            "gst_rate": 3.0,
            "quantity": 10,
            "low_stock_threshold": 3,
            "images": []
        }
        
        success, response = self.make_request('POST', 'inventory/products', product_data, expected_status=201)
        
        # Verify selling price calculation
        if success:
            expected_selling_price = round(product_data['base_price'] * (1 + product_data['gst_rate'] / 100), 2)
            actual_selling_price = response.get('selling_price', 0)
            price_correct = abs(expected_selling_price - actual_selling_price) < 0.01
            
            details = f"Product created with selling price ₹{actual_selling_price} (expected ₹{expected_selling_price})"
            if not price_correct:
                details += " - PRICE CALCULATION ERROR"
        else:
            details = "Failed to create product"
            price_correct = False
            
        self.log_test(
            "Create Product with Jewellery Attributes",
            success and price_correct,
            details,
            {"product_id": response.get('id'), "selling_price": response.get('selling_price')} if success else response
        )
        
        return success, response if success else None

    def test_get_products_with_filters(self):
        """Test getting products with various filters"""
        if not self.token:
            self.log_test("Get Products with Filters", False, "No token available for authentication")
            return False
            
        # Test getting all products
        success, all_products = self.make_request('GET', 'inventory/products', expected_status=200)
        self.log_test(
            "Get All Products",
            success,
            f"Retrieved {len(all_products)} products" if success else "Failed to get products",
            {"product_count": len(all_products)} if success else all_products
        )
        
        if not success or not all_products:
            return False
            
        # Test category filter
        first_product_category = all_products[0].get('category')
        if first_product_category:
            success, filtered_products = self.make_request('GET', f'inventory/products?category={first_product_category}', expected_status=200)
            self.log_test(
                f"Get Products by Category - {first_product_category}",
                success,
                f"Retrieved {len(filtered_products)} products for category {first_product_category}" if success else "Failed to filter by category",
                {"filtered_count": len(filtered_products)} if success else filtered_products
            )
        
        # Test low stock filter
        success, low_stock_products = self.make_request('GET', 'inventory/products?low_stock=true', expected_status=200)
        self.log_test(
            "Get Low Stock Products",
            success,
            f"Retrieved {len(low_stock_products)} low stock products" if success else "Failed to get low stock products",
            {"low_stock_count": len(low_stock_products)} if success else low_stock_products
        )
        
        # Test search filter
        if all_products:
            search_term = all_products[0]['name'][:5]  # First 5 characters of product name
            success, search_results = self.make_request('GET', f'inventory/products?search={search_term}', expected_status=200)
            self.log_test(
                f"Search Products - '{search_term}'",
                success,
                f"Found {len(search_results)} products matching '{search_term}'" if success else "Failed to search products",
                {"search_results": len(search_results)} if success else search_results
            )
        
        return True

    def test_get_single_product(self, product_id=None):
        """Test getting a single product by ID"""
        if not self.token:
            self.log_test("Get Single Product", False, "No token available for authentication")
            return False
            
        # If no product_id provided, get one from products list
        if not product_id:
            success, products = self.make_request('GET', 'inventory/products', expected_status=200)
            if not success or not products:
                self.log_test("Get Single Product", False, "No products available to test single product retrieval")
                return False
            product_id = products[0]['id']
        
        success, response = self.make_request('GET', f'inventory/products/{product_id}', expected_status=200)
        
        if success:
            # Verify all required fields are present
            required_fields = ['id', 'name', 'sku', 'category', 'gold_weight', 'purity', 'selling_price', 'quantity']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                details = f"Product retrieved but missing fields: {missing_fields}"
                success = False
            else:
                details = f"Product {product_id} retrieved with all required fields"
        else:
            details = f"Failed to retrieve product {product_id}"
            
        self.log_test(
            "Get Single Product by ID",
            success,
            details,
            {"product_id": product_id, "has_all_fields": len(missing_fields) == 0 if success else False} if success else response
        )
        
        return success, response if success else None

    def test_update_product(self):
        """Test updating product details"""
        if not self.token:
            self.log_test("Update Product", False, "No token available for authentication")
            return False
            
        # Get a product to update
        success, products = self.make_request('GET', 'inventory/products', expected_status=200)
        if not success or not products:
            self.log_test("Update Product", False, "No products available to test update")
            return False
            
        product_id = products[0]['id']
        original_name = products[0]['name']
        
        # Update product data
        update_data = {
            "name": f"Updated {original_name}",
            "making_charges": 3000.0,
            "base_price": 40000.0
        }
        
        success, response = self.make_request('PATCH', f'inventory/products/{product_id}', update_data, expected_status=200)
        
        if success:
            # Verify updates were applied
            name_updated = response.get('name') == update_data['name']
            charges_updated = response.get('making_charges') == update_data['making_charges']
            price_updated = response.get('base_price') == update_data['base_price']
            
            # Verify selling price was recalculated
            expected_selling_price = round(update_data['base_price'] * (1 + response.get('gst_rate', 3) / 100), 2)
            actual_selling_price = response.get('selling_price', 0)
            price_recalculated = abs(expected_selling_price - actual_selling_price) < 0.01
            
            all_updates_correct = name_updated and charges_updated and price_updated and price_recalculated
            details = f"Product updated - Name: {name_updated}, Charges: {charges_updated}, Price: {price_updated}, Recalculated: {price_recalculated}"
        else:
            all_updates_correct = False
            details = f"Failed to update product {product_id}"
            
        self.log_test(
            "Update Product Details",
            success and all_updates_correct,
            details,
            {"product_id": product_id, "updates_applied": all_updates_correct} if success else response
        )
        
        return success

    def test_update_stock(self):
        """Test updating product stock"""
        if not self.token:
            self.log_test("Update Stock", False, "No token available for authentication")
            return False
            
        # Get a product to update stock
        success, products = self.make_request('GET', 'inventory/products', expected_status=200)
        if not success or not products:
            self.log_test("Update Stock", False, "No products available to test stock update")
            return False
            
        product_id = products[0]['id']
        original_quantity = products[0]['quantity']
        
        # Test stock increase
        stock_update = {
            "quantity_change": 5,
            "reason": "Stock replenishment test"
        }
        
        success, response = self.make_request('PATCH', f'inventory/products/{product_id}/stock', stock_update, expected_status=200)
        
        if success:
            expected_quantity = original_quantity + stock_update['quantity_change']
            actual_quantity = response.get('quantity', 0)
            quantity_correct = actual_quantity == expected_quantity
            
            # Check if low stock status is updated correctly
            low_stock_threshold = response.get('low_stock_threshold', 5)
            expected_low_stock = actual_quantity <= low_stock_threshold
            actual_low_stock = response.get('is_low_stock', False)
            low_stock_correct = expected_low_stock == actual_low_stock
            
            details = f"Stock updated from {original_quantity} to {actual_quantity} (expected {expected_quantity}), Low stock: {actual_low_stock}"
            stock_update_correct = quantity_correct and low_stock_correct
        else:
            stock_update_correct = False
            details = f"Failed to update stock for product {product_id}"
            
        self.log_test(
            "Update Product Stock",
            success and stock_update_correct,
            details,
            {"product_id": product_id, "stock_correct": stock_update_correct} if success else response
        )
        
        return success

    def test_delete_product(self):
        """Test deleting a product"""
        if not self.token:
            self.log_test("Delete Product", False, "No token available for authentication")
            return False
            
        # Create a product specifically for deletion test
        test_product = {
            "name": "Test Product for Deletion",
            "sku": f"DEL-TEST-{datetime.now().strftime('%H%M%S')}",
            "description": "This product will be deleted",
            "category": "Ring",
            "gold_weight": 2.0,
            "purity": "18K",
            "making_charges": 1000.0,
            "base_price": 15000.0,
            "gst_rate": 3.0,
            "quantity": 1,
            "low_stock_threshold": 1
        }
        
        # Create the product
        create_success, created_product = self.make_request('POST', 'inventory/products', test_product, expected_status=201)
        if not create_success:
            self.log_test("Delete Product", False, "Failed to create test product for deletion")
            return False
            
        product_id = created_product['id']
        
        # Delete the product
        success, response = self.make_request('DELETE', f'inventory/products/{product_id}', expected_status=204)
        
        if success:
            # Verify product is actually deleted by trying to get it
            get_success, get_response = self.make_request('GET', f'inventory/products/{product_id}', expected_status=404)
            deletion_verified = get_success  # 404 is expected, so success means it's properly deleted
            details = "Product deleted and verified as removed" if deletion_verified else "Product deleted but still accessible"
        else:
            deletion_verified = False
            details = f"Failed to delete product {product_id}"
            
        self.log_test(
            "Delete Product",
            success and deletion_verified,
            details,
            {"product_id": product_id, "deletion_verified": deletion_verified} if success else response
        )
        
        return success

    def test_low_stock_detection(self):
        """Test low stock detection functionality"""
        if not self.token:
            self.log_test("Low Stock Detection", False, "No token available for authentication")
            return False
            
        # Create a product with low stock
        low_stock_product = {
            "name": "Low Stock Test Product",
            "sku": f"LOW-STOCK-{datetime.now().strftime('%H%M%S')}",
            "description": "Product for testing low stock detection",
            "category": "Ring",
            "gold_weight": 1.5,
            "purity": "22K",
            "making_charges": 800.0,
            "base_price": 12000.0,
            "gst_rate": 3.0,
            "quantity": 2,  # Below threshold
            "low_stock_threshold": 5
        }
        
        success, response = self.make_request('POST', 'inventory/products', low_stock_product, expected_status=201)
        
        if success:
            is_low_stock = response.get('is_low_stock', False)
            quantity = response.get('quantity', 0)
            threshold = response.get('low_stock_threshold', 0)
            
            # Should be marked as low stock since quantity (2) <= threshold (5)
            low_stock_correct = is_low_stock and quantity <= threshold
            details = f"Product created with quantity {quantity}, threshold {threshold}, marked as low stock: {is_low_stock}"
        else:
            low_stock_correct = False
            details = "Failed to create low stock test product"
            
        self.log_test(
            "Low Stock Detection",
            success and low_stock_correct,
            details,
            {"quantity": response.get('quantity'), "threshold": response.get('low_stock_threshold'), "is_low_stock": response.get('is_low_stock')} if success else response
        )
        
        return success

    # ===== SALES MODULE TESTS =====
    
    def test_create_customer(self):
        """Test creating customers with address details"""
        if not self.token:
            self.log_test("Create Customer", False, "No token available for authentication")
            return False, None
            
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "email": f"customer_{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "9876543210",
            "gstin": "27ABCDE1234F1Z5",
            "address": "123 Test Street, Test Area",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001"
        }
        
        success, response = self.make_request('POST', 'sales/customers', customer_data, expected_status=201)
        
        if success:
            # Verify all fields are present
            required_fields = ['id', 'name', 'phone', 'address', 'city', 'state', 'pincode']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                details = f"Customer created but missing fields: {missing_fields}"
                success = False
            else:
                details = f"Customer created with all required fields"
        else:
            details = "Failed to create customer"
            
        self.log_test(
            "Create Customer with Address Details",
            success,
            details,
            {"customer_id": response.get('id'), "has_all_fields": len(missing_fields) == 0 if success else False} if success else response
        )
        
        return success, response if success else None

    def test_get_customers(self):
        """Test getting all customers"""
        if not self.token:
            self.log_test("Get Customers", False, "No token available for authentication")
            return False, []
            
        success, response = self.make_request('GET', 'sales/customers', expected_status=200)
        
        if success:
            customer_count = len(response) if isinstance(response, list) else 0
            details = f"Retrieved {customer_count} customers"
        else:
            details = "Failed to retrieve customers"
            
        self.log_test(
            "Get All Customers",
            success,
            details,
            {"customer_count": customer_count} if success else response
        )
        return success, response if success else []

    def test_create_sale_with_gst_calculation(self):
        """Test creating sale with automatic GST calculation and stock reduction"""
        if not self.token:
            self.log_test("Create Sale", False, "No token available for authentication")
            return False, None
            
        # First ensure we have customers and products
        customers_success, customers = self.test_get_customers()
        if not customers_success or not customers:
            # Create a customer for testing
            customer_success, customer = self.test_create_customer()
            if not customer_success:
                self.log_test("Create Sale", False, "No customers available and failed to create test customer")
                return False, None
            customers = [customer]
            
        # Get products for sale
        products_success, products = self.make_request('GET', 'inventory/products', expected_status=200)
        if not products_success or not products:
            self.log_test("Create Sale", False, "No products available for sale")
            return False, None
            
        # Get product stock before sale
        product = products[0]
        original_stock = product['quantity']
        
        # Create sale data
        sale_data = {
            "customer_id": customers[0]['id'],
            "items": [
                {
                    "product_id": product['id'],
                    "product_name": product['name'],
                    "sku": product['sku'],
                    "quantity": 1,
                    "unit_price": product['selling_price'],
                    "hsn_code": product['hsn_code'],
                    "gst_rate": product['gst_rate'],
                    "total_before_tax": product['base_price'],
                    "tax_amount": product['selling_price'] - product['base_price'],
                    "total_after_tax": product['selling_price']
                }
            ],
            "payment_method": "cash",
            "notes": "Test sale for GST calculation"
        }
        
        success, response = self.make_request('POST', 'sales/', sale_data, expected_status=201)
        
        if success:
            # Verify invoice number format
            invoice_number = response.get('invoice_number', '')
            invoice_format_correct = invoice_number.startswith('INV-2024-') and len(invoice_number) == 14
            
            # Verify GST calculation based on customer state
            customer_state = customers[0]['state']
            gst_breakdown = response.get('gst_breakdown', {})
            
            if customer_state.lower() == 'maharashtra':
                # Intra-state: CGST + SGST
                gst_correct = (gst_breakdown.get('cgst', 0) > 0 and 
                              gst_breakdown.get('sgst', 0) > 0 and 
                              gst_breakdown.get('igst', 0) == 0)
                gst_type = "CGST+SGST (intra-state)"
            else:
                # Inter-state: IGST
                gst_correct = (gst_breakdown.get('igst', 0) > 0 and 
                              gst_breakdown.get('cgst', 0) == 0 and 
                              gst_breakdown.get('sgst', 0) == 0)
                gst_type = "IGST (inter-state)"
            
            # Verify stock reduction
            updated_product_success, updated_product = self.make_request('GET', f'inventory/products/{product["id"]}', expected_status=200)
            stock_reduced = False
            if updated_product_success:
                new_stock = updated_product['quantity']
                stock_reduced = new_stock == (original_stock - 1)
            
            all_checks_passed = invoice_format_correct and gst_correct and stock_reduced
            details = f"Sale created - Invoice: {invoice_format_correct}, GST ({gst_type}): {gst_correct}, Stock reduced: {stock_reduced}"
        else:
            all_checks_passed = False
            details = "Failed to create sale"
            
        self.log_test(
            "Create Sale with GST Calculation & Stock Reduction",
            success and all_checks_passed,
            details,
            {
                "sale_id": response.get('id'),
                "invoice_number": response.get('invoice_number'),
                "gst_breakdown": response.get('gst_breakdown'),
                "checks_passed": all_checks_passed
            } if success else response
        )
        
        return success, response if success else None

    def test_get_sales_with_filters(self):
        """Test getting sales with various filters"""
        if not self.token:
            self.log_test("Get Sales with Filters", False, "No token available for authentication")
            return False
            
        # Test getting all sales
        success, all_sales = self.make_request('GET', 'sales/', expected_status=200)
        self.log_test(
            "Get All Sales",
            success,
            f"Retrieved {len(all_sales)} sales" if success else "Failed to get sales",
            {"sales_count": len(all_sales)} if success else all_sales
        )
        
        if not success:
            return False
            
        # Test status filter
        success, completed_sales = self.make_request('GET', 'sales/?status=completed', expected_status=200)
        self.log_test(
            "Get Sales by Status - Completed",
            success,
            f"Retrieved {len(completed_sales)} completed sales" if success else "Failed to filter by status",
            {"completed_sales_count": len(completed_sales)} if success else completed_sales
        )
        
        return True

    def test_get_single_sale(self):
        """Test getting single sale by ID"""
        if not self.token:
            self.log_test("Get Single Sale", False, "No token available for authentication")
            return False
            
        # Get sales list first
        success, sales = self.make_request('GET', 'sales/', expected_status=200)
        if not success or not sales:
            self.log_test("Get Single Sale", False, "No sales available to test single sale retrieval")
            return False
            
        sale_id = sales[0]['id']
        success, response = self.make_request('GET', f'sales/{sale_id}', expected_status=200)
        
        if success:
            # Verify all required fields are present
            required_fields = ['id', 'invoice_number', 'customer', 'items', 'gst_breakdown', 'grand_total']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                details = f"Sale retrieved but missing fields: {missing_fields}"
                success = False
            else:
                details = f"Sale {sale_id} retrieved with all required fields"
        else:
            details = f"Failed to retrieve sale {sale_id}"
            
        self.log_test(
            "Get Single Sale by ID",
            success,
            details,
            {"sale_id": sale_id, "has_all_fields": len(missing_fields) == 0 if success else False} if success else response
        )
        
        return success

    def test_sales_summary(self):
        """Test sales summary statistics"""
        if not self.token:
            self.log_test("Sales Summary", False, "No token available for authentication")
            return False
            
        success, response = self.make_request('GET', 'sales/summary', expected_status=200)
        
        if success:
            # Verify summary fields
            required_fields = ['total_sales', 'total_revenue', 'today_sales', 'today_revenue']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                details = f"Summary retrieved but missing fields: {missing_fields}"
                success = False
            else:
                details = f"Summary: {response['total_sales']} total sales, ₹{response['total_revenue']} revenue"
        else:
            details = "Failed to retrieve sales summary"
            
        self.log_test(
            "Sales Summary Statistics",
            success,
            details,
            {
                "total_sales": response.get('total_sales'),
                "total_revenue": response.get('total_revenue'),
                "today_stats": f"{response.get('today_sales')} sales, ₹{response.get('today_revenue')}"
            } if success else response
        )
        
        return success

    def test_payment_method_tracking(self):
        """Test different payment methods in sales"""
        if not self.token:
            self.log_test("Payment Method Tracking", False, "No token available for authentication")
            return False
            
        payment_methods = ['cash', 'upi', 'card', 'bank_transfer']
        
        # Get existing customers and products
        customers_success, customers = self.test_get_customers()
        products_success, products = self.make_request('GET', 'inventory/products', expected_status=200)
        
        if not customers_success or not customers or not products_success or not products:
            self.log_test("Payment Method Tracking", False, "No customers or products available for payment method testing")
            return False
            
        payment_tests_passed = 0
        
        for method in payment_methods:
            if len(products) == 0:
                break
                
            product = products[0]
            
            # Check if product has enough stock
            if product['quantity'] < 1:
                continue
                
            sale_data = {
                "customer_id": customers[0]['id'],
                "items": [
                    {
                        "product_id": product['id'],
                        "product_name": product['name'],
                        "sku": product['sku'],
                        "quantity": 1,
                        "unit_price": product['selling_price'],
                        "hsn_code": product['hsn_code'],
                        "gst_rate": product['gst_rate'],
                        "total_before_tax": product['base_price'],
                        "tax_amount": product['selling_price'] - product['base_price'],
                        "total_after_tax": product['selling_price']
                    }
                ],
                "payment_method": method,
                "notes": f"Test sale with {method} payment"
            }
            
            success, response = self.make_request('POST', 'sales/', sale_data, expected_status=201)
            
            if success and response.get('payment_method') == method:
                payment_tests_passed += 1
                
        all_methods_tested = payment_tests_passed == len(payment_methods)
        
        self.log_test(
            "Payment Method Tracking",
            all_methods_tested,
            f"Successfully tested {payment_tests_passed}/{len(payment_methods)} payment methods",
            {"methods_tested": payment_tests_passed, "total_methods": len(payment_methods)}
        )
        
        return all_methods_tested

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Gold Jewellery ERP Backend API Tests")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)

        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False

        # Test authentication flow
        self.test_user_registration()
        
        # Test login with valid credentials
        if not self.test_login_valid_credentials():
            print("❌ Cannot login with valid credentials. Stopping protected endpoint tests.")
            self.test_login_invalid_credentials()
            self.test_unauthorized_access()
            return False

        # Test login with invalid credentials
        self.test_login_invalid_credentials()
        
        # Test protected endpoints - User Management
        self.test_get_current_user()
        self.test_get_users_list()
        self.test_toggle_user_status()
        self.test_unauthorized_access()

        print("\n" + "=" * 60)
        print("🏪 Starting Inventory Management Tests")
        print("=" * 60)

        # Test inventory management
        self.test_create_categories()
        self.test_get_categories()
        created_product_success, created_product = self.test_create_product()
        self.test_get_products_with_filters()
        
        if created_product:
            self.test_get_single_product(created_product['id'])
        else:
            self.test_get_single_product()
            
        self.test_update_product()
        self.test_update_stock()
        self.test_low_stock_detection()
        self.test_delete_product()

        print("\n" + "=" * 60)
        print("💰 Starting Sales Module Tests")
        print("=" * 60)

        # Test sales management
        self.test_create_customer()
        self.test_get_customers()
        self.test_create_sale_with_gst_calculation()
        self.test_get_sales_with_filters()
        self.test_get_single_sale()
        self.test_sales_summary()
        self.test_payment_method_tracking()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_failed_tests(self):
        """Get list of failed tests"""
        return [test for test in self.test_results if not test['success']]

def main():
    """Main test execution"""
    tester = JewelleryERPTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": tester.tests_run,
                    "passed_tests": tester.tests_passed,
                    "failed_tests": tester.tests_run - tester.tests_passed,
                    "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
                },
                "test_results": tester.test_results,
                "failed_tests": tester.get_failed_tests()
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())