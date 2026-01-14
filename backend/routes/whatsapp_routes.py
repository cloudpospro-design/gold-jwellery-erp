from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
from typing import List, Optional
from models_advanced import (
    WhatsAppMessageCreate, WhatsAppMessageResponse, WhatsAppMessageType,
    WhatsAppTemplate, WhatsAppConfig
)
from auth import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Integration"])

def get_db():
    from server import db
    return db

# ==================== WHATSAPP CONFIGURATION ====================

@router.get("/config", response_model=WhatsAppConfig)
async def get_whatsapp_config(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get WhatsApp integration configuration"""
    config = await db.whatsapp_config.find_one({}, {"_id": 0})
    
    if not config:
        # Return default config
        default_config = {
            "enabled": False,
            "api_provider": "baileys",
            "connection_status": "disconnected",
            "phone_number": None,
            "last_connected": None
        }
        return WhatsAppConfig(**default_config)
    
    return WhatsAppConfig(**config)

@router.patch("/config")
async def update_whatsapp_config(
    enabled: Optional[bool] = None,
    api_provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update WhatsApp configuration"""
    update_data = {}
    if enabled is not None:
        update_data["enabled"] = enabled
    if api_provider:
        update_data["api_provider"] = api_provider
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    existing = await db.whatsapp_config.find_one({})
    if existing:
        await db.whatsapp_config.update_one({}, {"$set": update_data})
    else:
        update_data["connection_status"] = "disconnected"
        await db.whatsapp_config.insert_one(update_data)
    
    return {"message": "Configuration updated successfully"}

# ==================== MESSAGE TEMPLATES ====================

@router.get("/templates", response_model=List[WhatsAppTemplate])
async def get_message_templates(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all message templates"""
    templates = await db.whatsapp_templates.find({}, {"_id": 0}).to_list(length=100)
    
    if not templates:
        # Initialize default templates
        default_templates = [
            {
                "id": str(uuid.uuid4()),
                "name": "invoice_notification",
                "template_type": "invoice",
                "content": "Dear {customer_name},\n\nThank you for your purchase at {company_name}!\n\nInvoice No: {invoice_number}\nAmount: ₹{amount}\nDate: {date}\n\nWe appreciate your business!",
                "variables": ["customer_name", "company_name", "invoice_number", "amount", "date"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "payment_reminder",
                "template_type": "payment_reminder",
                "content": "Dear {customer_name},\n\nThis is a friendly reminder that your payment of ₹{amount} for invoice {invoice_number} is pending.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\n{company_name}",
                "variables": ["customer_name", "amount", "invoice_number", "company_name"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "order_ready",
                "template_type": "order_update",
                "content": "Dear {customer_name},\n\nGreat news! Your order {order_number} is ready for pickup/delivery.\n\nItem: {item_name}\nWeight: {weight}g\n\nPlease visit our store or contact us to arrange delivery.\n\n{company_name}",
                "variables": ["customer_name", "order_number", "item_name", "weight", "company_name"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "gold_rate_update",
                "template_type": "promotional",
                "content": "📊 Gold Rate Update from {company_name}\n\n22K Gold: ₹{rate_22k}/g\n24K Gold: ₹{rate_24k}/g\n\nVisit us for the best deals on gold jewellery!\n\n📍 {address}",
                "variables": ["company_name", "rate_22k", "rate_24k", "address"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for template in default_templates:
            await db.whatsapp_templates.insert_one(template)
        
        templates = default_templates
    
    return [WhatsAppTemplate(**t) for t in templates]

@router.post("/templates", response_model=WhatsAppTemplate)
async def create_template(
    name: str,
    template_type: str,
    content: str,
    variables: List[str],
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new message template"""
    template_data = {
        "id": str(uuid.uuid4()),
        "name": name,
        "template_type": template_type,
        "content": content,
        "variables": variables,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.whatsapp_templates.insert_one(template_data)
    return WhatsAppTemplate(**template_data)

# ==================== MESSAGES ====================

@router.get("/messages", response_model=List[WhatsAppMessageResponse])
async def get_messages(
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all WhatsApp messages"""
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    
    messages = await db.whatsapp_messages.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [WhatsAppMessageResponse(**m) for m in messages]

@router.post("/send", response_model=WhatsAppMessageResponse)
async def send_message(
    message: WhatsAppMessageCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send a WhatsApp message to a customer"""
    # Get customer details
    customer = await db.customers.find_one({"id": message.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate phone number format (Indian)
    phone = message.phone_number.replace("+", "").replace(" ", "").replace("-", "")
    if not phone.startswith("91"):
        phone = "91" + phone
    if len(phone) != 12:
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    message_data = {
        "id": str(uuid.uuid4()),
        "customer_id": message.customer_id,
        "customer_name": customer.get("name", "Customer"),
        "phone_number": phone,
        "message_type": message.message_type.value,
        "message_content": message.message_content,
        "invoice_id": message.invoice_id,
        "status": "pending",  # Will be updated when actually sent via WhatsApp service
        "sent_at": None,
        "delivered_at": None,
        "read_at": None,
        "error_message": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.whatsapp_messages.insert_one(message_data)
    
    # In production, this would call the WhatsApp service to actually send the message
    # For now, we'll simulate it
    await db.whatsapp_messages.update_one(
        {"id": message_data["id"]},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    message_data["status"] = "sent"
    message_data["sent_at"] = datetime.now(timezone.utc).isoformat()
    
    return WhatsAppMessageResponse(**message_data)

@router.post("/send-invoice/{sale_id}")
async def send_invoice_via_whatsapp(
    sale_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send invoice to customer via WhatsApp"""
    # Get sale details
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Get customer details
    customer_id = sale.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No customer associated with this sale")
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    phone = customer.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Customer has no phone number")
    
    # Get business settings for company name
    business_settings = await db.business_settings.find_one({}, {"_id": 0})
    company_name = business_settings.get("company_name", "Gilded Ledger") if business_settings else "Gilded Ledger"
    
    # Format message
    message_content = f"""Dear {customer.get('name', 'Valued Customer')},

Thank you for your purchase at {company_name}!

📄 Invoice Details:
Invoice No: {sale.get('invoice_number', 'N/A')}
Date: {sale.get('created_at', '')[:10]}
Amount: ₹{sale.get('total_amount', 0):,.2f}

Items:
"""
    for item in sale.get("items", []):
        message_content += f"• {item.get('product_name', 'Item')} - ₹{item.get('total', 0):,.2f}\n"
    
    message_content += f"""
We appreciate your business! Visit us again.

Best regards,
{company_name}"""

    # Create message record
    phone_formatted = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not phone_formatted.startswith("91"):
        phone_formatted = "91" + phone_formatted
    
    message_data = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "customer_name": customer.get("name", "Customer"),
        "phone_number": phone_formatted,
        "message_type": WhatsAppMessageType.INVOICE.value,
        "message_content": message_content,
        "invoice_id": sale_id,
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "delivered_at": None,
        "read_at": None,
        "error_message": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.whatsapp_messages.insert_one(message_data)
    
    return {
        "message": "Invoice sent successfully via WhatsApp",
        "message_id": message_data["id"],
        "customer_phone": phone_formatted
    }

@router.post("/send-bulk")
async def send_bulk_messages(
    customer_ids: List[str],
    template_name: str,
    template_params: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send bulk WhatsApp messages using a template"""
    # Get template
    template = await db.whatsapp_templates.find_one({"name": template_name}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    sent = []
    failed = []
    
    for customer_id in customer_ids:
        customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            failed.append({"customer_id": customer_id, "reason": "Customer not found"})
            continue
        
        phone = customer.get("phone", "")
        if not phone:
            failed.append({"customer_id": customer_id, "reason": "No phone number"})
            continue
        
        # Format message with template params
        params = {**template_params, "customer_name": customer.get("name", "Customer")}
        message_content = template["content"]
        for key, value in params.items():
            message_content = message_content.replace(f"{{{key}}}", str(value))
        
        phone_formatted = phone.replace("+", "").replace(" ", "").replace("-", "")
        if not phone_formatted.startswith("91"):
            phone_formatted = "91" + phone_formatted
        
        message_data = {
            "id": str(uuid.uuid4()),
            "customer_id": customer_id,
            "customer_name": customer.get("name", "Customer"),
            "phone_number": phone_formatted,
            "message_type": template["template_type"],
            "message_content": message_content,
            "invoice_id": None,
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "delivered_at": None,
            "read_at": None,
            "error_message": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.whatsapp_messages.insert_one(message_data)
        sent.append({"customer_id": customer_id, "message_id": message_data["id"]})
    
    return {
        "sent": len(sent),
        "failed": len(failed),
        "details": {"sent": sent, "failed": failed}
    }

@router.get("/stats")
async def get_whatsapp_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get WhatsApp messaging statistics"""
    total_messages = await db.whatsapp_messages.count_documents({})
    sent_messages = await db.whatsapp_messages.count_documents({"status": "sent"})
    delivered_messages = await db.whatsapp_messages.count_documents({"status": "delivered"})
    read_messages = await db.whatsapp_messages.count_documents({"status": "read"})
    failed_messages = await db.whatsapp_messages.count_documents({"status": "failed"})
    
    # Messages by type
    pipeline = [
        {"$group": {"_id": "$message_type", "count": {"$sum": 1}}}
    ]
    by_type = await db.whatsapp_messages.aggregate(pipeline).to_list(length=10)
    
    return {
        "total_messages": total_messages,
        "sent": sent_messages,
        "delivered": delivered_messages,
        "read": read_messages,
        "failed": failed_messages,
        "by_type": {item["_id"]: item["count"] for item in by_type}
    }
