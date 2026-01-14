from pydantic import BaseModel, EmailStr
from typing import Optional

class BusinessSettings(BaseModel):
    company_name: str
    address: str
    city: str
    state: str
    pincode: str
    phone: str
    email: EmailStr
    gstin: Optional[str] = None
    pan: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: str = "INV"
    po_prefix: str = "PO"
    financial_year_start: str = "04-01"  # April 1st

class BusinessSettingsResponse(BaseModel):
    id: str
    company_name: str
    address: str
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    gstin: Optional[str]
    pan: Optional[str]
    logo_url: Optional[str]
    invoice_prefix: str
    po_prefix: str
    financial_year_start: str
    updated_at: str

class SystemSettings(BaseModel):
    low_stock_threshold_default: int = 5
    default_gst_rate: float = 3.0
    currency: str = "INR"
    currency_symbol: str = "₹"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "12h"
    timezone: str = "Asia/Kolkata"
    backup_frequency: str = "daily"  # daily, weekly, monthly
    enable_email_notifications: bool = True
    enable_sms_notifications: bool = True
    auto_send_invoice: bool = False

class SystemSettingsResponse(BaseModel):
    id: str
    low_stock_threshold_default: int
    default_gst_rate: float
    currency: str
    currency_symbol: str
    date_format: str
    time_format: str
    timezone: str
    backup_frequency: str
    enable_email_notifications: bool
    enable_sms_notifications: bool
    auto_send_invoice: bool
    updated_at: str

class BackupInfo(BaseModel):
    last_backup_date: Optional[str]
    backup_size: str
    total_records: dict
    backup_status: str

class ExportDataResponse(BaseModel):
    message: str
    export_id: str
    records_exported: int
    export_date: str