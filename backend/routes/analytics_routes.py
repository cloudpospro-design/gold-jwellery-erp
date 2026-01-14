from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from models_analytics import (
    CustomerAnalytics, CustomerPurchaseHistory, TopCustomer,
    SalesTrend, ProductPerformance, DashboardSummary
)
from auth import get_current_user, check_permission

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def get_db():
    from server import db
    return db

@router.get("/customers/{customer_id}", response_model=CustomerAnalytics)
async def get_customer_analytics(
    customer_id: str,
    current_user: dict = Depends(check_permission('customer_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed analytics for a specific customer"""
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Get all purchases
    sales = await db.sales.find(
        {"customer_id": customer_id, "status": "completed"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    purchase_history = [
        CustomerPurchaseHistory(
            invoice_number=sale["invoice_number"],
            invoice_date=sale["created_at"][:10],
            total_amount=sale["grand_total"],
            items_count=len(sale["items"]),
            payment_method=sale["payment_method"]
        )
        for sale in sales
    ]
    
    total_spent = sum(sale["grand_total"] for sale in sales)
    total_orders = len(sales)
    avg_order = total_spent / total_orders if total_orders > 0 else 0
    
    return CustomerAnalytics(
        customer_id=customer_id,
        customer_name=customer["name"],
        total_purchases=round(total_spent, 2),
        total_orders=total_orders,
        average_order_value=round(avg_order, 2),
        last_purchase_date=sales[0]["created_at"][:10] if sales else None,
        first_purchase_date=sales[-1]["created_at"][:10] if sales else customer["created_at"][:10],
        purchase_history=purchase_history
    )

@router.get("/customers/top", response_model=List[TopCustomer])
async def get_top_customers(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(check_permission('customer_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get top customers by total spend"""
    
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    
    customer_stats = []
    for customer in customers:
        sales = await db.sales.find(
            {"customer_id": customer["id"], "status": "completed"},
            {"_id": 0}
        ).to_list(1000)
        
        if not sales:
            continue
        
        total_spent = sum(sale["grand_total"] for sale in sales)
        total_orders = len(sales)
        
        customer_stats.append(TopCustomer(
            customer_id=customer["id"],
            customer_name=customer["name"],
            phone=customer["phone"],
            total_spent=round(total_spent, 2),
            total_orders=total_orders,
            average_order_value=round(total_spent / total_orders, 2),
            last_purchase=sales[0]["created_at"][:10] if sales else None
        ))
    
    # Sort by total spent
    customer_stats.sort(key=lambda x: x.total_spent, reverse=True)
    
    return customer_stats[:limit]

@router.get("/sales/trends", response_model=List[SalesTrend])
async def get_sales_trends(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(check_permission('sales_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get sales trends over time"""
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    
    sales = await db.sales.find(
        {
            "created_at": {"$gte": from_date},
            "status": "completed"
        },
        {"_id": 0}
    ).to_list(10000)
    
    # Aggregate by date
    daily_stats = defaultdict(lambda: {"total": 0, "count": 0})
    
    for sale in sales:
        date = sale["created_at"][:10]
        daily_stats[date]["total"] += sale["grand_total"]
        daily_stats[date]["count"] += 1
    
    trends = []
    for date, stats in sorted(daily_stats.items()):
        avg_order = stats["total"] / stats["count"] if stats["count"] > 0 else 0
        trends.append(SalesTrend(
            date=date,
            total_sales=round(stats["total"], 2),
            orders_count=stats["count"],
            average_order_value=round(avg_order, 2)
        ))
    
    return trends

@router.get("/products/performance", response_model=List[ProductPerformance])
async def get_product_performance(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(check_permission('inventory_read')),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get top performing products by revenue"""
    
    sales = await db.sales.find(
        {"status": "completed"},
        {"_id": 0}
    ).to_list(10000)
    
    product_stats = defaultdict(lambda: {
        "name": "",
        "sku": "",
        "category": "",
        "quantity": 0,
        "revenue": 0,
        "total_price": 0
    })
    
    for sale in sales:
        for item in sale["items"]:
            pid = item["product_id"]
            product_stats[pid]["name"] = item["product_name"]
            product_stats[pid]["sku"] = item["sku"]
            product_stats[pid]["quantity"] += item["quantity"]
            product_stats[pid]["revenue"] += item["total_after_tax"]
            product_stats[pid]["total_price"] += item["total_after_tax"]
    
    # Get category info from products
    products = await db.products.find({}, {"_id": 0, "id": 1, "category": 1}).to_list(10000)
    product_categories = {p["id"]: p["category"] for p in products}
    
    performance = []
    for pid, stats in product_stats.items():
        if stats["quantity"] > 0:
            avg_price = stats["total_price"] / stats["quantity"]
            performance.append(ProductPerformance(
                product_id=pid,
                product_name=stats["name"],
                sku=stats["sku"],
                category=product_categories.get(pid, "Unknown"),
                quantity_sold=stats["quantity"],
                revenue=round(stats["revenue"], 2),
                average_price=round(avg_price, 2)
            ))
    
    # Sort by revenue
    performance.sort(key=lambda x: x.revenue, reverse=True)
    
    return performance[:limit]

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get overall analytics dashboard summary"""
    
    # Get all sales
    all_sales = await db.sales.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(s["grand_total"] for s in all_sales)
    total_orders = len(all_sales)
    avg_order = total_revenue / total_orders if total_orders > 0 else 0
    
    # Today's stats
    today = datetime.now(timezone.utc).date().isoformat()
    today_sales = [s for s in all_sales if s["created_at"][:10] == today]
    today_revenue = sum(s["grand_total"] for s in today_sales)
    today_orders = len(today_sales)
    
    # This month
    month_start = datetime.now(timezone.utc).replace(day=1).date().isoformat()
    month_sales = [s for s in all_sales if s["created_at"][:10] >= month_start]
    month_revenue = sum(s["grand_total"] for s in month_sales)
    month_orders = len(month_sales)
    
    # Last month for growth calculation
    last_month_start = (datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)).replace(day=1).date().isoformat()
    last_month_end = (datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)).date().isoformat()
    last_month_sales = [s for s in all_sales if last_month_start <= s["created_at"][:10] <= last_month_end]
    last_month_revenue = sum(s["grand_total"] for s in last_month_sales)
    last_month_orders = len(last_month_sales)
    
    revenue_growth = ((month_revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue > 0 else 0
    orders_growth = ((month_orders - last_month_orders) / last_month_orders * 100) if last_month_orders > 0 else 0
    
    # Inventory stats
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    total_products = len(products)
    low_stock_products = len([p for p in products if p.get("is_low_stock", False)])
    total_inventory_value = sum(p["base_price"] * p["quantity"] for p in products)
    
    # Customer stats
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    total_customers = len(customers)
    
    # Active customers (purchased in last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    active_customers = len(set(s["customer_id"] for s in all_sales if s["created_at"][:10] >= thirty_days_ago))
    
    # Get top performers
    top_products = await get_product_performance(5, current_user, db)
    top_customers = await get_top_customers(5, current_user, db)
    
    return DashboardSummary(
        total_revenue=round(total_revenue, 2),
        total_orders=total_orders,
        average_order_value=round(avg_order, 2),
        today_revenue=round(today_revenue, 2),
        today_orders=today_orders,
        month_revenue=round(month_revenue, 2),
        month_orders=month_orders,
        revenue_growth=round(revenue_growth, 2),
        orders_growth=round(orders_growth, 2),
        total_products=total_products,
        low_stock_products=low_stock_products,
        total_inventory_value=round(total_inventory_value, 2),
        total_customers=total_customers,
        active_customers=active_customers,
        top_products=top_products,
        top_customers=top_customers
    )