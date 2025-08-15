# Complete Widget Options Documentation

## Current Data Available in Dashboard

### 1. Standard Dashboard Stats (from getDashboardStats)
- **Total Invoiced** - Total amount invoiced in period
- **Total Paid** - Total amount paid in period  
- **Outstanding Balance** - Unpaid invoices amount
- **Overdue Invoices** - Count of overdue invoices

### 2. Volume Metrics (from fetchVolumeMetrics)
- **Daily Volume** - Number of invoices today
- **Daily Revenue** - Revenue generated today
- **Processing Rate** - Invoices per hour
- **Active Labs** - Number of active labs today
- **Pending ERA** - Count of pending ERA postings
- **Success Rate** - Percentage of paid invoices
- **Avg Processing Time** - Average time to process
- **PGX Samples** - PGX product samples processed
- **PGX Revenue** - Revenue from PGX products
- **PGX Profit** - Profit from PGX products (92% margin)

### 3. Chart Data
- **Aging Overview** - AR aging buckets (0-30, 31-60, 61-90, 90+ days)
- **Status Distribution** - Invoice status percentages
- **PGX Performance** - PGX metrics vs targets

### 4. Table Data
- **Top Clients** - Clients by revenue with dispute rates
- **Lab Performance** - Lab samples, revenue, and status

## Additional Data That Makes Sense to Add

### New Stat Widgets
1. **Collection Rate** - (Paid / Invoiced) * 100
2. **Average Invoice Value** - Total / Count
3. **Days Sales Outstanding (DSO)** - AR aging metric
4. **Dispute Rate** - % of disputed invoices
5. **Monthly Growth Rate** - MoM revenue growth
6. **Client Count** - Total active clients
7. **New Clients This Month** - Client acquisition
8. **Average Payment Time** - Days to payment

### New Chart Widgets
1. **Revenue Trend** - Line chart of daily/weekly/monthly revenue
2. **Invoice Volume Trend** - Line chart of invoice counts
3. **Payment Status Pie** - Pie chart of payment statuses
4. **Client Distribution** - Pie/donut of revenue by client
5. **Service Mix** - Breakdown by service type/CPT code
6. **Hourly Volume** - Heat map of processing times

### New Table Widgets
1. **Recent Invoices** - Last 10 invoices with status
2. **Overdue Invoices** - List of overdue with aging
3. **Disputed Invoices** - Invoices in dispute status
4. **Today's Activity** - Real-time invoice feed
5. **Payment Queue** - Invoices awaiting payment

### Logical Improvements Needed

1. **Conditional Fields in Form**
   - Show metric selector only for stat + volume combo
   - Show chart type only for chart widgets
   - Hide irrelevant options based on selections

2. **Smart Defaults**
   - Auto-set widget ID based on data source
   - Pre-fill title based on selection
   - Default size based on widget type

3. **Validation Rules**
   - Prevent duplicate widget IDs
   - Ensure valid data source for widget type
   - Check required fields based on type

4. **Enhanced Options**
   - Date range override per widget
   - Refresh interval settings
   - Color theme selection
   - Display format (number, currency, percentage)

5. **Widget Templates**
   - Pre-configured widget sets (Executive, Operations, Finance)
   - Quick-add common widgets
   - Save custom widget configurations