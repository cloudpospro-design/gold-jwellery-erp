from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
from typing import List, Optional
from models_karigar import (
    KarigarCreate, KarigarResponse, KarigarUpdate,
    KarigarJobCreate, KarigarJobResponse, KarigarJobUpdate,
    KarigarStatus, JobStatus
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/karigar", tags=["Karigar Management"])

def get_db():
    from server import db
    return db

# ==================== KARIGAR CRUD ====================

@router.get("/", response_model=List[KarigarResponse])
async def get_all_karigars(
    status: Optional[str] = None,
    specialization: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all karigars with optional filtering"""
    query = {}
    if status:
        query["status"] = status
    if specialization:
        query["specialization"] = specialization
    
    karigars = await db.karigars.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    return [KarigarResponse(**k) for k in karigars]

@router.get("/{karigar_id}", response_model=KarigarResponse)
async def get_karigar(
    karigar_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific karigar by ID"""
    karigar = await db.karigars.find_one({"id": karigar_id}, {"_id": 0})
    if not karigar:
        raise HTTPException(status_code=404, detail="Karigar not found")
    return KarigarResponse(**karigar)

@router.post("/", response_model=KarigarResponse, status_code=status.HTTP_201_CREATED)
async def create_karigar(
    karigar: KarigarCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new karigar"""
    # Check if phone already exists
    existing = await db.karigars.find_one({"phone": karigar.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Karigar with this phone already exists")
    
    karigar_data = karigar.model_dump()
    karigar_data["id"] = str(uuid.uuid4())
    karigar_data["specialization"] = karigar.specialization.value
    karigar_data["status"] = karigar.status.value
    karigar_data["total_jobs"] = 0
    karigar_data["total_earnings"] = 0.0
    karigar_data["created_at"] = datetime.now(timezone.utc).isoformat()
    karigar_data["updated_at"] = None
    
    await db.karigars.insert_one(karigar_data)
    
    return KarigarResponse(**karigar_data)

@router.patch("/{karigar_id}", response_model=KarigarResponse)
async def update_karigar(
    karigar_id: str,
    karigar_update: KarigarUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a karigar"""
    existing = await db.karigars.find_one({"id": karigar_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Karigar not found")
    
    update_data = {k: v for k, v in karigar_update.model_dump().items() if v is not None}
    if "specialization" in update_data:
        update_data["specialization"] = update_data["specialization"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.karigars.update_one({"id": karigar_id}, {"$set": update_data})
    
    updated = await db.karigars.find_one({"id": karigar_id}, {"_id": 0})
    return KarigarResponse(**updated)

@router.delete("/{karigar_id}")
async def delete_karigar(
    karigar_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a karigar"""
    result = await db.karigars.delete_one({"id": karigar_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Karigar not found")
    return {"message": "Karigar deleted successfully"}

# ==================== KARIGAR JOBS ====================

@router.get("/jobs/all", response_model=List[KarigarJobResponse])
async def get_all_jobs(
    status: Optional[str] = None,
    karigar_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all karigar jobs"""
    query = {}
    if status:
        query["status"] = status
    if karigar_id:
        query["karigar_id"] = karigar_id
    
    jobs = await db.karigar_jobs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [KarigarJobResponse(**j) for j in jobs]

@router.get("/jobs/{job_id}", response_model=KarigarJobResponse)
async def get_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific job by ID"""
    job = await db.karigar_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return KarigarJobResponse(**job)

@router.post("/jobs", response_model=KarigarJobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: KarigarJobCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new karigar job/work order"""
    # Verify karigar exists
    karigar = await db.karigars.find_one({"id": job.karigar_id}, {"_id": 0})
    if not karigar:
        raise HTTPException(status_code=404, detail="Karigar not found")
    
    # Generate job number
    count = await db.karigar_jobs.count_documents({})
    job_number = f"JOB-{str(count + 1).zfill(6)}"
    
    job_data = job.model_dump()
    job_data["id"] = str(uuid.uuid4())
    job_data["job_number"] = job_number
    job_data["karigar_name"] = karigar["name"]
    job_data["status"] = JobStatus.PENDING.value
    job_data["actual_weight_return"] = None
    job_data["weight_loss"] = None
    job_data["actual_completion_date"] = None
    job_data["total_making_charge"] = None
    job_data["balance_due"] = None
    job_data["created_at"] = datetime.now(timezone.utc).isoformat()
    job_data["updated_at"] = None
    
    await db.karigar_jobs.insert_one(job_data)
    
    # Update karigar's total jobs
    await db.karigars.update_one(
        {"id": job.karigar_id},
        {"$inc": {"total_jobs": 1}}
    )
    
    return KarigarJobResponse(**job_data)

@router.patch("/jobs/{job_id}", response_model=KarigarJobResponse)
async def update_job(
    job_id: str,
    job_update: KarigarJobUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a karigar job"""
    existing = await db.karigar_jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = {k: v for k, v in job_update.model_dump().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    # Calculate weight loss and making charge if actual weight is provided
    if "actual_weight_return" in update_data:
        weight_issued = existing["gold_weight_issued"]
        actual_return = update_data["actual_weight_return"]
        update_data["weight_loss"] = round(weight_issued - actual_return, 3)
        
        # Calculate making charge
        if existing["making_charge_type"] == "per_gram":
            update_data["total_making_charge"] = round(actual_return * existing["making_charge_rate"], 2)
        elif existing["making_charge_type"] == "fixed":
            update_data["total_making_charge"] = existing["making_charge_rate"]
        
        # Calculate balance due
        if update_data.get("total_making_charge"):
            update_data["balance_due"] = round(update_data["total_making_charge"] - existing["advance_paid"], 2)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.karigar_jobs.update_one({"id": job_id}, {"$set": update_data})
    
    # If job completed, update karigar earnings
    if update_data.get("status") == "completed" and update_data.get("total_making_charge"):
        await db.karigars.update_one(
            {"id": existing["karigar_id"]},
            {"$inc": {"total_earnings": update_data["total_making_charge"]}}
        )
    
    updated = await db.karigar_jobs.find_one({"id": job_id}, {"_id": 0})
    return KarigarJobResponse(**updated)

@router.get("/{karigar_id}/summary")
async def get_karigar_summary(
    karigar_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get karigar performance summary"""
    karigar = await db.karigars.find_one({"id": karigar_id}, {"_id": 0})
    if not karigar:
        raise HTTPException(status_code=404, detail="Karigar not found")
    
    # Get job statistics
    total_jobs = await db.karigar_jobs.count_documents({"karigar_id": karigar_id})
    completed_jobs = await db.karigar_jobs.count_documents({"karigar_id": karigar_id, "status": "completed"})
    pending_jobs = await db.karigar_jobs.count_documents({"karigar_id": karigar_id, "status": {"$in": ["pending", "in_progress"]}})
    
    # Calculate total weight processed
    pipeline = [
        {"$match": {"karigar_id": karigar_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total_gold_issued": {"$sum": "$gold_weight_issued"},
            "total_gold_returned": {"$sum": "$actual_weight_return"},
            "total_weight_loss": {"$sum": "$weight_loss"},
            "total_earnings": {"$sum": "$total_making_charge"}
        }}
    ]
    
    stats = await db.karigar_jobs.aggregate(pipeline).to_list(length=1)
    stats = stats[0] if stats else {
        "total_gold_issued": 0,
        "total_gold_returned": 0,
        "total_weight_loss": 0,
        "total_earnings": 0
    }
    
    return {
        "karigar": karigar,
        "statistics": {
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "pending_jobs": pending_jobs,
            "total_gold_issued": round(stats.get("total_gold_issued", 0), 3),
            "total_gold_returned": round(stats.get("total_gold_returned", 0), 3),
            "total_weight_loss": round(stats.get("total_weight_loss", 0), 3),
            "average_weight_loss_percentage": round((stats.get("total_weight_loss", 0) / max(stats.get("total_gold_issued", 1), 1)) * 100, 2),
            "total_earnings": round(stats.get("total_earnings", 0), 2)
        }
    }
