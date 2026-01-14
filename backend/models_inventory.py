from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class GoldPurity(str, Enum):
    K24 = "24K"
    K22 = "22K"
    K18 = "18K"
    K14 = "14K"

class ProductCategory(str, Enum):
    RING = "ring"
    NECKLACE = "necklace"
    BANGLE = "bangle"
    EARRING = "earring"
    BRACELET = "bracelet"
    PENDANT = "pendant"
    CHAIN = "chain"
    MANGALSUTRA = "mangalsutra"
    NOSERING = "nosering"
    ANKLET = "anklet"

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hsn_code: str = "71131900"

class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    hsn_code: str
    product_count: int = 0
    created_at: str

class ProductCreate(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    category: str
    gold_weight: float  # in grams
    purity: GoldPurity
    making_charges: float  # in rupees
    stone_weight: Optional[float] = 0  # in carats
    stone_charges: Optional[float] = 0  # in rupees
    hallmark_number: Optional[str] = None
    hsn_code: str = "71131900"
    base_price: float  # gold price + making + stone
    gst_rate: float = 3.0  # percentage
    quantity: int = 0
    low_stock_threshold: int = 5
    images: Optional[List[str]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    gold_weight: Optional[float] = None
    purity: Optional[GoldPurity] = None
    making_charges: Optional[float] = None
    stone_weight: Optional[float] = None
    stone_charges: Optional[float] = None
    hallmark_number: Optional[str] = None
    hsn_code: Optional[str] = None
    base_price: Optional[float] = None
    gst_rate: Optional[float] = None
    quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    images: Optional[List[str]] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    sku: str
    description: Optional[str]
    category: str
    gold_weight: float
    purity: GoldPurity
    making_charges: float
    stone_weight: float
    stone_charges: float
    hallmark_number: Optional[str]
    hsn_code: str
    base_price: float
    gst_rate: float
    selling_price: float  # base_price + GST
    quantity: int
    low_stock_threshold: int
    is_low_stock: bool
    images: List[str]
    created_at: str
    updated_at: str

class StockUpdate(BaseModel):
    quantity_change: int  # positive for adding, negative for reducing
    reason: str = "Manual adjustment"