# Admin Workflow Review & Maintenance Feature

## Overview
Create an admin route to review and validate workflow data without enforcing rules yet. This feature will analyze the complex workflow system where customers have builds (products) with workflows, and each job has a change_array that requires validation.

## Database Schema Understanding

### Core Relationships
```
customers (1) → (many) builds → (1) product → (many) job_templates
builds (1) → (many) jobs
job_templates (1) → (many) jobs
```

### Key Tables
- **customers**: Customer information
- **builds**: Product instances for customers (customer_id, product_id)
- **products**: Workflow types (Initial Enquiry=8, Vic Permits=5, Shed Construction=4, etc.)
- **job_templates**: Master workflow definitions (product_id, antecedent_array, decendant_array, job_change_array)
- **jobs**: Active workflow instances (build_id, job_template_id, change_array)

## Required Admin Route: `/admin/workflow-review`

### Route Structure
```javascript
app.get("/admin/workflow-review", async (req, res) => {
  // Implementation details below
});
```

### Core Analysis Functions

#### 1. **Workflow Data Collection**
```javascript
async function getWorkflowAnalysisData() {
  // Get all active customers with builds and workflows
  const query = `
    SELECT 
      c.id as customer_id,
      c.full_name,
      c.current_status as customer_status,
      b.id as build_id,
      b.product_id,
      p.display_text as product_name,
      j.id as job_id,
      j.display_text as job_name,
      j.job_template_id,
      j.current_status as job_status,
      j.change_array as job_change_array,
      jt.antecedent_array as template_antecedent,
      jt.decendant_array as template_decendant,
      jt.job_change_array as template_change_array,
      jt.tier,
      jt.sort_order
    FROM customers c
    LEFT JOIN builds b ON c.id = b.customer_id
    LEFT JOIN products p ON b.product_id = p.id
    LEFT JOIN jobs j ON b.id = j.build_id
    LEFT JOIN job_templates jt ON j.job_template_id = jt.id
    WHERE c.current_status NOT LIKE 'Archive%'
    ORDER BY c.id, b.id, jt.sort_order
  `;
}
```

#### 2. **Change Array Validation**
```javascript
async function validateChangeArrays(workflowData) {
  const validationResults = {
    valid: [],
    invalid: [],
    warnings: []
  };

  for (const workflow of workflowData) {
    // Validate job change_array format
    if (workflow.job_change_array) {
      try {
        const parsed = JSON.parse(workflow.job_change_array);
        const validation = validateChangeArrayStructure(parsed, workflow);
        if (validation.isValid) {
          validationResults.valid.push({...workflow, validation});
        } else {
          validationResults.invalid.push({...workflow, validation});
        }
      } catch (error) {
        validationResults.invalid.push({
          ...workflow, 
          validation: { isValid: false, error: 'Invalid JSON format' }
        });
      }
    }
  }

  return validationResults;
}

function validateChangeArrayStructure(changeArray, workflow) {
  const validationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check if it's an array
  if (!Array.isArray(changeArray)) {
    validationResult.isValid = false;
    validationResult.errors.push('Change array must be an array');
    return validationResult;
  }

  // Validate each change object
  changeArray.forEach((change, index) => {
    // Validate antecedent field
    if (!change.antecedent) {
      validationResult.errors.push(`Item ${index}: Missing 'antecedent' field`);
      validationResult.isValid = false;
    } else if (!['complete', 'pending', 'active'].includes(change.antecedent)) {
      validationResult.warnings.push(`Item ${index}: Unusual antecedent value '${change.antecedent}'`);
    }

    // Validate action fields (decendant, product, customer)
    const actionFields = ['decendant', 'product', 'customer'];
    const hasAction = actionFields.some(field => change[field]);
    
    if (!hasAction) {
      validationResult.errors.push(`Item ${index}: Missing action field (decendant/product/customer)`);
      validationResult.isValid = false;
    }

    // Validate specific action structures
    if (change.decendant && !Array.isArray(change.decendant)) {
      validationResult.errors.push(`Item ${index}: 'decendant' must be an array`);
      validationResult.isValid = false;
    }

    if (change.product && !Array.isArray(change.product)) {
      validationResult.errors.push(`Item ${index}: 'product' must be an array`);
      validationResult.isValid = false;
    }

    // Validate workflow trigger logic
    if (change.product) {
      change.product.forEach((productAction, pIndex) => {
        if (productAction.addWorkflow && !isValidProductId(productAction.addWorkflow)) {
          validationResult.warnings.push(`Item ${index}.product[${pIndex}]: Product ID '${productAction.addWorkflow}' may not exist`);
        }
      });
    }
  });

  return validationResult;
}
```

#### 3. **Workflow Integrity Checks**
```javascript
async function checkWorkflowIntegrity(workflowData) {
  const integrityChecks = {
    orphanedJobs: [],
    missingTemplates: [],
    brokenChains: [],
    tierViolations: []
  };

  // Group by build for analysis
  const buildGroups = groupBy(workflowData, 'build_id');

  for (const [buildId, jobs] of Object.entries(buildGroups)) {
    // Check for orphaned jobs (no template)
    const orphaned = jobs.filter(j => j.job_id && !j.job_template_id);
    integrityChecks.orphanedJobs.push(...orphaned);

    // Check for missing templates
    const missingTemplates = jobs.filter(j => j.job_template_id && !j.template_antecedent);
    integrityChecks.missingTemplates.push(...missingTemplates);

    // Check antecedent/descendant chains
    const chainIssues = validateWorkflowChains(jobs);
    integrityChecks.brokenChains.push(...chainIssues);

    // Check tier inheritance rules
    const tierIssues = validateTierInheritance(jobs);
    integrityChecks.tierViolations.push(...tierIssues);
  }

  return integrityChecks;
}

function validateTierInheritance(jobs) {
  const tierIssues = [];
  const tier500Jobs = jobs.filter(j => j.tier === 500).sort((a, b) => a.sort_order - b.sort_order);
  const tier501Jobs = jobs.filter(j => j.tier === 501);

  // Rule: Tier 500 tasks should inherit from previous tier 500 task
  for (let i = 1; i < tier500Jobs.length; i++) {
    const current = tier500Jobs[i];
    const previous = tier500Jobs[i - 1];
    
    if (current.template_antecedent != previous.job_template_id) {
      tierIssues.push({
        ...current,
        issue: `Tier 500 task should inherit from previous tier 500 task (${previous.job_template_id}), but inherits from ${current.template_antecedent}`,
        severity: 'warning'
      });
    }
  }

  // Rule: Tier 501 tasks should inherit from their parent tier 500 task
  tier501Jobs.forEach(job => {
    const parentTier500 = tier500Jobs.find(t500 => 
      t500.sort_order <= job.sort_order && 
      (!tier500Jobs.find(t => t.sort_order > t500.sort_order && t.sort_order <= job.sort_order))
    );

    if (parentTier500 && job.template_antecedent != parentTier500.job_template_id) {
      tierIssues.push({
        ...job,
        issue: `Tier 501 task should inherit from parent tier 500 task (${parentTier500.job_template_id}), but inherits from ${job.template_antecedent}`,
        severity: 'error'
      });
    }
  });

  return tierIssues;
}
```

#### 4. **Product Workflow Analysis**
```javascript
async function analyzeProductWorkflows() {
  const query = `
    SELECT 
      p.id as product_id,
      p.display_text as product_name,
      COUNT(jt.id) as template_count,
      COUNT(CASE WHEN jt.tier = 500 THEN 1 END) as header_count,
      COUNT(CASE WHEN jt.tier = 501 THEN 1 END) as task_count,
      COUNT(CASE WHEN jt.job_change_array IS NOT NULL THEN 1 END) as automation_count,
      STRING_AGG(DISTINCT 
        CASE WHEN jt.job_change_array LIKE '%addWorkflow%' 
        THEN jt.id::text || ':' || jt.display_text 
        END, ', '
      ) as workflow_triggers
    FROM products p
    LEFT JOIN job_templates jt ON p.id = jt.product_id
    GROUP BY p.id, p.display_text
    ORDER BY p.id
  `;
}
```

### EJS View Structure: `views/admin/workflowReview.ejs`

```ejs
<!DOCTYPE html>
<html>
<head>
    <title>Workflow Review & Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .validation-error { color: #dc3545; }
        .validation-warning { color: #ffc107; }
        .validation-success { color: #198754; }
        .integrity-issue { background-color: #fff3cd; padding: 0.5rem; margin: 0.25rem 0; border-radius: 0.25rem; }
        .severity-error { border-left: 4px solid #dc3545; }
        .severity-warning { border-left: 4px solid #ffc107; }
        .nav-tabs { margin-bottom: 20px; }
        .workflow-card { margin-bottom: 15px; }
        .change-array-code { background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.85em; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h1>Workflow Review & Analysis</h1>
        
        <!-- Navigation Tabs -->
        <ul class="nav nav-tabs" id="reviewTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab">Overview</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="validation-tab" data-bs-toggle="tab" data-bs-target="#validation" type="button" role="tab">
                    Change Array Validation 
                    <span class="badge bg-danger"><%= validationResults.invalid.length %></span>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="integrity-tab" data-bs-toggle="tab" data-bs-target="#integrity" type="button" role="tab">
                    Workflow Integrity
                    <span class="badge bg-warning"><%= integrityChecks.brokenChains.length + integrityChecks.tierViolations.length %></span>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="products-tab" data-bs-toggle="tab" data-bs-target="#products" type="button" role="tab">Product Analysis</button>
            </li>
        </ul>

        <div class="tab-content" id="reviewTabContent">
            <!-- Overview Tab -->
            <div class="tab-pane fade show active" id="overview" role="tabpanel">
                <div class="row">
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Active Customers</h5>
                                <h3 class="text-primary"><%= overview.activeCustomers %></h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Active Builds</h5>
                                <h3 class="text-info"><%= overview.activeBuilds %></h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Active Jobs</h5>
                                <h3 class="text-success"><%= overview.activeJobs %></h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Validation Issues</h5>
                                <h3 class="text-danger"><%= validationResults.invalid.length %></h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Validation Tab -->
            <div class="tab-pane fade" id="validation" role="tabpanel">
                <h3>Change Array Validation Results</h3>
                
                <!-- Invalid Change Arrays -->
                <% if (validationResults.invalid.length > 0) { %>
                <div class="card border-danger mb-3">
                    <div class="card-header bg-danger text-white">
                        <h5>Invalid Change Arrays (<%= validationResults.invalid.length %>)</h5>
                    </div>
                    <div class="card-body">
                        <% validationResults.invalid.forEach(function(item) { %>
                        <div class="workflow-card border border-danger rounded p-3">
                            <h6>Customer: <%= item.full_name %> | Job: <%= item.job_name %> (ID: <%= item.job_id %>)</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Current Change Array:</strong>
                                    <div class="change-array-code"><%= item.job_change_array || 'NULL' %></div>
                                </div>
                                <div class="col-md-6">
                                    <strong>Issues:</strong>
                                    <ul class="list-unstyled">
                                        <% if (item.validation.errors) { %>
                                            <% item.validation.errors.forEach(function(error) { %>
                                            <li class="validation-error">❌ <%= error %></li>
                                            <% }); %>
                                        <% } %>
                                        <% if (item.validation.warnings) { %>
                                            <% item.validation.warnings.forEach(function(warning) { %>
                                            <li class="validation-warning">⚠️ <%= warning %></li>
                                            <% }); %>
                                        <% } %>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <% }); %>
                    </div>
                </div>
                <% } %>

                <!-- Valid Change Arrays with Warnings -->
                <% const validWithWarnings = validationResults.valid.filter(v => v.validation.warnings && v.validation.warnings.length > 0); %>
                <% if (validWithWarnings.length > 0) { %>
                <div class="card border-warning mb-3">
                    <div class="card-header bg-warning">
                        <h5>Valid Arrays with Warnings (<%= validWithWarnings.length %>)</h5>
                    </div>
                    <div class="card-body">
                        <% validWithWarnings.forEach(function(item) { %>
                        <div class="workflow-card border border-warning rounded p-3">
                            <h6>Customer: <%= item.full_name %> | Job: <%= item.job_name %> (ID: <%= item.job_id %>)</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Change Array:</strong>
                                    <div class="change-array-code"><%= item.job_change_array %></div>
                                </div>
                                <div class="col-md-6">
                                    <strong>Warnings:</strong>
                                    <ul class="list-unstyled">
                                        <% item.validation.warnings.forEach(function(warning) { %>
                                        <li class="validation-warning">⚠️ <%= warning %></li>
                                        <% }); %>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <% }); %>
                    </div>
                </div>
                <% } %>
            </div>

            <!-- Integrity Tab -->
            <div class="tab-pane fade" id="integrity" role="tabpanel">
                <h3>Workflow Integrity Issues</h3>
                
                <!-- Tier Violations -->
                <% if (integrityChecks.tierViolations.length > 0) { %>
                <div class="card border-danger mb-3">
                    <div class="card-header bg-danger text-white">
                        <h5>Tier Inheritance Violations (<%= integrityChecks.tierViolations.length %>)</h5>
                    </div>
                    <div class="card-body">
                        <% integrityChecks.tierViolations.forEach(function(violation) { %>
                        <div class="integrity-issue severity-<%= violation.severity %>">
                            <strong>Job Template ID <%= violation.job_template_id %>:</strong> <%= violation.job_name %><br>
                            <small><%= violation.issue %></small>
                        </div>
                        <% }); %>
                    </div>
                </div>
                <% } %>

                <!-- Broken Chains -->
                <% if (integrityChecks.brokenChains.length > 0) { %>
                <div class="card border-warning mb-3">
                    <div class="card-header bg-warning">
                        <h5>Broken Workflow Chains (<%= integrityChecks.brokenChains.length %>)</h5>
                    </div>
                    <div class="card-body">
                        <% integrityChecks.brokenChains.forEach(function(chain) { %>
                        <div class="integrity-issue severity-warning">
                            <strong>Customer <%= chain.customer_id %>:</strong> <%= chain.full_name %><br>
                            <small>Build <%= chain.build_id %> | Product: <%= chain.product_name %></small><br>
                            <small><%= chain.issue %></small>
                        </div>
                        <% }); %>
                    </div>
                </div>
                <% } %>
            </div>

            <!-- Products Tab -->
            <div class="tab-pane fade" id="products" role="tabpanel">
                <h3>Product Workflow Analysis</h3>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Product ID</th>
                                <th>Product Name</th>
                                <th>Templates</th>
                                <th>Headers (Tier 500)</th>
                                <th>Tasks (Tier 501)</th>
                                <th>Automation Rules</th>
                                <th>Workflow Triggers</th>
                            </tr>
                        </thead>
                        <tbody>
                            <% productAnalysis.forEach(function(product) { %>
                            <tr>
                                <td><%= product.product_id %></td>
                                <td><%= product.product_name %></td>
                                <td><%= product.template_count %></td>
                                <td><%= product.header_count %></td>
                                <td><%= product.task_count %></td>
                                <td><%= product.automation_count %></td>
                                <td><small><%= product.workflow_triggers || 'None' %></small></td>
                            </tr>
                            <% }); %>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

### Implementation Steps

1. **Add the route to app.js** (after existing admin routes):
```javascript
app.get("/admin/workflow-review", async (req, res) => {
  if (req.isAuthenticated()) {
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send('Access denied - System administrator privileges required');
    }
    
    try {
      // Collect workflow data
      const workflowData = await getWorkflowAnalysisData();
      
      // Run validations
      const validationResults = await validateChangeArrays(workflowData);
      const integrityChecks = await checkWorkflowIntegrity(workflowData);
      const productAnalysis = await analyzeProductWorkflows();
      
      // Generate overview statistics
      const overview = {
        activeCustomers: new Set(workflowData.map(w => w.customer_id)).size,
        activeBuilds: new Set(workflowData.map(w => w.build_id)).size,
        activeJobs: workflowData.filter(w => w.job_id).length,
        totalIssues: validationResults.invalid.length + integrityChecks.tierViolations.length
      };
      
      res.render("admin/workflowReview.ejs", {
        workflowData,
        validationResults,
        integrityChecks,
        productAnalysis,
        overview,
        user: req.user
      });
      
    } catch (error) {
      console.error("Error in workflow review:", error);
      res.status(500).send("Error loading workflow review");
    }
  } else {
    res.redirect("/login");
  }
});
```

2. **Add helper functions** before the route definition

3. **Create the EJS view** at `views/admin/workflowReview.ejs`

4. **Add navigation link** to existing admin pages

### Expected Outcomes

This feature will provide:

1. **Visual Overview**: Dashboard showing active customers, builds, jobs, and issues
2. **Change Array Validation**: Detailed analysis of job_change_array JSON structures
3. **Workflow Integrity Checks**: Detection of broken antecedent/descendant chains
4. **Tier Inheritance Validation**: Verification of proper tier 500/501 relationships
5. **Product Analysis**: Summary of each product's workflow configuration
6. **Issue Prioritization**: Clear categorization of errors vs warnings

This analysis tool will help identify data inconsistencies and workflow configuration problems without enforcing corrections, allowing for informed decision-making about workflow maintenance and cleanup.