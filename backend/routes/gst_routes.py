from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timezone
from collections import defaultdict
from models_gst import (
    GSTR1Response, B2BInvoice, B2CInvoice,
    HSNSummaryResponse, HSNSummaryItem,
    GSTR3BResponse, ITCReconciliation
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/gst-reports", tags=["GST Reports"])

def get_db():
    from server import db
    return db

@router.get("/gstr1", response_model=GSTR1Response)
async def generate_gstr1(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(check_permission('gst_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate GSTR-1 report for outward supplies"""
    
    # Fetch all sales in the date range
    sales = await db.sales.find({
        "created_at": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    b2b_invoices = []
    b2c_invoices = []
    total_taxable = 0
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    total_invoice_value = 0
    
    for sale in sales:
        customer = await db.customers.find_one({"id": sale["customer_id"]}, {"_id": 0})
        if not customer:
            continue
        
        taxable_value = sale["subtotal"]
        total_taxable += taxable_value
        total_invoice_value += sale["grand_total"]
        
        gst_breakdown = sale["gst_breakdown"]
        total_cgst += gst_breakdown["cgst"]
        total_sgst += gst_breakdown["sgst"]
        total_igst += gst_breakdown["igst"]
        
        if customer.get("gstin"):
            # B2B Invoice
            b2b_invoices.append(B2BInvoice(
                invoice_number=sale["invoice_number"],
                invoice_date=sale["created_at"][:10],
                customer_name=customer["name"],
                customer_gstin=customer["gstin"],
                customer_state=customer["state"],
                invoice_value=sale["grand_total"],
                taxable_value=taxable_value,
                cgst=gst_breakdown["cgst"],
                sgst=gst_breakdown["sgst"],
                igst=gst_breakdown["igst"],
                total_tax=gst_breakdown["total_tax"]
            ))
        else:
            # B2C Invoice
            b2c_invoices.append(B2CInvoice(
                invoice_number=sale["invoice_number"],
                invoice_date=sale["created_at"][:10],
                customer_state=customer["state"],
                invoice_value=sale["grand_total"],
                taxable_value=taxable_value,
                cgst=gst_breakdown["cgst"],
                sgst=gst_breakdown["sgst"],
                igst=gst_breakdown["igst"],
                total_tax=gst_breakdown["total_tax"]
            ))
    
    return GSTR1Response(
        period_from=from_date,
        period_to=to_date,
        b2b_invoices=b2b_invoices,
        b2c_invoices=b2c_invoices,
        total_taxable_value=round(total_taxable, 2),
        total_cgst=round(total_cgst, 2),
        total_sgst=round(total_sgst, 2),
        total_igst=round(total_igst, 2),
        total_tax=round(total_cgst + total_sgst + total_igst, 2),
        total_invoice_value=round(total_invoice_value, 2)
    )

@router.get("/hsn-summary", response_model=HSNSummaryResponse)
async def generate_hsn_summary(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(check_permission('gst_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate HSN-wise summary of outward supplies"""
    
    sales = await db.sales.find({
        "created_at": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    # Aggregate by HSN code
    hsn_data = defaultdict(lambda: {
        "quantity": 0,
        "total_value": 0,
        "taxable_value": 0,
        "cgst": 0,
        "sgst": 0,
        "igst": 0,
        "description": ""
    })
    
    for sale in sales:
        for item in sale["items"]:
            hsn = item["hsn_code"]
            hsn_data[hsn]["quantity"] += item["quantity"]
            hsn_data[hsn]["total_value"] += item["total_after_tax"]
            hsn_data[hsn]["taxable_value"] += item["total_before_tax"]
            
            # Proportional GST distribution
            gst_breakdown = sale["gst_breakdown"]
            item_proportion = item["total_before_tax"] / sale["subtotal"] if sale["subtotal"] > 0 else 0
            hsn_data[hsn]["cgst"] += gst_breakdown["cgst"] * item_proportion
            hsn_data[hsn]["sgst"] += gst_breakdown["sgst"] * item_proportion
            hsn_data[hsn]["igst"] += gst_breakdown["igst"] * item_proportion
            
            if not hsn_data[hsn]["description"]:
                hsn_data[hsn]["description"] = item["product_name"]
    
    items = []
    total_taxable = 0
    total_tax = 0
    
    for hsn_code, data in hsn_data.items():
        tax_amount = data["cgst"] + data["sgst"] + data["igst"]
        total_taxable += data["taxable_value"]
        total_tax += tax_amount
        
        items.append(HSNSummaryItem(
            hsn_code=hsn_code,
            description=data["description"],
            total_quantity=data["quantity"],
            total_value=round(data["total_value"], 2),
            taxable_value=round(data["taxable_value"], 2),
            cgst=round(data["cgst"], 2),
            sgst=round(data["sgst"], 2),
            igst=round(data["igst"], 2),
            total_tax=round(tax_amount, 2)
        ))
    
    return HSNSummaryResponse(
        period_from=from_date,
        period_to=to_date,
        items=items,
        total_taxable_value=round(total_taxable, 2),
        total_tax=round(total_tax, 2)
    )

@router.get("/gstr3b", response_model=GSTR3BResponse)
async def generate_gstr3b(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(check_permission('gst_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate GSTR-3B monthly summary return"""
    
    # Outward supplies (Sales)
    sales = await db.sales.find({
        "created_at": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    outward_taxable = 0
    outward_cgst = 0
    outward_sgst = 0
    outward_igst = 0
    
    for sale in sales:
        outward_taxable += sale["subtotal"]
        outward_cgst += sale["gst_breakdown"]["cgst"]
        outward_sgst += sale["gst_breakdown"]["sgst"]
        outward_igst += sale["gst_breakdown"]["igst"]
    
    # Inward supplies (Purchases) - ITC Available
    purchases = await db.purchase_orders.find({
        "order_date": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "received"
    }, {"_id": 0}).to_list(10000)
    
    inward_taxable = 0
    itc_cgst = 0
    itc_sgst = 0
    itc_igst = 0
    
    for purchase in purchases:
        inward_taxable += purchase["subtotal"]
        # Assuming equal split for ITC (similar to sales logic)
        total_gst = purchase["gst_total"]
        supplier = await db.suppliers.find_one({"id": purchase["supplier_id"]}, {"_id": 0})
        
        if supplier and supplier["state"].lower() == "maharashtra":
            # Intra-state: CGST + SGST
            itc_cgst += total_gst / 2
            itc_sgst += total_gst / 2
        else:
            # Inter-state: IGST
            itc_igst += total_gst
    
    # Calculate net tax liability
    net_cgst = max(0, outward_cgst - itc_cgst)
    net_sgst = max(0, outward_sgst - itc_sgst)
    net_igst = max(0, outward_igst - itc_igst)
    net_tax_payable = net_cgst + net_sgst + net_igst
    
    return GSTR3BResponse(
        period_from=from_date,
        period_to=to_date,
        outward_taxable_supplies=round(outward_taxable, 2),
        outward_tax_amount=round(outward_cgst + outward_sgst + outward_igst, 2),
        outward_cgst=round(outward_cgst, 2),
        outward_sgst=round(outward_sgst, 2),
        outward_igst=round(outward_igst, 2),
        inward_taxable_supplies=round(inward_taxable, 2),
        inward_tax_amount=round(itc_cgst + itc_sgst + itc_igst, 2),
        itc_cgst=round(itc_cgst, 2),
        itc_sgst=round(itc_sgst, 2),
        itc_igst=round(itc_igst, 2),
        net_cgst=round(net_cgst, 2),
        net_sgst=round(net_sgst, 2),
        net_igst=round(net_igst, 2),
        net_tax_payable=round(net_tax_payable, 2)
    )

@router.get("/itc-reconciliation", response_model=ITCReconciliation)
async def get_itc_reconciliation(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(check_permission('gst_all')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get Input Tax Credit reconciliation"""
    
    # Get GSTR-3B data which already has the calculations
    gstr3b_data = await generate_gstr3b(from_date, to_date, current_user, db)
    
    # Get totals
    sales = await db.sales.find({
        "created_at": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "completed"
    }, {"_id": 0}).to_list(10000)
    
    purchases = await db.purchase_orders.find({
        "order_date": {
            "$gte": from_date,
            "$lte": to_date + "T23:59:59"
        },
        "status": "received"
    }, {"_id": 0}).to_list(10000)
    
    total_sales = sum(s["grand_total"] for s in sales)
    total_purchases = sum(p["grand_total"] for p in purchases)
    
    return ITCReconciliation(
        period_from=from_date,
        period_to=to_date,
        itc_available_cgst=gstr3b_data.itc_cgst,
        itc_available_sgst=gstr3b_data.itc_sgst,
        itc_available_igst=gstr3b_data.itc_igst,
        total_itc_available=gstr3b_data.inward_tax_amount,
        output_cgst=gstr3b_data.outward_cgst,
        output_sgst=gstr3b_data.outward_sgst,
        output_igst=gstr3b_data.outward_igst,
        total_output_tax=gstr3b_data.outward_tax_amount,
        net_cgst=gstr3b_data.net_cgst,
        net_sgst=gstr3b_data.net_sgst,
        net_igst=gstr3b_data.net_igst,
        net_tax_payable=gstr3b_data.net_tax_payable,
        total_purchases=round(total_purchases, 2),
        total_sales=round(total_sales, 2)
    )