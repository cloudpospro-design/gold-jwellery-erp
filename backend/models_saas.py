from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# ==================== BUSINESS/TENANT MODELS ====================

class BusinessStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"

class BusinessCreate(BaseModel):
    name: str
    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    plan_id: Optional[str] = None

class BusinessResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    owner_email: str
    owner_phone: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    gstin: Optional[str]
    pan: Optional[str]
    status: str
    plan_id: Optional[str]
    plan_name: Optional[str]
    subscription_id: Optional[str]
    subscription_status: Optional[str]
    subscription_end_date: Optional[str]
    total_users: int = 0
    total_products: int = 0
    total_sales: int = 0
    created_at: str
    updated_at: Optional[str]

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    status: Optional[BusinessStatus] = None

# ==================== SUBSCRIPTION PLAN MODELS ====================

class PlanInterval(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"

class PlanCreate(BaseModel):
    name: str
    description: str
    price: float
    interval: PlanInterval = PlanInterval.MONTHLY
    max_users: int = 5
    max_products: int = 100
    max_sales_per_month: int = 500
    features: List[str] = []
    is_popular: bool = False
    is_active: bool = True

class PlanResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    interval: str
    max_users: int
    max_products: int
    max_sales_per_month: int
    features: List[str]
    is_popular: bool
    is_active: bool
    total_subscribers: int = 0
    created_at: str
    updated_at: Optional[str]

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    interval: Optional[PlanInterval] = None
    max_users: Optional[int] = None
    max_products: Optional[int] = None
    max_sales_per_month: Optional[int] = None
    features: Optional[List[str]] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None

# ==================== SUBSCRIPTION MODELS ====================

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"
    TRIAL = "trial"

class SubscriptionCreate(BaseModel):
    business_id: str
    plan_id: str
    start_date: str
    end_date: str
    amount_paid: float = 0.0
    payment_method: str = "manual"
    notes: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    business_id: str
    business_name: str
    plan_id: str
    plan_name: str
    status: str
    start_date: str
    end_date: str
    amount_paid: float
    payment_method: str
    auto_renew: bool = False
    notes: Optional[str]
    created_at: str
    updated_at: Optional[str]

class SubscriptionUpdate(BaseModel):
    status: Optional[SubscriptionStatus] = None
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = None
    notes: Optional[str] = None

# ==================== SYSTEM SETTINGS MODELS ====================

class SaaSSystemSettings(BaseModel):
    platform_name: str = "Gilded Ledger"
    platform_tagline: str = "Professional Gold Jewellery ERP"
    support_email: str = "support@gildedledger.com"
    support_phone: str = "+91 9876543210"
    trial_days: int = 14
    default_plan_id: Optional[str] = None
    maintenance_mode: bool = False
    allow_registration: bool = True
    smtp_configured: bool = False
    payment_gateway_configured: bool = False
    currency: str = "INR"
    currency_symbol: str = "₹"
    tax_rate: float = 18.0

class SaaSSystemSettingsResponse(BaseModel):
    id: str
    platform_name: str
    platform_tagline: str
    support_email: str
    support_phone: str
    trial_days: int
    default_plan_id: Optional[str]
    maintenance_mode: bool
    allow_registration: bool
    smtp_configured: bool
    payment_gateway_configured: bool
    currency: str
    currency_symbol: str
    tax_rate: float
    updated_at: str

# ==================== DASHBOARD STATS ====================

class SaaSDashboardStats(BaseModel):
    total_businesses: int
    active_businesses: int
    trial_businesses: int
    suspended_businesses: int
    total_subscriptions: int
    active_subscriptions: int
    total_revenue: float
    monthly_revenue: float
    total_plans: int
    active_plans: int
    recent_signups: List[Dict]
    expiring_soon: List[Dict]
    revenue_by_plan: List[Dict]
