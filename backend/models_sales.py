from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from enum import Enum

class PaymentMethod(str, Enum):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"

class SaleStatus(str, Enum):
    COMPLETED = "completed"
    PENDING = "pending"
    CANCELLED = "cancelled"

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    gstin: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: str
    gstin: Optional[str]
    address: str
    city: str
    state: str
    pincode: str
    total_purchases: float = 0
    created_at: str

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    hsn_code: str
    gst_rate: float
    total_before_tax: float
    tax_amount: float
    total_after_tax: float

class GSTBreakdown(BaseModel):
    cgst: float = 0
    sgst: float = 0
    igst: float = 0
    total_tax: float = 0

class SaleCreate(BaseModel):
    customer_id: str
    items: List[SaleItem]
    payment_method: PaymentMethod
    notes: Optional[str] = None

class SaleResponse(BaseModel):
    id: str
    invoice_number: str
    customer: CustomerResponse
    items: List[SaleItem]
    subtotal: float
    gst_breakdown: GSTBreakdown
    grand_total: float
    payment_method: PaymentMethod
    status: SaleStatus
    notes: Optional[str]
    created_at: str
    created_by: str

class SalesSummary(BaseModel):
    total_sales: int
    total_revenue: float
    today_sales: int
    today_revenue: float
    pending_amount: float