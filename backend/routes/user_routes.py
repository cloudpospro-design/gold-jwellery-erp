from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
from models import UserResponse, UserRole, PermissionUpdate, ROLE_PERMISSIONS
from auth import get_current_user, check_permission

router = APIRouter(prefix="/users", tags=["Users"])

def get_db():
    from server import db
    return db

@router.get("", response_model=List[UserResponse])
async def get_all_users(
    current_user: dict = Depends(check_permission('users_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    return [
        UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=UserRole(user["role"]),
            is_active=user.get("is_active", True),
            permissions=user.get("permissions", []),
            created_at=user["created_at"]
        )
        for user in users
    ]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(check_permission('users_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
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
        is_active=user.get("is_active", True),
        permissions=user.get("permissions", []),
        created_at=user["created_at"]
    )

@router.patch("/{user_id}/permissions", response_model=UserResponse)
async def update_user_permissions(
    user_id: str,
    permission_update: PermissionUpdate,
    current_user: dict = Depends(check_permission('users_write')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "permissions": permission_update.permissions,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user.get("is_active", True),
        permissions=user.get("permissions", []),
        created_at=user["created_at"]
    )

@router.patch("/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: str,
    current_user: dict = Depends(check_permission('users_write')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    new_status = not user.get("is_active", True)
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_active": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user.get("is_active", True),
        permissions=user.get("permissions", []),
        created_at=user["created_at"]
    )