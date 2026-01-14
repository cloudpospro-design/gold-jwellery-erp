from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum

class NotificationType(str, Enum):
    INVOICE_SHARED = "invoice_shared"
    PAYMENT_REMINDER = "payment_reminder"
    STOCK_ALERT = "stock_alert"
    RATE_UPDATE = "rate_update"
    BULK_ANNOUNCEMENT = "bulk_announcement"
    ORDER_CONFIRMATION = "order_confirmation"

class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"

class NotificationStatus(str, Enum):
    SENT = "sent"
    PENDING = "pending"
    FAILED = "failed"

class SendInvoiceEmail(BaseModel):
    invoice_id: str
    customer_email: EmailStr
    message: Optional[str] = None

class PaymentReminder(BaseModel):
    customer_id: str
    invoice_id: str
    amount_due: float
    due_date: Optional[str] = None

class BulkAnnouncement(BaseModel):
    subject: str
    message: str
    customer_ids: Optional[List[str]] = None  # If None, send to all
    channel: NotificationChannel = NotificationChannel.EMAIL

class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    recipient_id: Optional[str]
    recipient_email: Optional[str]
    recipient_phone: Optional[str]
    subject: str
    message: str
    channel: NotificationChannel
    status: NotificationStatus
    metadata: Optional[dict] = None
    sent_at: Optional[str]
    created_at: str

class NotificationStats(BaseModel):
    total_sent: int
    sent_today: int
    sent_this_month: int
    failed_count: int
    by_type: dict
    by_channel: dict