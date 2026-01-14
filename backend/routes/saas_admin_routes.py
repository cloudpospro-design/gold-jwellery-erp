from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import uuid
from typing import List, Optional
from models_saas import (
    BusinessCreate, BusinessResponse, BusinessUpdate, BusinessStatus,
    PlanCreate, PlanResponse, PlanUpdate, PlanInterval,
    SubscriptionCreate, SubscriptionResponse, SubscriptionUpdate, SubscriptionStatus,
    SaaSSystemSettings, SaaSSystemSettingsResponse, SaaSDashboardStats
)
from auth import get_current_user

router = APIRouter(prefix="/saas-admin", tags=["SaaS Admin"])

def get_db():
    from server import db
    return db

def require_superadmin(current_user: dict = Depends(get_current_user)):
    """Require superadmin role"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user

# ==================== DASHBOARD STATS ====================

@router.get("/dashboard", response_model=SaaSDashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get SaaS dashboard statistics"""
    
    # Business counts
    total_businesses = await db.saas_businesses.count_documents({})
    active_businesses = await db.saas_businesses.count_documents({"status": "active"})
    trial_businesses = await db.saas_businesses.count_documents({"status": "trial"})
    suspended_businesses = await db.saas_businesses.count_documents({"status": "suspended"})
    
    # Subscription counts
    total_subscriptions = await db.saas_subscriptions.count_documents({})
    active_subscriptions = await db.saas_subscriptions.count_documents({"status": "active"})
    
    # Plan counts
    total_plans = await db.saas_plans.count_documents({})
    active_plans = await db.saas_plans.count_documents({"is_active": True})
    
    # Revenue calculation
    revenue_pipeline = [
        {"$match": {"status": {"$in": ["active", "expired"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]
    total_revenue_result = await db.saas_subscriptions.aggregate(revenue_pipeline).to_list(1)
    total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
    
    # Monthly revenue (current month)
    current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_pipeline = [
        {"$match": {
            "created_at": {"$gte": current_month_start.isoformat()},
            "status": {"$in": ["active", "expired"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}}
    ]
    monthly_revenue_result = await db.saas_subscriptions.aggregate(monthly_pipeline).to_list(1)
    monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
    
    # Recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_signups = await db.saas_businesses.find(
        {"created_at": {"$gte": week_ago}},
        {"_id": 0, "id": 1, "name": 1, "owner_name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Expiring soon (next 7 days)
    next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    today = datetime.now(timezone.utc).isoformat()
    expiring_soon = await db.saas_subscriptions.find(
        {
            "status": "active",
            "end_date": {"$gte": today, "$lte": next_week}
        },
        {"_id": 0}
    ).limit(5).to_list(5)
    
    # Add business names to expiring subscriptions
    for sub in expiring_soon:
        business = await db.saas_businesses.find_one({"id": sub.get("business_id")}, {"_id": 0, "name": 1})
        sub["business_name"] = business.get("name", "Unknown") if business else "Unknown"
    
    # Revenue by plan
    revenue_by_plan_pipeline = [
        {"$match": {"status": {"$in": ["active", "expired"]}}},
        {"$group": {
            "_id": "$plan_id",
            "total_revenue": {"$sum": "$amount_paid"},
            "count": {"$sum": 1}
        }}
    ]
    revenue_by_plan_result = await db.saas_subscriptions.aggregate(revenue_by_plan_pipeline).to_list(10)
    
    revenue_by_plan = []
    for item in revenue_by_plan_result:
        plan = await db.saas_plans.find_one({"id": item["_id"]}, {"_id": 0, "name": 1})
        revenue_by_plan.append({
            "plan_id": item["_id"],
            "plan_name": plan.get("name", "Unknown") if plan else "Unknown",
            "total_revenue": item["total_revenue"],
            "subscribers": item["count"]
        })
    
    return SaaSDashboardStats(
        total_businesses=total_businesses,
        active_businesses=active_businesses,
        trial_businesses=trial_businesses,
        suspended_businesses=suspended_businesses,
        total_subscriptions=total_subscriptions,
        active_subscriptions=active_subscriptions,
        total_revenue=total_revenue,
        monthly_revenue=monthly_revenue,
        total_plans=total_plans,
        active_plans=active_plans,
        recent_signups=recent_signups,
        expiring_soon=expiring_soon,
        revenue_by_plan=revenue_by_plan
    )

# ==================== BUSINESS MANAGEMENT ====================

@router.get("/businesses", response_model=List[BusinessResponse])
async def get_all_businesses(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all registered businesses"""
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}},
            {"owner_email": {"$regex": search, "$options": "i"}}
        ]
    
    businesses = await db.saas_businesses.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with subscription and plan info
    for business in businesses:
        if business.get("plan_id"):
            plan = await db.saas_plans.find_one({"id": business["plan_id"]}, {"_id": 0, "name": 1})
            business["plan_name"] = plan.get("name") if plan else None
        
        subscription = await db.saas_subscriptions.find_one(
            {"business_id": business["id"], "status": "active"},
            {"_id": 0}
        )
        if subscription:
            business["subscription_id"] = subscription.get("id")
            business["subscription_status"] = subscription.get("status")
            business["subscription_end_date"] = subscription.get("end_date")
    
    return [BusinessResponse(**b) for b in businesses]

@router.get("/businesses/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: str,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific business"""
    business = await db.saas_businesses.find_one({"id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Enrich with subscription info
    if business.get("plan_id"):
        plan = await db.saas_plans.find_one({"id": business["plan_id"]}, {"_id": 0, "name": 1})
        business["plan_name"] = plan.get("name") if plan else None
    
    subscription = await db.saas_subscriptions.find_one(
        {"business_id": business_id, "status": "active"},
        {"_id": 0}
    )
    if subscription:
        business["subscription_id"] = subscription.get("id")
        business["subscription_status"] = subscription.get("status")
        business["subscription_end_date"] = subscription.get("end_date")
    
    return BusinessResponse(**business)

@router.post("/businesses", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    business: BusinessCreate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new business"""
    # Check if email already exists
    existing = await db.saas_businesses.find_one({"owner_email": business.owner_email})
    if existing:
        raise HTTPException(status_code=400, detail="Business with this email already exists")
    
    business_data = business.model_dump()
    business_data["id"] = str(uuid.uuid4())
    business_data["status"] = BusinessStatus.TRIAL.value
    business_data["total_users"] = 0
    business_data["total_products"] = 0
    business_data["total_sales"] = 0
    business_data["plan_name"] = None
    business_data["subscription_id"] = None
    business_data["subscription_status"] = None
    business_data["subscription_end_date"] = None
    business_data["created_at"] = datetime.now(timezone.utc).isoformat()
    business_data["updated_at"] = None
    
    await db.saas_businesses.insert_one(business_data)
    
    return BusinessResponse(**business_data)

@router.patch("/businesses/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: str,
    business_update: BusinessUpdate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a business"""
    existing = await db.saas_businesses.find_one({"id": business_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Business not found")
    
    update_data = {k: v for k, v in business_update.model_dump().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.saas_businesses.update_one({"id": business_id}, {"$set": update_data})
    
    updated = await db.saas_businesses.find_one({"id": business_id}, {"_id": 0})
    return BusinessResponse(**updated)

@router.delete("/businesses/{business_id}")
async def delete_business(
    business_id: str,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a business"""
    result = await db.saas_businesses.delete_one({"id": business_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Also delete related subscriptions
    await db.saas_subscriptions.delete_many({"business_id": business_id})
    
    return {"message": "Business deleted successfully"}

# ==================== PLAN MANAGEMENT ====================

@router.get("/plans", response_model=List[PlanResponse])
async def get_all_plans(
    active_only: bool = False,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all subscription plans"""
    query = {"is_active": True} if active_only else {}
    plans = await db.saas_plans.find(query, {"_id": 0}).sort("price", 1).to_list(20)
    
    # Add subscriber count
    for plan in plans:
        count = await db.saas_subscriptions.count_documents({"plan_id": plan["id"], "status": "active"})
        plan["total_subscribers"] = count
    
    return [PlanResponse(**p) for p in plans]

@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific plan"""
    plan = await db.saas_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    count = await db.saas_subscriptions.count_documents({"plan_id": plan_id, "status": "active"})
    plan["total_subscribers"] = count
    
    return PlanResponse(**plan)

@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan: PlanCreate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new subscription plan"""
    plan_data = plan.model_dump()
    plan_data["id"] = str(uuid.uuid4())
    plan_data["interval"] = plan.interval.value
    plan_data["total_subscribers"] = 0
    plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
    plan_data["updated_at"] = None
    
    await db.saas_plans.insert_one(plan_data)
    
    return PlanResponse(**plan_data)

@router.patch("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: str,
    plan_update: PlanUpdate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a plan"""
    existing = await db.saas_plans.find_one({"id": plan_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = {k: v for k, v in plan_update.model_dump().items() if v is not None}
    if "interval" in update_data:
        update_data["interval"] = update_data["interval"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.saas_plans.update_one({"id": plan_id}, {"$set": update_data})
    
    updated = await db.saas_plans.find_one({"id": plan_id}, {"_id": 0})
    count = await db.saas_subscriptions.count_documents({"plan_id": plan_id, "status": "active"})
    updated["total_subscribers"] = count
    
    return PlanResponse(**updated)

@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a plan (only if no active subscribers)"""
    # Check for active subscribers
    active_subs = await db.saas_subscriptions.count_documents({"plan_id": plan_id, "status": "active"})
    if active_subs > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete plan with {active_subs} active subscribers")
    
    result = await db.saas_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Plan deleted successfully"}

# ==================== SUBSCRIPTION MANAGEMENT ====================

@router.get("/subscriptions", response_model=List[SubscriptionResponse])
async def get_all_subscriptions(
    status: Optional[str] = None,
    business_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all subscriptions"""
    query = {}
    if status:
        query["status"] = status
    if business_id:
        query["business_id"] = business_id
    
    subscriptions = await db.saas_subscriptions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with business and plan names
    for sub in subscriptions:
        business = await db.saas_businesses.find_one({"id": sub.get("business_id")}, {"_id": 0, "name": 1})
        sub["business_name"] = business.get("name", "Unknown") if business else "Unknown"
        
        plan = await db.saas_plans.find_one({"id": sub.get("plan_id")}, {"_id": 0, "name": 1})
        sub["plan_name"] = plan.get("name", "Unknown") if plan else "Unknown"
    
    return [SubscriptionResponse(**s) for s in subscriptions]

@router.post("/subscriptions", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    subscription: SubscriptionCreate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new subscription"""
    # Verify business exists
    business = await db.saas_businesses.find_one({"id": subscription.business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Verify plan exists
    plan = await db.saas_plans.find_one({"id": subscription.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Deactivate existing active subscription
    await db.saas_subscriptions.update_many(
        {"business_id": subscription.business_id, "status": "active"},
        {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    sub_data = subscription.model_dump()
    sub_data["id"] = str(uuid.uuid4())
    sub_data["business_name"] = business.get("name", "Unknown")
    sub_data["plan_name"] = plan.get("name", "Unknown")
    sub_data["status"] = SubscriptionStatus.ACTIVE.value
    sub_data["auto_renew"] = False
    sub_data["created_at"] = datetime.now(timezone.utc).isoformat()
    sub_data["updated_at"] = None
    
    await db.saas_subscriptions.insert_one(sub_data)
    
    # Update business with plan info
    await db.saas_businesses.update_one(
        {"id": subscription.business_id},
        {"$set": {
            "plan_id": subscription.plan_id,
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return SubscriptionResponse(**sub_data)

@router.patch("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    subscription_update: SubscriptionUpdate,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a subscription"""
    existing = await db.saas_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    update_data = {k: v for k, v in subscription_update.model_dump().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.saas_subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
    
    updated = await db.saas_subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    
    # Get business and plan names
    business = await db.saas_businesses.find_one({"id": updated.get("business_id")}, {"_id": 0, "name": 1})
    updated["business_name"] = business.get("name", "Unknown") if business else "Unknown"
    
    plan = await db.saas_plans.find_one({"id": updated.get("plan_id")}, {"_id": 0, "name": 1})
    updated["plan_name"] = plan.get("name", "Unknown") if plan else "Unknown"
    
    return SubscriptionResponse(**updated)

# ==================== SYSTEM SETTINGS ====================

@router.get("/system-settings", response_model=SaaSSystemSettingsResponse)
async def get_system_settings(
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get SaaS system settings"""
    settings = await db.saas_system_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Create default settings
        default_settings = {
            "id": str(uuid.uuid4()),
            "platform_name": "Gilded Ledger",
            "platform_tagline": "Professional Gold Jewellery ERP",
            "support_email": "support@gildedledger.com",
            "support_phone": "+91 9876543210",
            "trial_days": 14,
            "default_plan_id": None,
            "maintenance_mode": False,
            "allow_registration": True,
            "smtp_configured": False,
            "payment_gateway_configured": False,
            "currency": "INR",
            "currency_symbol": "₹",
            "tax_rate": 18.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.saas_system_settings.insert_one(default_settings)
        return SaaSSystemSettingsResponse(**default_settings)
    
    return SaaSSystemSettingsResponse(**settings)

@router.patch("/system-settings", response_model=SaaSSystemSettingsResponse)
async def update_system_settings(
    settings_update: SaaSSystemSettings,
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update SaaS system settings"""
    existing = await db.saas_system_settings.find_one({}, {"_id": 0})
    
    update_data = settings_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        update_data["id"] = existing["id"]
        await db.saas_system_settings.update_one({}, {"$set": update_data})
    else:
        update_data["id"] = str(uuid.uuid4())
        await db.saas_system_settings.insert_one(update_data)
    
    result = await db.saas_system_settings.find_one({}, {"_id": 0})
    return SaaSSystemSettingsResponse(**result)

# ==================== INITIALIZE DEFAULT PLANS ====================

@router.post("/initialize-plans")
async def initialize_default_plans(
    current_user: dict = Depends(require_superadmin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Initialize default subscription plans"""
    existing_count = await db.saas_plans.count_documents({})
    if existing_count > 0:
        return {"message": f"{existing_count} plans already exist"}
    
    default_plans = [
        {
            "id": str(uuid.uuid4()),
            "name": "Starter",
            "description": "Perfect for small jewellery shops just getting started",
            "price": 999,
            "interval": "monthly",
            "max_users": 2,
            "max_products": 100,
            "max_sales_per_month": 200,
            "features": [
                "Basic Inventory Management",
                "Sales & Invoicing",
                "Customer Management",
                "Basic GST Reports",
                "Email Support"
            ],
            "is_popular": False,
            "is_active": True,
            "total_subscribers": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Professional",
            "description": "Ideal for growing jewellery businesses",
            "price": 2499,
            "interval": "monthly",
            "max_users": 5,
            "max_products": 500,
            "max_sales_per_month": 1000,
            "features": [
                "Everything in Starter",
                "Karigar Management",
                "Karat Pricing",
                "Advanced GST & E-Invoicing",
                "Barcode/QR Support",
                "Analytics Dashboard",
                "Priority Email Support"
            ],
            "is_popular": True,
            "is_active": True,
            "total_subscribers": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Enterprise",
            "description": "For large jewellery chains and enterprises",
            "price": 4999,
            "interval": "monthly",
            "max_users": 20,
            "max_products": 5000,
            "max_sales_per_month": 10000,
            "features": [
                "Everything in Professional",
                "Multi-branch Support",
                "WhatsApp Integration",
                "Custom Reports",
                "API Access",
                "Dedicated Account Manager",
                "24/7 Phone Support"
            ],
            "is_popular": False,
            "is_active": True,
            "total_subscribers": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Enterprise Yearly",
            "description": "Enterprise plan with 2 months free",
            "price": 49990,
            "interval": "yearly",
            "max_users": 20,
            "max_products": 5000,
            "max_sales_per_month": 10000,
            "features": [
                "Everything in Enterprise",
                "2 Months Free",
                "Annual Review Meeting",
                "Custom Training Sessions"
            ],
            "is_popular": False,
            "is_active": True,
            "total_subscribers": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
    ]
    
    await db.saas_plans.insert_many(default_plans)
    
    return {"message": f"Created {len(default_plans)} default plans", "plans": [p["name"] for p in default_plans]}
