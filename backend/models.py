from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    SALES = "sales"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.SALES

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    permissions: List[str]
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PermissionUpdate(BaseModel):
    permissions: List[str]

# Role permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: ['all'],
    UserRole.MANAGER: ['users_read', 'inventory_all', 'sales_all', 'purchase_all', 'customer_all', 'reports_read'],
    UserRole.ACCOUNTANT: ['inventory_read', 'sales_read', 'purchase_read', 'customer_read', 'reports_all', 'gst_all'],
    UserRole.SALES: ['inventory_read', 'sales_all', 'customer_all']
}