# Customer Excel Import Feature

## Overview

The Customer Excel Import feature allows system administrators to bulk import customer data from Excel (.xlsx/.xls) files into the customer database. This feature streamlines the process of migrating existing customer databases or importing large customer datasets.

## Access Requirements

- **Role Required**: `sysadmin` only
- **Authentication**: User must be logged in with system administrator privileges
- **Navigation**: Admin menu → Customer Import

## Supported File Formats

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- **Maximum File Size**: 10MB
- **Maximum Records**: 1,000 customers per import

## Excel to Database Column Mapping

| Database Field | Current Sheet | Completed Sheet | Type | Required |
|----------------|---------------|-----------------|------|----------|
| `full_name` | Customer Name | Customer Name | VARCHAR(255) | ✅ |
| `primary_phone` | Phone # | Phone # | VARCHAR(15) | ✅ |
| `home_address` | Address | *(use Site Location)* | VARCHAR(511) | ❌ |
| `current_status` | Current Status | *(auto: "Complete")* | VARCHAR(255) | ❌ |
| `job_no` | Job No | Job No | VARCHAR(50) | ❌ |
| `site_location` | Site Location | Site Location | VARCHAR(511) | ❌ |
| `building_type` | Building Type | Building Type | VARCHAR(100) | ❌ |
| `permit_type` | *(not available)* | Type of permit req | VARCHAR(100) | ❌ |
| `slab_size` | Size | Size | VARCHAR(100) | ❌ |
| `council_responsible` | Council (planning) | Council (planning) | VARCHAR(100) | ❌ |
| `owner_builder_permit` | OB? | *(not available)* | BOOLEAN | ❌ |
| `date_ordered` | Order Date | Order Date | DATE | ❌ |
| `date_bp_applied` | BP App date | BP App date | DATE | ❌ |
| `date_bp_issued` | *(not available)* | Date Building Permit Issued | DATE | ❌ |
| `date_completed` | *(not available)* | *(derived from context)* | DATE | ❌ |
| `next_action_description` | Waiting on: | *(not available)* | TEXT | ❌ |
| `quoted_estimate` | Quoted Estimate | Quoted Estimate | DECIMAL(10,2) | ❌ |
| `fees_paid_out` | Fees paid Out | Fees paid out | DECIMAL(10,2) | ❌ |
| `invoices_collected` | *(calc: Initial Inv + 2nd Invoice)* | *(calc: Invoice amounts)* | DECIMAL(10,2) | ❌ |
| `job_earnings` | Job Earnings | Job Earnings | DECIMAL(10,2) | ❌ |
| `last_payment_amount` | *(calc: payments)* | *(calc: payments)* | DECIMAL(10,2) | ❌ |

### Sample Data Mapping

Based on your Excel data, here are examples of how records would be mapped:

#### Current Projects Example:
```
Excel Row: E | 4 | Gaye Elliott | 0429 779 089 | 07.10.2024 | 109 Caldwell Street | Heathcote | 7.5 X 13.5 X 3.0 | Dwelling | Building | | COGB | SETUP | | | | | | | | $0.00 | 1 | #VALUE!

Database Mapping:
- full_name: "Gaye Elliott"
- primary_phone: "0429 779 089"
- home_address: "109 Caldwell Street"
- job_no: "E4"
- site_location: "Heathcote"
- slab_size: "7.5 X 13.5 X 3.0"
- building_type: "Dwelling"
- current_status: "Building"
- council_responsible: "COGB"
- date_ordered: "2024-10-07"
- quoted_estimate: 0.00
```

#### Completed Projects Example:
```
Excel Row: E | 9033 | Diana Hookey | 0414 583 746 | 7/14/2022 | North Harcourt | 6.0 x 6.0 x 2.8 | Garage | Building | 7/20/2022 | | | | | | | | 29.07.2022 | 1,650.00 | $660.00 | 15-Jul | $990.00 | 19-Jul | $1,064.70 | $585.30

Database Mapping:
- full_name: "Diana Hookey"
- primary_phone: "0414 583 746"
- site_location: "North Harcourt"
- job_no: "E9033"
- slab_size: "6.0 x 6.0 x 2.8"
- building_type: "Garage"
- current_status: "Complete"
- permit_type: "Building"
- date_ordered: "2022-07-14"
- date_bp_applied: "2022-07-20"
- date_bp_issued: "2022-07-29"
- quoted_estimate: 1650.00
- invoices_collected: 1650.00 (660.00 + 990.00)
- fees_paid_out: 1064.70
- job_earnings: 585.30
```

## Import Process Workflow

### 1. File Upload & Validation
```
Admin uploads Excel file → build insert statement → catch errors 
```

### 2. Data Validation
 - no validation is necessary

### 3. Preview & Confirmation
 - no preview is necessary

### 4. Import Execution
error handling - continue with upload but provide a list of failed updates at the end of the process

### 5. Post-Import Actions
- **Build Creation**: create default builds for new customers
- **Workflow Initialization**: Start initial job workflows 
- **Report Generation**: Provide simple import summary of errors encountered

## Error Handling & Validation


### Error Conditions (Continue with Notes)
- Duplicate customer records (skip or update based on setting)
- Invalid date formats (use null)
- Invalid numeric values (set to null)
- Unknown status values (leave as null)

## Data Cleaning Rules

### Date Parsing
- **Excel Date Formats**: Handle both serial dates and text dates
- **Input Examples**: "07.10.2024", "7/14/2022", "29.07.2022", "15-Jul"
- **Output Format**: PostgreSQL DATE format (YYYY-MM-DD)
- **Year Handling**: Two-digit years assume 20xx for 00-30, 19xx for 31-99

### Financial Data Cleaning
- **Currency Removal**: Strip "$", "," from monetary values
- **Error Values**: Handle "#VALUE!" and empty cells as NULL

### no Job Number Standardization - import as given

### no Status Mapping - import as given without reconciling to a valid stage description

### no Building Type Standardization - import as given

### no Council Name Normalization - import as given

## Excel Worksheet Handling

### Multi-Sheet Support
look for the current sheet and the completed sheet but ignore all other sheets

#### "Current" Sheet Structure
- **Purpose**: Active/ongoing projects
- **Status Assignment**: Import as given

#### "Completed" Sheet Structure  
- **Purpose**: Finished projects with full financial records
- **Status Assignment**: Auto-assign "Complete" status regardless of other indicators

### Import Strategy

#### Combined Import
- Process both sheets in single import operation
- Use sheet name to determine base status
- Allow status override from data


## User Interface Design

### Import Page Layout
```
[Navigation: add to header.ejs alongside job templates]

┌─────────────────────────────────────────────────┐
│ Customer Excel Import                           │
├─────────────────────────────────────────────────┤
│ 📁 Select Excel File                           │
│ [Choose File] [Upload]                          │
│                                                 │
│ ⚙️ Import Settings                              │
│ □ Create default builds for new customers       │
│ □ Start initial workflows                       │
│ □ Update existing customers (if duplicates)     │
│ □ Skip existing customers (if duplicates)     │
│                                                 │
│ 📋 Column Mapping (auto-detected)              │
│ Excel Column    →    Database Field             │
│ [Dropdown]     →    [Fixed Field]               │
│ (show a mapping here of all the columns and match to the schema)                                                │
│                                                 │
│ 👀 Preview (First 10 Rows)                     │
│ [Data Grid Display]                             │
│                                                 │
│ [Cancel] [Import Customers]                     │
└─────────────────────────────────────────────────┘
```

### Final report
```
┌─────────────────────────────────────────────────┐
│ Import Progress                                 │
├─────────────────────────────────────────────────┤
│ Processing: 45/150 customers                    │
│                                                 │
│                                                 │
│ row(34) Diana Hockey - [return error message]                    │
│ row(35) Keith Maybanks - [return error message]                                 │
│ ❌ Errors: 2                                    │
│                                                 │
│                   │
└─────────────────────────────────────────────────┘
```

## Routes & API Endpoints

### Frontend Routes
- `GET /admin/customers/import` - Simple import page
- `POST /admin/customers/import` - Single endpoint for file upload and immediate processing

### Backend Implementation
```javascript
// Single import endpoint - immediate processing
app.post("/admin/customers/import", upload.single('customerFile'), async (req, res) => {
  // Validate sysadmin access
  // Parse Excel file (current and completed sheets)
  // Process each row immediately with error collection
  // Create default builds if option selected
  // Start workflows if option selected
  // Return summary with error list
});
```

### create a dedicated API route
 - do not use the front end for DB inserts. 

### use the existing endpoints for build and workflow initialization



## Database Considerations

### Error Handling
- Store import errors in memory during processing
- Display error summary at completion
- No persistent logging required - errors shown once and discarded

## Dependencies

### Required Libraries
- `multer` - File upload handling
- `xlsx` - Excel file parsing

### Integration Points
- Existing sysadmin role validation
- Current customer schema and database connection
- Header navigation (add link alongside job templates)

---

**Note**: Simple admin-supervised import with basic error reporting and immediate processing.

