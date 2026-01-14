from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
from models import UserCreate, UserLogin, TokenResponse, UserResponse, UserRole, ROLE_PERMISSIONS
from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_db():
    from server import db
    return db

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Get default permissions for role
    permissions = ROLE_PERMISSIONS.get(user_data.role, [])
    
    # Create user document
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role.value,
        "is_active": True,
        "permissions": permissions,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    token_data = {
        "sub": user_id,
        "email": user_data.email,
        "role": user_data.role.value,
        "permissions": permissions
    }
    access_token = create_access_token(token_data)
    
    # Prepare response
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True,
        permissions=permissions,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Create access token
    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "permissions": user.get("permissions", [])
    }
    access_token = create_access_token(token_data)
    
    # Prepare response
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        permissions=user.get("permissions", []),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        permissions=user.get("permissions", []),
        created_at=user["created_at"]
    )