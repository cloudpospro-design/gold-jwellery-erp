from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid
from typing import List, Optional
import json
from models_advanced import (
    EInvoiceCreate, EInvoiceResponse, EInvoiceStatus,
    GSTR2ARecord, GSTR2BRecord, GSTReconciliationReport
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/advanced-gst", tags=["Advanced GST"])

def get_db():
    from server import db
    return db

# ==================== E-INVOICING ====================

@router.get("/e-invoices", response_model=List[EInvoiceResponse])
async def get_e_invoices(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all e-invoices"""
    query = {}
    if status:
        query["status"] = status
    
    invoices = await db.e_invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [EInvoiceResponse(**inv) for inv in invoices]

@router.post("/e-invoices/generate/{sale_id}", response_model=EInvoiceResponse)
async def generate_e_invoice(
    sale_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate e-invoice for a sale"""
    # Get sale details
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Check if e-invoice already exists
    existing = await db.e_invoices.find_one({"sale_id": sale_id})
    if existing:
        raise HTTPException(status_code=400, detail="E-invoice already generated for this sale")
    
    # In production, this would call the GST e-invoice API
    # For now, we'll simulate the response
    irn = f"IRN{uuid.uuid4().hex[:32].upper()}"
    ack_number = str(uuid.uuid4().int)[:12]
    
    e_invoice_data = {
        "id": str(uuid.uuid4()),
        "sale_id": sale_id,
        "invoice_number": sale.get("invoice_number", ""),
        "irn": irn,
        "ack_number": ack_number,
        "ack_date": datetime.now(timezone.utc).isoformat(),
        "signed_invoice": f"SIGNED_{sale_id}",  # Would be actual signed data
        "signed_qr_code": f"QR_{irn}",  # Would be actual QR code
        "status": EInvoiceStatus.GENERATED.value,
        "error_message": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.e_invoices.insert_one(e_invoice_data)
    
    # Update sale with e-invoice reference
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": {"e_invoice_id": e_invoice_data["id"], "irn": irn}}
    )
    
    return EInvoiceResponse(**e_invoice_data)

@router.post("/e-invoices/cancel/{e_invoice_id}")
async def cancel_e_invoice(
    e_invoice_id: str,
    reason: str = Query(..., min_length=10),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Cancel an e-invoice"""
    e_invoice = await db.e_invoices.find_one({"id": e_invoice_id}, {"_id": 0})
    if not e_invoice:
        raise HTTPException(status_code=404, detail="E-invoice not found")
    
    if e_invoice["status"] == EInvoiceStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="E-invoice already cancelled")
    
    # In production, this would call the GST cancellation API
    await db.e_invoices.update_one(
        {"id": e_invoice_id},
        {"$set": {
            "status": EInvoiceStatus.CANCELLED.value,
            "cancellation_reason": reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "E-invoice cancelled successfully", "irn": e_invoice["irn"]}

# ==================== GSTR-2A/2B RECONCILIATION ====================

@router.post("/gstr2a/import")
async def import_gstr2a(
    file: UploadFile = File(...),
    filing_period: str = Query(..., regex=r"^\d{2}\d{4}$"),  # MMYYYY format
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Import GSTR-2A data from JSON file"""
    try:
        content = await file.read()
        data = json.loads(content)
        
        records_imported = 0
        for record in data.get("b2b", []):
            for invoice in record.get("inv", []):
                gstr2a_record = {
                    "id": str(uuid.uuid4()),
                    "supplier_gstin": record.get("ctin", ""),
                    "supplier_name": record.get("cfs", "Unknown"),
                    "invoice_number": invoice.get("inum", ""),
                    "invoice_date": invoice.get("idt", ""),
                    "invoice_value": invoice.get("val", 0),
                    "taxable_value": sum(item.get("txval", 0) for item in invoice.get("itms", [])),
                    "cgst": sum(item.get("camt", 0) for item in invoice.get("itms", [])),
                    "sgst": sum(item.get("samt", 0) for item in invoice.get("itms", [])),
                    "igst": sum(item.get("iamt", 0) for item in invoice.get("itms", [])),
                    "cess": sum(item.get("csamt", 0) for item in invoice.get("itms", [])),
                    "place_of_supply": invoice.get("pos", ""),
                    "reverse_charge": invoice.get("rchrg", "N") == "Y",
                    "invoice_type": "B2B",
                    "filing_period": filing_period,
                    "matched": False,
                    "matched_with_purchase_id": None,
                    "discrepancy_amount": None,
                    "discrepancy_reason": None,
                    "imported_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.gstr2a_records.insert_one(gstr2a_record)
                records_imported += 1
        
        return {"message": f"Successfully imported {records_imported} GSTR-2A records", "filing_period": filing_period}
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gstr2b/import")
async def import_gstr2b(
    file: UploadFile = File(...),
    filing_period: str = Query(..., regex=r"^\d{2}\d{4}$"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Import GSTR-2B data from JSON file"""
    try:
        content = await file.read()
        data = json.loads(content)
        
        records_imported = 0
        for record in data.get("docdata", {}).get("b2b", []):
            for invoice in record.get("inv", []):
                gstr2b_record = {
                    "id": str(uuid.uuid4()),
                    "supplier_gstin": record.get("ctin", ""),
                    "supplier_name": record.get("trdnm", "Unknown"),
                    "invoice_number": invoice.get("inum", ""),
                    "invoice_date": invoice.get("dt", ""),
                    "invoice_value": invoice.get("val", 0),
                    "taxable_value": sum(item.get("txval", 0) for item in invoice.get("items", [])),
                    "itc_available": sum(item.get("itcavl", {}).get("samt", 0) + item.get("itcavl", {}).get("camt", 0) for item in invoice.get("items", [])),
                    "cgst": sum(item.get("camt", 0) for item in invoice.get("items", [])),
                    "sgst": sum(item.get("samt", 0) for item in invoice.get("items", [])),
                    "igst": sum(item.get("iamt", 0) for item in invoice.get("items", [])),
                    "filing_period": filing_period,
                    "itc_eligibility": "eligible",
                    "action_taken": None,
                    "imported_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.gstr2b_records.insert_one(gstr2b_record)
                records_imported += 1
        
        return {"message": f"Successfully imported {records_imported} GSTR-2B records", "filing_period": filing_period}
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reconciliation/{filing_period}", response_model=GSTReconciliationReport)
async def get_reconciliation_report(
    filing_period: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get GSTR-2A/2B reconciliation report for a filing period"""
    # Get GSTR-2A records
    gstr2a_records = await db.gstr2a_records.find(
        {"filing_period": filing_period}, {"_id": 0}
    ).to_list(length=1000)
    
    # Get GSTR-2B records
    gstr2b_records = await db.gstr2b_records.find(
        {"filing_period": filing_period}, {"_id": 0}
    ).to_list(length=1000)
    
    # Get purchase records for the period (convert MMYYYY to date range)
    month = int(filing_period[:2])
    year = int(filing_period[2:])
    
    purchases = await db.purchase_orders.find({}, {"_id": 0}).to_list(length=1000)
    
    # Calculate totals
    total_gstr2a_value = sum(r.get("invoice_value", 0) for r in gstr2a_records)
    total_purchase_value = sum(p.get("total_amount", 0) for p in purchases)
    
    # Find discrepancies
    discrepancies = []
    matched_count = 0
    
    for gstr2a in gstr2a_records:
        # Try to match with purchases
        matched = False
        for purchase in purchases:
            if (purchase.get("supplier_gstin") == gstr2a.get("supplier_gstin") and
                abs(purchase.get("total_amount", 0) - gstr2a.get("invoice_value", 0)) < 1):
                matched = True
                matched_count += 1
                break
        
        if not matched:
            discrepancies.append({
                "type": "unmatched_gstr2a",
                "supplier_gstin": gstr2a.get("supplier_gstin"),
                "invoice_number": gstr2a.get("invoice_number"),
                "amount": gstr2a.get("invoice_value"),
                "reason": "No matching purchase found"
            })
    
    # Calculate ITC
    itc_claimable = sum(r.get("itc_available", 0) for r in gstr2b_records)
    
    return GSTReconciliationReport(
        filing_period=filing_period,
        total_gstr2a_records=len(gstr2a_records),
        total_gstr2b_records=len(gstr2b_records),
        total_purchase_records=len(purchases),
        matched_records=matched_count,
        unmatched_records=len(gstr2a_records) - matched_count,
        total_gstr2a_value=total_gstr2a_value,
        total_purchase_value=total_purchase_value,
        variance_amount=abs(total_gstr2a_value - total_purchase_value),
        itc_claimable=itc_claimable,
        itc_not_claimable=total_gstr2a_value - itc_claimable,
        discrepancies=discrepancies[:20]  # Limit to 20 discrepancies
    )

@router.get("/gstr2a/{filing_period}")
async def get_gstr2a_records(
    filing_period: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get GSTR-2A records for a filing period"""
    records = await db.gstr2a_records.find(
        {"filing_period": filing_period}, {"_id": 0}
    ).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.gstr2a_records.count_documents({"filing_period": filing_period})
    
    return {"records": records, "total": total, "filing_period": filing_period}

@router.get("/gstr2b/{filing_period}")
async def get_gstr2b_records(
    filing_period: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get GSTR-2B records for a filing period"""
    records = await db.gstr2b_records.find(
        {"filing_period": filing_period}, {"_id": 0}
    ).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.gstr2b_records.count_documents({"filing_period": filing_period})
    
    return {"records": records, "total": total, "filing_period": filing_period}
