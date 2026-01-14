from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
from collections import defaultdict
from models_gold_rates import (
    GoldRateCreate, GoldRateResponse, CurrentGoldRates,
    RateHistoryItem, PriceUpdateSummary, GoldPurity
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/gold-rates", tags=["Gold Rates"])

def get_db():
    from server import db
    return db

@router.post("/", response_model=List[GoldRateResponse], status_code=status.HTTP_201_CREATED)
async def create_gold_rates(
    rates: List[GoldRateCreate],
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create or update gold rates for the current date"""
    
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Deactivate previous rates for today
    await db.gold_rates.update_many(
        {"date": today},
        {"$set": {"is_active": False}}
    )
    
    created_rates = []
    
    for rate in rates:
        rate_id = str(uuid.uuid4())
        rate_doc = {
            "id": rate_id,
            "date": today,
            "purity": rate.purity.value,
            "rate_per_gram": rate.rate_per_gram,
            "notes": rate.notes,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["sub"]
        }
        
        await db.gold_rates.insert_one(rate_doc)
        created_rates.append(GoldRateResponse(**rate_doc))
    
    return created_rates

@router.get("/current", response_model=CurrentGoldRates)
async def get_current_rates(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current active gold rates"""
    
    # Get latest date with active rates
    latest = await db.gold_rates.find_one(
        {"is_active": True},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    if not latest:
        return CurrentGoldRates(date=datetime.now(timezone.utc).date().isoformat(), rates=[])
    
    rates = await db.gold_rates.find(
        {"date": latest["date"], "is_active": True},
        {"_id": 0}
    ).to_list(10)
    
    return CurrentGoldRates(
        date=latest["date"],
        rates=[GoldRateResponse(**r) for r in rates]
    )

@router.get("/history", response_model=List[RateHistoryItem])
async def get_rate_history(
    purity: Optional[GoldPurity] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get historical gold rates"""
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    
    query = {
        "is_active": True,
        "date": {"$gte": from_date}
    }
    
    if purity:
        query["purity"] = purity.value
    
    rates = await db.gold_rates.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Calculate change percentage
    history = []
    prev_rates = {}
    
    for rate in rates:
        purity_key = rate["purity"]
        change_pct = None
        
        if purity_key in prev_rates:
            prev_rate = prev_rates[purity_key]
            if prev_rate > 0:
                change_pct = ((rate["rate_per_gram"] - prev_rate) / prev_rate) * 100
        
        history.append(RateHistoryItem(
            date=rate["date"],
            purity=GoldPurity(rate["purity"]),
            rate_per_gram=rate["rate_per_gram"],
            change_percentage=round(change_pct, 2) if change_pct is not None else None
        ))
        
        prev_rates[purity_key] = rate["rate_per_gram"]
    
    return history

@router.patch("/apply-to-products", response_model=PriceUpdateSummary)
async def apply_rates_to_products(
    current_user: dict = Depends(check_permission('inventory_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Apply current gold rates to update product prices"""
    
    # Get current active rates
    current_rates_data = await get_current_rates(current_user, db)
    
    if not current_rates_data.rates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active gold rates found. Please set rates first."
        )
    
    # Create rate map
    rate_map = {rate.purity.value: rate.rate_per_gram for rate in current_rates_data.rates}
    
    # Get all products
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    updated_count = 0
    failed_count = 0
    
    for product in products:
        try:
            purity = product.get("purity")
            if purity not in rate_map:
                failed_count += 1
                continue
            
            gold_rate = rate_map[purity]
            gold_weight = product["gold_weight"]
            making_charges = product["making_charges"]
            stone_charges = product.get("stone_charges", 0)
            
            # Calculate new base price
            gold_value = gold_weight * gold_rate
            new_base_price = gold_value + making_charges + stone_charges
            
            # Calculate selling price with GST
            gst_rate = product["gst_rate"]
            new_selling_price = new_base_price + (new_base_price * gst_rate / 100)
            
            # Update product
            await db.products.update_one(
                {"id": product["id"]},
                {
                    "$set": {
                        "base_price": round(new_base_price, 2),
                        "selling_price": round(new_selling_price, 2),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            updated_count += 1
            
        except Exception as e:
            failed_count += 1
            continue
    
    return PriceUpdateSummary(
        products_updated=updated_count,
        products_failed=failed_count,
        total_products=len(products),
        message=f"Successfully updated {updated_count} products"
    )

@router.get("/latest-by-purity/{purity}", response_model=GoldRateResponse)
async def get_latest_rate_by_purity(
    purity: GoldPurity,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get the latest active rate for a specific purity"""
    
    rate = await db.gold_rates.find_one(
        {"purity": purity.value, "is_active": True},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active rate found for {purity.value}"
        )
    
    return GoldRateResponse(**rate)