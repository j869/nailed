/**
 * Test Script for Workflow Validator Admin Page
 * Created: 4 September 2025
 * Purpose: Debug and validate the admin workflow validator functionality
 */

import pg from "pg";
import env from "dotenv";

env.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function testWorkflowValidator() {
  console.log("tv1      Starting workflow validator test");
  
  try {
    // Test 1: Check data_problems table exists and has data
    console.log("tv101    Testing data_problems table access");
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as total_problems 
      FROM data_problems 
      WHERE problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')
    `);
    console.log("tv201    Data problems count:", tableCheck.rows[0].total_problems);

    // Test 2: Check summary statistics query
    console.log("tv102    Testing summary statistics query");
    const summaryResult = await pool.query(`
      SELECT 
        problem_type,
        severity,
        COUNT(*) as count
      FROM data_problems 
      WHERE problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')
      GROUP BY problem_type, severity
      ORDER BY problem_type, severity
    `);
    console.log("tv202    Summary rows returned:", summaryResult.rows.length);
    summaryResult.rows.forEach(row => {
      console.log(`tv203    ${row.problem_type} (${row.severity}): ${row.count}`);
    });

    // Test 3: Check detailed problems query with joins
    console.log("tv103    Testing detailed problems query with joins");
    const problemsResult = await pool.query(`
      SELECT 
        dp.id,
        dp.problem_type,
        dp.severity,
        dp.problem_description,
        dp.record_id,
        j.display_text as job_name,
        c.full_name as customer_name
      FROM data_problems dp
      LEFT JOIN jobs j ON dp.table_name = 'jobs' AND dp.record_id = j.id
      LEFT JOIN builds b ON j.build_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE dp.problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')
      ORDER BY dp.severity DESC, dp.problem_type, dp.detected_date DESC
      LIMIT 10
    `);
    console.log("tv204    Detailed problems returned:", problemsResult.rows.length);
    
    if (problemsResult.rows.length > 0) {
      console.log("tv205    Sample problem:");
      const sample = problemsResult.rows[0];
      console.log(`tv206    - Type: ${sample.problem_type}`);
      console.log(`tv207    - Severity: ${sample.severity}`);
      console.log(`tv208    - Job: ${sample.job_name || 'NULL'}`);
      console.log(`tv209    - Customer: ${sample.customer_name || 'NULL'}`);
      console.log(`tv210    - Description: ${sample.problem_description.substring(0, 100)}...`);
    }

    // Test 4: Check for missing joins (NULL customers/jobs)
    console.log("tv104    Testing for missing joins");
    const nullJoins = await pool.query(`
      SELECT 
        dp.problem_type,
        COUNT(CASE WHEN j.id IS NULL THEN 1 END) as missing_jobs,
        COUNT(CASE WHEN c.id IS NULL THEN 1 END) as missing_customers,
        COUNT(*) as total
      FROM data_problems dp
      LEFT JOIN jobs j ON dp.table_name = 'jobs' AND dp.record_id = j.id
      LEFT JOIN builds b ON j.build_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE dp.problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')
      GROUP BY dp.problem_type
    `);
    
    nullJoins.rows.forEach(row => {
      console.log(`tv211    ${row.problem_type}: ${row.missing_jobs}/${row.total} missing jobs, ${row.missing_customers}/${row.total} missing customers`);
    });

    // Test 5: Simulate data structure creation
    console.log("tv105    Testing data structure creation");
    const problemsByType = {
      json_error: [],
      missing_steps: [],
      broken_chains: [],
      template_issues: [],
      tier_violations: []
    };

    problemsResult.rows.forEach(problem => {
      if (problemsByType[problem.problem_type]) {
        problemsByType[problem.problem_type].push(problem);
      }
    });

    Object.keys(problemsByType).forEach(type => {
      console.log(`tv212    ${type}: ${problemsByType[type].length} problems`);
    });

    // Test 6: Summary calculation
    console.log("tv106    Testing summary calculation");
    const summary = {
      totalProblems: problemsResult.rows.length,
      highSeverity: problemsResult.rows.filter(p => p.severity === 'high').length,
      mediumSeverity: problemsResult.rows.filter(p => p.severity === 'medium').length,
      lowSeverity: problemsResult.rows.filter(p => p.severity === 'low').length,
      uniqueJobs: new Set(problemsResult.rows.map(p => p.record_id)).size,
      byType: {}
    };

    summaryResult.rows.forEach(row => {
      if (!summary.byType[row.problem_type]) {
        summary.byType[row.problem_type] = {};
      }
      summary.byType[row.problem_type][row.severity] = parseInt(row.count);
    });

    console.log("tv213    Summary statistics:");
    console.log(`tv214    - Total Problems: ${summary.totalProblems}`);
    console.log(`tv215    - High Severity: ${summary.highSeverity}`);
    console.log(`tv216    - Medium Severity: ${summary.mediumSeverity}`);
    console.log(`tv217    - Low Severity: ${summary.lowSeverity}`);
    console.log(`tv218    - Unique Jobs: ${summary.uniqueJobs}`);

    // Test 7: Update button functionality
    console.log("tv107    Testing update button functionality");
    const updateResponse = await fetch('http://localhost:4000/admin/update-validator-report', {
      method: 'POST'
    });

    if (updateResponse.ok) {
      console.log("tv219    Update button test passed: Validator report updated successfully");
    } else {
      console.error("tv820    Update button test failed:", updateResponse.statusText);
    }

    console.log("tv9      Workflow validator test completed successfully");
    
  } catch (error) {
    console.error("tv8      Test failed:", error.message);
    console.error("tv808    Stack trace:", error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testWorkflowValidator();
