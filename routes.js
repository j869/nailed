import { pool } from "./database.js";
import app from "./server.js";
import upload from "./fileUpload.js";


// Simple Rule Templates Editor
app.get("/rule-templates-editor", async (req, res) => {
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

app.get("/rule-templates-editor/add", (req, res) => {
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

app.get("/rule-templates-editor/delete", (req, res) => {
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

app.get("/wf-rule-report", async (req, res) => {
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
        WHERE j.job_template_id IS NOT NULL 
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
app.post("/wf-rule-report/update", async (req, res) => {
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
    const { templateId, jobIds, newChangeArray } = req.body;
    
    if (!jobIds || !Array.isArray(jobIds) || !newChangeArray) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }
    
    console.log(`wru3    Updating change_array for template ${templateId || 'ALL'}, jobs: ${jobIds.join(',')}`);
    console.log(`wru3a   Job IDs array:`, jobIds);
    console.log(`wru3b   New change_array:`, newChangeArray);
    
    // Get user's security clause for data access control
    const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
    const securityClause = securityResult.rows[0]?.data_security || '1=0';
    const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);
    
    console.log(`wru3c   Security clause: ${processedSecurityClause}`);
    
    // Update the change_array for specified jobs with optional template filtering
    let updateQuery, queryParams;
    
    if (templateId) {
      updateQuery = `
        UPDATE jobs 
        SET change_array = $1
        WHERE job_template_id = $2 
          AND id = ANY($3)
      `;
      queryParams = [newChangeArray, templateId, jobIds];
    } else {
      updateQuery = `
        UPDATE jobs 
        SET change_array = $1
        WHERE id = ANY($2)
      `;
      queryParams = [newChangeArray, jobIds];
    }
    
    console.log(`wru3d   Update query:`, updateQuery);
    console.log(`wru3e   Query params:`, queryParams);
    
    // Check which jobs exist and meet the criteria
    const checkQuery = `
      SELECT j.id, j.job_template_id, j.build_id
      FROM jobs j
      WHERE j.id = ANY($1)
    `;
    const checkResult = await db.query(checkQuery, [jobIds]);
    console.log(`wru3f   Jobs found matching criteria:`, checkResult.rows);
    
    const result = await db.query(updateQuery, queryParams);
    
    console.log(`wru4    Updated ${result.rowCount} records for template ${templateId}`);
    
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



app.get("/admin/workflow-validator", async (req, res) => {
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
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File uploaded successfully.");
  res.send("File uploaded successfully.");
});

export default app;
