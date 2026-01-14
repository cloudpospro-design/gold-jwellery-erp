from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class KarigarStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"

class KarigarSpecialization(str, Enum):
    GOLD = "gold"
    SILVER = "silver"
    DIAMOND = "diamond"
    KUNDAN = "kundan"
    MEENAKARI = "meenakari"
    ANTIQUE = "antique"
    TEMPLE = "temple"
    ALL = "all"

class KarigarCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    specialization: KarigarSpecialization = KarigarSpecialization.GOLD
    experience_years: int = 0
    daily_rate: float = 0.0
    per_gram_rate: float = 0.0
    commission_percentage: float = 0.0
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    status: KarigarStatus = KarigarStatus.ACTIVE
    notes: Optional[str] = None

class KarigarResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    specialization: str
    experience_years: int
    daily_rate: float
    per_gram_rate: float
    commission_percentage: float
    aadhar_number: Optional[str]
    pan_number: Optional[str]
    bank_account: Optional[str]
    ifsc_code: Optional[str]
    status: str
    notes: Optional[str]
    total_jobs: int = 0
    total_earnings: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

class KarigarUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    specialization: Optional[KarigarSpecialization] = None
    experience_years: Optional[int] = None
    daily_rate: Optional[float] = None
    per_gram_rate: Optional[float] = None
    commission_percentage: Optional[float] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    status: Optional[KarigarStatus] = None
    notes: Optional[str] = None

# Karigar Job/Work Order Models
class JobStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class KarigarJobCreate(BaseModel):
    karigar_id: str
    job_description: str
    product_type: str
    gold_purity: str = "22K"
    gold_weight_issued: float  # in grams
    expected_weight_return: float  # in grams
    stone_weight: float = 0.0
    expected_completion_date: str
    making_charge_type: str = "per_gram"  # per_gram, fixed, percentage
    making_charge_rate: float = 0.0
    advance_paid: float = 0.0
    notes: Optional[str] = None

class KarigarJobResponse(BaseModel):
    id: str
    job_number: str
    karigar_id: str
    karigar_name: str
    job_description: str
    product_type: str
    gold_purity: str
    gold_weight_issued: float
    expected_weight_return: float
    actual_weight_return: Optional[float] = None
    weight_loss: Optional[float] = None
    stone_weight: float
    expected_completion_date: str
    actual_completion_date: Optional[str] = None
    making_charge_type: str
    making_charge_rate: float
    total_making_charge: Optional[float] = None
    advance_paid: float
    balance_due: Optional[float] = None
    status: str
    notes: Optional[str]
    created_at: str
    updated_at: Optional[str] = None

class KarigarJobUpdate(BaseModel):
    job_description: Optional[str] = None
    expected_completion_date: Optional[str] = None
    actual_weight_return: Optional[float] = None
    actual_completion_date: Optional[str] = None
    status: Optional[JobStatus] = None
    notes: Optional[str] = None
