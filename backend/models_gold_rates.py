from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class GoldPurity(str, Enum):
    K24 = "24K"
    K22 = "22K"
    K18 = "18K"
    K14 = "14K"

class GoldRateCreate(BaseModel):
    purity: GoldPurity
    rate_per_gram: float
    notes: Optional[str] = None

class GoldRateResponse(BaseModel):
    id: str
    date: str
    purity: GoldPurity
    rate_per_gram: float
    notes: Optional[str]
    is_active: bool
    created_at: str
    created_by: str

class CurrentGoldRates(BaseModel):
    date: str
    rates: List[GoldRateResponse]

class RateHistoryItem(BaseModel):
    date: str
    purity: GoldPurity
    rate_per_gram: float
    change_percentage: Optional[float] = None

class PriceUpdateSummary(BaseModel):
    products_updated: int
    products_failed: int
    total_products: int
    message: str