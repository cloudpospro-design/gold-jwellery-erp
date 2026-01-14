from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
from typing import List, Optional
from models_advanced import (
    KaratType, KARAT_PURITY,
    KaratPricingCreate, KaratPricingResponse, KaratPricingUpdate,
    PriceCalculationRequest, PriceCalculationResponse
)
from auth import get_current_user

router = APIRouter(prefix="/karat-pricing", tags=["Karat Pricing"])

def get_db():
    from server import db
    return db

@router.get("/", response_model=List[KaratPricingResponse])
async def get_all_karat_pricing(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all karat pricing configurations"""
    pricing = await db.karat_pricing.find({}, {"_id": 0}).sort("karat", 1).to_list(length=20)
    return [KaratPricingResponse(**p) for p in pricing]

@router.get("/{karat}", response_model=KaratPricingResponse)
async def get_karat_pricing(
    karat: KaratType,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get pricing for a specific karat"""
    pricing = await db.karat_pricing.find_one({"karat": karat.value}, {"_id": 0})
    if not pricing:
        raise HTTPException(status_code=404, detail=f"Pricing for {karat.value} not found")
    return KaratPricingResponse(**pricing)

@router.post("/", response_model=KaratPricingResponse, status_code=status.HTTP_201_CREATED)
async def create_karat_pricing(
    pricing: KaratPricingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create or update karat pricing"""
    # Check if pricing exists for this karat
    existing = await db.karat_pricing.find_one({"karat": pricing.karat.value})
    
    pricing_data = pricing.model_dump()
    pricing_data["karat"] = pricing.karat.value
    pricing_data["purity_percentage"] = KARAT_PURITY.get(pricing.karat.value, 0)
    
    if existing:
        # Update existing
        pricing_data["id"] = existing["id"]
        pricing_data["created_at"] = existing["created_at"]
        pricing_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.karat_pricing.update_one({"karat": pricing.karat.value}, {"$set": pricing_data})
    else:
        # Create new
        pricing_data["id"] = str(uuid.uuid4())
        pricing_data["created_at"] = datetime.now(timezone.utc).isoformat()
        pricing_data["updated_at"] = None
        await db.karat_pricing.insert_one(pricing_data)
    
    result = await db.karat_pricing.find_one({"karat": pricing.karat.value}, {"_id": 0})
    return KaratPricingResponse(**result)

@router.patch("/{karat}", response_model=KaratPricingResponse)
async def update_karat_pricing(
    karat: KaratType,
    pricing_update: KaratPricingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update karat pricing"""
    existing = await db.karat_pricing.find_one({"karat": karat.value}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Pricing for {karat.value} not found")
    
    update_data = {k: v for k, v in pricing_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.karat_pricing.update_one({"karat": karat.value}, {"$set": update_data})
    
    updated = await db.karat_pricing.find_one({"karat": karat.value}, {"_id": 0})
    return KaratPricingResponse(**updated)

@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_price(
    request: PriceCalculationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate price for gold based on karat and weight"""
    # Get pricing for the karat
    pricing = await db.karat_pricing.find_one({"karat": request.karat.value}, {"_id": 0})
    
    if not pricing:
        # Use default calculation if pricing not set
        # Get 24K rate from gold_rates and calculate
        gold_rate = await db.gold_rates.find_one({"purity": "24K"}, {"_id": 0}, sort=[("date", -1)])
        if not gold_rate:
            raise HTTPException(status_code=404, detail="Gold rate not configured. Please set gold rates first.")
        
        base_rate = gold_rate["rate"] * (KARAT_PURITY.get(request.karat.value, 0) / 100)
        making_charge_per_gram = 500  # Default making charge
        wastage_percentage = 3  # Default wastage
        gst_percentage = 3
    else:
        base_rate = pricing["base_rate_per_gram"]
        making_charge_per_gram = pricing["making_charge_per_gram"]
        wastage_percentage = pricing["wastage_percentage"]
        gst_percentage = pricing["gst_percentage"]
    
    # Calculate gold value
    gold_value = round(request.weight_grams * base_rate, 2)
    
    # Calculate making charges
    if request.making_charge_type == "per_gram":
        making_charges = round(request.weight_grams * making_charge_per_gram, 2)
    else:
        making_charge_percentage = pricing.get("making_charge_percentage", 10) if pricing else 10
        making_charges = round(gold_value * (making_charge_percentage / 100), 2)
    
    # Calculate wastage
    wastage_charges = round(gold_value * (wastage_percentage / 100), 2)
    
    # Subtotal
    subtotal = gold_value + making_charges + wastage_charges + request.stone_value
    
    # Discount
    discount_amount = round(subtotal * (request.discount_percentage / 100), 2)
    
    # Taxable amount
    taxable_amount = subtotal - discount_amount
    
    # GST calculation
    if request.include_gst:
        cgst = round(taxable_amount * (gst_percentage / 200), 2)  # Half of GST
        sgst = round(taxable_amount * (gst_percentage / 200), 2)  # Half of GST
        total_gst = cgst + sgst
    else:
        cgst = sgst = total_gst = 0
    
    # Grand total
    grand_total = round(taxable_amount + total_gst, 2)
    
    return PriceCalculationResponse(
        karat=request.karat.value,
        purity_percentage=KARAT_PURITY.get(request.karat.value, 0),
        weight_grams=request.weight_grams,
        gold_rate_per_gram=base_rate,
        gold_value=gold_value,
        making_charges=making_charges,
        wastage_charges=wastage_charges,
        stone_value=request.stone_value,
        subtotal=subtotal,
        discount_amount=discount_amount,
        taxable_amount=taxable_amount,
        cgst=cgst,
        sgst=sgst,
        total_gst=total_gst,
        grand_total=grand_total,
        breakdown={
            "gold_value": gold_value,
            "making_charges": making_charges,
            "wastage_charges": wastage_charges,
            "stone_value": request.stone_value,
            "discount": discount_amount,
            "cgst": cgst,
            "sgst": sgst
        }
    )

@router.post("/initialize-defaults")
async def initialize_default_pricing(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Initialize default karat pricing based on current gold rates"""
    # Get latest 24K gold rate
    gold_rate = await db.gold_rates.find_one({"purity": "24K"}, {"_id": 0}, sort=[("date", -1)])
    base_24k_rate = gold_rate["rate"] if gold_rate else 7500  # Default to 7500 if not set
    
    default_pricing = [
        {"karat": "24K", "purity": 99.9, "making_charge": 800, "wastage": 2.0},
        {"karat": "22K", "purity": 91.6, "making_charge": 600, "wastage": 2.5},
        {"karat": "21K", "purity": 87.5, "making_charge": 550, "wastage": 2.5},
        {"karat": "18K", "purity": 75.0, "making_charge": 500, "wastage": 3.0},
        {"karat": "14K", "purity": 58.5, "making_charge": 400, "wastage": 3.5},
    ]
    
    created = []
    for dp in default_pricing:
        existing = await db.karat_pricing.find_one({"karat": dp["karat"]})
        if not existing:
            pricing_data = {
                "id": str(uuid.uuid4()),
                "karat": dp["karat"],
                "purity_percentage": dp["purity"],
                "base_rate_per_gram": round(base_24k_rate * (dp["purity"] / 100), 2),
                "making_charge_per_gram": dp["making_charge"],
                "making_charge_percentage": 10.0,
                "wastage_percentage": dp["wastage"],
                "gst_percentage": 3.0,
                "effective_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "notes": "Auto-generated default pricing",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": None
            }
            await db.karat_pricing.insert_one(pricing_data)
            created.append(dp["karat"])
    
    return {"message": f"Default pricing initialized for: {', '.join(created) if created else 'All pricing already exists'}"}
