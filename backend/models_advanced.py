from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# ==================== KARAT PRICING MODELS ====================

class KaratType(str, Enum):
    K24 = "24K"
    K22 = "22K"
    K21 = "21K"
    K18 = "18K"
    K14 = "14K"
    K10 = "10K"
    K9 = "9K"

KARAT_PURITY = {
    "24K": 99.9,
    "22K": 91.6,
    "21K": 87.5,
    "18K": 75.0,
    "14K": 58.5,
    "10K": 41.7,
    "9K": 37.5
}

class KaratPricingCreate(BaseModel):
    karat: KaratType
    base_rate_per_gram: float
    making_charge_per_gram: float = 0.0
    making_charge_percentage: float = 0.0
    wastage_percentage: float = 0.0
    gst_percentage: float = 3.0
    effective_date: str
    notes: Optional[str] = None

class KaratPricingResponse(BaseModel):
    id: str
    karat: str
    purity_percentage: float
    base_rate_per_gram: float
    making_charge_per_gram: float
    making_charge_percentage: float
    wastage_percentage: float
    gst_percentage: float
    effective_date: str
    notes: Optional[str]
    created_at: str
    updated_at: Optional[str] = None

class KaratPricingUpdate(BaseModel):
    base_rate_per_gram: Optional[float] = None
    making_charge_per_gram: Optional[float] = None
    making_charge_percentage: Optional[float] = None
    wastage_percentage: Optional[float] = None
    gst_percentage: Optional[float] = None
    notes: Optional[str] = None

class PriceCalculationRequest(BaseModel):
    karat: KaratType
    weight_grams: float
    making_charge_type: str = "per_gram"  # per_gram or percentage
    include_gst: bool = True
    stone_value: float = 0.0
    discount_percentage: float = 0.0

class PriceCalculationResponse(BaseModel):
    karat: str
    purity_percentage: float
    weight_grams: float
    gold_rate_per_gram: float
    gold_value: float
    making_charges: float
    wastage_charges: float
    stone_value: float
    subtotal: float
    discount_amount: float
    taxable_amount: float
    cgst: float
    sgst: float
    total_gst: float
    grand_total: float
    breakdown: Dict[str, float]

# ==================== ADVANCED GST MODELS ====================

class EInvoiceStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    CANCELLED = "cancelled"
    FAILED = "failed"

class EInvoiceCreate(BaseModel):
    sale_id: str
    irn: Optional[str] = None  # Invoice Reference Number
    ack_number: Optional[str] = None
    ack_date: Optional[str] = None
    signed_invoice: Optional[str] = None
    signed_qr_code: Optional[str] = None

class EInvoiceResponse(BaseModel):
    id: str
    sale_id: str
    invoice_number: str
    irn: Optional[str]
    ack_number: Optional[str]
    ack_date: Optional[str]
    signed_invoice: Optional[str]
    signed_qr_code: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: str

class GSTR2ARecord(BaseModel):
    id: str
    supplier_gstin: str
    supplier_name: str
    invoice_number: str
    invoice_date: str
    invoice_value: float
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    cess: float = 0.0
    place_of_supply: str
    reverse_charge: bool = False
    invoice_type: str = "B2B"
    filing_period: str  # MMYYYY format
    matched: bool = False
    matched_with_purchase_id: Optional[str] = None
    discrepancy_amount: Optional[float] = None
    discrepancy_reason: Optional[str] = None
    imported_at: str

class GSTR2BRecord(BaseModel):
    id: str
    supplier_gstin: str
    supplier_name: str
    invoice_number: str
    invoice_date: str
    invoice_value: float
    taxable_value: float
    itc_available: float
    cgst: float
    sgst: float
    igst: float
    filing_period: str
    itc_eligibility: str = "eligible"
    action_taken: Optional[str] = None
    imported_at: str

class GSTReconciliationReport(BaseModel):
    filing_period: str
    total_gstr2a_records: int
    total_gstr2b_records: int
    total_purchase_records: int
    matched_records: int
    unmatched_records: int
    total_gstr2a_value: float
    total_purchase_value: float
    variance_amount: float
    itc_claimable: float
    itc_not_claimable: float
    discrepancies: List[Dict]

# ==================== BARCODE/QR CODE MODELS ====================

class BarcodeType(str, Enum):
    BARCODE = "barcode"
    QR_CODE = "qr_code"

class BarcodeCreate(BaseModel):
    product_id: str
    barcode_type: BarcodeType = BarcodeType.BARCODE
    custom_code: Optional[str] = None  # If not provided, auto-generate

class BarcodeResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    barcode_type: str
    barcode_value: str
    barcode_image_base64: str
    qr_data: Optional[Dict] = None  # For QR codes, contains product details
    created_at: str

class BarcodeScanResult(BaseModel):
    found: bool
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_details: Optional[Dict] = None
    price_info: Optional[Dict] = None
    stock_info: Optional[Dict] = None

# ==================== WHATSAPP INTEGRATION MODELS ====================

class WhatsAppMessageType(str, Enum):
    TEXT = "text"
    INVOICE = "invoice"
    PAYMENT_REMINDER = "payment_reminder"
    ORDER_UPDATE = "order_update"
    PROMOTIONAL = "promotional"

class WhatsAppMessageCreate(BaseModel):
    customer_id: str
    phone_number: str
    message_type: WhatsAppMessageType
    message_content: str
    invoice_id: Optional[str] = None
    template_name: Optional[str] = None
    template_params: Optional[Dict] = None

class WhatsAppMessageResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    phone_number: str
    message_type: str
    message_content: str
    invoice_id: Optional[str]
    status: str  # pending, sent, delivered, read, failed
    sent_at: Optional[str]
    delivered_at: Optional[str]
    read_at: Optional[str]
    error_message: Optional[str]
    created_at: str

class WhatsAppTemplate(BaseModel):
    id: str
    name: str
    template_type: str
    content: str
    variables: List[str]
    is_active: bool = True
    created_at: str

class WhatsAppConfig(BaseModel):
    enabled: bool = False
    api_provider: str = "baileys"  # baileys, twilio, etc.
    connection_status: str = "disconnected"
    phone_number: Optional[str] = None
    last_connected: Optional[str] = None
