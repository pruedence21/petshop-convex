# ⚡ Quick Start Guide - Pet Shop Management System

Get up and running with the Pet Shop Management System in minutes! This guide will help you understand the basics and start managing your pet shop operations immediately.

## 🎯 What You'll Learn

- How to log in and navigate the system
- Basic operations in each major module
- Common workflows and best practices
- Tips for efficient daily operations

## 🚀 First Steps

### 1. Access the System

1. **Open your browser** and go to your application URL
   - Development: http://localhost:3000
   - Production: https://your-domain.com

2. **Create Your Account**
   - Click "Sign Up" 
   - Enter your email and password
   - Verify your email address
   - Complete your profile information

3. **Login**
   - Use your credentials to access the dashboard
   - You'll see the main navigation menu

### 2. System Dashboard Overview

The dashboard provides quick access to all modules:

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard | 🛒 Sales | 🏥 Clinic | 🏨 Hotel | 💰 Accounting │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📊 Today's Summary                                          │
│ • Sales: 45 transactions | $2,850 revenue                  │
│ • Appointments: 12 scheduled | 8 completed                 │
│ • Hotel Guests: 15 pets | 3 check-outs today               │
│ • Cash Balance: $15,240 | AR Outstanding: $3,200           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚡ Quick Actions                                            │
│ • Create Sale    • Schedule Appointment    • Book Hotel     │
│ • Add Product    • Record Expense         • View Reports    │
└─────────────────────────────────────────────────────────────┘
```

## 🛒 Sales Module Quick Start

### Creating Your First Sale

1. **Navigate to Sales**
   - Click "Sales" in the main menu
   - Click "New Sale" button

2. **Add Customer** (Optional)
   - Search existing customer or create new
   - Customer info auto-fills for loyalty tracking

3. **Add Products**
   - Scan barcode or search product name
   - Select quantity and verify price
   - System calculates totals automatically

4. **Process Payment**
   - Choose payment method (Cash/Card/Digital Wallet)
   - Enter amount received
   - System calculates change due
   - Print or email receipt

### Sales Best Practices

```typescript
// Daily Sales Workflow
1. Open register and count starting cash
2. Process sales throughout the day
3. Check inventory levels (red alerts)
4. End of day: count cash and reconcile
5. Review daily sales report
```

**Keyboard Shortcuts:**
- `Ctrl + N`: New sale
- `F2`: Focus product search
- `F3`: Process payment
- `F5`: Print receipt

## 🏥 Clinic Module Quick Start

### Scheduling an Appointment

1. **Navigate to Clinic**
   - Click "Clinic" in main menu
   - Select "Appointments"

2. **Create New Appointment**
   - Click "Schedule Appointment"
   - Select date and time
   - Search or add customer
   - Add customer pet(s)
   - Select services needed

3. **Add Services**
   - Choose from service menu
   - Set pricing (or use standard rates)
   - Add any notes or special instructions
   - Calculate total cost

### Clinic Workflow

```
Customer Arrives → Check-in → Doctor Examination → 
Treatment/Services → Payment → Update Medical Records → 
Schedule Follow-up (if needed)
```

**Service Types:**
- **Consultation**: General check-up
- **Vaccination**: Preventive care
- **Treatment**: Medical procedures
- **Grooming**: Basic and premium services
- **Surgery**: Sterilization and procedures

## 🏨 Hotel Module Quick Start

### Booking a Pet Stay

1. **Navigate to Hotel**
   - Click "Hotel" in main menu
   - Select "New Booking"

2. **Check Room Availability**
   - Select check-in/check-out dates
   - View available room types
   - Choose room for pet

3. **Add Guest Information**
   - Customer details and contact
   - Pet information and special needs
   - Emergency contact information

4. **Add Services**
   - Daily care services
   - Special feeding instructions
   - Medication administration
   - Extra services (grooming, playtime)

### Hotel Daily Operations

```typescript
Daily Hotel Routine:
Morning:
• Check-in new guests
• Verify room assignments
• Review special care instructions

During Day:
• Feed pets per schedule
• Administer medications
• Provide updates to owners
• Clean and maintain rooms

Evening:
• Final feeding
• Secure pets for night
• Prepare for next day check-outs
```

## 💰 Accounting Module Quick Start

### Understanding the Financial Dashboard

The accounting dashboard shows:

1. **Current Financial Position**
   - Total Assets
   - Total Liabilities  
   - Net Worth
   - Cash Flow Summary

2. **Key Financial Metrics**
   - Revenue (Current Month)
   - Expenses (Current Month)
   - Net Profit
   - Profit Margin %

3. **Important Alerts**
   - Overdue payments
   - Low cash balance
   - Monthly closing reminder

### Chart of Accounts

Your system comes pre-loaded with Indonesian standard accounts:

```
ASSET (1-xxx)
├── 1-111 Cash on Hand
├── 1-121 Bank Accounts
├── 1-131 Inventory - Pet Food
└── 1-141 Accounts Receivable

LIABILITY (2-xxx)
├── 2-111 Accounts Payable
└── 2-121 Sales Tax Payable

EQUITY (3-xxx)
└── 3-111 Owner's Equity

REVENUE (4-xxx)
├── 4-111 Sales - Pet Food
├── 4-121 Veterinary Services
└── 4-131 Boarding Revenue

EXPENSE (5-xxx)
├── 5-111 Cost of Goods Sold
└── 5-121 Operating Expenses
```

### Quick Financial Tasks

#### Daily Cash Reconciliation
1. Go to Accounting → Bank Reconciliation
2. Match bank transactions to records
3. Identify any discrepancies
4. Post any missing transactions

#### Monthly Financial Review
1. Generate Balance Sheet
2. Generate Income Statement
3. Review cash flow statement
4. Analyze key ratios and trends

## 📦 Inventory Management Quick Start

### Adding Your First Products

1. **Navigate to Products**
   - Click "Products" in main menu
   - Click "Add Product"

2. **Product Information**
   - Product name and description
   - SKU or barcode
   - Category and brand
   - Unit of measurement
   - Purchase price and selling price

3. **Stock Information**
   - Current stock quantity
   - Reorder level
   - Supplier information

### Inventory Best Practices

```typescript
Inventory Management Routine:
Daily:
• Monitor low stock alerts
• Check for damaged goods
• Verify received shipments

Weekly:
• Physical count of key items
• Update supplier information
• Review slow-moving inventory

Monthly:
• Full inventory count
• Update cost prices
• Adjust reorder levels
```

## 👥 Customer Management Quick Start

### Adding a New Customer

1. **Navigate to Customers**
   - Click "Customers" in main menu
   - Click "Add Customer"

2. **Customer Information**
   - Name, phone, email
   - Address information
   - Preferred contact method

3. **Pet Information**
   - Pet name, species, breed
   - Date of birth
   - Medical history
   - Special care needs

### Customer Service Tips

- **Always update customer contact info** after service
- **Note pet preferences** and behavioral traits
- **Set up automated reminders** for vaccinations
- **Track service history** for better recommendations

## 📊 Reports and Analytics

### Key Reports to Review Daily

1. **Daily Sales Report**
   - Total transactions
   - Revenue breakdown
   - Payment method analysis
   - Top-selling products

2. **Cash Flow Report**
   - Money in/out today
   - Bank balance
   - Outstanding receivables

3. **Appointment Summary**
   - Today's appointments
   - No-shows and cancellations
   - Revenue from clinic services

### Weekly Reports

1. **Inventory Status**
   - Low stock items
   - Fast-moving products
   - Slow-moving inventory

2. **Customer Analysis**
   - New customers added
   - Returning customers
   - Service frequency

## 🔧 System Administration

### User Management

1. **Add Staff Members**
   - Create user accounts
   - Assign appropriate roles
   - Set permissions per module

2. **Role-Based Access**
   - **Admin**: Full system access
   - **Manager**: All operations except system settings
   - **Staff**: Limited to sales and basic operations
   - **Accountant**: Full accounting access

### Settings Configuration

1. **Business Information**
   - Company name and address
   - Tax identification
   - Banking information
   - Default payment terms

2. **System Preferences**
   - Currency and number formatting
   - Receipt templates
   - Email notifications
   - Backup schedules

## 📱 Mobile Usage

The system is fully responsive and works great on mobile devices:

### Mobile-Optimized Features
- **Quick Sale**: Fast checkout for retail
- **Appointment Check-in**: Scanner integration
- **Pet Care Notes**: Voice-to-text entries
- **Photo Upload**: For medical records

### Offline Capabilities
- **Sale Processing**: Cache transactions
- **Appointment Viewing**: Sync when online
- **Customer Search**: Local database access

## 🎯 Daily Workflow Examples

### Opening Procedures (15 minutes)

```typescript
1. Log into system
2. Check overnight messages
3. Review today's appointments
4. Check room availability (hotel)
5. Review inventory alerts
6. Count cash drawer
7. Prepare for first customers
```

### Midday Operations (Throughout day)

```typescript
• Process sales as they occur
• Check customers in for appointments
• Update pet medical records
• Monitor inventory levels
• Answer customer questions
• Process payments
```

### Closing Procedures (20 minutes)

```typescript
1. Count cash and reconcile
2. Review day's transactions
3. Check tomorrow's schedule
4. Update any incomplete records
5. Set up for next day
6. Log out of system
```

## 🚨 Important Reminders

### Daily Must-Dos
- [ ] Count cash at opening and closing
- [ ] Process all payments before end of day
- [ ] Update customer and pet records
- [ ] Check inventory alerts
- [ ] Review tomorrow's appointments

### Weekly Must-Dos
- [ ] Review financial reports
- [ ] Update supplier information
- [ ] Check for slow-moving inventory
- [ ] Backup important data
- [ ] Staff meeting and training

### Monthly Must-Dos
- [ ] Financial review and closing
- [ ] Full inventory count
- [ ] Customer satisfaction survey
- [ ] System maintenance
- [ ] Update business policies

## 🆘 Getting Help

### Built-in Help
- **Tooltips**: Hover over any icon for description
- **Help Buttons**: Click for detailed instructions
- **Keyboard Shortcuts**: Press `?` for shortcut list

### Support Resources
- **Documentation**: Complete guides in `/docs` folder
- **API Reference**: Technical details for developers
- **Video Tutorials**: Coming soon
- **Community Forum**: Connect with other users

### Common Questions

**Q: How do I handle returns?**
A: Go to Sales → Returns, select the original sale, process return and refund.

**Q: Can I schedule recurring appointments?**
A: Yes, in Clinic → Recurring Appointments, set frequency and automatic creation.

**Q: How do I backup my data?**
A: Convex automatically handles backups. Export reports monthly for your records.

**Q: Can multiple people use the system?**
A: Yes, create user accounts for each staff member with appropriate permissions.

---

**Next Steps**:
- Explore the [User Guide](./05-user-guide.md) for detailed workflows
- Review the [API Reference](./04-api-reference.md) for technical integration
- Check [Module-Specific Documentation](./07-sales-module.md) for advanced features

**Related Documentation**:
- [Installation Guide](./02-installation-guide.md) - Setup instructions
- [System Architecture](./06-system-architecture.md) - Technical overview
- [Troubleshooting Guide](./15-faq-troubleshooting.md) - Common issues