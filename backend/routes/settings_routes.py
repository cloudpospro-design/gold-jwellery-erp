from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
import json
from models_settings import (
    BusinessSettings, BusinessSettingsResponse,
    SystemSettings, SystemSettingsResponse,
    BackupInfo, ExportDataResponse
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_db():
    from server import db
    return db

# Business Settings Routes
@router.get("/business", response_model=BusinessSettingsResponse)
async def get_business_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get business settings"""
    
    settings = await db.business_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Return default settings if none exist
        default_settings = {
            "id": str(uuid.uuid4()),
            "company_name": "Gilded Ledger",
            "address": "123 Business Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "phone": "+91 9876543210",
            "email": "info@gildedledger.com",
            "gstin": None,
            "pan": None,
            "logo_url": None,
            "invoice_prefix": "INV",
            "po_prefix": "PO",
            "financial_year_start": "04-01",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.business_settings.insert_one(default_settings)
        return BusinessSettingsResponse(**default_settings)
    
    return BusinessSettingsResponse(**settings)

@router.patch("/business", response_model=BusinessSettingsResponse)
async def update_business_settings(
    settings_update: BusinessSettings,
    current_user: dict = Depends(check_permission('all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update business settings (Admin only)"""
    
    existing = await db.business_settings.find_one({}, {"_id": 0})
    
    update_data = settings_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        update_data["id"] = existing["id"]
        await db.business_settings.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
    else:
        update_data["id"] = str(uuid.uuid4())
        await db.business_settings.insert_one(update_data)
    
    return BusinessSettingsResponse(**update_data)

# System Settings Routes
@router.get("/system", response_model=SystemSettingsResponse)
async def get_system_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get system settings"""
    
    settings = await db.system_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Return default settings
        default_settings = {
            "id": str(uuid.uuid4()),
            "low_stock_threshold_default": 5,
            "default_gst_rate": 3.0,
            "currency": "INR",
            "currency_symbol": "₹",
            "date_format": "DD/MM/YYYY",
            "time_format": "12h",
            "timezone": "Asia/Kolkata",
            "backup_frequency": "daily",
            "enable_email_notifications": True,
            "enable_sms_notifications": True,
            "auto_send_invoice": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.system_settings.insert_one(default_settings)
        return SystemSettingsResponse(**default_settings)
    
    return SystemSettingsResponse(**settings)

@router.patch("/system", response_model=SystemSettingsResponse)
async def update_system_settings(
    settings_update: SystemSettings,
    current_user: dict = Depends(check_permission('all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update system settings (Admin only)"""
    
    existing = await db.system_settings.find_one({}, {"_id": 0})
    
    update_data = settings_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        update_data["id"] = existing["id"]
        await db.system_settings.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
    else:
        update_data["id"] = str(uuid.uuid4())
        await db.system_settings.insert_one(update_data)
    
    return SystemSettingsResponse(**update_data)

# Backup & Export Routes
@router.get("/backup-info", response_model=BackupInfo)
async def get_backup_info(
    current_user: dict = Depends(check_permission('all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get backup information"""
    
    # Count records in all collections
    collections = {
        "users": await db.users.count_documents({}),
        "customers": await db.customers.count_documents({}),
        "products": await db.products.count_documents({}),
        "sales": await db.sales.count_documents({}),
        "purchase_orders": await db.purchase_orders.count_documents({}),
        "suppliers": await db.suppliers.count_documents({}),
    }
    
    # Check for last backup record
    last_backup = await db.backups.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    
    return BackupInfo(
        last_backup_date=last_backup["created_at"] if last_backup else None,
        backup_size="N/A",  # Would calculate actual size in production
        total_records=collections,
        backup_status="healthy" if sum(collections.values()) > 0 else "no_data"
    )

@router.post("/export-data", response_model=ExportDataResponse)
async def export_data(
    current_user: dict = Depends(check_permission('all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Export all data (Admin only)"""
    
    export_id = str(uuid.uuid4())
    export_date = datetime.now(timezone.utc).isoformat()
    
    # Count total records
    total_records = 0
    collections = ["users", "customers", "products", "sales", "purchase_orders", "suppliers"]
    
    for collection_name in collections:
        count = await db[collection_name].count_documents({})
        total_records += count
    
    # Create export record
    export_record = {
        "id": export_id,
        "export_date": export_date,
        "exported_by": current_user["sub"],
        "records_count": total_records,
        "status": "completed"
    }
    
    await db.exports.insert_one(export_record)
    
    # In production, you would:
    # 1. Generate actual export files (CSV, JSON, etc.)
    # 2. Store in S3 or similar
    # 3. Provide download link
    
    return ExportDataResponse(
        message="Data export initiated successfully",
        export_id=export_id,
        records_exported=total_records,
        export_date=export_date
    )