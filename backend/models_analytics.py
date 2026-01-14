from pydantic import BaseModel
from typing import List, Optional

class CustomerPurchaseHistory(BaseModel):
    invoice_number: str
    invoice_date: str
    total_amount: float
    items_count: int
    payment_method: str

class CustomerAnalytics(BaseModel):
    customer_id: str
    customer_name: str
    total_purchases: float
    total_orders: int
    average_order_value: float
    last_purchase_date: Optional[str]
    first_purchase_date: str
    purchase_history: List[CustomerPurchaseHistory]

class TopCustomer(BaseModel):
    customer_id: str
    customer_name: str
    phone: str
    total_spent: float
    total_orders: int
    average_order_value: float
    last_purchase: Optional[str]

class SalesTrend(BaseModel):
    date: str
    total_sales: float
    orders_count: int
    average_order_value: float

class ProductPerformance(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category: str
    quantity_sold: int
    revenue: float
    average_price: float

class DashboardSummary(BaseModel):
    # Sales metrics
    total_revenue: float
    total_orders: int
    average_order_value: float
    
    # Today's metrics
    today_revenue: float
    today_orders: int
    
    # This month
    month_revenue: float
    month_orders: int
    
    # Growth percentages
    revenue_growth: float
    orders_growth: float
    
    # Inventory
    total_products: int
    low_stock_products: int
    total_inventory_value: float
    
    # Customers
    total_customers: int
    active_customers: int  # Purchased in last 30 days
    
    # Top performers
    top_products: List[ProductPerformance]
    top_customers: List[TopCustomer]