from pydantic import BaseModel
from typing import List, Optional

class B2BInvoice(BaseModel):
    invoice_number: str
    invoice_date: str
    customer_name: str
    customer_gstin: str
    customer_state: str
    invoice_value: float
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    total_tax: float

class B2CInvoice(BaseModel):
    invoice_number: str
    invoice_date: str
    customer_state: str
    invoice_value: float
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    total_tax: float

class GSTR1Response(BaseModel):
    period_from: str
    period_to: str
    b2b_invoices: List[B2BInvoice]
    b2c_invoices: List[B2CInvoice]
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax: float
    total_invoice_value: float

class HSNSummaryItem(BaseModel):
    hsn_code: str
    description: str
    uqc: str = "NOS"  # Unit of Quantity Code
    total_quantity: int
    total_value: float
    taxable_value: float
    cgst: float
    sgst: float
    igst: float
    total_tax: float

class HSNSummaryResponse(BaseModel):
    period_from: str
    period_to: str
    items: List[HSNSummaryItem]
    total_taxable_value: float
    total_tax: float

class GSTR3BResponse(BaseModel):
    period_from: str
    period_to: str
    # Outward supplies
    outward_taxable_supplies: float
    outward_tax_amount: float
    outward_cgst: float
    outward_sgst: float
    outward_igst: float
    # Inward supplies (ITC)
    inward_taxable_supplies: float
    inward_tax_amount: float
    itc_cgst: float
    itc_sgst: float
    itc_igst: float
    # Net tax liability
    net_cgst: float
    net_sgst: float
    net_igst: float
    net_tax_payable: float

class ITCReconciliation(BaseModel):
    period_from: str
    period_to: str
    # Input Tax Credit Available
    itc_available_cgst: float
    itc_available_sgst: float
    itc_available_igst: float
    total_itc_available: float
    # Output Tax Liability
    output_cgst: float
    output_sgst: float
    output_igst: float
    total_output_tax: float
    # Net Position
    net_cgst: float
    net_sgst: float
    net_igst: float
    net_tax_payable: float
    # Purchase and Sales Summary
    total_purchases: float
    total_sales: float