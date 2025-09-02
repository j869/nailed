-- Test script to verify the workflow setup was completed correctly
-- This script will check that all expected records were created

\echo '=== Workflow Setup Verification Tests ==='
\echo ''

-- Test 1: Check that all products were created
\echo 'Test 1: Verifying products 51-55 exist...'
SELECT 
    id, 
    display_text,
    CASE 
        WHEN id BETWEEN 51 AND 55 THEN '✓ Found'
        ELSE '✗ Missing'
    END as status
FROM products 
WHERE id BETWEEN 51 AND 55
ORDER BY id;

\echo ''

-- Test 2: Count job templates per workflow
\echo 'Test 2: Counting job templates per workflow...'
SELECT 
    product_id as workflow_id,
    p.display_text as workflow_name,
    COUNT(*) as template_count,
    CASE 
        WHEN product_id = 51 AND COUNT(*) = 41 THEN '✓ Correct count (41)'
        WHEN product_id = 52 AND COUNT(*) = 14 THEN '✓ Correct count (14)'
        WHEN product_id = 53 AND COUNT(*) = 13 THEN '✓ Correct count (13)'
        WHEN product_id = 54 AND COUNT(*) = 16 THEN '✓ Correct count (16)'
        WHEN product_id = 55 AND COUNT(*) = 19 THEN '✓ Correct count (19)'
        ELSE '✗ Unexpected count'
    END as status
FROM job_templates jt
JOIN products p ON jt.product_id = p.id
WHERE product_id BETWEEN 51 AND 55
GROUP BY product_id, p.display_text
ORDER BY product_id;

\echo ''

-- Test 3: Check branching tasks exist
\echo 'Test 3: Verifying branching tasks exist...'
SELECT 
    id,
    product_id as workflow_id,
    display_text,
    sort_order,
    CASE 
        WHEN id IN (5233, 5234, 5235) THEN '✓ Workflow 51 branch'
        WHEN id IN (5273, 5274) THEN '✓ Workflow 52 branch'
        ELSE '✗ Unexpected'
    END as branch_type
FROM job_templates 
WHERE id IN (5233, 5234, 5235, 5273, 5274)
ORDER BY product_id, sort_order;

\echo ''

-- Test 4: Check job_change_array triggers are set correctly
\echo 'Test 4: Verifying workflow transition triggers...'
SELECT 
    id,
    product_id as workflow_id,
    display_text,
    CASE 
        WHEN job_change_array LIKE '%"addWorkflow": "52"%' THEN '✓ Triggers Workflow 52'
        WHEN job_change_array LIKE '%"addWorkflow": "53"%' THEN '✓ Triggers Workflow 53'
        WHEN job_change_array LIKE '%"addWorkflow": "54"%' THEN '✓ Triggers Workflow 54'
        WHEN job_change_array LIKE '%"addWorkflow": "55"%' THEN '✓ Triggers Workflow 55'
        WHEN job_change_array LIKE '%"setCategory": "Archive%' THEN '✓ Archives customer'
        ELSE '✗ No trigger found'
    END as trigger_status
FROM job_templates 
WHERE id IN (5233, 5234, 5235, 5273, 5274, 5313, 5365, 5424)
ORDER BY product_id, id;

\echo ''

-- Test 5: Check ID ranges don't overlap
\echo 'Test 5: Checking ID ranges for overlaps...'
SELECT 
    product_id as workflow_id,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as count,
    CASE 
        WHEN product_id = 51 AND MIN(id) >= 5110 AND MAX(id) <= 5235 THEN '✓ Range OK (5110-5235)'
        WHEN product_id = 52 AND MIN(id) >= 5240 AND MAX(id) <= 5274 THEN '✓ Range OK (5240-5274)'
        WHEN product_id = 53 AND MIN(id) >= 5280 AND MAX(id) <= 5313 THEN '✓ Range OK (5280-5313)'
        WHEN product_id = 54 AND MIN(id) >= 5320 AND MAX(id) <= 5365 THEN '✓ Range OK (5320-5365)'
        WHEN product_id = 55 AND MIN(id) >= 5370 AND MAX(id) <= 5424 THEN '✓ Range OK (5370-5424)'
        ELSE '✗ Range issue'
    END as range_status
FROM job_templates 
WHERE product_id BETWEEN 51 AND 55
GROUP BY product_id
ORDER BY product_id;

\echo ''

-- Test 6: Check antecedent/descendant linking
\echo 'Test 6: Verifying task linking...'
SELECT 
    product_id as workflow_id,
    COUNT(CASE WHEN antecedent_array IS NOT NULL THEN 1 END) as has_antecedent,
    COUNT(CASE WHEN decendant_array IS NOT NULL THEN 1 END) as has_descendant,
    COUNT(CASE WHEN tier = '500' THEN 1 END) as header_tasks,
    COUNT(CASE WHEN tier = '501' THEN 1 END) as regular_tasks
FROM job_templates 
WHERE product_id BETWEEN 51 AND 55
GROUP BY product_id
ORDER BY product_id;

\echo ''

-- Test 7: Summary report
\echo 'Test 7: Summary Report'
\echo '====================='

SELECT 
    'Total Products Created' as metric,
    COUNT(*)::text as value
FROM products 
WHERE id BETWEEN 51 AND 55

UNION ALL

SELECT 
    'Total Job Templates Created' as metric,
    COUNT(*)::text as value
FROM job_templates 
WHERE product_id BETWEEN 51 AND 55

UNION ALL

SELECT 
    'Branching Tasks Created' as metric,
    COUNT(*)::text as value
FROM job_templates 
WHERE id IN (5233, 5234, 5235, 5273, 5274)

UNION ALL

SELECT 
    'Workflow Triggers Set' as metric,
    COUNT(*)::text as value
FROM job_templates 
WHERE product_id BETWEEN 51 AND 55 
  AND job_change_array IS NOT NULL
  AND (job_change_array LIKE '%addWorkflow%' OR job_change_array LIKE '%setCategory%');

\echo ''
\echo '=== Verification Complete ==='
\echo ''
\echo 'If all tests show ✓ status, the workflow setup was successful!'
\echo 'Any ✗ status indicates an issue that should be investigated.'
