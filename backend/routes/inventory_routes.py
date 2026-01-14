from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from models_inventory import (
    CategoryCreate, CategoryResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    StockUpdate, GoldPurity
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def get_db():
    from server import db
    return db

def calculate_selling_price(base_price: float, gst_rate: float) -> float:
    return round(base_price + (base_price * gst_rate / 100), 2)

# Categories Routes
@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    category_id = str(uuid.uuid4())
    category_doc = {
        "id": category_id,
        "name": category_data.name,
        "description": category_data.description,
        "hsn_code": category_data.hsn_code,
        "product_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(category_doc)
    
    return CategoryResponse(**category_doc)

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    current_user: dict = Depends(check_permission('inventory_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return [CategoryResponse(**cat) for cat in categories]

# Products Routes
@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Check if SKU already exists
    existing = await db.products.find_one({"sku": product_data.sku}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SKU already exists"
        )
    
    product_id = str(uuid.uuid4())
    selling_price = calculate_selling_price(product_data.base_price, product_data.gst_rate)
    is_low_stock = product_data.quantity <= product_data.low_stock_threshold
    
    product_doc = {
        "id": product_id,
        "name": product_data.name,
        "sku": product_data.sku,
        "description": product_data.description,
        "category": product_data.category,
        "gold_weight": product_data.gold_weight,
        "purity": product_data.purity.value,
        "making_charges": product_data.making_charges,
        "stone_weight": product_data.stone_weight or 0,
        "stone_charges": product_data.stone_charges or 0,
        "hallmark_number": product_data.hallmark_number,
        "hsn_code": product_data.hsn_code,
        "base_price": product_data.base_price,
        "gst_rate": product_data.gst_rate,
        "selling_price": selling_price,
        "quantity": product_data.quantity,
        "low_stock_threshold": product_data.low_stock_threshold,
        "is_low_stock": is_low_stock,
        "images": product_data.images or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product_doc)
    
    # Update category product count
    await db.categories.update_one(
        {"name": product_data.category},
        {"$inc": {"product_count": 1}}
    )
    
    return ProductResponse(
        id=product_id,
        name=product_data.name,
        sku=product_data.sku,
        description=product_data.description,
        category=product_data.category,
        gold_weight=product_data.gold_weight,
        purity=product_data.purity,
        making_charges=product_data.making_charges,
        stone_weight=product_data.stone_weight or 0,
        stone_charges=product_data.stone_charges or 0,
        hallmark_number=product_data.hallmark_number,
        hsn_code=product_data.hsn_code,
        base_price=product_data.base_price,
        gst_rate=product_data.gst_rate,
        selling_price=selling_price,
        quantity=product_data.quantity,
        low_stock_threshold=product_data.low_stock_threshold,
        is_low_stock=is_low_stock,
        images=product_data.images or [],
        created_at=product_doc["created_at"],
        updated_at=product_doc["updated_at"]
    )

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(check_permission('inventory_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query = {}
    if category:
        query["category"] = category
    if low_stock:
        query["is_low_stock"] = True
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    return [
        ProductResponse(
            id=p["id"],
            name=p["name"],
            sku=p["sku"],
            description=p.get("description"),
            category=p["category"],
            gold_weight=p["gold_weight"],
            purity=GoldPurity(p["purity"]),
            making_charges=p["making_charges"],
            stone_weight=p.get("stone_weight", 0),
            stone_charges=p.get("stone_charges", 0),
            hallmark_number=p.get("hallmark_number"),
            hsn_code=p["hsn_code"],
            base_price=p["base_price"],
            gst_rate=p["gst_rate"],
            selling_price=p["selling_price"],
            quantity=p["quantity"],
            low_stock_threshold=p["low_stock_threshold"],
            is_low_stock=p["is_low_stock"],
            images=p.get("images", []),
            created_at=p["created_at"],
            updated_at=p["updated_at"]
        )
        for p in products
    ]

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: dict = Depends(check_permission('inventory_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse(
        id=product["id"],
        name=product["name"],
        sku=product["sku"],
        description=product.get("description"),
        category=product["category"],
        gold_weight=product["gold_weight"],
        purity=GoldPurity(product["purity"]),
        making_charges=product["making_charges"],
        stone_weight=product.get("stone_weight", 0),
        stone_charges=product.get("stone_charges", 0),
        hallmark_number=product.get("hallmark_number"),
        hsn_code=product["hsn_code"],
        base_price=product["base_price"],
        gst_rate=product["gst_rate"],
        selling_price=product["selling_price"],
        quantity=product["quantity"],
        low_stock_threshold=product["low_stock_threshold"],
        is_low_stock=product["is_low_stock"],
        images=product.get("images", []),
        created_at=product["created_at"],
        updated_at=product["updated_at"]
    )

@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    if "purity" in update_data:
        update_data["purity"] = update_data["purity"].value
    
    # Recalculate selling price if base_price or gst_rate changed
    if "base_price" in update_data or "gst_rate" in update_data:
        base_price = update_data.get("base_price", product["base_price"])
        gst_rate = update_data.get("gst_rate", product["gst_rate"])
        update_data["selling_price"] = calculate_selling_price(base_price, gst_rate)
    
    # Check if low stock
    if "quantity" in update_data or "low_stock_threshold" in update_data:
        quantity = update_data.get("quantity", product["quantity"])
        threshold = update_data.get("low_stock_threshold", product["low_stock_threshold"])
        update_data["is_low_stock"] = quantity <= threshold
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    return ProductResponse(
        id=updated_product["id"],
        name=updated_product["name"],
        sku=updated_product["sku"],
        description=updated_product.get("description"),
        category=updated_product["category"],
        gold_weight=updated_product["gold_weight"],
        purity=GoldPurity(updated_product["purity"]),
        making_charges=updated_product["making_charges"],
        stone_weight=updated_product.get("stone_weight", 0),
        stone_charges=updated_product.get("stone_charges", 0),
        hallmark_number=updated_product.get("hallmark_number"),
        hsn_code=updated_product["hsn_code"],
        base_price=updated_product["base_price"],
        gst_rate=updated_product["gst_rate"],
        selling_price=updated_product["selling_price"],
        quantity=updated_product["quantity"],
        low_stock_threshold=updated_product["low_stock_threshold"],
        is_low_stock=updated_product["is_low_stock"],
        images=updated_product.get("images", []),
        created_at=updated_product["created_at"],
        updated_at=updated_product["updated_at"]
    )

@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return None

@router.patch("/products/{product_id}/stock", response_model=ProductResponse)
async def update_stock(
    product_id: str,
    stock_update: StockUpdate,
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    new_quantity = product["quantity"] + stock_update.quantity_change
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock"
        )
    
    is_low_stock = new_quantity <= product["low_stock_threshold"]
    
    await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "quantity": new_quantity,
                "is_low_stock": is_low_stock,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log stock change
    stock_log = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "quantity_change": stock_update.quantity_change,
        "reason": stock_update.reason,
        "previous_quantity": product["quantity"],
        "new_quantity": new_quantity,
        "user_id": current_user["sub"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.stock_logs.insert_one(stock_log)
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    return ProductResponse(
        id=updated_product["id"],
        name=updated_product["name"],
        sku=updated_product["sku"],
        description=updated_product.get("description"),
        category=updated_product["category"],
        gold_weight=updated_product["gold_weight"],
        purity=GoldPurity(updated_product["purity"]),
        making_charges=updated_product["making_charges"],
        stone_weight=updated_product.get("stone_weight", 0),
        stone_charges=updated_product.get("stone_charges", 0),
        hallmark_number=updated_product.get("hallmark_number"),
        hsn_code=updated_product["hsn_code"],
        base_price=updated_product["base_price"],
        gst_rate=updated_product["gst_rate"],
        selling_price=updated_product["selling_price"],
        quantity=updated_product["quantity"],
        low_stock_threshold=updated_product["low_stock_threshold"],
        is_low_stock=updated_product["is_low_stock"],
        images=updated_product.get("images", []),
        created_at=updated_product["created_at"],
        updated_at=updated_product["updated_at"]
    )