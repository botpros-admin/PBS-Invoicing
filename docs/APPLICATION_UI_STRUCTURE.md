# PBS Invoicing Web Application - Complete UI Structure Documentation

## Table of Contents
- [Overview](#overview)
- [Public Pages](#public-pages)
- [Authenticated Pages](#authenticated-pages)
  - [Dashboard](#dashboard)
  - [Invoices](#invoices)
  - [Payments](#payments)
  - [Labs](#labs)
  - [Reports](#reports)
  - [Import Data](#import-data)
  - [Settings](#settings)
  - [Profile](#profile)
- [Navigation Structure](#navigation-structure)
- [User Roles & Access](#user-roles--access)
- [Common UI Patterns](#common-ui-patterns)
- [Technical Architecture](#technical-architecture)

---

## Overview

PBS Invoicing is a comprehensive billing and invoice management system designed for medical laboratories and healthcare providers. The application features a modern React-based frontend with role-based access control, real-time data updates, and extensive customization options.

### Key Technologies
- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Context API, React Query
- **UI Framework**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security

---

## Public Pages

### 1. Landing Page (`/`)
**Purpose**: Marketing and welcome page for unauthenticated users

**Components**:
- Hero section with product branding
- Feature highlights with icons
- Benefits section
- Call-to-action buttons (Sign Up, Login)
- Footer with links and contact information

**Features**:
- Responsive design
- Animated sections on scroll
- Quick demo video embed
- Testimonials carousel
- Pricing preview

---

### 2. Login Page (`/login`)
**Purpose**: User authentication portal

**Form Fields**:
- Email address (with validation)
- Password (with show/hide toggle)
- Remember me checkbox
- Organization code (optional)

**Features**:
- Form validation with error messages
- Loading state during authentication
- Redirect to dashboard after successful login
- "Forgot Password?" link
- "New User? Sign Up" link
- Social login options (future)

**Security**:
- Rate limiting on failed attempts
- CAPTCHA after multiple failures
- Session management

---

### 3. Reset Password (`/reset-password`)
**Purpose**: Initiate password recovery process

**Components**:
- Email input field
- Submit button
- Success message display
- Return to login link

**Process Flow**:
1. User enters registered email
2. System sends reset link via email
3. Confirmation message displayed
4. Email contains secure token link

---

### 4. Password Reset Handler (`/auth/reset`)
**Purpose**: Handle password reset token from email link

**Form Fields**:
- New password (with strength meter)
- Confirm password
- Submit button

**Features**:
- Token validation
- Password strength requirements display
- Real-time password match validation
- Success redirect to login
- Token expiry handling

---

### 5. Update Password (`/update-password`)
**Purpose**: Force password update for first-time login or expired passwords

**Components**:
- Current password field
- New password field with requirements
- Confirm new password
- Password strength indicator
- Submit button

**Use Cases**:
- First-time user login
- Password expiry (90-day policy)
- Admin-forced reset
- Security breach response

---

### 6. Pay Invoice (`/pay/:invoiceId`)
**Purpose**: Public portal for clients to pay invoices

**Sections**:
- **Invoice Details Display**:
  - Invoice number and date
  - Billing organization info
  - Client information
  - Service line items
  - Subtotal, taxes, total
  
- **Payment Form**:
  - Payment amount (full or partial)
  - Payment method selection:
    - Credit/Debit card
    - ACH bank transfer
    - Check by mail instructions
  - Billing information
  - Email for receipt

- **Security Features**:
  - SSL encryption badge
  - PCI compliance notice
  - Fraud detection
  - Payment verification

**Post-Payment**:
- Receipt generation
- Email confirmation
- PDF download option
- Transaction reference number

---

## Authenticated Pages

### Dashboard

#### Route: `/dashboard`
**Purpose**: Main analytics and overview hub for authenticated users

#### Header Section
- **Date Range Selector**:
  - Preset options: Today, 7 days, 30 days, 90 days, Custom
  - Custom date picker with calendar
  - Apply button to refresh data

- **Action Buttons**:
  - Refresh All Data (with loading spinner)
  - Add Widget (opens modal)
  - Export Dashboard (PDF/Image)
  - Settings (dashboard preferences)

#### Dynamic Widget System

**Widget Management**:
- Drag-and-drop repositioning using @dnd-kit
- Resize handles for adjustable dimensions
- Edit button (gear icon) for configuration
- Delete button (X) with confirmation
- Widget collapse/expand toggle

**Widget Size Options**:
- **Small**: 1 column × 1 row (200px min height)
- **Medium**: 2 columns × 2 rows (400px min height)
- **Large**: 4 columns × 2 rows (400px min height)

**Available Widget Types**:

1. **Stat Cards**:
   - Total Invoices (count + trend)
   - Total Revenue (amount + percentage change)
   - Outstanding Balance (amount + aging)
   - Average Days to Payment (days + trend)
   - Collection Rate (percentage + change)
   - Active Clients (count + new this month)

2. **Aging Analysis Chart**:
   - Bar chart with buckets: Current, 30, 60, 90, 120+ days
   - Interactive hover for details
   - Click to drill down to invoice list
   - Export as CSV option

3. **Status Distribution**:
   - Pie chart: Draft, Sent, Paid, Overdue, Cancelled
   - Donut chart alternative view
   - Legend with counts and percentages
   - Click segments for filtered view

4. **Top Clients Widget**:
   - Ranked list by revenue
   - Client name, total revenue, invoice count
   - Sparkline for trend
   - Quick actions: View, Email, Create Invoice

5. **Volume Metrics**:
   - Line graph: Daily/Weekly/Monthly processing
   - Comparison with previous period
   - Peak/valley indicators
   - Forecast projection

6. **Lab Performance Metrics**:
   - Multi-line chart for lab comparisons
   - Samples processed per lab
   - Turnaround time metrics
   - Quality indicators

7. **Recent Activity Feed**:
   - Timeline of recent actions
   - User avatars and timestamps
   - Action descriptions with links
   - Filter by action type

8. **Quick Actions Grid**:
   - Create New Invoice
   - Record Payment
   - Generate Report
   - Import Data
   - View All Invoices
   - Manage Clients

**Widget Configuration Modal**:
- Widget title customization
- Data source selection
- Refresh interval (1, 5, 15, 30 minutes)
- Display options (chart type, colors)
- Filter criteria
- Alert thresholds

**Dashboard Persistence**:
- Layout saved per user
- Widget preferences stored
- Default dashboard templates
- Share dashboard configuration
- Reset to default option

---

### Invoices

#### Main Invoice List (`/invoices`)
**Purpose**: Central hub for invoice management

**Search & Filter Bar**:
- Global search (invoice #, client, amount)
- Advanced filters:
  - Date range picker
  - Client multi-select dropdown
  - Status checkboxes
  - Amount range slider
  - Lab/clinic selection
  - Service type filter
- Save filter presets
- Clear all filters button

**Bulk Actions Bar** (appears with selection):
- Select all checkbox
- Actions dropdown:
  - Export selected (PDF/CSV/Excel)
  - Mark as paid
  - Mark as sent
  - Delete (with confirmation)
  - Email invoices
  - Print batch

**Invoice Table**:
| Column | Features | Width |
|--------|----------|-------|
| Checkbox | Bulk selection | 40px |
| Invoice # | Clickable link, copy button | 120px |
| Date | Sortable, format: MM/DD/YYYY | 100px |
| Client | Searchable, with subtitle | 200px |
| Amount | Right-aligned, currency format | 120px |
| Status | Color-coded badge | 100px |
| Due Date | Highlight if overdue | 100px |
| Actions | Dropdown menu | 80px |

**Status Badges**:
- 🟦 **Draft**: Blue badge
- 🟨 **Sent**: Yellow badge
- 🟩 **Paid**: Green badge
- 🟥 **Overdue**: Red badge with days count
- ⬜ **Cancelled**: Gray badge

**Row Actions Dropdown**:
- View details
- Edit (if draft)
- Duplicate
- Send email
- Record payment
- Download PDF
- View history
- Delete

**Pagination Controls**:
- Items per page selector (10, 25, 50, 100)
- Page number navigation
- Jump to page input
- Total records display

**Quick Stats Bar** (top of page):
- Total invoices count
- Total value
- Paid this month
- Outstanding amount
- Average days to payment

---

#### Create Invoice (`/invoices/create`)
**Purpose**: New invoice generation interface

**Form Sections**:

1. **Client Selection**:
   - Searchable dropdown with recent clients
   - "Add New Client" quick button
   - Client details display upon selection
   - Billing address override option

2. **Invoice Details**:
   - Invoice number (auto-generated or manual)
   - Invoice date picker
   - Due date calculator (based on terms)
   - Payment terms dropdown
   - PO number field
   - Reference field

3. **Service Lines Section**:
   - **Add Line Item**:
     - Service/product dropdown
     - CPT code lookup with autocomplete
     - Description field
     - Quantity input
     - Rate field
     - Line total (auto-calculated)
   - **Line Actions**:
     - Duplicate line
     - Delete line
     - Reorder (drag handle)
   - **Bulk Actions**:
     - Import from template
     - Import from previous invoice
     - Clear all lines

4. **Calculations Section**:
   - Subtotal (auto-calculated)
   - Discount (percentage or fixed)
   - Tax rate selector with calculation
   - Shipping/handling fees
   - **Total** (highlighted)

5. **Additional Information**:
   - Notes (visible on invoice)
   - Internal notes (not printed)
   - Terms & conditions (template or custom)
   - Attachments upload

6. **Actions Bar** (sticky bottom):
   - Save as Draft
   - Save and Send
   - Save and Print
   - Preview (opens modal)
   - Cancel (with unsaved changes warning)

**Preview Modal**:
- Full invoice preview
- Print preview mode
- Download as PDF
- Email preview
- Edit button to return

---

#### Invoice Detail (`/invoices/:id`)
**Purpose**: View and manage individual invoice

**Header Section**:
- Invoice number (large)
- Status badge with timestamp
- Client name and contact
- Quick actions toolbar

**Quick Actions Toolbar**:
- Edit (if draft)
- Duplicate
- Send/Resend email
- Record payment
- Print
- Download PDF
- More options dropdown

**Main Content Tabs**:

1. **Invoice Tab**:
   - Full invoice display
   - Service line items table
   - Calculations breakdown
   - Notes and terms
   - Signature block (if applicable)

2. **Payments Tab**:
   - Payment history table
   - Record new payment form
   - Payment method details
   - Transaction references
   - Refund processing

3. **Activity Tab**:
   - Timeline of all actions
   - Status changes
   - Email sends with opens/clicks
   - Payment attempts
   - User actions with timestamps

4. **Communications Tab**:
   - Email history
   - Email templates used
   - Open/click tracking
   - Bounce/complaint handling
   - Resend options

5. **Documents Tab**:
   - Related documents
   - Upload new documents
   - Supporting documentation
   - Signed agreements
   - Download all as ZIP

**Sidebar Information**:
- Invoice summary box
- Key dates
- Outstanding balance
- Payment status
- Related invoices
- Client quick info
- Contact options

---

### Payments

#### Route: `/payments`
**Purpose**: Comprehensive payment tracking and management

**Dashboard Cards** (top row):
- Total Collected (month)
- Pending Payments
- Average Payment Time
- Payment Success Rate

**Main Sections**:

1. **Payment List View**:
   - **Filters**:
     - Date range
     - Payment method
     - Status (completed, pending, failed)
     - Client selector
     - Amount range
   
   - **Payment Table**:
     - Payment ID/Reference
     - Date received
     - Client name
     - Invoice number(s)
     - Amount
     - Method (Check, ACH, Card, Wire)
     - Status
     - Actions

2. **Record Payment Modal**:
   - **Payment Information**:
     - Payment date
     - Amount received
     - Payment method dropdown
     - Reference/check number
     - Processing fee (if applicable)
   
   - **Apply to Invoices**:
     - List of open invoices
     - Auto-apply option
     - Manual allocation
     - Partial payment handling
     - Overpayment credit

3. **Payment Methods Section**:
   - Configure accepted methods
   - Payment gateway settings
   - Fee structures
   - Processing times
   - Bank account details

4. **Reconciliation Tools**:
   - Import bank statements
   - Auto-match algorithm
   - Manual matching interface
   - Discrepancy reports
   - Approval workflow

**Payment Actions**:
- Void payment
- Issue refund
- Send receipt
- Add note
- View audit trail

---

### Labs

#### Route: `/labs`
**Purpose**: Laboratory management and billing interface

**Summary Cards Row**:
- **Total Labs**: Count with active/inactive breakdown
- **Active Labs**: Green count with percentage
- **Total Revenue**: Sum across all labs
- **Avg Daily Volume**: Samples per day average

**Lab Management Table**:

**Table Columns**:
1. **Lab Info**:
   - Lab name (bold)
   - Lab code (gray subtitle)
   - Contact person with icon

2. **Location**:
   - City, State
   - Phone number
   - Full address on hover

3. **Performance**:
   - Total invoices count
   - Average daily volume with trend
   - Processing type badge

4. **Revenue**:
   - Total revenue (formatted)
   - Overdue amount (red if > 0)
   - Collection rate percentage

5. **Status**:
   - Active (green badge)
   - Inactive (gray badge)
   - Suspended (red badge)
   - Last activity date

6. **Actions**:
   - Edit button
   - Delete button (with confirmation)
   - View details link

**Add/Edit Lab Modal**:

**Basic Information**:
- Lab name (required)
- Lab code (unique identifier)
- Status dropdown

**Location Details**:
- Street address
- City
- State (dropdown)
- ZIP code
- Country

**Contact Information**:
- Primary contact person
- Phone number
- Email address
- Fax number
- Alternative contact

**Operational Details**:
- Processing type (Standard/PGX/Both)
- Daily volume target
- Turnaround time target
- Operating hours

**Compliance Information**:
- Medicare provider number
- CLIA number
- License number
- Certification dates
- Insurance information

**Billing Configuration**:
- Billing address (if different)
- Payment terms
- Preferred payment method
- Tax ID
- Special rates

**Lab Features**:
- Search functionality
- Sort by any column
- Export lab list
- Bulk import labs
- Performance analytics
- Integration status

---

### Reports

#### Route: `/reports`
**Purpose**: Comprehensive analytics and reporting center

**Report Categories**:

1. **Financial Reports**:
   - **Revenue Report**:
     - Gross revenue by period
     - Revenue by client
     - Revenue by service type
     - Growth trends
     - Forecasting
   
   - **Aging Analysis**:
     - Detailed aging buckets
     - Client-specific aging
     - Historical aging trends
     - Collection predictions
   
   - **Cash Flow Report**:
     - Inflows and outflows
     - Payment timing analysis
     - Cash position forecast
     - Working capital metrics

2. **Operational Reports**:
   - **Lab Performance**:
     - Volume by lab
     - Turnaround times
     - Error rates
     - Capacity utilization
   
   - **Service Analysis**:
     - Most used services
     - Service profitability
     - CPT code usage
     - Pricing analysis

3. **Client Reports**:
   - **Client Summary**:
     - Client list with metrics
     - Revenue per client
     - Payment behavior
     - Credit risk assessment
   
   - **Client Statements**:
     - Detailed transaction history
     - Account balance
     - Aging summary
     - Payment history

4. **Compliance Reports**:
   - **Audit Trail**:
     - User actions log
     - System changes
     - Data modifications
     - Access logs
   
   - **Regulatory Reports**:
     - Medicare compliance
     - HIPAA audit reports
     - Financial compliance
     - Tax reports

**Report Builder Interface**:
- Drag-and-drop field selector
- Filter criteria builder
- Grouping options
- Sorting preferences
- Calculation fields
- Chart type selector

**Report Actions**:
- **Export Options**:
  - PDF (formatted)
  - Excel (with formulas)
  - CSV (raw data)
  - Email delivery
  
- **Scheduling**:
  - Frequency (daily, weekly, monthly)
  - Recipients list
  - Delivery time
  - Format preferences

- **Sharing**:
  - Share link generation
  - Permission settings
  - Expiry date
  - Password protection

**Report Templates**:
- Pre-built templates library
- Custom template creation
- Template sharing
- Version control
- Template categories

---

### Import Data

#### Route: `/import`
**Purpose**: Bulk data import and migration interface

**Import Wizard Steps**:

1. **Select Import Type**:
   - Invoices
   - Clients
   - Payments
   - Lab results
   - CPT codes
   - Historical data

2. **Upload File**:
   - Drag-and-drop zone
   - File type validation (CSV, XLSX, XLS)
   - File size limit display
   - Sample template downloads
   - Multiple file support

3. **Column Mapping**:
   - Auto-detection AI
   - Manual mapping interface
   - Required fields indicator
   - Data type validation
   - Preview first 10 rows
   - Save mapping template

4. **Data Validation**:
   - Validation rules display
   - Error summary:
     - Critical errors (must fix)
     - Warnings (should review)
     - Info (suggestions)
   - Row-by-row error details
   - Quick fix suggestions
   - Bulk fix actions

5. **Review & Confirm**:
   - Summary statistics
   - Records to import
   - Records to skip
   - Duplicate handling options
   - Rollback capability
   - Test import option

6. **Import Progress**:
   - Real-time progress bar
   - Records processed counter
   - Error log display
   - Pause/resume capability
   - Cancel with rollback

**Import History**:
- Past imports table
- Import status
- Records imported
- User who imported
- Download original file
- Revert import option

**Import Templates**:
- Save mapping templates
- Share with team
- Template versioning
- Default templates

---

### Settings

#### Route: `/settings/*`
**Purpose**: System configuration and administration hub

#### 1. Organization Hierarchy (`/settings/`)
**Purpose**: Manage organizational structure

**Hierarchy Tree View**:
- Parent organization at root
- Departments as branches
- Teams as sub-branches
- Drag-and-drop reorganization
- Expand/collapse nodes

**Organization Details Panel**:
- Organization name
- Type (Company, Department, Team)
- Parent organization
- Child count
- User count
- Created date
- Status

**Actions**:
- Add child organization
- Edit organization details
- Move organization
- Merge organizations
- Delete (with impact warning)

---

#### 2. Clients & Clinics (`/settings/clinics`)
**Purpose**: Client and clinic management

**Client List View**:
- Search and filter bar
- Client table with:
  - Client name
  - Type (Lab, Clinic, Hospital)
  - Contact person
  - Location
  - Status
  - Last activity

**Client Details Form**:
- **Basic Information**:
  - Client name
  - Client code
  - Type selection
  - Tax ID
  - Website

- **Contact Information**:
  - Primary contact
  - Phone numbers
  - Email addresses
  - Billing contact
  - Technical contact

- **Billing Configuration**:
  - Payment terms
  - Credit limit
  - Pricing tier
  - Discount rules
  - Tax exemptions

- **Integration Settings**:
  - API credentials
  - Webhook URLs
  - Data format preferences
  - Sync schedule

---

#### 3. User Assignments (`/settings/users`)
**Purpose**: User-to-organization mapping and access control

**User Management Table**:
- User name with avatar
- Email address
- Role
- Organization assignment
- Department
- Status (Active, Inactive, Locked)
- Last login
- Actions

**Bulk Actions**:
- Assign to organization
- Change role
- Activate/deactivate
- Reset passwords
- Export user list

**Add User Form**:
- Email address
- First and last name
- Role selection
- Organization assignment
- Department selection
- Send invitation email

**User Details Panel**:
- Profile information
- Access permissions
- Activity log
- Sessions
- API keys
- Audit trail

---

#### 4. Roles & Permissions (`/settings/roles`)
**Purpose**: Role-based access control management

**Predefined Roles**:
- **Admin**: Full system access
- **AR Manager**: Billing operations
- **Staff**: Limited billing access
- **User**: View-only access
- **Client User**: Client portal access

**Permissions Matrix**:
| Module | View | Create | Edit | Delete | Export |
|--------|------|--------|------|--------|--------|
| Invoices | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payments | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ |

**Custom Role Creation**:
- Role name
- Description
- Base role (inherit from)
- Module permissions
- Feature permissions
- Data access rules

---

#### 5. CPT Codes (`/settings/cpt`)
**Purpose**: CPT code management and mapping

**CPT Code Table**:
- CPT code
- Description
- Category
- Base price
- Medicare rate
- Last updated
- Status

**VLOOKUP Functionality**:
- Excel-like interface
- Mapping rules:
  - Source field
  - Lookup table
  - Return field
  - Default value
- Test mapping tool
- Bulk update capability

**Import/Export**:
- Import from CSV/Excel
- Export current codes
- Sync with external sources
- Version history

**CPT Categories**:
- Laboratory tests
- Procedures
- Consultations
- Special services
- Modifiers

---

#### 6. Pricing (`/settings/pricing`)
**Purpose**: Service pricing configuration

**Pricing Tiers**:
- Standard pricing
- Volume discounts
- Contract rates
- Special pricing
- Medicare/Medicaid rates

**Price Lists**:
- Service/CPT code
- Base price
- Tier 1-5 prices
- Effective date
- Expiry date
- Notes

**Discount Rules**:
- Volume-based discounts
- Client-specific discounts
- Promotional discounts
- Early payment discounts
- Bundle discounts

**Price Adjustment Tools**:
- Bulk price updates
- Percentage adjustments
- Formula-based pricing
- Competitor price matching
- Historical pricing

---

#### 7. Payment Settings (`/settings/payment`)
**Purpose**: Payment gateway and method configuration

**Payment Gateways**:
- Stripe configuration
- PayPal settings
- Square integration
- Bank ACH setup
- Check processing

**Gateway Settings**:
- API keys (encrypted)
- Webhook endpoints
- Test/Live mode toggle
- Transaction fees
- Settlement schedule

**Payment Methods**:
- Credit/debit cards
- ACH transfers
- Wire transfers
- Checks
- Cash
- Payment terms

**Auto-Payment Rules**:
- Auto-charge conditions
- Retry logic
- Failed payment handling
- Notification settings
- Credit card updates

---

#### 8. Email Settings (`/settings/email`)
**Purpose**: Email configuration and templates

**SMTP Configuration**:
- SMTP server
- Port
- Username (encrypted)
- Password (encrypted)
- Encryption (TLS/SSL)
- From address
- Reply-to address

**Email Templates**:
- **Invoice Templates**:
  - New invoice
  - Invoice reminder
  - Overdue notice
  - Payment received
  - Invoice cancelled

- **System Templates**:
  - Welcome email
  - Password reset
  - Account locked
  - System notifications

**Template Editor**:
- WYSIWYG editor
- Variable insertion
- Preview mode
- Test send
- Mobile preview

**Email Settings**:
- Send copy to admin
- BCC addresses
- Tracking pixels
- Unsubscribe links
- Footer customization

---

#### 9. Invoice Parameters (`/settings/invoice`)
**Purpose**: Invoice configuration and defaults

**Invoice Numbering**:
- Format pattern (INV-YYYY-MM-####)
- Starting number
- Reset frequency
- Preview next number

**Default Settings**:
- Payment terms (Net 30, etc.)
- Late fee percentage
- Tax rates
- Currency
- Language

**Invoice Templates**:
- Layout selection
- Logo upload
- Color scheme
- Font selection
- Custom CSS

**Legal Information**:
- Terms and conditions
- Privacy policy link
- Refund policy
- Contact information
- Registration numbers

---

#### 10. Security (`/settings/security`)
**Purpose**: Security policies and audit logs

**Password Policies**:
- Minimum length
- Complexity requirements
- Password history
- Expiry period
- Reset requirements

**Session Management**:
- Session timeout
- Concurrent sessions
- Remember me duration
- IP restrictions
- Device management

**Two-Factor Authentication**:
- Enforcement rules
- Backup codes
- Authenticator apps
- SMS verification
- Recovery options

**Audit Logs**:
- User actions
- System events
- Data changes
- Login attempts
- API access
- Export capability

**Security Features**:
- IP whitelist/blacklist
- Rate limiting
- CAPTCHA settings
- Encryption settings
- Backup configuration

---

### Profile

#### Route: `/profile/*`
**Purpose**: User profile management and preferences

#### Profile Header Section
**Visual Design**:
- Gradient blue background (blue-600 to blue-700)
- 128px height with padding

**Components**:
- **User Avatar** (80×80px):
  - Circular display
  - Upload indicator (camera icon)
  - Default user icon if no image
  - Click to change photo

- **User Information**:
  - Full name (large, bold, white)
  - Email address (smaller, blue-100)
  - Role badge with icon
  - Last active timestamp
  - Organization name

- **Quick Edit Button**:
  - White with transparency
  - Opens inline edit mode
  - Save/Cancel options

---

#### 1. Personal Info Tab (`/profile/`)
**Purpose**: Manage personal profile information

**Profile Picture Section**:
- Current image display (200×200px)
- Upload new photo button
- Remove photo option
- Accepted formats: JPG, PNG, GIF
- Max file size: 5MB
- Auto-crop tool

**Basic Information Form**:
- **Name Fields**:
  - First name (required)
  - Middle name (optional)
  - Last name (required)
  - Display name preference

- **Contact Information**:
  - Email (primary, verified)
  - Secondary email
  - Phone (with country code)
  - Mobile phone
  - Extension

- **Professional Details**:
  - Job title/position
  - Department dropdown
  - Employee ID
  - Start date
  - Reports to

**Additional Details**:
- **Bio Section**:
  - Rich text editor
  - 500 character limit
  - Markdown support

- **Location Settings**:
  - Office location
  - Desk/room number
  - Work schedule
  - Time zone selector
  - Working hours

- **Preferences**:
  - Preferred language
  - Date format
  - Number format
  - Name display format

---

#### 2. Security Tab (`/profile/security`)
**Purpose**: Account security and authentication settings

**Password Management**:
- **Change Password Form**:
  - Current password field
  - New password field
  - Confirm new password
  - Password strength meter:
    - Weak (red)
    - Medium (yellow)
    - Strong (green)
  - Requirements checklist:
    - Minimum 8 characters
    - One uppercase letter
    - One number
    - One special character

**Two-Factor Authentication (2FA)**:
- **Setup Process**:
  1. Enable 2FA toggle
  2. QR code display
  3. Manual entry key
  4. Verification code input
  5. Backup codes generation

- **2FA Management**:
  - Authenticator apps list
  - Trusted devices
  - Remove device option
  - Regenerate backup codes
  - SMS fallback option

**Active Sessions**:
- **Session Table**:
  - Device/Browser
  - IP address
  - Location (city, country)
  - Login time
  - Last activity
  - Current indicator

- **Session Actions**:
  - Sign out specific session
  - Sign out all other sessions
  - Sign out everywhere

**Security Activity Log**:
- **Event Types**:
  - Successful logins
  - Failed login attempts
  - Password changes
  - 2FA events
  - Profile updates
  - Permission changes

- **Log Details**:
  - Timestamp
  - Event type
  - IP address
  - User agent
  - Result (success/failure)

**Security Recommendations**:
- Password last changed
- 2FA status
- Unusual activity alerts
- Security score
- Improvement suggestions

---

#### 3. Preferences Tab (`/profile/preferences`)
**Purpose**: Customize application experience

**UI Customization**:
- **Theme Settings**:
  - Light mode
  - Dark mode
  - Auto (follows system)
  - High contrast option

- **Layout Preferences**:
  - Sidebar default state
  - Compact/comfortable view
  - Show/hide tooltips
  - Animation effects
  - Accessibility options

- **Color Customization**:
  - Primary color picker
  - Accent color
  - Success/error colors
  - Custom CSS option

**Notification Settings**:
- **Email Notifications**:
  - New invoice created ✓
  - Payment received ✓
  - Invoice overdue ✓
  - Weekly summary ✓
  - System updates ✓
  - Security alerts ✓

- **In-App Notifications**:
  - Desktop notifications
  - Sound alerts
  - Pop-up duration
  - Position (top-right, etc.)

- **Notification Schedule**:
  - Immediate
  - Daily digest (time picker)
  - Weekly summary (day picker)
  - Do not disturb hours

**Dashboard Preferences**:
- Default date range
- Auto-refresh interval
- Default widgets
- Widget layout
- Data density
- Chart preferences

**Regional Settings**:
- **Formats**:
  - Date: MM/DD/YYYY, DD/MM/YYYY
  - Time: 12-hour, 24-hour
  - Numbers: 1,000.00 vs 1.000,00
  - Currency symbol position

- **Localization**:
  - Language selection
  - Currency
  - First day of week
  - Decimal separator
  - Thousand separator

**Keyboard Shortcuts**:
- Enable/disable shortcuts
- Customize key bindings
- View shortcut list
- Reset to defaults

---

#### 4. Activity Tab (`/profile/activity`)
**Purpose**: Monitor account activity and usage

**Login History**:
- **Table Columns**:
  - Date/Time
  - IP Address
  - Location
  - Device/Browser
  - OS
  - Status
  - Duration

- **Filters**:
  - Date range
  - Status (success/failed)
  - Device type
  - Location

**Recent Actions Timeline**:
- **Action Types**:
  - Created invoice #1234
  - Updated client "ABC Lab"
  - Generated report "Monthly Revenue"
  - Changed settings
  - Exported data

- **Timeline Entry**:
  - Icon for action type
  - Description with links
  - Timestamp
  - Undo option (where applicable)

**Usage Statistics**:
- **Metrics Dashboard**:
  - Total logins (month)
  - Active days
  - Invoices created
  - Reports generated
  - Data exported
  - API calls made

- **Charts**:
  - Activity heatmap
  - Daily activity graph
  - Feature usage pie chart
  - Peak hours histogram

**Activity Insights**:
- Most used features
- Productivity score
- Time saved metrics
- Suggestions for efficiency
- Compare to average

---

#### 5. Organization Tab (`/profile/organization`)
**Purpose**: View organizational context and team information

**Organization Information**:
- **Company Details**:
  - Organization name
  - Organization ID
  - Industry type
  - Employee count
  - Founded date
  - Website

- **Subscription Info**:
  - Plan type
  - Users (used/total)
  - Storage (used/total)
  - API calls (used/limit)
  - Billing cycle
  - Next renewal

**Your Role & Permissions**:
- **Role Details**:
  - Current role name
  - Role description
  - Assigned date
  - Assigned by

- **Permissions List**:
  - ✓ View invoices
  - ✓ Create invoices
  - ✓ Edit invoices
  - ✗ Delete invoices
  - ✓ View reports
  - ✗ Manage users

**Organizational Structure**:
- **Hierarchy View**:
  - CEO/Owner
  - └── Departments
    - └── Teams
      - └── You are here

- **Your Position**:
  - Direct manager
  - Peer colleagues
  - Direct reports (if any)
  - Dotted-line reports

**Team Members**:
- **Team List**:
  - Avatar
  - Name
  - Role
  - Department
  - Email
  - Phone
  - Status (online/offline)

- **Quick Actions**:
  - Send message
  - View profile
  - Start video call
  - Schedule meeting

**Resources**:
- Company handbook
- IT support
- HR documents
- Training materials
- Feedback form

---

## Navigation Structure

### Primary Navigation (Sidebar)
**Design**:
- Fixed left position
- 256px width (expanded)
- 64px width (collapsed)
- Dark blue background (#1e40af)
- White text and icons

**Navigation Items** (with role-based visibility):
1. **Dashboard** (`/dashboard`)
   - Icon: LayoutDashboard
   - Roles: All

2. **Invoices** (`/invoices`)
   - Icon: FileText
   - Roles: All

3. **Payments** (`/payments`)
   - Icon: DollarSign
   - Roles: Admin, AR Manager, Staff

4. **Labs** (`/labs`)
   - Icon: Building2
   - Roles: Admin, AR Manager

5. **Reports** (`/reports`)
   - Icon: BarChart3
   - Roles: Admin, AR Manager

6. **Import Data** (`/import`)
   - Icon: Upload
   - Roles: Admin, AR Manager

7. **Settings** (`/settings`)
   - Icon: Settings
   - Roles: Admin only

**Sidebar Footer**:
- User avatar and name
- Logout button
- Version number

### Header Navigation
**Components**:
- **Left Section**:
  - Hamburger menu (toggle sidebar)
  - Breadcrumb navigation
  - Page title

- **Right Section**:
  - Global search (Cmd+K)
  - Notifications bell (with badge)
  - Help menu
  - User menu dropdown

**User Menu Dropdown**:
- View Profile
- Account Settings
- Keyboard Shortcuts
- Help & Support
- Sign Out

### Mobile Navigation
**Responsive Breakpoints**:
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

**Mobile Menu**:
- Bottom tab bar
- Hamburger slide-out menu
- Simplified navigation
- Touch-optimized targets

---

## User Roles & Access

### Role Hierarchy

#### 1. System Admin
**Access Level**: Full system access
**Capabilities**:
- All features and settings
- User management
- System configuration
- Database access
- API management
- Audit logs

#### 2. Organization Admin
**Access Level**: Organization-wide access
**Capabilities**:
- Organization settings
- User management (within org)
- All billing features
- Report generation
- Data import/export

#### 3. AR Manager
**Access Level**: Accounts receivable operations
**Capabilities**:
- Invoice management
- Payment processing
- Lab management
- Reports access
- Import data
- Client management

#### 4. Staff
**Access Level**: Limited billing operations
**Capabilities**:
- Create/edit invoices
- Record payments
- View reports
- Basic client access
- No settings access

#### 5. User
**Access Level**: View-only access
**Capabilities**:
- View invoices
- View payments
- View basic reports
- No create/edit rights
- Profile management only

#### 6. Client User
**Access Level**: Client portal access
**Capabilities**:
- View own invoices
- Make payments
- Download receipts
- View statements
- Update contact info

### Permission Matrix

| Feature | Admin | AR Manager | Staff | User | Client |
|---------|-------|------------|-------|------|--------|
| **Dashboard** |
| View | ✓ | ✓ | ✓ | ✓ | ✗ |
| Customize | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Invoices** |
| View | ✓ | ✓ | ✓ | ✓ | Own |
| Create | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Payments** |
| View | ✓ | ✓ | ✓ | ✗ | Own |
| Record | ✓ | ✓ | ✓ | ✗ | ✓ |
| Void | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Reports** |
| View | ✓ | ✓ | Limited | ✗ | Own |
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export | ✓ | ✓ | ✓ | ✗ | ✓ |
| **Settings** |
| View | ✓ | ✗ | ✗ | ✗ | ✗ |
| Modify | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Common UI Patterns

### Form Components

#### Input Fields
- Text inputs with floating labels
- Error states with red border
- Helper text below field
- Character count for limited fields
- Auto-formatting (phone, currency)

#### Validation
- Real-time validation
- Error messages inline
- Success checkmarks
- Required field indicators (*)
- Submit button disabled until valid

#### Buttons
- **Primary**: Blue background, white text
- **Secondary**: White background, blue text
- **Danger**: Red background, white text
- **Ghost**: Transparent, blue text
- Loading states with spinner
- Disabled states with opacity

### Data Display

#### Tables
- Sticky header on scroll
- Sortable columns (arrow indicators)
- Resizable columns
- Row hover effects
- Alternating row colors
- Responsive scroll on mobile

#### Cards
- White background
- Subtle shadow
- Rounded corners (8px)
- Padding (16px)
- Header with actions
- Hover lift effect

#### Charts
- Interactive tooltips
- Legend with toggles
- Export to image/PDF
- Zoom and pan
- Responsive sizing
- Animation on load

### Feedback Components

#### Notifications/Toasts
- **Success**: Green with checkmark
- **Error**: Red with X icon
- **Warning**: Yellow with ! icon
- **Info**: Blue with i icon
- Auto-dismiss after 5 seconds
- Manual dismiss option
- Stack multiple notifications

#### Modals
- Overlay with backdrop
- Close on escape key
- Close on backdrop click
- Centered positioning
- Size variants (sm, md, lg, xl)
- Scrollable content area

#### Loading States
- Skeleton screens for content
- Spinner for actions
- Progress bars for uploads
- Shimmer effects
- "Loading..." text
- Estimated time remaining

### Interactive Elements

#### Drag and Drop
- Visual drop zones
- Drag preview/ghost
- Valid drop indicators
- Invalid drop feedback
- Multi-select drag
- Touch support

#### Search
- Instant search results
- Search suggestions
- Recent searches
- Clear search button
- Advanced filter toggle
- Search within results

#### Pagination
- Previous/Next buttons
- Page number display
- Jump to page input
- Items per page selector
- Total items count
- Keyboard navigation

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18.2.0
- **Language**: TypeScript 5.0+
- **Routing**: React Router v6
- **State Management**: 
  - Context API for auth/global state
  - React Query for server state
  - Local state with useState/useReducer

### Styling & UI
- **CSS Framework**: Tailwind CSS 3.0
- **Component Library**: Custom components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit

### Data & API
- **Backend**: Supabase
- **Database**: PostgreSQL
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage
- **Authentication**: Supabase Auth

### Development Tools
- **Build Tool**: Vite
- **Package Manager**: npm/yarn
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, React Testing Library
- **Version Control**: Git

### Performance Optimizations
- Code splitting with lazy loading
- Image optimization
- Memoization with React.memo
- Virtual scrolling for large lists
- Service worker for offline support
- CDN for static assets

### Security Features
- JWT token authentication
- Row Level Security (RLS)
- XSS protection
- CSRF tokens
- Rate limiting
- Input sanitization
- Encrypted sensitive data

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome)

---

## Accessibility Features

### WCAG 2.1 AA Compliance
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader compatibility
- Color contrast ratios
- Alternative text for images
- Captions for videos

### Keyboard Shortcuts
- `Cmd/Ctrl + K`: Global search
- `Cmd/Ctrl + N`: New invoice
- `Cmd/Ctrl + S`: Save
- `Cmd/Ctrl + P`: Print
- `Esc`: Close modal
- `Tab`: Navigate fields
- `Enter`: Submit forms
- `Space`: Toggle checkboxes

---

## Mobile Responsiveness

### Responsive Breakpoints
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px - 1439px
- Large Desktop: 1440px+

### Mobile Optimizations
- Touch-friendly targets (44px minimum)
- Swipe gestures
- Bottom navigation bar
- Collapsible sections
- Simplified layouts
- Optimized images
- Reduced animations
- Offline capability

---

## Future Enhancements

### Planned Features
- AI-powered invoice predictions
- Automated payment reminders
- Advanced workflow automation
- Multi-currency support
- Blockchain audit trail
- Voice commands
- Mobile native apps
- API marketplace
- White-label options
- Advanced analytics dashboard

### Integration Roadmap
- QuickBooks integration
- Salesforce connector
- Slack notifications
- Microsoft Teams app
- Google Workspace addon
- Zapier integration
- Webhook management
- Custom API endpoints

---

## Conclusion

The PBS Invoicing Web Application provides a comprehensive, modern solution for medical billing and laboratory invoice management. With its intuitive interface, robust feature set, and extensive customization options, it serves as a complete platform for healthcare billing operations.

The application's architecture ensures scalability, security, and performance while maintaining a user-friendly experience across all devices and user roles. Regular updates and feature enhancements continue to evolve the platform based on user feedback and industry requirements.

---

## Documentation Version

- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Author**: PBS Development Team
- **Review Status**: Complete
- **Next Review**: Q2 2025

---

*This document serves as the comprehensive reference for the PBS Invoicing Web Application UI structure and features.*