# Data Security SQL Modifications Required

Based on the new `data_security` column in the `users` table, the following SQL statements need to be modified to implement user-based data access control.

## Overview
The `data_security` column contains SQL WHERE clauses that define user data access restrictions using the simplified `user_accessible_customers` security view. This view maps job user assignments to customer access for efficient job-based security.

## Security Implementation Strategy
- **Simple Job-Based Access**: One `data_security` field per user with job assignment logic
- **Security View**: `user_accessible_customers` view maps job assignments to customer access
- **Three Security Patterns**: Admin (1=1), Job-based access, or No access (1=0)
- **Performance Optimized**: Simple INNER JOIN view with minimal overhead

## Critical Customer Data Queries

### 1. Management Report Query (app.js:1030-1042) ✅ IMPLEMENTED
**Location**: `/management-report` route  
**Current Query**:
```sql
SELECT 
  id, job_no, full_name, primary_phone, current_status, invoices_collected,
  site_location, slab_size, building_type,
  TO_CHAR(date_ordered, 'DD-Mon-YY') AS date_ordered,
  TO_CHAR(date_bp_applied, 'DD-Mon-YY') AS date_bp_applied,
  TO_CHAR(date_bp_issued, 'DD-Mon-YY') AS date_bp_issued,
  TO_CHAR(date_completed, 'DD-Mon-YY') AS date_completed,
  TO_CHAR(last_payment_date, 'DD-Mon-YY') AS last_payment_date,
  last_payment_amount, last_payment_description,
  next_action_description,
  TO_CHAR(date_last_actioned, 'DD-Mon-YY') AS date_last_actioned
FROM customers 
ORDER BY CASE current_status...
```

**New Secure Implementation**:
```javascript
// Get user's security clause for data access control
const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

// Replace $USER_ID placeholder with actual user ID for dynamic clauses
const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

// Enhanced query with security filtering
const secureQuery = `
SELECT 
  id, job_no, full_name, primary_phone, current_status, invoices_collected,
  site_location, slab_size, building_type,
  TO_CHAR(date_ordered, 'DD-Mon-YY') AS date_ordered,
  TO_CHAR(date_bp_applied, 'DD-Mon-YY') AS date_bp_applied,
  TO_CHAR(date_bp_issued, 'DD-Mon-YY') AS date_bp_issued,
  TO_CHAR(date_completed, 'DD-Mon-YY') AS date_completed,
  TO_CHAR(last_payment_date, 'DD-Mon-YY') AS last_payment_date,
  last_payment_amount, last_payment_description,
  next_action_description,
  TO_CHAR(date_last_actioned, 'DD-Mon-YY') AS date_last_actioned
FROM customers 
WHERE (${processedSecurityClause})
ORDER BY CASE current_status...`;

const result = await db.query(secureQuery);
```

**Security Clause Examples**:
- Admin: `'1=1'`
- Job-based access: `'id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = $USER_ID)'`
- No access: `'1=0'`

**Status**: ✅ IMPLEMENTED - Uses simplified job-based security view

### 2. Customer List View - Search Query (app.js:650-685)
**Location**: `/2/customers` route with search  
**Current Query**:
```sql
SELECT 
    c.id, c.full_name, c.home_address, c.primary_phone, c.primary_email, 
    c.contact_other, c.current_status AS customer_status, 
    TO_CHAR(c.follow_up, 'DD-Mon-YY') AS follow_up,
    b.id AS build_id, b.product_id, b.enquiry_date, b.job_id, 
    b.current_status AS build_status
FROM customers c
LEFT JOIN builds b ON b.customer_id = c.id
WHERE (c.full_name ILIKE $1 OR c.primary_phone ILIKE $1 OR c.home_address ILIKE $1 
       OR c.primary_email ILIKE $1 OR c.contact_other ILIKE $1 OR c.current_status ILIKE $1)
  AND (EXISTS (SELECT 1 FROM jobs j WHERE j.build_id = b.id AND j.user_id = $2)
       OR EXISTS (SELECT 1 FROM users u WHERE u.id = $2 AND u.roles = 'sysadmin'))
```
**Modification Needed**: Replace job-based filtering with user's data_security clause

### 3. Customer List View - No Search Query (app.js:739-767)
**Location**: `/2/customers` route without search  
**Current Query**:
```sql
SELECT 
    c.id, c.full_name, c.home_address, c.primary_phone, c.primary_email, 
    c.contact_other, c.current_status AS customer_status, 
    TO_CHAR(c.follow_up, 'DD-Mon-YY') AS follow_up,
    b.id AS build_id, b.product_id, TO_CHAR(b.enquiry_date, 'DD-Mon-YY') AS enquiry_date, 
    b.job_id, b.current_status AS build_status, p.display_text AS product_description
FROM customers c
LEFT JOIN builds b ON b.customer_id = c.id
LEFT JOIN products p ON b.product_id = p.id
WHERE EXISTS (SELECT 1 FROM jobs j WHERE j.build_id = b.id AND j.user_id = $1)
   OR EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND u.roles = 'sysadmin')
```
**Modification Needed**: Replace job-based filtering with user's data_security clause

### 4. Simple Customer Search (app.js:900)
**Location**: `/3/customers` route  
**Current Query**:
```sql
SELECT * FROM customers 
WHERE full_name LIKE $1 OR primary_phone LIKE $1 OR home_address LIKE $1
```
**Modification Needed**: Add user's data_security clause to WHERE condition

### 5. Individual Customer Detail (app.js:946)
**Location**: `/customer/:id` route  
**Current Query**:
```sql
SELECT * FROM customers WHERE id = $1
```
**Modification Needed**: Add user's data_security clause to ensure user can access this customer

### 6. Customer Editor List (app.js:999)
**Location**: `/customers` route  
**Current Query**:
```sql
SELECT * FROM customers 
WHERE full_name LIKE $1 OR primary_phone LIKE $1 OR home_address LIKE $1
```
**Modification Needed**: Add user's data_security clause to WHERE condition

### 7. Customer Status List (app.js:998)
**Location**: `/customers` route  
**Current Query**:
```sql
SELECT DISTINCT current_status FROM customers
```
**Modification Needed**: Add user's data_security clause to only show statuses for accessible customers

## Customer Validation Queries (Need Security Check)

### 8. Duplicate Customer Checks (app.js:1086-1122)
**Location**: `/addCustomer` route - multiple queries  
**Current Queries**:
```sql
SELECT * FROM customers WHERE LOWER(full_name) = LOWER($1)
SELECT * FROM customers WHERE primary_email = $1
SELECT * FROM customers WHERE primary_phone = $1
SELECT * FROM customers WHERE home_address = $1
SELECT * FROM customers WHERE contact_other = $1
```
**Modification Needed**: Add user's data_security clause to prevent duplicate detection across restricted data

### 9. Customer Lookup for Updates (app.js:1331)
**Location**: `/getCustomerData` route  
**Current Query**:
```sql
SELECT * FROM customers WHERE id = $1
```
**Modification Needed**: Add user's data_security clause to ensure access rights

## Build and Project Queries

### 10. Customer's Builds (app.js:958)
**Location**: `/customer/:id` route  
**Current Query**:
```sql
SELECT products.display_text, builds.id, builds.customer_id, builds.product_id, builds.enquiry_date 
FROM builds INNER JOIN products ON builds.product_id = products.id 
WHERE customer_id = $1
```
**Modification Needed**: Add subquery to verify customer access via data_security clause

### 11. Build Status Check (app.js:1281)
**Location**: Build operations  
**Current Query**:
```sql
SELECT current_status FROM builds WHERE id = $1
```
**Modification Needed**: Add customer access verification via data_security

### 12. Build Job Lookup (app.js:1398)
**Location**: Build operations  
**Current Query**:
```sql
SELECT job_id FROM builds WHERE id = $1
```
**Modification Needed**: Add customer access verification

## Complex Build Data Queries

### 13. Customer with Build Info Lookup (app.js:143)
**Location**: `getBuildData` function  
**Current Query**:
```sql
SELECT customers.id, customers.full_name, customers.home_address 
FROM builds LEFT JOIN customers ON builds.customer_id = customers.id 
WHERE builds.id = $1
```
**Modification Needed**: Add data_security clause to customer verification

### 14. Simple Customer List (app.js:579)
**Location**: Build workflow context  
**Current Query**:
```sql
SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, 
       current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up 
FROM customers
```
**Modification Needed**: Add user's data_security clause

## Implementation Strategy

### Step 1: Deploy Security View
```sql
-- Simple security view mapping job user assignments to customer access (from schema_changes.sql)
CREATE VIEW public.user_accessible_customers AS
SELECT DISTINCT 
    c.id as customer_id,
    j.user_id as assigned_user_id
FROM public.customers c
INNER JOIN public.builds b ON c.id = b.customer_id  
INNER JOIN public.jobs j ON b.id = j.build_id
WHERE j.user_id IS NOT NULL;
```

### Step 2: Security Helper Functions
```javascript
async function getUserSecurityClause(userId) {
  const result = await db.query('SELECT data_security FROM users WHERE id = $1', [userId]);
  let clause = result.rows[0]?.data_security || '1=0';
  
  // Replace $USER_ID placeholder with actual user ID for dynamic clauses
  clause = clause.replace(/\$USER_ID/g, userId);
  
  return clause;
}

function addSecurityToCustomerQuery(baseQuery, securityClause) {
  if (securityClause === '1=1') return baseQuery; // Admin bypass
  
  const hasWhere = baseQuery.toLowerCase().includes('where');
  const operator = hasWhere ? ' AND ' : ' WHERE ';
  
  return baseQuery + operator + `(${securityClause})`;
}
```

### Step 3: Security Clause Patterns (Simplified)
**Job-based access patterns using the security view**:
- `'1=1'` - Admin access (all customers)
- `'id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = $USER_ID)'` - Job-based access
- `'1=0'` - No access

### Step 4: Query Modification Process
1. **Fetch user's security clause** with getUserSecurityClause()
2. **Process $USER_ID placeholders** with actual user ID
3. **Apply to base query** using addSecurityToCustomerQuery()
4. **Handle admin bypass** with '1=1' clause
5. **Test with sample data** to verify access control

### Step 5: Special Considerations for Job-Based Logic
- **Simple Mapping**: View only maps job assignments to customer access
- **Performance**: Fast INNER JOIN with minimal data overhead
- **Consistency**: Same pattern works across all customer queries
- **Security**: Users only see customers where they have assigned jobs

## Testing Requirements

1. **Admin Access**: Verify `1=1` clause provides full access
2. **Restricted Access**: Test various security patterns work correctly
3. **No Access**: Verify `1=0` or empty clause blocks all data
4. **Edge Cases**: Test queries with/without existing WHERE clauses
5. **Performance**: Ensure security clauses don't significantly impact query speed

## Priority Order for Implementation

1. **High Priority**: Management Report, Customer List Views (most visible)
2. **Medium Priority**: Individual customer access, validation queries
3. **Low Priority**: Build/job queries (inherit customer security)
