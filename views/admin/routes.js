import express from 'express';
import axios from 'axios';
const router = express.Router();

// DEMO: Rule Engine Administration Interface
router.get("/rules", (req, res) => {
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




export default router;
