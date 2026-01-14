from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
from collections import defaultdict
from models_notifications import (
    SendInvoiceEmail, PaymentReminder, BulkAnnouncement,
    NotificationResponse, NotificationStats,
    NotificationType, NotificationChannel, NotificationStatus
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def get_db():
    from server import db
    return db

# Simulated email/SMS sending (in production, integrate with SendGrid, Twilio, etc.)
async def send_email(to_email: str, subject: str, body: str) -> bool:
    """Simulate email sending - integrate with actual email service in production"""
    # In production: use SendGrid, AWS SES, or similar
    print(f"[EMAIL] To: {to_email}, Subject: {subject}")
    return True

async def send_sms(to_phone: str, message: str) -> bool:
    """Simulate SMS sending - integrate with Twilio in production"""
    # In production: use Twilio, AWS SNS, or similar
    print(f"[SMS] To: {to_phone}, Message: {message}")
    return True

@router.post("/send-invoice-email", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_invoice_email(
    data: SendInvoiceEmail,
    current_user: dict = Depends(check_permission('sales_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send invoice to customer via email"""
    
    # Get invoice details
    sale = await db.sales.find_one({"id": data.invoice_id}, {"_id": 0})
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
    
    subject = f"Invoice {sale['invoice_number']} - Gilded Ledger"
    message = data.message or f"""Dear {customer['name']},

Please find your invoice details below:

Invoice Number: {sale['invoice_number']}
Invoice Date: {sale['created_at'][:10]}
Amount: ₹{sale['grand_total']}

Thank you for your business!

Best regards,
Gilded Ledger Team"""
    
    # Attempt to send email
    try:
        success = await send_email(data.customer_email, subject, message)
        notification_status = NotificationStatus.SENT if success else NotificationStatus.FAILED
    except Exception as e:
        notification_status = NotificationStatus.FAILED
    
    # Create notification record
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "type": NotificationType.INVOICE_SHARED.value,
        "recipient_id": customer["id"],
        "recipient_email": data.customer_email,
        "recipient_phone": None,
        "subject": subject,
        "message": message,
        "channel": NotificationChannel.EMAIL.value,
        "status": notification_status.value,
        "metadata": {
            "invoice_id": data.invoice_id,
            "invoice_number": sale["invoice_number"],
            "amount": sale["grand_total"]
        },
        "sent_at": datetime.now(timezone.utc).isoformat() if notification_status == NotificationStatus.SENT else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    
    await db.notifications.insert_one(notification_doc)
    
    return NotificationResponse(**notification_doc)

@router.post("/payment-reminder", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_payment_reminder(
    data: PaymentReminder,
    current_user: dict = Depends(check_permission('sales_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send payment reminder to customer"""
    
    customer = await db.customers.find_one({"id": data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    sale = await db.sales.find_one({"id": data.invoice_id}, {"_id": 0})
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    subject = f"Payment Reminder - Invoice {sale['invoice_number']}"
    message = f"""Dear {customer['name']},

This is a friendly reminder about the payment for Invoice {sale['invoice_number']}.

Amount Due: ₹{data.amount_due}
{f'Due Date: {data.due_date}' if data.due_date else ''}

Please make the payment at your earliest convenience.

Thank you!
Gilded Ledger Team"""
    
    # Send via SMS if phone available, otherwise email
    channel = NotificationChannel.SMS if customer.get("phone") else NotificationChannel.EMAIL
    
    try:
        if channel == NotificationChannel.SMS:
            success = await send_sms(customer["phone"], message)
        else:
            success = await send_email(customer.get("email", "noemail@example.com"), subject, message)
        notification_status = NotificationStatus.SENT if success else NotificationStatus.FAILED
    except Exception:
        notification_status = NotificationStatus.FAILED
    
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "type": NotificationType.PAYMENT_REMINDER.value,
        "recipient_id": customer["id"],
        "recipient_email": customer.get("email"),
        "recipient_phone": customer.get("phone"),
        "subject": subject,
        "message": message,
        "channel": channel.value,
        "status": notification_status.value,
        "metadata": {
            "invoice_id": data.invoice_id,
            "amount_due": data.amount_due
        },
        "sent_at": datetime.now(timezone.utc).isoformat() if notification_status == NotificationStatus.SENT else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    
    await db.notifications.insert_one(notification_doc)
    
    return NotificationResponse(**notification_doc)

@router.post("/bulk-announcement", response_model=List[NotificationResponse], status_code=status.HTTP_201_CREATED)
async def send_bulk_announcement(
    data: BulkAnnouncement,
    current_user: dict = Depends(check_permission('customer_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send bulk announcement to customers"""
    
    # Get target customers
    if data.customer_ids:
        customers = await db.customers.find(
            {"id": {"$in": data.customer_ids}},
            {"_id": 0}
        ).to_list(1000)
    else:
        customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    
    notifications = []
    
    for customer in customers:
        try:
            if data.channel == NotificationChannel.EMAIL and customer.get("email"):
                success = await send_email(customer["email"], data.subject, data.message)
            elif data.channel == NotificationChannel.SMS and customer.get("phone"):
                success = await send_sms(customer["phone"], data.message)
            else:
                continue
            
            notification_status = NotificationStatus.SENT if success else NotificationStatus.FAILED
        except Exception:
            notification_status = NotificationStatus.FAILED
        
        notification_id = str(uuid.uuid4())
        notification_doc = {
            "id": notification_id,
            "type": NotificationType.BULK_ANNOUNCEMENT.value,
            "recipient_id": customer["id"],
            "recipient_email": customer.get("email"),
            "recipient_phone": customer.get("phone"),
            "subject": data.subject,
            "message": data.message,
            "channel": data.channel.value,
            "status": notification_status.value,
            "metadata": None,
            "sent_at": datetime.now(timezone.utc).isoformat() if notification_status == NotificationStatus.SENT else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["sub"]
        }
        
        await db.notifications.insert_one(notification_doc)
        notifications.append(NotificationResponse(**notification_doc))
    
    return notifications

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(50, ge=1, le=500),
    notification_type: Optional[NotificationType] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get notification history"""
    
    query = {}
    if notification_type:
        query["type"] = notification_type.value
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [NotificationResponse(**n) for n in notifications]

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get notification statistics"""
    
    notifications = await db.notifications.find({}, {"_id": 0}).to_list(10000)
    
    total_sent = len([n for n in notifications if n["status"] == NotificationStatus.SENT.value])
    
    today = datetime.now(timezone.utc).date().isoformat()
    sent_today = len([n for n in notifications if n.get("sent_at", "")[:10] == today])
    
    month_start = datetime.now(timezone.utc).replace(day=1).date().isoformat()
    sent_this_month = len([n for n in notifications if n.get("sent_at", "")[:10] >= month_start])
    
    failed_count = len([n for n in notifications if n["status"] == NotificationStatus.FAILED.value])
    
    by_type = defaultdict(int)
    by_channel = defaultdict(int)
    
    for n in notifications:
        by_type[n["type"]] += 1
        by_channel[n["channel"]] += 1
    
    return NotificationStats(
        total_sent=total_sent,
        sent_today=sent_today,
        sent_this_month=sent_this_month,
        failed_count=failed_count,
        by_type=dict(by_type),
        by_channel=dict(by_channel)
    )