-- Enhanced Security Implementation for Option 1B
-- Single clause with either/or attributes from customers and jobs tables

-- =============================================================================
-- SECURITY VIEW - Flattened customer and job data for flexible access control
-- =============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.user_accessible_customers;

-- Create comprehensive security view combining customer and job attributes
CREATE VIEW public.user_accessible_customers AS
SELECT DISTINCT 
    -- Primary customer identifier
    c.id as customer_id,
    
    -- Customer attributes for security filtering
    c.work_source,
    c.current_status as customer_status,
    c.council_responsible,
    c.building_type,
    c.site_location,
    c.quoted_estimate,
    c.invoices_collected,
    c.date_ordered,
    c.date_completed,
    
    -- Job attributes for security filtering  
    j.user_id as assigned_user_id,
    j.role_id as required_role_id,
    j.current_status as job_status,
    j.priority,
    
    -- Build attributes
    b.product_id,
    b.current_status as build_status,
    
    -- Derived security flags
    CASE 
        WHEN c.current_status IN ('completed', 'archived') THEN 'archived'
        WHEN c.current_status IN ('active', 'pending') THEN 'active'
        ELSE 'other'
    END as access_level,
    
    -- Regional grouping
    CASE 
        WHEN c.council_responsible ILIKE '%brisbane%' THEN 'brisbane'
        WHEN c.council_responsible ILIKE '%gold coast%' THEN 'gold_coast'
        WHEN c.council_responsible ILIKE '%sunshine coast%' THEN 'sunshine_coast'
        ELSE 'other_region'
    END as region,
    
    -- Financial flags
    CASE WHEN c.invoices_collected > 0 THEN true ELSE false END as has_payments,
    CASE WHEN c.quoted_estimate > 0 THEN true ELSE false END as has_quote

FROM public.customers c
LEFT JOIN public.builds b ON c.id = b.customer_id  
LEFT JOIN public.jobs j ON b.id = j.build_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_work_source ON public.customers(work_source);
CREATE INDEX IF NOT EXISTS idx_customers_council ON public.customers(council_responsible);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(current_status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_role_id ON public.jobs(role_id);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority);

-- Add documentation
COMMENT ON VIEW public.user_accessible_customers IS 'Security view combining customer and job attributes for flexible either/or access control';

-- =============================================================================
-- EXAMPLE SECURITY CLAUSE PATTERNS using either/or logic
-- =============================================================================

-- Store these patterns in users.data_security column:

-- 1. User assigned jobs OR BPA customers:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = $USER_ID OR work_source = ''BPA'')'

-- 2. Regional access OR user assignments:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE region = ''brisbane'' OR assigned_user_id = $USER_ID)'

-- 3. Work source OR role-based access:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE work_source IN (''BPA'', ''E'') OR required_role_id = 2)'

-- 4. Status-based OR high priority jobs:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE customer_status = ''active'' OR priority = ''high'')'

-- 5. Financial access OR assigned work:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE has_payments = true OR assigned_user_id = $USER_ID)'

-- 6. Complex multi-criteria:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE (region = ''brisbane'' AND work_source = ''BPA'') OR (assigned_user_id = $USER_ID AND priority IN (''high'', ''urgent'')))'

-- 7. Council-specific OR product-specific:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE council_responsible = ''Brisbane City Council'' OR product_id = 3)'

-- 8. Date-based OR assignment-based:
-- 'id IN (SELECT customer_id FROM user_accessible_customers WHERE date_ordered >= ''2024-01-01'' OR assigned_user_id = $USER_ID)'

-- 9. Admin access (all data):
-- '1=1'

-- 10. No access:
-- '1=0'

-- =============================================================================
-- JAVASCRIPT HELPER FUNCTIONS
-- =============================================================================

/*
// Helper function to get user's security clause
async function getUserSecurityClause(userId) {
    const result = await db.query('SELECT data_security FROM users WHERE id = $1', [userId]);
    let clause = result.rows[0]?.data_security || '1=0';
    
    // Replace $USER_ID placeholder with actual user ID
    clause = clause.replace(/\$USER_ID/g, userId);
    
    return clause;
}

// Function to apply security to customer queries
function addSecurityToCustomerQuery(baseQuery, securityClause) {
    if (securityClause === '1=1') return baseQuery; // Admin bypass
    
    const hasWhere = baseQuery.toLowerCase().includes('where');
    const operator = hasWhere ? ' AND ' : ' WHERE ';
    
    return baseQuery + operator + `(${securityClause})`;
}

// Function to apply security to builds queries  
function addSecurityToBuildsQuery(baseQuery, securityClause) {
    if (securityClause === '1=1') return baseQuery; // Admin bypass
    
    const hasWhere = baseQuery.toLowerCase().includes('where');
    const operator = hasWhere ? ' AND ' : ' WHERE ';
    
    // Convert customer security clause to builds context
    const buildsClause = securityClause.replace(/\bid\b/g, 'customer_id');
    
    return baseQuery + operator + `(${buildsClause})`;
}

// Function to apply security to jobs queries
function addSecurityToJobsQuery(baseQuery, securityClause) {
    if (securityClause === '1=1') return baseQuery; // Admin bypass
    
    const hasWhere = baseQuery.toLowerCase().includes('where');
    const operator = hasWhere ? ' AND ' : ' WHERE ';
    
    return baseQuery + operator + `build_id IN (SELECT id FROM builds WHERE ${securityClause.replace(/\bid\b/g, 'customer_id')})`;
}

// Example usage:
app.get('/customers', async (req, res) => {
    try {
        const securityClause = await getUserSecurityClause(req.user.id);
        const secureQuery = addSecurityToCustomerQuery(
            "SELECT * FROM customers WHERE full_name LIKE $1", 
            securityClause
        );
        const result = await db.query(secureQuery, [`%${req.query.search}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error('Security query error:', error);
        res.status(500).json({error: 'Access denied'});
    }
});
*/
