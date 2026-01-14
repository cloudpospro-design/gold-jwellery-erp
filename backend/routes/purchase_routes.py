from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from models_purchase import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseItem,
    OldGoldExchangeCreate, OldGoldExchangeResponse,
    PurchaseStatus
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/purchase", tags=["Purchase"])

def get_db():
    from server import db
    return db

async def generate_po_number(db: AsyncIOMotorDatabase) -> str:
    """Generate sequential PO number"""
    latest = await db.purchase_orders.find_one(
        {},
        {"_id": 0, "po_number": 1},
        sort=[("order_date", -1)]
    )
    
    if latest and latest.get("po_number"):
        parts = latest["po_number"].split("-")
        if len(parts) == 3:
            num = int(parts[2]) + 1
            return f"PO-2024-{num:05d}"
    
    return "PO-2024-00001"

# Supplier Routes
@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: dict = Depends(check_permission('purchase_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    supplier_id = str(uuid.uuid4())
    supplier_doc = {
        "id": supplier_id,
        "name": supplier_data.name,
        "contact_person": supplier_data.contact_person,
        "phone": supplier_data.phone,
        "email": supplier_data.email,
        "gstin": supplier_data.gstin,
        "address": supplier_data.address,
        "city": supplier_data.city,
        "state": supplier_data.state,
        "pincode": supplier_data.pincode,
        "payment_terms": supplier_data.payment_terms,
        "total_purchases": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.suppliers.insert_one(supplier_doc)
    return SupplierResponse(**supplier_doc)

@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    search: Optional[str] = None,
    current_user: dict = Depends(check_permission('purchase_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}}
        ]
    
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(1000)
    return [SupplierResponse(**s) for s in suppliers]

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    current_user: dict = Depends(check_permission('purchase_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    return SupplierResponse(**supplier)

@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier_update: SupplierUpdate,
    current_user: dict = Depends(check_permission('purchase_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    update_data = supplier_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    result = await db.suppliers.update_one(
        {"id": supplier_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    return SupplierResponse(**supplier)

# Purchase Order Routes
@router.post("/orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    po_data: PurchaseOrderCreate,
    current_user: dict = Depends(check_permission('purchase_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Get supplier
    supplier = await db.suppliers.find_one({"id": po_data.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Generate PO number
    po_number = await generate_po_number(db)
    
    # Calculate totals
    subtotal = sum(item.total_before_tax for item in po_data.items)
    gst_total = sum(item.tax_amount for item in po_data.items)
    grand_total = subtotal + gst_total
    
    # Create PO document
    po_id = str(uuid.uuid4())
    po_doc = {
        "id": po_id,
        "po_number": po_number,
        "supplier_id": po_data.supplier_id,
        "items": [item.model_dump() for item in po_data.items],
        "subtotal": round(subtotal, 2),
        "gst_total": round(gst_total, 2),
        "grand_total": round(grand_total, 2),
        "status": PurchaseStatus.PENDING.value,
        "order_date": datetime.now(timezone.utc).isoformat(),
        "expected_delivery": po_data.expected_delivery,
        "received_date": None,
        "notes": po_data.notes,
        "created_by": current_user["sub"]
    }
    
    await db.purchase_orders.insert_one(po_doc)
    
    return PurchaseOrderResponse(
        id=po_id,
        po_number=po_number,
        supplier=SupplierResponse(**supplier),
        items=po_data.items,
        subtotal=round(subtotal, 2),
        gst_total=round(gst_total, 2),
        grand_total=round(grand_total, 2),
        status=PurchaseStatus.PENDING,
        order_date=po_doc["order_date"],
        expected_delivery=po_data.expected_delivery,
        received_date=None,
        notes=po_data.notes,
        created_by=current_user["sub"]
    )

@router.get("/orders", response_model=List[PurchaseOrderResponse])
async def get_purchase_orders(
    status: Optional[PurchaseStatus] = None,
    current_user: dict = Depends(check_permission('purchase_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {}
    if status:
        query["status"] = status.value
    
    orders = await db.purchase_orders.find(query, {"_id": 0}).sort("order_date", -1).to_list(1000)
    
    result = []
    for order in orders:
        supplier = await db.suppliers.find_one({"id": order["supplier_id"]}, {"_id": 0})
        result.append(
            PurchaseOrderResponse(
                id=order["id"],
                po_number=order["po_number"],
                supplier=SupplierResponse(**supplier),
                items=[PurchaseItem(**item) for item in order["items"]],
                subtotal=order["subtotal"],
                gst_total=order["gst_total"],
                grand_total=order["grand_total"],
                status=PurchaseStatus(order["status"]),
                order_date=order["order_date"],
                expected_delivery=order.get("expected_delivery"),
                received_date=order.get("received_date"),
                notes=order.get("notes"),
                created_by=order["created_by"]
            )
        )
    
    return result

@router.get("/orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: str,
    current_user: dict = Depends(check_permission('purchase_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    order = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    supplier = await db.suppliers.find_one({"id": order["supplier_id"]}, {"_id": 0})
    
    return PurchaseOrderResponse(
        id=order["id"],
        po_number=order["po_number"],
        supplier=SupplierResponse(**supplier),
        items=[PurchaseItem(**item) for item in order["items"]],
        subtotal=order["subtotal"],
        gst_total=order["gst_total"],
        grand_total=order["grand_total"],
        status=PurchaseStatus(order["status"]),
        order_date=order["order_date"],
        expected_delivery=order.get("expected_delivery"),
        received_date=order.get("received_date"),
        notes=order.get("notes"),
        created_by=order["created_by"]
    )

@router.patch("/orders/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    po_id: str,
    current_user: dict = Depends(check_permission('purchase_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    order = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    
    if order["status"] == PurchaseStatus.RECEIVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase order already received"
        )
    
    # Update product stock
    for item in order["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            new_quantity = product["quantity"] + item["quantity"]
            is_low_stock = new_quantity <= product["low_stock_threshold"]
            
            await db.products.update_one(
                {"id": item["product_id"]},
                {
                    "$set": {
                        "quantity": new_quantity,
                        "is_low_stock": is_low_stock,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    # Update PO status
    await db.purchase_orders.update_one(
        {"id": po_id},
        {
            "$set": {
                "status": PurchaseStatus.RECEIVED.value,
                "received_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update supplier total purchases
    await db.suppliers.update_one(
        {"id": order["supplier_id"]},
        {"$inc": {"total_purchases": order["grand_total"]}}
    )
    
    # Get updated order
    updated_order = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    supplier = await db.suppliers.find_one({"id": updated_order["supplier_id"]}, {"_id": 0})
    
    return PurchaseOrderResponse(
        id=updated_order["id"],
        po_number=updated_order["po_number"],
        supplier=SupplierResponse(**supplier),
        items=[PurchaseItem(**item) for item in updated_order["items"]],
        subtotal=updated_order["subtotal"],
        gst_total=updated_order["gst_total"],
        grand_total=updated_order["grand_total"],
        status=PurchaseStatus(updated_order["status"]),
        order_date=updated_order["order_date"],
        expected_delivery=updated_order.get("expected_delivery"),
        received_date=updated_order.get("received_date"),
        notes=updated_order.get("notes"),
        created_by=updated_order["created_by"]
    )

# Old Gold Exchange Routes
@router.post("/old-gold", response_model=OldGoldExchangeResponse, status_code=status.HTTP_201_CREATED)
async def record_old_gold_exchange(
    exchange_data: OldGoldExchangeCreate,
    current_user: dict = Depends(check_permission('purchase_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    total_value = exchange_data.gold_weight * exchange_data.rate_per_gram
    
    exchange_id = str(uuid.uuid4())
    exchange_doc = {
        "id": exchange_id,
        "customer_id": exchange_data.customer_id,
        "customer_name": exchange_data.customer_name,
        "gold_weight": exchange_data.gold_weight,
        "purity": exchange_data.purity,
        "rate_per_gram": exchange_data.rate_per_gram,
        "total_value": round(total_value, 2),
        "description": exchange_data.description,
        "linked_sale_id": exchange_data.linked_sale_id,
        "exchange_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    
    await db.old_gold_exchanges.insert_one(exchange_doc)
    
    return OldGoldExchangeResponse(**exchange_doc)

@router.get("/old-gold", response_model=List[OldGoldExchangeResponse])
async def get_old_gold_exchanges(
    current_user: dict = Depends(check_permission('purchase_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    exchanges = await db.old_gold_exchanges.find({}, {"_id": 0}).sort("exchange_date", -1).to_list(1000)
    return [OldGoldExchangeResponse(**ex) for ex in exchanges]