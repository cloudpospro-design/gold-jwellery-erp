from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
import base64
import io
from typing import List, Optional
from models_advanced import BarcodeCreate, BarcodeResponse, BarcodeScanResult, BarcodeType
from auth import get_current_user

router = APIRouter(prefix="/barcode", tags=["Barcode & QR Code"])

def get_db():
    from server import db
    return db

# Try to import barcode libraries
try:
    import barcode
    from barcode.writer import ImageWriter
    BARCODE_AVAILABLE = True
except ImportError:
    BARCODE_AVAILABLE = False

try:
    import qrcode
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False

def generate_barcode_image(code: str) -> str:
    """Generate barcode image and return as base64"""
    if not BARCODE_AVAILABLE:
        return ""
    
    try:
        EAN = barcode.get_barcode_class('code128')
        ean = EAN(code, writer=ImageWriter())
        
        buffer = io.BytesIO()
        ean.write(buffer)
        buffer.seek(0)
        
        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        print(f"Barcode generation error: {e}")
        return ""

def generate_qr_image(data: dict) -> str:
    """Generate QR code image and return as base64"""
    if not QR_AVAILABLE:
        return ""
    
    try:
        import json
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(json.dumps(data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        print(f"QR generation error: {e}")
        return ""

@router.get("/", response_model=List[BarcodeResponse])
async def get_all_barcodes(
    barcode_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all generated barcodes"""
    query = {}
    if barcode_type:
        query["barcode_type"] = barcode_type
    
    barcodes = await db.barcodes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [BarcodeResponse(**b) for b in barcodes]

@router.get("/product/{product_id}", response_model=BarcodeResponse)
async def get_product_barcode(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get barcode for a specific product"""
    barcode_record = await db.barcodes.find_one({"product_id": product_id}, {"_id": 0})
    if not barcode_record:
        raise HTTPException(status_code=404, detail="Barcode not found for this product")
    return BarcodeResponse(**barcode_record)

@router.post("/generate", response_model=BarcodeResponse, status_code=status.HTTP_201_CREATED)
async def generate_barcode(
    barcode_data: BarcodeCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate barcode or QR code for a product"""
    # Check if product exists
    product = await db.products.find_one({"id": barcode_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if barcode already exists
    existing = await db.barcodes.find_one({"product_id": barcode_data.product_id})
    if existing:
        raise HTTPException(status_code=400, detail="Barcode already exists for this product. Use regenerate endpoint.")
    
    # Generate barcode value
    if barcode_data.custom_code:
        barcode_value = barcode_data.custom_code
    else:
        # Auto-generate: PREFIX + timestamp + random
        barcode_value = f"GLD{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4().int)[:6]}"
    
    # Generate image based on type
    if barcode_data.barcode_type == BarcodeType.QR_CODE:
        qr_data = {
            "product_id": product["id"],
            "name": product.get("name", ""),
            "sku": product.get("sku", ""),
            "price": product.get("price", 0),
            "purity": product.get("gold_purity", ""),
            "weight": product.get("weight", 0),
            "hsn": product.get("hsn_code", "")
        }
        barcode_image = generate_qr_image(qr_data)
    else:
        qr_data = None
        barcode_image = generate_barcode_image(barcode_value)
    
    barcode_record = {
        "id": str(uuid.uuid4()),
        "product_id": barcode_data.product_id,
        "product_name": product.get("name", ""),
        "barcode_type": barcode_data.barcode_type.value,
        "barcode_value": barcode_value,
        "barcode_image_base64": barcode_image,
        "qr_data": qr_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.barcodes.insert_one(barcode_record)
    
    # Update product with barcode reference
    await db.products.update_one(
        {"id": barcode_data.product_id},
        {"$set": {"barcode": barcode_value, "barcode_id": barcode_record["id"]}}
    )
    
    return BarcodeResponse(**barcode_record)

@router.post("/scan", response_model=BarcodeScanResult)
async def scan_barcode(
    barcode_value: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Scan and lookup a barcode"""
    # Find barcode record
    barcode_record = await db.barcodes.find_one({"barcode_value": barcode_value}, {"_id": 0})
    
    if not barcode_record:
        # Try to find by product barcode field
        product = await db.products.find_one({"barcode": barcode_value}, {"_id": 0})
        if not product:
            return BarcodeScanResult(found=False)
        
        product_id = product["id"]
    else:
        product_id = barcode_record["product_id"]
    
    # Get full product details
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return BarcodeScanResult(found=False)
    
    # Get current gold rate for pricing
    gold_rate = await db.gold_rates.find_one(
        {"purity": product.get("gold_purity", "22K")},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    price_info = None
    if gold_rate:
        weight = product.get("weight", 0)
        rate = gold_rate.get("rate", 0)
        gold_value = weight * rate
        making_charge = product.get("making_charges", 0)
        gst = (gold_value + making_charge) * 0.03
        
        price_info = {
            "gold_rate_per_gram": rate,
            "gold_value": round(gold_value, 2),
            "making_charges": making_charge,
            "gst": round(gst, 2),
            "total": round(gold_value + making_charge + gst, 2)
        }
    
    return BarcodeScanResult(
        found=True,
        product_id=product["id"],
        product_name=product.get("name", ""),
        product_details={
            "name": product.get("name"),
            "category": product.get("category_name"),
            "sku": product.get("sku"),
            "gold_purity": product.get("gold_purity"),
            "weight": product.get("weight"),
            "hsn_code": product.get("hsn_code"),
            "description": product.get("description")
        },
        price_info=price_info,
        stock_info={
            "quantity_in_stock": product.get("quantity_in_stock", 0),
            "low_stock_threshold": product.get("low_stock_threshold", 5),
            "is_low_stock": product.get("quantity_in_stock", 0) <= product.get("low_stock_threshold", 5)
        }
    )

@router.post("/regenerate/{product_id}", response_model=BarcodeResponse)
async def regenerate_barcode(
    product_id: str,
    barcode_type: BarcodeType = BarcodeType.BARCODE,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Regenerate barcode for a product"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete existing barcode
    await db.barcodes.delete_one({"product_id": product_id})
    
    # Generate new barcode
    barcode_value = f"GLD{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4().int)[:6]}"
    
    if barcode_type == BarcodeType.QR_CODE:
        qr_data = {
            "product_id": product["id"],
            "name": product.get("name", ""),
            "sku": product.get("sku", ""),
            "price": product.get("price", 0),
            "purity": product.get("gold_purity", ""),
            "weight": product.get("weight", 0)
        }
        barcode_image = generate_qr_image(qr_data)
    else:
        qr_data = None
        barcode_image = generate_barcode_image(barcode_value)
    
    barcode_record = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": product.get("name", ""),
        "barcode_type": barcode_type.value,
        "barcode_value": barcode_value,
        "barcode_image_base64": barcode_image,
        "qr_data": qr_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.barcodes.insert_one(barcode_record)
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"barcode": barcode_value, "barcode_id": barcode_record["id"]}}
    )
    
    return BarcodeResponse(**barcode_record)

@router.post("/generate-bulk")
async def generate_bulk_barcodes(
    product_ids: List[str],
    barcode_type: BarcodeType = BarcodeType.BARCODE,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate barcodes for multiple products"""
    generated = []
    skipped = []
    
    for product_id in product_ids:
        # Check if product exists
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            skipped.append({"product_id": product_id, "reason": "Product not found"})
            continue
        
        # Check if barcode exists
        existing = await db.barcodes.find_one({"product_id": product_id})
        if existing:
            skipped.append({"product_id": product_id, "reason": "Barcode already exists"})
            continue
        
        # Generate barcode
        barcode_value = f"GLD{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4().int)[:6]}"
        
        if barcode_type == BarcodeType.QR_CODE:
            qr_data = {
                "product_id": product["id"],
                "name": product.get("name", ""),
                "price": product.get("price", 0)
            }
            barcode_image = generate_qr_image(qr_data)
        else:
            qr_data = None
            barcode_image = generate_barcode_image(barcode_value)
        
        barcode_record = {
            "id": str(uuid.uuid4()),
            "product_id": product_id,
            "product_name": product.get("name", ""),
            "barcode_type": barcode_type.value,
            "barcode_value": barcode_value,
            "barcode_image_base64": barcode_image,
            "qr_data": qr_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.barcodes.insert_one(barcode_record)
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"barcode": barcode_value}}
        )
        
        generated.append({"product_id": product_id, "barcode": barcode_value})
    
    return {
        "generated": len(generated),
        "skipped": len(skipped),
        "details": {"generated": generated, "skipped": skipped}
    }
