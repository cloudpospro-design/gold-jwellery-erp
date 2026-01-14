from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from enum import Enum

class PurchaseStatus(str, Enum):
    PENDING = "pending"
    RECEIVED = "received"
    PARTIAL = "partial"
    CANCELLED = "cancelled"

class SupplierCreate(BaseModel):
    name: str
    contact_person: str
    phone: str
    email: Optional[EmailStr] = None
    gstin: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    payment_terms: Optional[str] = "Net 30"

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    payment_terms: Optional[str] = None

class SupplierResponse(BaseModel):
    id: str
    name: str
    contact_person: str
    phone: str
    email: Optional[str]
    gstin: Optional[str]
    address: str
    city: str
    state: str
    pincode: str
    payment_terms: str
    total_purchases: float = 0
    created_at: str

class PurchaseItem(BaseModel):
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

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: List[PurchaseItem]
    expected_delivery: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier: SupplierResponse
    items: List[PurchaseItem]
    subtotal: float
    gst_total: float
    grand_total: float
    status: PurchaseStatus
    order_date: str
    expected_delivery: Optional[str]
    received_date: Optional[str]
    notes: Optional[str]
    created_by: str

class OldGoldExchangeCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    gold_weight: float  # in grams
    purity: str  # 24K, 22K, 18K, 14K
    rate_per_gram: float
    description: Optional[str] = None
    linked_sale_id: Optional[str] = None

class OldGoldExchangeResponse(BaseModel):
    id: str
    customer_id: Optional[str]
    customer_name: str
    gold_weight: float
    purity: str
    rate_per_gram: float
    total_value: float
    description: Optional[str]
    linked_sale_id: Optional[str]
    exchange_date: str
    created_by: str