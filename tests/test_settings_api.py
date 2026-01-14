#!/usr/bin/env python3
"""
Settings API Test Suite - Phase 8
Tests for Business Settings, System Settings, Backup Info, and Export Data endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://goldtracker-app-2.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@gilded.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestBusinessSettings:
    """Business Settings API Tests"""

    def test_get_business_settings(self, api_client):
        """Test GET /api/settings/business returns business settings"""
        response = api_client.get(f"{BASE_URL}/api/settings/business")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "id" in data
        assert "company_name" in data
        assert "address" in data
        assert "city" in data
        assert "state" in data
        assert "pincode" in data
        assert "phone" in data
        assert "email" in data
        assert "invoice_prefix" in data
        assert "po_prefix" in data
        assert "financial_year_start" in data
        assert "updated_at" in data
        
        # Verify data types
        assert isinstance(data["company_name"], str)
        assert isinstance(data["email"], str)

    def test_update_business_settings_company_info(self, api_client):
        """Test PATCH /api/settings/business updates company information"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/api/settings/business")
        original_data = get_response.json()
        
        # Update with new values
        update_payload = {
            "company_name": "TEST_Updated Company Name",
            "address": "TEST_456 New Street",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001",
            "phone": "+91 1234567890",
            "email": "test@company.com",
            "gstin": "22AAAAA0000A1Z5",
            "pan": "AAAAA0000A",
            "invoice_prefix": "TST",
            "po_prefix": "TPO",
            "financial_year_start": "01-01"
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/settings/business",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify updates were applied
        assert data["company_name"] == "TEST_Updated Company Name"
        assert data["address"] == "TEST_456 New Street"
        assert data["city"] == "Delhi"
        assert data["state"] == "Delhi"
        assert data["pincode"] == "110001"
        assert data["phone"] == "+91 1234567890"
        assert data["email"] == "test@company.com"
        assert data["gstin"] == "22AAAAA0000A1Z5"
        assert data["pan"] == "AAAAA0000A"
        assert data["invoice_prefix"] == "TST"
        assert data["po_prefix"] == "TPO"
        assert data["financial_year_start"] == "01-01"
        
        # Verify persistence with GET
        verify_response = api_client.get(f"{BASE_URL}/api/settings/business")
        verify_data = verify_response.json()
        assert verify_data["company_name"] == "TEST_Updated Company Name"
        
        # Restore original settings
        restore_payload = {
            "company_name": original_data["company_name"],
            "address": original_data["address"],
            "city": original_data["city"],
            "state": original_data["state"],
            "pincode": original_data["pincode"],
            "phone": original_data["phone"],
            "email": original_data["email"],
            "gstin": original_data.get("gstin"),
            "pan": original_data.get("pan"),
            "invoice_prefix": original_data["invoice_prefix"],
            "po_prefix": original_data["po_prefix"],
            "financial_year_start": original_data["financial_year_start"]
        }
        api_client.patch(f"{BASE_URL}/api/settings/business", json=restore_payload)

    def test_update_business_settings_tax_info(self, api_client):
        """Test PATCH /api/settings/business updates tax information (GSTIN, PAN)"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/api/settings/business")
        original_data = get_response.json()
        
        # Update tax info
        update_payload = {
            "company_name": original_data["company_name"],
            "address": original_data["address"],
            "city": original_data["city"],
            "state": original_data["state"],
            "pincode": original_data["pincode"],
            "phone": original_data["phone"],
            "email": original_data["email"],
            "gstin": "27AABCU9603R1ZM",
            "pan": "AABCU9603R",
            "invoice_prefix": "INV",
            "po_prefix": "PO",
            "financial_year_start": "04-01"
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/settings/business",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["gstin"] == "27AABCU9603R1ZM"
        assert data["pan"] == "AABCU9603R"
        
        # Restore original
        restore_payload = {
            "company_name": original_data["company_name"],
            "address": original_data["address"],
            "city": original_data["city"],
            "state": original_data["state"],
            "pincode": original_data["pincode"],
            "phone": original_data["phone"],
            "email": original_data["email"],
            "gstin": original_data.get("gstin"),
            "pan": original_data.get("pan"),
            "invoice_prefix": original_data["invoice_prefix"],
            "po_prefix": original_data["po_prefix"],
            "financial_year_start": original_data["financial_year_start"]
        }
        api_client.patch(f"{BASE_URL}/api/settings/business", json=restore_payload)


class TestSystemSettings:
    """System Settings API Tests"""

    def test_get_system_settings(self, api_client):
        """Test GET /api/settings/system returns system settings"""
        response = api_client.get(f"{BASE_URL}/api/settings/system")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "id" in data
        assert "low_stock_threshold_default" in data
        assert "default_gst_rate" in data
        assert "currency" in data
        assert "currency_symbol" in data
        assert "date_format" in data
        assert "time_format" in data
        assert "timezone" in data
        assert "backup_frequency" in data
        assert "enable_email_notifications" in data
        assert "enable_sms_notifications" in data
        assert "auto_send_invoice" in data
        assert "updated_at" in data
        
        # Verify data types
        assert isinstance(data["low_stock_threshold_default"], int)
        assert isinstance(data["default_gst_rate"], (int, float))
        assert isinstance(data["enable_email_notifications"], bool)

    def test_update_system_settings_general(self, api_client):
        """Test PATCH /api/settings/system updates general settings"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/api/settings/system")
        original_data = get_response.json()
        
        # Update general settings
        update_payload = {
            "low_stock_threshold_default": 15,
            "default_gst_rate": 5.0,
            "currency": "USD",
            "currency_symbol": "$",
            "date_format": original_data["date_format"],
            "time_format": original_data["time_format"],
            "timezone": original_data["timezone"],
            "backup_frequency": original_data["backup_frequency"],
            "enable_email_notifications": original_data["enable_email_notifications"],
            "enable_sms_notifications": original_data["enable_sms_notifications"],
            "auto_send_invoice": original_data["auto_send_invoice"]
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/settings/system",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["low_stock_threshold_default"] == 15
        assert data["default_gst_rate"] == 5.0
        assert data["currency"] == "USD"
        assert data["currency_symbol"] == "$"
        
        # Verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/settings/system")
        verify_data = verify_response.json()
        assert verify_data["low_stock_threshold_default"] == 15
        
        # Restore original
        api_client.patch(f"{BASE_URL}/api/settings/system", json=original_data)

    def test_update_system_settings_datetime(self, api_client):
        """Test PATCH /api/settings/system updates date/time settings"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/api/settings/system")
        original_data = get_response.json()
        
        # Update date/time settings
        update_payload = {
            "low_stock_threshold_default": original_data["low_stock_threshold_default"],
            "default_gst_rate": original_data["default_gst_rate"],
            "currency": original_data["currency"],
            "currency_symbol": original_data["currency_symbol"],
            "date_format": "YYYY-MM-DD",
            "time_format": "24h",
            "timezone": "America/New_York",
            "backup_frequency": original_data["backup_frequency"],
            "enable_email_notifications": original_data["enable_email_notifications"],
            "enable_sms_notifications": original_data["enable_sms_notifications"],
            "auto_send_invoice": original_data["auto_send_invoice"]
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/settings/system",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["date_format"] == "YYYY-MM-DD"
        assert data["time_format"] == "24h"
        assert data["timezone"] == "America/New_York"
        
        # Restore original
        api_client.patch(f"{BASE_URL}/api/settings/system", json=original_data)

    def test_update_system_settings_notifications(self, api_client):
        """Test PATCH /api/settings/system updates notification toggles"""
        # Get current settings
        get_response = api_client.get(f"{BASE_URL}/api/settings/system")
        original_data = get_response.json()
        
        # Toggle notifications
        update_payload = {
            "low_stock_threshold_default": original_data["low_stock_threshold_default"],
            "default_gst_rate": original_data["default_gst_rate"],
            "currency": original_data["currency"],
            "currency_symbol": original_data["currency_symbol"],
            "date_format": original_data["date_format"],
            "time_format": original_data["time_format"],
            "timezone": original_data["timezone"],
            "backup_frequency": original_data["backup_frequency"],
            "enable_email_notifications": False,
            "enable_sms_notifications": False,
            "auto_send_invoice": True
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/settings/system",
            json=update_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["enable_email_notifications"] == False
        assert data["enable_sms_notifications"] == False
        assert data["auto_send_invoice"] == True
        
        # Restore original
        api_client.patch(f"{BASE_URL}/api/settings/system", json=original_data)


class TestBackupInfo:
    """Backup Info API Tests"""

    def test_get_backup_info(self, api_client):
        """Test GET /api/settings/backup-info returns backup information"""
        response = api_client.get(f"{BASE_URL}/api/settings/backup-info")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "last_backup_date" in data
        assert "backup_size" in data
        assert "total_records" in data
        assert "backup_status" in data
        
        # Verify total_records structure
        assert isinstance(data["total_records"], dict)
        assert "users" in data["total_records"]
        assert "customers" in data["total_records"]
        assert "products" in data["total_records"]
        assert "sales" in data["total_records"]
        assert "purchase_orders" in data["total_records"]
        assert "suppliers" in data["total_records"]
        
        # Verify backup_status is valid
        assert data["backup_status"] in ["healthy", "no_data"]

    def test_backup_info_record_counts(self, api_client):
        """Test backup info returns valid record counts"""
        response = api_client.get(f"{BASE_URL}/api/settings/backup-info")
        
        assert response.status_code == 200
        data = response.json()
        
        # All counts should be non-negative integers
        for collection, count in data["total_records"].items():
            assert isinstance(count, int), f"{collection} count should be int"
            assert count >= 0, f"{collection} count should be non-negative"


class TestExportData:
    """Export Data API Tests"""

    def test_export_data(self, api_client):
        """Test POST /api/settings/export-data initiates data export"""
        response = api_client.post(
            f"{BASE_URL}/api/settings/export-data",
            json={}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "export_id" in data
        assert "records_exported" in data
        assert "export_date" in data
        
        # Verify data types
        assert isinstance(data["export_id"], str)
        assert isinstance(data["records_exported"], int)
        assert data["records_exported"] >= 0
        assert "Data export initiated successfully" in data["message"]


class TestSettingsAuthentication:
    """Test authentication requirements for settings endpoints"""

    def test_business_settings_requires_auth(self):
        """Test GET /api/settings/business requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/business")
        assert response.status_code == 401

    def test_system_settings_requires_auth(self):
        """Test GET /api/settings/system requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/system")
        assert response.status_code == 401

    def test_backup_info_requires_auth(self):
        """Test GET /api/settings/backup-info requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/backup-info")
        assert response.status_code == 401

    def test_export_data_requires_auth(self):
        """Test POST /api/settings/export-data requires authentication"""
        response = requests.post(f"{BASE_URL}/api/settings/export-data", json={})
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
