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
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
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
            {"email": "admin@jewellerp.com", "password": "wrongpassword"},
            {"email": "nonexistent@jewellerp.com", "password": "admin123"},
            {"email": "invalid-email", "password": "admin123"}
        ]

        for case in invalid_cases:
            success, response = self.make_request('POST', 'auth/login', case, expected_status=401)
            # For invalid login, we expect 401, so success means we got the expected error
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
        
        success, response = self.make_request('GET', 'auth/me', expected_status=401)
        
        # Restore token
        self.token = original_token
        
        self.log_test(
            "Unauthorized Access Protection",
            success,
            "Correctly rejected request without token" if success else "Should have rejected request without token",
            response
        )

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
        
        # Test protected endpoints
        self.test_get_current_user()
        self.test_get_users_list()
        self.test_toggle_user_status()
        self.test_unauthorized_access()

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