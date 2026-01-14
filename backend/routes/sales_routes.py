from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
from models_sales import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    SaleCreate, SaleResponse, SaleItem, GSTBreakdown,
    PaymentMethod, SaleStatus, SalesSummary
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/sales", tags=["Sales"])

def get_db():
    from server import db
    return db

# Store state for business (can be made configurable)
BUSINESS_STATE = "Maharashtra"

def calculate_gst(items: List[SaleItem], customer_state: str) -> GSTBreakdown:
    """Calculate GST based on customer state"""
    total_tax = sum(item.tax_amount for item in items)
    
    if customer_state.lower() == BUSINESS_STATE.lower():
        # Intra-state: CGST + SGST
        return GSTBreakdown(
            cgst=round(total_tax / 2, 2),
            sgst=round(total_tax / 2, 2),
            igst=0,
            total_tax=round(total_tax, 2)
        )
    else:
        # Inter-state: IGST
        return GSTBreakdown(
            cgst=0,
            sgst=0,
            igst=round(total_tax, 2),
            total_tax=round(total_tax, 2)
        )

async def generate_invoice_number(db: AsyncIOMotorDatabase) -> str:
    """Generate sequential invoice number"""
    # Get the latest invoice
    latest = await db.sales.find_one(
        {},
        {"_id": 0, "invoice_number": 1},
        sort=[("created_at", -1)]
    )
    
    if latest and latest.get("invoice_number"):
        # Extract number and increment
        parts = latest["invoice_number"].split("-")
        if len(parts) == 3:
            num = int(parts[2]) + 1
            return f"INV-2024-{num:05d}"
    
    return "INV-2024-00001"

# Customer Routes
@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(check_permission('customer_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "name": customer_data.name,
        "email": customer_data.email,
        "phone": customer_data.phone,
        "gstin": customer_data.gstin,
        "address": customer_data.address,
        "city": customer_data.city,
        "state": customer_data.state,
        "pincode": customer_data.pincode,
        "total_purchases": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(**customer_doc)

@router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: dict = Depends(check_permission('customer_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: dict = Depends(check_permission('customer_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return CustomerResponse(**customer)

# Sales Routes
@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_data: SaleCreate,
    current_user: dict = Depends(check_permission('sales_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Get customer
    customer = await db.customers.find_one({"id": sale_data.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check stock and update quantities
    for item in sale_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_name} not found"
            )
        if product["quantity"] < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {item.product_name}"
            )
    
    # Generate invoice number
    invoice_number = await generate_invoice_number(db)
    
    # Calculate totals
    subtotal = sum(item.total_before_tax for item in sale_data.items)
    gst_breakdown = calculate_gst(sale_data.items, customer["state"])
    grand_total = subtotal + gst_breakdown.total_tax
    
    # Create sale document
    sale_id = str(uuid.uuid4())
    sale_doc = {
        "id": sale_id,
        "invoice_number": invoice_number,
        "customer_id": sale_data.customer_id,
        "items": [item.model_dump() for item in sale_data.items],
        "subtotal": round(subtotal, 2),
        "gst_breakdown": gst_breakdown.model_dump(),
        "grand_total": round(grand_total, 2),
        "payment_method": sale_data.payment_method.value,
        "status": SaleStatus.COMPLETED.value,
        "notes": sale_data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    
    await db.sales.insert_one(sale_doc)
    
    # Update product stock
    for item in sale_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        new_quantity = product["quantity"] - item.quantity
        is_low_stock = new_quantity <= product["low_stock_threshold"]
        
        await db.products.update_one(
            {"id": item.product_id},
            {
                "$set": {
                    "quantity": new_quantity,
                    "is_low_stock": is_low_stock,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    # Update customer total purchases
    await db.customers.update_one(
        {"id": sale_data.customer_id},
        {"$inc": {"total_purchases": grand_total}}
    )
    
    # Return response
    return SaleResponse(
        id=sale_id,
        invoice_number=invoice_number,
        customer=CustomerResponse(**customer),
        items=sale_data.items,
        subtotal=round(subtotal, 2),
        gst_breakdown=gst_breakdown,
        grand_total=round(grand_total, 2),
        payment_method=sale_data.payment_method,
        status=SaleStatus.COMPLETED,
        notes=sale_data.notes,
        created_at=sale_doc["created_at"],
        created_by=current_user["sub"]
    )

@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    status: Optional[SaleStatus] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(check_permission('sales_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {}
    if status:
        query["status"] = status.value
    if from_date:
        query["created_at"] = {"$gte": from_date}
    if to_date:
        if "created_at" not in query:
            query["created_at"] = {}
        query["created_at"]["$lte"] = to_date
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    result = []
    for sale in sales:
        customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
        result.append(
            SaleResponse(
                id=sale["id"],
                invoice_number=sale["invoice_number"],
                customer=CustomerResponse(**customer),
                items=[SaleItem(**item) for item in sale["items"]],
                subtotal=sale["subtotal"],
                gst_breakdown=GSTBreakdown(**sale["gst_breakdown"]),
                grand_total=sale["grand_total"],
                payment_method=PaymentMethod(sale["payment_method"]),
                status=SaleStatus(sale["status"]),
                notes=sale.get("notes"),
                created_at=sale["created_at"],
                created_by=sale["created_by"]
            )
        )
    
    return result

@router.get("/summary", response_model=SalesSummary)
async def get_sales_summary(
    current_user: dict = Depends(check_permission('sales_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Get all sales
    all_sales = await db.sales.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    
    # Get today's sales
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales = [s for s in all_sales if datetime.fromisoformat(s["created_at"]) >= today_start]
    
    return SalesSummary(
        total_sales=len(all_sales),
        total_revenue=sum(s["grand_total"] for s in all_sales),
        today_sales=len(today_sales),
        today_revenue=sum(s["grand_total"] for s in today_sales),
        pending_amount=0  # Can be calculated from pending invoices
    )

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: str,
    current_user: dict = Depends(check_permission('sales_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
    
    return SaleResponse(
        id=sale["id"],
        invoice_number=sale["invoice_number"],
        customer=CustomerResponse(**customer),
        items=[SaleItem(**item) for item in sale["items"]],
        subtotal=sale["subtotal"],
        gst_breakdown=GSTBreakdown(**sale["gst_breakdown"]),
        grand_total=sale["grand_total"],
        payment_method=PaymentMethod(sale["payment_method"]),
        status=SaleStatus(sale["status"]),
        notes=sale.get("notes"),
        created_at=sale["created_at"],
        created_by=sale["created_by"]
    )