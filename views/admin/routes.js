import express from 'express';
import axios from 'axios';
import multer from "multer";
const router = express.Router();
const baseURL = process.env.BASE_URL;
const apiURL = process.env.API_URL;

// import upload from "./fileUpload.js";
// import { pool } from "./database.js";
import pg from "pg";

const { Pool } = pg;
export const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
const db = pool; // For consistency with other files


// Multer setup for file upload (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log(`File upload attempt: ${file.originalname} with MIME type: ${file.mimetype}`);
    
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm (standard)
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsm (sometimes reported as this)
      "application/octet-stream" // Fallback for some systems
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.xlsm'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      console.log(`File rejected: ${file.originalname} (MIME: ${file.mimetype}, Extension: ${fileExtension})`);
      cb(new Error(`Only .xlsx, .xls, and .xlsm files are allowed. Received: ${file.mimetype} for file: ${file.originalname}`));
    }
  }
});

// DEMO: Rule Engine Administration Interface
router.get("/demo/rules", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  
  console.log(`demo1   USER(${req.user.id}) accessing rule engine demo`);
  res.render("admin/rule-engine-demo");
});


// Rule Test API Endpoint - integrates with existing workflow rule engine
router.post("/rule-test", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    const { rule, jobId, scenario } = req.body;
    
    console.log(`ruleTest   USER(${req.user.id}) testing rule: ${rule.name}`);
    
    // Import the RuleEngine
    const { RuleEngine } = await import('../../utils/ruleEngine.js');
    const ruleEngine = new RuleEngine();
    
    // Simulate test context based on scenario
    let testContext = {
      user: req.user,
      jobId: jobId || 101, // Default test job
      scenario: scenario,
      timestamp: new Date().toISOString()
    };
    
    // Simulate different test scenarios
    let testData = {};
    switch (scenario) {
      case 'status_change':
        testData = {
          fieldID: 'status',
          newValue: 'complete',
          oldValue: 'active',
          rowID: testContext.jobId,
          table: 'jobs'
        };
        break;
      case 'tier_update':
        testData = {
          fieldID: 'tier',
          newValue: '300',
          oldValue: '200',
          rowID: testContext.jobId,
          table: 'jobs'
        };
        break;
      case 'date_trigger':
        testData = {
          fieldID: 'date_due',
          newValue: new Date().toISOString(),
          oldValue: null,
          rowID: testContext.jobId,
          table: 'jobs'
        };
        break;
      default:
        testData = {
          fieldID: rule.trigger?.field || 'status',
          newValue: 'test_value',
          oldValue: 'old_value',
          rowID: testContext.jobId,
          table: 'jobs'
        };
    }
    
    const startTime = Date.now();
    
    // Test the rule using our existing rule engine
    const testResult = await ruleEngine.processUpdate(testData, testContext);
    
    const executionTime = Date.now() - startTime;
    
    // Evaluate conditions (simulate for demo)
    const conditionsEvaluated = rule.conditions?.map(condition => ({
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      passed: Math.random() > 0.3 // Simulate 70% pass rate
    })) || [];
    
    // Track actions that would be executed
    const actionsExecuted = rule.actions?.map(action => ({
      type: action.type,
      description: `Would execute ${action.type} with value: ${action.value}`,
      executed: testResult.success
    })) || [];
    
    // Validate rule structure
    const validationResults = rule.validations?.map(validation => ({
      field: validation.field,
      type: validation.type,
      passed: Math.random() > 0.2, // Simulate 80% validation pass rate
      message: validation.message
    })) || [];
    
    const response = {
      success: true,
      passed: testResult.success && conditionsEvaluated.every(c => c.passed),
      executionTime: executionTime,
      ruleEngine: testResult,
      conditionsEvaluated: conditionsEvaluated,
      actionsExecuted: actionsExecuted,
      validationResults: validationResults,
      logs: [
        `Rule test started for: ${rule.name}`,
        `Scenario: ${scenario}`,
        `Test data: ${JSON.stringify(testData)}`,
        `Rule engine result: ${testResult.success ? 'SUCCESS' : 'FAILED'}`,
        `Execution completed in ${executionTime}ms`
      ]
    };
    
    console.log(`ruleTest   Rule test completed for ${rule.name} in ${executionTime}ms`);
    res.json(response);

  } catch (error) {
    console.error('Rule test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      logs: [`Error: ${error.message}`]
    });
  }
});


//#region job templates

router.get("/job-templates", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(`jt1      USER(${req.user.id}) accessing job templates`);
    // Check if user has sysadmin role
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send(`
        <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
          <h1 style="color: #dc3545;">Access Denied</h1>
          <p>System administrator privileges required to access Job Templates.</p>
          <a href="/" style="color: #007bff; text-decoration: none;">← Return to Home</a>
        </div>
      `);
    }
    
    try {
      console.log("jt2      Fetching job templates from API");
      const { product_id } = req.query;
      let apiUrl = `${process.env.API_URL}/job-templates`;
      
      if (product_id) {
        apiUrl += `?product_id=${encodeURIComponent(product_id)}`;
      }
      
      const response = await axios.get(apiUrl);
      res.render("jobTemplates.ejs", {
        jobTemplates: response.data.jobTemplates,
        products: response.data.products,
        selectedProductId: response.data.selectedProductId,
        baseURL: baseURL,
        user: req.user
      });
      console.log("jt3      Job templates page rendered");
    } catch (error) {
      console.error("Error fetching job templates:", error);
      res.render("jobTemplates.ejs", {
        jobTemplates: [],
        products: [],
        selectedProductId: '',
        error: "Error loading job templates",
        baseURL: process.env.BASE_URL,
        user: req.user
      });
    }
  } else {
    console.log("jt91      User not authenticated, redirecting to login");
    res.redirect("/login");
  }
});

//#endregion



// Admin Home Interface
router.get("/home", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  
  console.log(`wh1      USER(${req.user.id}) accessing admin home`);
  res.render("admin/home");
});

// Production Rule Builder Interface
router.get("/rule-builder", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  
  console.log(`wv1      USER(${req.user.id}) accessing production rule builder`);
  res.render("admin/rule-builder");
});

// Workflow Validator Admin Interface
router.get("/workflow-validator", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  
  console.log("wv1      Starting workflow validator admin page", { userId: req.user.id });
  
  try {
    // Call the API endpoint on the backend server
    const response = await axios.get(`${process.env.API_URL}/api/workflow-problems`);
    
    if (response.status !== 200) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.error);
    }

    console.log("wv9      Workflow validator data loaded from API", { 
      totalProblems: data.summary.totalProblems, 
      uniqueJobs: data.summary.uniqueJobs 
    });

    res.render("admin/workflow-validator", {
      user: req.user,
      problems: data.problems,
      summary: data.summary,
      lastUpdate: data.lastUpdate
    });

  } catch (error) {
    console.error("wv8      Workflow validator error", { error: error.message });
    res.status(500).send("Error loading workflow validator");
  }
});


// Save Rule API Endpoint - integrates with existing system
router.post("/rules", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    const rule = req.body;
    
    console.log(`saveRule   USER(${req.user.id}) saving rule: ${rule.name}`);
    
    // Validate rule structure
    if (!rule.name || !rule.trigger || !rule.actions) {
      throw new Error('Invalid rule structure: missing required fields');
    }
    
    // Add metadata
    rule.id = Date.now(); // Simple ID generation
    rule.createdBy = req.user.id;
    rule.createdAt = new Date().toISOString();
    rule.updatedAt = new Date().toISOString();
    
    // In production, this would save to your database
    // For now, we'll just log it and return success
    console.log('Rule to save:', JSON.stringify(rule, null, 2));
    
    // TODO: Integrate with your actual rule storage system
    // This could save to the same tables used by your workflow system
    
    res.json({
      success: true,
      ruleId: rule.id,
      message: 'Rule saved successfully'
    });

  } catch (error) {
    console.error('Save rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEMO: Get field configurations
router.get("/rules/configs", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Return demo configurations
  const demoConfigs = {
    jobTitle: {
      table: 'jobs',
      column: 'display_text',
      validations: [
        { type: 'required' },
        { type: 'maxLength', value: 126 }
      ],
      encoding: 'uri',
      preActions: [],
      postActions: [
        {
          type: 'notify',
          condition: 'always',
          params: { message: 'Job title updated' }
        }
      ]
    },
    jobStatus: {
      table: 'jobs',
      column: 'current_status',
      validations: [{ type: 'required' }],
      preActions: [],
      postActions: [
        {
          type: 'updateDate',
          condition: { field: 'current_status', value: 'complete' },
          params: { table: 'jobs', column: 'completed_date', value: 'now' }
        },
        {
          type: 'executeWorkflow',
          condition: 'always',
          params: { triggerField: 'change_array' }
        }
      ]
    }
  };

  res.json(demoConfigs);
});

// DEMO: Rule Engine API Endpoint for testing
router.post("/rules/test", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    // Import the RuleEngine (would be at module level in production)
    const { RuleEngine } = await import('../../utils/ruleEngine.js');
    const ruleEngine = new RuleEngine();

    const { fieldID, newValue, rowID } = req.body;
    
    console.log(`demo2   USER(${req.user.id}) testing rule engine - ${fieldID}: ${newValue}`);

    // Create mock context for demo
    const context = {
      user: req.user,
      axios: {
        get: async (url, params) => {
          console.log(`demo3   Mock API call: ${url}`, params);
          return { status: 201, data: { success: true } };
        }
      },
      API_URL: process.env.API_URL || 'http://localhost:3000/api',
      db: req.db
    };

    const result = await ruleEngine.processUpdate(
      { fieldID, newValue, rowID, table: null },
      context
    );

    res.json(result);

  } catch (error) {
    console.error('Demo rule engine error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



//#region admin user management

router.get("/users", async (req, res) => {
  if (req.isAuthenticated()) {
    // Check if user has sysadmin role
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send(`
        <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
          <h1 style="color: #dc3545;">Access Denied</h1>
          <p>System administrator privileges required to manage users.</p>
          <a href="/" style="color: #007bff; text-decoration: none;">← Return to Home</a>
        </div>
      `);
    }
    
    try {
      console.log("djd1  ")
      
      // Call the API endpoint on the backend server
      const response = await axios.get(`${process.env.API_URL}/api/admin/users`);
      
      if (response.status !== 200) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      res.render("admin/users.ejs", {
        users: data.users,
        user: req.user
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Error loading user list");
    }
  } else {
    res.redirect("/login");
  }
});

router.get("/users/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    // Check if user has sysadmin role
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send(`
        <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
          <h1 style="color: #dc3545;">Access Denied</h1>
          <p>System administrator privileges required to edit users.</p>
          <a href="/admin/users" style="color: #007bff; text-decoration: none;">← Return to User List</a>
        </div>
      `);
    }
    
    try {
      const userId = parseInt(req.params.id);
      // Use API endpoint instead of direct DB query
      const response = await axios.get(`${process.env.API_URL}/api/admin/users/${userId}`);
      if (response.status !== 200) {
        throw new Error(`API call failed: ${response.status}`);
      }
      const data = response.data;
      if (!data.success) {
        return res.status(404).send("User not found");
      }
      res.render("admin/editUser.ejs", {
        editUser: data.user,
        user: req.user
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("Error loading user");
    }
  } else {
    res.redirect("/login");
  }
});

router.post("/users/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    // Check if user has sysadmin role
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send("Access denied");
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { email, full_name, display_name, data_security, roles } = req.body;
      // Use API endpoint instead of direct DB query
      const response = await axios.post(`${process.env.API_URL}/api/admin/users/${userId}`, {
        email,
        full_name,
        display_name,
        data_security,
        roles
      });
      if (response.status !== 200) {
        throw new Error(`API call failed: ${response.status}`);
      }
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || "Error updating user");
      }
      console.log(`Admin ${req.user.id} updated user ${userId}`);
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Error updating user");
    }
  } else {
    res.redirect("/login");
  }
});

//#endregion


// Simple Rule Templates Editor
router.get("/rule-templates-editor", async (req, res) => {
  console.log("Accessing rule templates editor");
  if (req.isAuthenticated()) {
    try {
      const result = await db.query('SELECT * FROM rule_templates ORDER BY id');
      res.render('rule-templates-editor', { templates: result.rows });
    } catch (error) {
      console.error('Error fetching rule templates:', error);
      res.render('rule-templates-editor', { templates: [] });
    }
  } else {
    res.redirect('/login');
  }
});

router.get("/rule-templates-editor/add", (req, res) => {
  if (req.isAuthenticated()) {
    // Create a simple new template
    db.query(`INSERT INTO rule_templates (name, description, category, template_json) 
                VALUES ('New Template', 'Enter description', 'custom', '{}') RETURNING id`)
      .then(result => {
        res.redirect('/rule-templates-editor');
      })
      .catch(error => {
        console.error('Error adding template:', error);
        res.redirect('/rule-templates-editor');
      });
  } else {
    res.redirect('/login');
  }
});

router.get("/rule-templates-editor/delete", (req, res) => {
  if (req.isAuthenticated() && req.query.id) {
    db.query('DELETE FROM rule_templates WHERE id = $1', [req.query.id])
      .then(() => {
        res.redirect('/rule-templates-editor');
      })
      .catch(error => {
        console.error('Error deleting template:', error);
        res.redirect('/rule-templates-editor');
      });
  } else {
    res.redirect('/rule-templates-editor');
  }
});

router.get("/wf-rule-report", async (req, res) => {
  console.log("wr1     navigate to WF RULE REPORT page");
  if (req.isAuthenticated()) {
    // Check if user has admin/sysadmin role
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      console.log("wr2     Access denied - user does not have sysadmin role");
      return res.status(403).send("Access denied - Admin role required");
    }

    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0';
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      // Get individual jobs with their change_arrays for pattern analysis
      const jobsQuery = `
        SELECT 
          j.job_template_id,
          jt.display_text as template_name,
          j.sort_order,
          j.id as job_id,
          j.display_text as job_name,
          j.change_array,
          COALESCE(c.full_name, 'No Customer') as customer_name,
          j.build_id,
          j.product_id
        FROM jobs j
        LEFT JOIN job_templates jt ON j.job_template_id = jt.id
        LEFT JOIN builds b ON j.build_id = b.id
        LEFT JOIN customers c ON b.customer_id = c.id
        AND j.change_array IS NOT NULL 
        AND j.change_array != ''
        AND (${processedSecurityClause})
        ORDER BY j.sort_order, j.job_template_id, j.id
      `;

      const jobsResult = await db.query(jobsQuery);

      // Process and group by patterns
      const templateGroups = {};

      jobsResult.rows.forEach(job => {
        const templateId = job.job_template_id;

        if (!templateGroups[templateId]) {
          templateGroups[templateId] = {
            job_template_id: templateId,
            template_name: job.template_name,
            jobs: [],
            patterns: {}
          };
        }

        // Add job to template group
        templateGroups[templateId].jobs.push(job);

        // Create pattern by replacing @jobId with @X
        if (job.change_array) {
          const pattern = job.change_array.replace(/@\d+/g, '@X');

          if (!templateGroups[templateId].patterns[pattern]) {
            templateGroups[templateId].patterns[pattern] = {
              pattern: pattern,
              example: job.change_array,
              count: 0,
              job_ids: []
            };
          }

          templateGroups[templateId].patterns[pattern].count++;
          templateGroups[templateId].patterns[pattern].job_ids.push(job.job_id);
        }
      });

      // Convert to array format for the view
      const jobs = Object.values(templateGroups).map(template => {
        const uniqueJobNames = [...new Set(template.jobs.map(j => j.job_name).filter(name => name))];
        const uniqueProducts = [...new Set(template.jobs.map(j => j.product_id).filter(id => id))];
        const uniqueSortOrders = [...new Set(template.jobs.map(j => j.sort_order).filter(order => order !== null && order !== undefined))];

        return {
          job_template_id: template.job_template_id,
          template_name: template.template_name,
          job_count: template.jobs.length,
          job_ids: template.jobs.map(j => j.job_id),
          job_names: uniqueJobNames,
          product_ids: uniqueProducts,
          sort_orders: uniqueSortOrders,
          patterns: Object.values(template.patterns)
        };
      });

      console.log("wr3      WF Rule Report loaded with pattern analysis:", jobs.length, "templates");

      // Create rule groups - group all jobs by their change_array pattern across all templates
      const rulePatterns = {};
      let patternCounter = 1;

      jobsResult.rows.forEach(job => {
        if (job.change_array) {
          const pattern = job.change_array.replace(/@\d+/g, '@X');

          if (!rulePatterns[pattern]) {
            rulePatterns[pattern] = {
              pattern_id: patternCounter++,
              pattern: pattern,
              change_array: job.change_array, // Use first occurrence as example
              job_count: 0,
              job_ids: [],
              template_ids: []
            };
          }

          rulePatterns[pattern].job_count++;
          rulePatterns[pattern].job_ids.push(job.job_id);
          rulePatterns[pattern].template_ids.push(job.job_template_id);
        }
      });

      const ruleGroups = Object.values(rulePatterns);

      // Also get individual jobs for backward compatibility
      const individualJobs = jobsResult.rows.map(job => ({
        job_id: job.job_id,
        job_template_id: job.job_template_id,
        template_name: job.template_name,
        job_name: job.job_name,
        sort_order: job.sort_order,
        change_array: job.change_array
      }));

      res.render("wf-rule-report.ejs", {
        user: req.user,
        jobs: jobs,
        individualJobs: individualJobs,
        ruleGroups: ruleGroups
      });

    } catch (err) {
      console.error("Error loading WF rule report:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
});


// Update change_array values for workflow rules
router.post("/wf-rule-report/update", async (req, res) => {
  console.log("wru1    WF Rule Report update request");
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  // Check if user has admin/sysadmin role
  if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
    console.log("wru2    Access denied - user does not have sysadmin role");
    return res.status(403).json({ success: false, error: "Access denied - Admin role required" });
  }

  try {
    const { templateIds, jobIds, newChangeArray, newTemplateName } = req.body;

    if (!jobIds || !Array.isArray(jobIds) || !newChangeArray) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }

    console.log(`wru3a   Job IDs array:`, jobIds);
    console.log(`wru3b   New change_array:`, newChangeArray);
    if (newTemplateName) {
      console.log(`wru3c   New template name:`, newTemplateName);
    }

    // Get user's security clause for data access control
    const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
    const securityClause = securityResult.rows[0]?.data_security || '1=0';
    const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

    console.log(`wru3d   Security clause: ${processedSecurityClause}`);

    // Update the change_array for specified jobs with optional template filtering
    let updateQuery, queryParams;
    if (newChangeArray) {
      if (templateIds) {
        // templateIds can be a comma-separated string or a single value
        const templateIdArr = templateIds.split(',').map(id => id.trim()).filter(Boolean);
        updateQuery = `
          UPDATE jobs 
          SET change_array = $1
          WHERE job_template_id = ANY($2) 
            AND id = ANY($3)
        `;
        queryParams = [newChangeArray, templateIdArr, jobIds];
        console.log(`wru3    Updating change_array for template(s) - UPDATE jobs SET change_array = $1 WHERE job_template_id = ANY(${templateIdArr}) AND id = ANY($3)`);
      } else {
        updateQuery = `
          UPDATE jobs 
          SET change_array = $1
          WHERE id = ANY($2)
        `;
        queryParams = [newChangeArray, jobIds];
      }

      console.log(`wru3e   Update query:`, updateQuery);
      console.log(`wru3f   Query params:`, queryParams);

      // Check which jobs exist and meet the criteria
      const checkQuery = `
        SELECT j.id, j.job_template_id, j.build_id
        FROM jobs j
        WHERE j.id = ANY($1)
      `;
      const checkResult = await db.query(checkQuery, [jobIds]);
      console.log(`wru3g   Jobs found matching criteria:`, checkResult.rows);

      const result = await db.query(updateQuery, queryParams);
    }

    let templateUpdateResult = null;
    if (newTemplateName && jobIds) {
      // Update job_templates.display_text for all affected template IDs
      const templateIdArr = templateIds.split(',').map(id => id.trim()).filter(Boolean);
      const templateUpdateQuery = `
        UPDATE jobs SET display_text = $1 WHERE id = ANY($2)
      `;
      templateUpdateResult = await db.query(templateUpdateQuery, [newTemplateName, jobIds]);
      console.log(`wru4    Updated task title for ${templateUpdateResult.rowCount} job(s)\n`, `UPDATE jobs SET display_text = ${newTemplateName} WHERE id = ANY(${jobIds})`);
    }

    res.json({
      success: true,
      updatedCount: result.rowCount,
      message: `Successfully updated ${result.rowCount} record(s)`
    });

  } catch (err) {
    console.error("wru5    Error updating workflow rules:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error: " + err.message
    });
  }
});



router.get("/workflow-validator", async (req, res) => {
  console.log("wv1      Starting workflow validator admin page");

  try {
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

    const problemsResult = await pool.query(`
      SELECT 
        dp.*,
        j.display_text as job_name,
        c.full_name as customer_name
      FROM data_problems dp
      LEFT JOIN jobs j ON dp.table_name = 'jobs' AND dp.record_id = j.id
      LEFT JOIN builds b ON j.build_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE dp.problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')
      ORDER BY dp.severity DESC, dp.problem_type, dp.detected_date DESC
    `);

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

    console.log("wv9      Workflow validator data loaded", {
      totalProblems: summary.totalProblems,
      uniqueJobs: summary.uniqueJobs
    });

    res.json({ summary, problemsByType });
  } catch (error) {
    console.error("wv10     Error loading workflow validator data", error);
    res.status(500).send("Error loading workflow validator data");
  }
});

// Define your routes here
router.post("/upload", upload.single("file"), (req, res) => {
  console.log("File uploaded successfully.");
  res.send("File uploaded successfully.");
});


export default router;
