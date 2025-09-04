import express from 'express';
const router = express.Router();
import multer from "multer";
import ExcelJS from "exceljs";


// Multer setup for Excel permit customer import file upload (max 10MB)
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

import pg from "pg";
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();



router.post("/updateRoles", async (req, res) => {
  //allows the user to update their own role, and reorder their role.  It defaults to the first role in the list.
  
  console.log("k1    ", req.body.roles);
  if (req.isAuthenticated()) {
    const newRole = req.body.roles;
    const userId = req.user.id;

    try {
      const result = await db.query("UPDATE users SET roles = $1 WHERE id = $2 RETURNING *", [newRole, userId]);
      if (result.rowCount === 1) {
        res.status(200).json({ message: "Role updated successfully", user: req.user });
        req.user.roles = newRole;
        // req.session.user = result.rows[0];
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      console.error("Error updating role:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.redirect("/login");
  }
});



  router.get("/updateSMTP", async (req, res) => {
    if (req.isAuthenticated()) {
      console.log("gp1    ", req.user);
      const smtpResult = await db.query("SELECT id, email, smtp_host, smtp_password FROM users WHERE id = $1", [req.user.id]);
      console.log("gp2    ", smtpResult.rows[0]);
      let encrypted_password = smtpResult.rows[0].smtp_password;
      let decrypted_password = "";
      if (encrypted_password == null) {
        decrypted_password = "";
      } else {
        const result = await axios.get(`${API_URL}/decrypt/${encrypted_password}`);
        decrypted_password = result.data.decryptedText;
      }
      console.log("gp3    ", decrypted_password);
      res.render("smtp.ejs", { user: req.user, data: smtpResult.rows[0], decrypted_password : decrypted_password });
    }
  });

  router.post("/updateSMTP", async (req, res) => {
    if (req.isAuthenticated()) {
      console.log("up1    ", req.body);
      const { id, email, host, password } = req.body;
      console.log("up1a   password ", password);
      const encryptedPassword = await axios.get(`${API_URL}/encrypt/${password}`); 
      console.log("up2    ", encryptedPassword.data);
      const result = await db.query("UPDATE users SET email = $1, smtp_host = $2, smtp_password = $3 WHERE id = $4", [email, host, encryptedPassword.data.encryptedText, id]);
      console.log("up3    ", result);
      const connectionResult = await axios.get(`${API_URL}/testSMTP/${id}`);
      console.log("up4    ", connectionResult.data);
      res.redirect("/updateSMTP");

    }
  });
  

router.get("/management-report", async (req, res) => {
  console.log("m1      navigate to MANAGEMENT REPORT page");
  if (req.isAuthenticated()) {
    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access
      
      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);
      
      // Enhanced query with security filtering
      const customersQuery = `
        SELECT 
          c.id, c.job_no, c.full_name, c.primary_phone, c.current_status, c.invoices_collected,
          c.site_location, c.slab_size, c.building_type,
          TO_CHAR(c.date_ordered, 'DD-Mon-YY') AS date_ordered,
          TO_CHAR(c.date_bp_applied, 'DD-Mon-YY') AS date_bp_applied,
          TO_CHAR(c.date_bp_issued, 'DD-Mon-YY') AS date_bp_issued,
          TO_CHAR(c.date_completed, 'DD-Mon-YY') AS date_completed,
          TO_CHAR(c.last_payment_date, 'DD-Mon-YY') AS last_payment_date,
          c.last_payment_amount, c.last_payment_description,
          c.next_action_description,
          TO_CHAR(c.date_last_actioned, 'DD-Mon-YY') AS date_last_actioned
        FROM customers c
        WHERE (${processedSecurityClause})
        ORDER BY 
          CASE c.current_status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
          END,
          c.full_name
      `;
      
      const customersResult = await db.query(customersQuery);
      
      // Calculate simple counts from filtered data
      const activeCount = customersResult.rows.filter(c => c.current_status === 'active').length;
      const completedCount = customersResult.rows.filter(c => c.current_status === 'completed').length;
      
      console.log("m2       Management Report loaded:", customersResult.rowCount, "customers (security filtered)");
      
      res.render("managementReport.ejs", {
        user: req.user,
        customers: customersResult.rows,
        activeCount: activeCount,
        completedCount: completedCount
      });
      
    } catch (err) {
      console.error("Error loading management report:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
});


// GET /admin/users
router.get('/users', async (req, res) => {
  if (req.isAuthenticated()) {
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
      const result = await db.query(`
        SELECT id, email, full_name, display_name, data_security, roles 
        FROM users 
        ORDER BY id
      `);
      res.render('admin/users.ejs', {
        users: result.rows,
        user: req.user
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Error loading user list');
    }
  } else {
    res.redirect('/login');
  }
});

// GET /admin/users/:id
router.get('/users/:id', async (req, res) => {
  if (req.isAuthenticated()) {
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
      const result = await db.query(`
        SELECT id, email, full_name, display_name, data_security, roles 
        FROM users 
        WHERE id = $1
      `, [userId]);
      if (result.rows.length === 0) {
        return res.status(404).send('User not found');
      }
      res.render('admin/editUser.ejs', {
        editUser: result.rows[0],
        user: req.user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Error loading user');
    }
  } else {
    res.redirect('/login');
  }
});

// POST /admin/users/:id
router.post('/users/:id', async (req, res) => {
  if (req.isAuthenticated()) {
    if (!req.user.roles || !req.user.roles.includes('sysadmin')) {
      return res.status(403).send('Access denied');
    }
    try {
      const userId = parseInt(req.params.id);
      const { email, full_name, display_name, data_security, roles } = req.body;
      await db.query(`
        UPDATE users 
        SET email = $1, full_name = $2, display_name = $3, data_security = $4, roles = $5
        WHERE id = $6
      `, [email, full_name, display_name, data_security, roles, userId]);
      console.log(`Admin ${req.user.id} updated user ${userId}`);
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Error updating user');
    }
  } else {
    res.redirect('/login');
  }
});



// MVP: Customer Import Page (GET)
router.get("/admin/customers/import", (req, res) => {
  const sessionId = req.sessionID?.substring(0, 8) || 'unknown';
  const userId = req.user?.id || 'unknown';
  console.log(`ci1     [${sessionId}] USER(${userId}) navigated to Customer Import page`);
  
  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    console.log(`ci2     [${sessionId}] Access denied - USER(${userId}) does not have sysadmin role`);
    return res.status(403).send("Access denied");
  }
  
  console.log(`ci3     [${sessionId}] Rendering customer import page for USER(${userId})`);
  res.render("customer-import");
});



// MVP: Customer Excel Import Route (POST)
router.post("/admin/customers/import", upload.single("customerFile"), async (req, res) => {
  const sessionId = req.sessionID?.substring(0, 8) || 'unknown';
  const userId = req.user?.id || 'unknown';
  const importId = Date.now().toString().slice(-6); // Last 6 digits of timestamp as import ID
  
  console.log(`ci10    [${sessionId}][${importId}] USER(${userId}) started Excel import`);
  
  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    console.log(`ci11    [${sessionId}][${importId}] Access denied - USER(${userId}) does not have sysadmin role`);
    return res.status(403).json({ error: "Access denied" });
  }
  
  if (!req.file) {
    console.log(`ci12    [${sessionId}][${importId}] No file uploaded by USER(${userId})`);
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  console.log(`ci13    [${sessionId}][${importId}] Processing file: ${req.file.originalname} (${req.file.size} bytes) for USER(${userId})`);
  
  let errors = [];
  let imported = 0;
  let updated = 0;
  let sheetsProcessed = 0;
  const options = {
    createBuilds: req.body.createBuilds === 'on',
    startWorkflows: req.body.startWorkflows === 'on',
    duplicateAction: req.body.duplicateAction || 'update'
  };
  
  // Create revert script
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const revertFileName = `import_${timestamp}_${userId}.sql`;
  const revertFilePath = path.join(logsDir, revertFileName);
  let revertScript = [];
  let createdBuilds = [];
  let createdWorkflows = [];
  
  // Add header to revert script
  revertScript.push(`-- Customer Import Revert Script`);
  revertScript.push(`-- Import Date: ${new Date().toISOString()}`);
  revertScript.push(`-- User ID: ${userId}`);
  revertScript.push(`-- Original File: ${req.file.originalname}`);
  revertScript.push(`-- Import ID: ${importId}`);
  revertScript.push(`-- WARNING: Execute this script to undo ALL changes from this import`);
  revertScript.push(`\\echo 'Starting revert of import ${importId}'`);
  revertScript.push(`BEGIN;`);
  revertScript.push(``);
  
  // Helper function to escape SQL values
  function escapeSQLValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return value.toString();
    if (value instanceof Date) return `'${value.toISOString().split('T')[0]}'`;
    // String values - escape single quotes
    return `'${value.toString().replace(/'/g, "''")}'`;
  }
  
  // Helper function to create build with workflow
  async function createBuildWithWorkflow(customerId, productId, customerAddress, userId, sessionId, importId) {
    try {
      console.log(`ci25a   [${sessionId}][${importId}] Creating build for customer ${customerId} with product ${productId}`);
      
      // Create the build
      const result = await db.query(
        "INSERT INTO builds (customer_id, product_id, enquiry_date, site_address) VALUES ($1, $2, NOW(), $3) RETURNING *", 
        [customerId, productId, customerAddress]
      );
      const newBuild = result.rows[0];    
      const buildID = newBuild.id;
      
      console.log(`ci25b   [${sessionId}][${importId}] Created build ${buildID}, starting workflow...`);
      
      // Start workflow by calling the API
      const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);
      
      // Update build with job_id and assign to user
      await db.query("UPDATE builds SET job_id = $1 WHERE id = $2", [response.data.id, buildID]);
      await db.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2", [userId, buildID]);
      
      console.log(`ci25c   [${sessionId}][${importId}] Workflow started for build ${buildID} with job ${response.data.id}`);
      
      return { buildId: buildID, jobId: response.data.id };
    } catch (error) {
      console.log(`ci25d   [${sessionId}][${importId}] Error creating build/workflow: ${error.message}`);
      throw error;
    }
  }
  
  // Helper function to parse Excel dates
  function parseExcelDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'number') {
      // Excel serial date
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      // Try to parse various date formats
      const formats = [
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // 07.10.2024
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // 7/14/2022
        /(\d{1,2})-(\w{3})/               // 15-Jul
      ];
      
      for (const format of formats) {
        const match = value.match(format);
        if (match) {
          if (format.source.includes('\\w')) {
            // Month name format
            const day = match[1];
            const month = match[2];
            const year = new Date().getFullYear(); // Current year for month-only dates
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const monthNum = monthNames.indexOf(month) + 1;
            if (monthNum > 0) {
              return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          } else {
            const day = match[1];
            const month = match[2];
            const year = match[3];
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
    }
    return null;
  }
  
  // Helper function to parse currency
  function parseCurrency(value) {
    if (!value || value === '#VALUE!') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  }
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    console.log(`ci14    [${sessionId}][${importId}] Excel file loaded successfully, found ${workbook.worksheets.length} sheets`);
    
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      console.log(`ci15    [${sessionId}][${importId}] Checking sheet: "${sheetName}"`);
      
      if (!/current|completed/i.test(sheetName)) {
        console.log(`ci16    [${sessionId}][${importId}] Skipping sheet "${sheetName}" (not current/completed)`);
        continue;
      }
      
      sheetsProcessed++;
      console.log(`ci17    [${sessionId}][${importId}] Processing sheet "${sheetName}"`);
      
      const rows = [];
      let headers = {};
      
      // Get headers from row 2 (for Permit Register format)
      const headerRow = worksheet.getRow(2);
      headerRow.eachCell((cell, colNumber) => {
        let value = cell.value;
        // Handle formula cells
        if (cell.formula) {
          value = cell.result || cell.text || value;
        } else if (cell.text) {
          value = cell.text;
        }
        headers[colNumber] = value;
      });
      
      // Process data rows starting from row 9 (where actual data begins in Permit Register)
      for (let rowNumber = 9; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        // Check if row has actual meaningful data (not empty or formula-only)
        let hasRealData = false;
        let hasCustomerName = false;
        let hasPhoneNumber = false;
        const rowData = {};
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let value = cell.value;
          
          // Handle formula cells
          if (cell.formula) {
            value = cell.result || cell.text;
          } else if (cell.text) {
            value = cell.text;
          }
          
          // Skip null, undefined, empty strings, and formula placeholders
          if (value === null || value === undefined || value === '' || String(value).startsWith('FORMULA:')) {
            value = '';
          } else {
            // Convert to string and trim whitespace
            value = String(value).trim();
            if (value !== '') {
              hasRealData = true;
              
              // Check for essential fields based on header
              const header = headers[colNumber];
              if (header === 'Customer Name' && value) {
                hasCustomerName = true;
              }
              if (header === 'Phone #' && value) {
                hasPhoneNumber = true;
              }
            }
          }
          
          const header = headers[colNumber];
          if (header) {
            rowData[header] = value;
          }
        });
        
        // Concatenate columns A and B for Job Number
        const colA = row.getCell(1).value;
        const colB = row.getCell(2).value;
        if (colA || colB) {
          const jobNo = `${colA || ''}${colB || ''}`.trim();
          if (jobNo) {
            rowData["Job No"] = jobNo;
            hasRealData = true;
          }
        }
        
        // Only process rows that have meaningful data and at least Customer Name or Phone #
        // This filters out completely empty rows and rows with only formatting/formulas
        if (hasRealData && (hasCustomerName || hasPhoneNumber)) {
          rows.push({ data: rowData, rowNumber });
        }
      }
      
      console.log(`ci18    [${sessionId}][${importId}] Found ${rows.length} data rows in sheet "${sheetName}"`);
      
      for (const { data: row, rowNumber } of rows) {
        try {
          // Map Excel columns to database fields
          const customer = {
            full_name: row["Customer Name"] || "",
            primary_phone: row["Phone #"] || "",
            home_address: row["Address"] || row["Site Location"] || "",
            job_no: row["Job No"] || "",
            site_location: row["Site Location"] || "",
            building_type: row["Building Type"] || "",
            permit_type: row["Type of permit req"] || "",
            slab_size: row["Size"] || "",
            council_responsible: row["Council (planning)"] || "",
            owner_builder_permit: (row["OB?"] === "Y" || row["OB?"] === "Yes"),
            current_status: /completed/i.test(sheetName) ? "Complete" : (row["Current Status"] || ""),
            date_ordered: parseExcelDate(row["Order Date"]),
            date_bp_applied: parseExcelDate(row["BP App date"]),
            date_bp_issued: parseExcelDate(row["Date Building Permit Issued"]),
            quoted_estimate: parseCurrency(row["Quoted Estimate"]),
            fees_paid_out: parseCurrency(row["Fees paid Out"] || row["Fees paid out"]),
            job_earnings: parseCurrency(row["Job Earnings"]),
            next_action_description: row["Waiting on:"] || ""
          };
          
          // Validate required fields
          if (!customer.full_name || !customer.primary_phone) {
            const errorMsg = `Row ${rowNumber} (${customer.full_name || 'Unknown'}): Missing required fields (Customer Name and Phone #)`;
            console.log(`ci19    [${sessionId}][${importId}] Error - ${errorMsg}`);
            errors.push(errorMsg);
            continue;
          }
          
          console.log(`ci20    [${sessionId}][${importId}] Processing customer: ${customer.full_name} (${customer.primary_phone})`);
          
          // Check for duplicates and get existing data
          let existingCustomer = null;
          try {
            const duplicateCheck = await db.query(
              "SELECT * FROM customers WHERE LOWER(full_name) = LOWER($1) OR primary_phone = $2 LIMIT 1",
              [customer.full_name, customer.primary_phone]
            );
            existingCustomer = duplicateCheck.rows[0];
          } catch (dbError) {
            console.log(`ci21    [${sessionId}][${importId}] DB error checking duplicates: ${dbError.message}`);
          }
          
          if (existingCustomer && options.duplicateAction === 'skip') {
            console.log(`ci22    [${sessionId}][${importId}] Skipping duplicate: ${customer.full_name}`);
            continue;
          }
          
          // Insert or update customer with revert script generation
          try {
            if (existingCustomer && options.duplicateAction === 'update') {
              // Generate revert UPDATE statement with original values
              const revertUpdate = `UPDATE customers SET 
                full_name = ${escapeSQLValue(existingCustomer.full_name)},
                primary_phone = ${escapeSQLValue(existingCustomer.primary_phone)},
                home_address = ${escapeSQLValue(existingCustomer.home_address)},
                job_no = ${escapeSQLValue(existingCustomer.job_no)},
                site_location = ${escapeSQLValue(existingCustomer.site_location)},
                building_type = ${escapeSQLValue(existingCustomer.building_type)},
                permit_type = ${escapeSQLValue(existingCustomer.permit_type)},
                slab_size = ${escapeSQLValue(existingCustomer.slab_size)},
                council_responsible = ${escapeSQLValue(existingCustomer.council_responsible)},
                owner_builder_permit = ${escapeSQLValue(existingCustomer.owner_builder_permit)},
                current_status = ${escapeSQLValue(existingCustomer.current_status)},
                date_ordered = ${escapeSQLValue(existingCustomer.date_ordered)},
                date_bp_applied = ${escapeSQLValue(existingCustomer.date_bp_applied)},
                date_bp_issued = ${escapeSQLValue(existingCustomer.date_bp_issued)},
                quoted_estimate = ${escapeSQLValue(existingCustomer.quoted_estimate)},
                fees_paid_out = ${escapeSQLValue(existingCustomer.fees_paid_out)},
                job_earnings = ${escapeSQLValue(existingCustomer.job_earnings)},
                next_action_description = ${escapeSQLValue(existingCustomer.next_action_description)},
                date_last_actioned = ${escapeSQLValue(existingCustomer.date_last_actioned)}
              WHERE id = ${existingCustomer.id};`;
              
              revertScript.push(`-- Revert update for customer: ${customer.full_name}`);
              revertScript.push(revertUpdate);
              revertScript.push('');
              
              // Update existing customer
              await db.query(`
                UPDATE customers SET 
                  full_name = $1, primary_phone = $2, home_address = $3, job_no = $4,
                  site_location = $5, building_type = $6, permit_type = $7, slab_size = $8,
                  council_responsible = $9, owner_builder_permit = $10, current_status = $11,
                  date_ordered = $12, date_bp_applied = $13, date_bp_issued = $14,
                  quoted_estimate = $15, fees_paid_out = $16, job_earnings = $17,
                  next_action_description = $18, date_last_actioned = CURRENT_TIMESTAMP
                WHERE id = $19
              `, [
                customer.full_name, customer.primary_phone, customer.home_address, customer.job_no,
                customer.site_location, customer.building_type, customer.permit_type, customer.slab_size,
                customer.council_responsible, customer.owner_builder_permit, customer.current_status,
                customer.date_ordered, customer.date_bp_applied, customer.date_bp_issued,
                customer.quoted_estimate, customer.fees_paid_out, customer.job_earnings,
                customer.next_action_description, existingCustomer.id
              ]);
              console.log(`ci23    [${sessionId}][${importId}] Updated customer: ${customer.full_name}`);
              updated++;
            } else {
              // Insert new customer
              const result = await db.query(`
                INSERT INTO customers (
                  full_name, primary_phone, home_address, job_no, site_location, building_type,
                  permit_type, slab_size, council_responsible, owner_builder_permit, current_status,
                  date_ordered, date_bp_applied, date_bp_issued, quoted_estimate, fees_paid_out,
                  job_earnings, next_action_description, follow_up
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_DATE + INTERVAL '21 days')
                RETURNING id
              `, [
                customer.full_name, customer.primary_phone, customer.home_address, customer.job_no,
                customer.site_location, customer.building_type, customer.permit_type, customer.slab_size,
                customer.council_responsible, customer.owner_builder_permit, customer.current_status,
                customer.date_ordered, customer.date_bp_applied, customer.date_bp_issued,
                customer.quoted_estimate, customer.fees_paid_out, customer.job_earnings,
                customer.next_action_description
              ]);
              
              const newCustomerId = result.rows[0].id;
              
              // Generate revert DELETE statement
              revertScript.push(`-- Revert insert for customer: ${customer.full_name}`);
              revertScript.push(`DELETE FROM customers WHERE id = ${newCustomerId};`);
              revertScript.push('');
              
              console.log(`ci24    [${sessionId}][${importId}] Inserted new customer: ${customer.full_name} (ID: ${newCustomerId})`);
              
              // Create build and workflow based on sheet type
              let buildId = null;
              let jobId = null;
              if (options.startWorkflows) {
                try {
                  // Determine product ID based on sheet name
                  const productId = /completed/i.test(sheetName) ? 6 : 5; // 6 for Archive - Completed Permits, 5 for Active Permits
                  const productName = productId === 6 ? 'Archive - Completed Permits' : 'Active Permits';
                  
                  console.log(`ci25    [${sessionId}][${importId}] Creating ${productName} workflow for customer ${newCustomerId}`);
                  
                  const buildResult = await createBuildWithWorkflow(
                    newCustomerId, 
                    productId, 
                    customer.home_address, 
                    req.user.id, 
                    sessionId, 
                    importId
                  );
                  
                  buildId = buildResult.buildId;
                  jobId = buildResult.jobId;
                  
                  // Track for revert script
                  createdBuilds.push(buildId);
                  createdWorkflows.push(jobId);
                  
                  console.log(`ci26    [${sessionId}][${importId}] Created build ${buildId} with workflow ${jobId} for customer ${newCustomerId}`);
                } catch (workflowError) {
                  console.log(`ci27    [${sessionId}][${importId}] Warning: Failed to create workflow for customer ${newCustomerId}: ${workflowError.message}`);
                  // Continue with import even if workflow creation fails
                }
              }
              
              imported++;
            }
          } catch (dbError) {
            const errorMsg = `Row ${rowNumber} (${customer.full_name}): Database error - ${dbError.message}`;
            console.log(`ci27    [${sessionId}][${importId}] DB Error - ${errorMsg}`);
            errors.push(errorMsg);
          }
          
        } catch (rowError) {
          const errorMsg = `Row ${rowNumber}: Processing error - ${rowError.message}`;
          console.log(`ci28    [${sessionId}][${importId}] Row Error - ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    
    // Add workflow/build cleanup to revert script (in reverse order)
    if (createdWorkflows.length > 0) {
      revertScript.push(`-- Delete created workflows (${createdWorkflows.length})`);
      createdWorkflows.forEach(workflowId => {
        revertScript.push(`DELETE FROM jobs WHERE id = ${workflowId};`);
      });
      revertScript.push('');
    }
    
    if (createdBuilds.length > 0) {
      revertScript.push(`-- Delete created builds (${createdBuilds.length})`);
      createdBuilds.forEach(buildId => {
        revertScript.push(`DELETE FROM builds WHERE id = ${buildId};`);
      });
      revertScript.push('');
    }
    
    // Finalize revert script
    revertScript.push(`COMMIT;`);
    revertScript.push(`\\echo 'Revert completed successfully'`);
    
    // Write revert script to file
    fs.writeFileSync(revertFilePath, revertScript.join('\n'));
    console.log(`ci29    [${sessionId}][${importId}] Revert script saved: ${revertFileName}`);
    
    console.log(`ci30    [${sessionId}][${importId}] Import completed - Sheets processed: ${sheetsProcessed}, New customers: ${imported}, Updated customers: ${updated}, Errors: ${errors.length}, Builds created: ${createdBuilds.length}, Workflows started: ${createdWorkflows.length}`);
    
    res.json({ 
      imported, 
      updated, 
      errors, 
      buildsCreated: createdBuilds.length,
      workflowsStarted: createdWorkflows.length,
      revertFile: revertFileName,
      revertPath: `/admin/customers/import/revert/${revertFileName}`
    });
    
  } catch (e) {
    console.error(`ci31    [${sessionId}][${importId}] Import failed with error:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Customer Import Revert Management Routes
router.get("/admin/customers/import/reverts", async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    return res.status(403).send("Access denied");
  }
  
  try {
    // List all revert files
    const revertFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('import_') && file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(logsDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime,
          path: `/admin/customers/import/revert/${file}`
        };
      })
      .sort((a, b) => b.created - a.created);
      
    res.render("revert-list", { revertFiles });
  } catch (error) {
    console.error("Error listing revert files:", error);
    res.status(500).send("Error loading revert files");
  }
});

router.get("/admin/customers/import/revert/:filename", async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    return res.status(403).send("Access denied");
  }
  
  const filename = req.params.filename;
  const filePath = path.join(logsDir, filename);
  
  // Security check - ensure filename is safe
  if (!filename.match(/^import_[\d\-T]+_\d+\.sql$/)) {
    return res.status(400).send("Invalid filename");
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Revert file not found");
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.render("revert-preview", { filename, content });
  } catch (error) {
    console.error("Error reading revert file:", error);
    res.status(500).send("Error reading revert file");
  }
});

router.post("/admin/customers/import/revert/:filename/execute", async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const filename = req.params.filename;
  const filePath = path.join(logsDir, filename);
  
  // Security check - ensure filename is safe
  if (!filename.match(/^import_[\d\-T]+_\d+\.sql$/)) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Revert file not found" });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Execute the revert script
    const result = await db.query(content);
    
    console.log(`Revert executed successfully for file: ${filename} by user: ${req.user.id}`);
    
    // Archive the executed revert file
    const archivedName = filename.replace('.sql', '_executed.sql');
    fs.renameSync(filePath, path.join(logsDir, archivedName));
    
    res.json({ 
      success: true, 
      message: "Revert executed successfully",
      archivedAs: archivedName
    });
    
  } catch (error) {
    console.error("Error executing revert:", error);
    res.status(500).json({ 
      error: "Error executing revert: " + error.message 
    });
  }
});





export default router;
