# Gold Jewellery ERP - Product Requirements Document

## Original Problem Statement
Build a SaaS application for a Gold Jewellery ERP (Enterprise Resource Planning) system, specifically designed for the Indian market with GST (Goods and Services Tax) compliance.

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React.js with Tailwind CSS & Shadcn/UI
- **Database**: MongoDB

## Core Requirements

### Phase 1: Authentication & User Management ✅
- JWT-based authentication
- User registration and login
- Role-based access (SuperAdmin, Admin, Manager, Sales, etc.)
- User management UI

### Phase 2: Inventory Management ✅
- Product CRUD operations
- Category management
- Stock tracking
- Gold purity tracking

### Phase 3: Sales & Invoicing ✅
- POS interface
- Invoice generation
- Customer selection during sale
- GST calculation

### Phase 4: Purchase & Suppliers ✅
- Supplier management
- Purchase order creation
- Stock updates from purchases

### Phase 5: GST Compliance ✅
- GSTR-1 report generation
- GSTR-3B report generation
- Tax calculation

### Phase 6: Live Gold Rate Management ✅
- Daily gold rate entry
- Historical rate tracking
- Multiple purity support (24K, 22K, 18K)

### Phase 7: Analytics & Reporting ✅
- Sales analytics dashboard
- Revenue tracking
- Inventory insights

### Phase 8: Notifications & Alerts ✅
- In-app notification system
- Low stock alerts
- System notifications

### Phase 9: Settings & Configuration ✅
- Business settings (Company name, address, GSTIN, PAN)
- System settings (GST rates, currency, date formats)
- Backup & Export functionality

### Phase 10: Advanced Features ✅ (Completed: Jan 14, 2026)
- **Karigar Management**: Artisan/goldsmith management with job tracking
- **Karat Pricing**: Configurable pricing by gold purity with price calculator
- **Advanced GST**: E-invoicing, GSTR-2A/2B reconciliation
- **Barcode/QR Code**: Generate and scan product barcodes
- **WhatsApp Integration**: Send invoices and notifications (MOCKED - requires WhatsApp Business API setup)

## Implementation Status

### Completed Features
| Feature | Status | Date |
|---------|--------|------|
| Authentication | ✅ | Phase 1 |
| User Management | ✅ | Phase 1 |
| Inventory Management | ✅ | Phase 2 |
| Sales/POS | ✅ | Phase 3 |
| Purchase Management | ✅ | Phase 4 |
| Supplier Management | ✅ | Phase 4 |
| GST Reports | ✅ | Phase 5 |
| Gold Rates | ✅ | Phase 6 |
| Analytics Dashboard | ✅ | Phase 7 |
| Notifications | ✅ | Phase 8 |
| Customer Management | ✅ | Phase 8 |
| Settings & Configuration | ✅ | Jan 14, 2026 |
| Karigar Management | ✅ | Jan 14, 2026 |
| Karat Pricing | ✅ | Jan 14, 2026 |
| Advanced GST | ✅ | Jan 14, 2026 |
| Barcode/QR Code | ✅ | Jan 14, 2026 |
| WhatsApp Integration | ✅ (MOCKED) | Jan 14, 2026 |

## User Roles & Credentials

### SuperAdmin
- **Email**: superadmin@gilded.com
- **Password**: SuperAdmin@123
- **Permissions**: Full access to all features

### Admin
- **Email**: admin@gilded.com
- **Password**: admin123
- **Permissions**: All features except superadmin-specific

## API Endpoints Reference

### Core APIs
- Auth: `/api/auth/token`, `/api/auth/register`
- Users: `/api/users/`
- Inventory: `/api/inventory/products`, `/api/inventory/categories`
- Sales: `/api/sales/`
- Purchases: `/api/purchases/`
- Suppliers: `/api/suppliers/`
- Customers: `/api/customers/`
- GST: `/api/gst/gstr1`, `/api/gst/gstr3b`
- Gold Rates: `/api/gold-rates/`
- Analytics: `/api/analytics/`
- Notifications: `/api/notifications/`
- Settings: `/api/settings/business`, `/api/settings/system`

### Advanced APIs
- Karigar: `/api/karigar/`, `/api/karigar/jobs`
- Karat Pricing: `/api/karat-pricing/`, `/api/karat-pricing/calculate`
- Advanced GST: `/api/advanced-gst/e-invoices`, `/api/advanced-gst/reconciliation/{period}`
- Barcode: `/api/barcode/`, `/api/barcode/generate`, `/api/barcode/scan`
- WhatsApp: `/api/whatsapp/send`, `/api/whatsapp/templates`, `/api/whatsapp/config`

## Known Issues
1. **Role-based permissions not fully enforced** - Backend has `check_permission` function but not applied to all routes
2. **WhatsApp integration is MOCKED** - Requires WhatsApp Business API setup for actual message sending

## Prioritized Backlog

### P0 (Critical)
- Full end-to-end testing of all modules
- Enforce roles & permissions on all backend APIs

### P1 (High Priority)
- Actual WhatsApp Business API integration (currently simulated)
- Multi-branch support
- Mobile app

### P2 (Medium Priority)
- Email integration for notifications
- PDF export for reports
- Advanced reporting with charts

### P3 (Low Priority)
- Multi-language support
- Dark mode theme
