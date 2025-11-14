//#region imports
import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import { main } from './trigger2.js';
import moment from 'moment';
import e from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from 'nodemailer';
import { logUserActivity } from './src/logging.js';
import { getMelbourneTime } from './src/datetime.js';

const app = express();
app.set('trust proxy', 1);
// Set view engine
app.set("view engine", "ejs");
app.set("views", "./views");

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
const port = 3000;
let baseURL = "";
const saltRounds = 10;

env.config();
let API_URL = process.env.API_URL || '/api';  // From .env (full HTTPS for prod)

// For server-side calls, ensure full URL (Node needs it)
if (API_URL.startsWith('/') && !API_URL.startsWith('http')) {
  API_URL = process.env.BASE_URL + API_URL;  // e.g., "https://buildingbb.com.au/api"
}

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs', 'customer_imports');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Serve static files first (no session processing needed)
app.use(express.static("public"));

app.use((req, res, next) => {
  // console.log(`x1        NEW REQUEST ${req.method} ${req.path} from USER(${req.user?.id || 'unset'}) with SessionID: ${req.sessionID} `);
  console.log(`x1        NEW REQUEST ${req.method} ${req.path} `);
  // logUserActivity(req, `x1        NEW REQUEST ${req.method} ${req.path} `);
  // logUserActivity(req, `x3        with SessionID: ${req.sessionID}`);
  // logUserActivity(req, `x4        and Cookies: ${req.headers.cookie}`);
  
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // console.log('x2       req.user:', req.user?.id || 'unset');
  console.log(`x9          ...from USER(${req.user?.id || 'unset'}) with SessionID: ${req.sessionID} `);
  let variables = ``;
  
  // Build variables string with available request data
  const dataParts = [];
  if (Object.keys(req.params).length > 0) {
    dataParts.push(`params: ${JSON.stringify(req.params)}`);
  }
  if (Object.keys(req.query).length > 0) {
    dataParts.push(`query: ${JSON.stringify(req.query)}`);
  }
  // Note: req.body won't be available here since body parsing middleware comes later
  
  if (dataParts.length > 0) {
    variables = dataParts.join(', ') + ', ';
  }

  logUserActivity(req, `x1        NEW REQUEST ${req.method} ${req.path} ${variables}`);
  // logUserActivity(req, `x9          ...from USER(${req.user?.id || 'unset'}) with SessionID: ${req.sessionID} `);
  // console.log('x6       Post-passport - sessionID:', req.sessionID);
  next();
});
app.use(express.json());    //// Middleware to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Middleware to make db available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Import admin routes
import adminRoutes from './views/admin/routes.js';
app.use('/admin', adminRoutes);


//#endregion



// Decryption function
function decrypt(encryptedText, key) {
  console.log("de1    decrypting: ", encryptedText ? encryptedText.substring(0, 10) + "..." : "null");
  if (!encryptedText || encryptedText === "null") {
    console.error("de2    No encrypted text provided");
    return null;
  }

  try {
    // Check if this is new format (IV prepended)
    if (encryptedText.length > 32) { // IV is 32 hex chars
      const iv = Buffer.from(encryptedText.substring(0, 32), 'hex');
      const encryptedData = encryptedText.substring(32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      console.log("de3    Decryption successful with new method");
      return decrypted;
    } else {
      // Try old method for backward compatibility
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      console.log("de4    Decryption successful with old method");
      return decrypted;
    }
  } catch (error) {
    console.error("de5    Decryption failed:", error.message);
    return null;
  }
}


// Helper function to get user's security clause
async function getUserSecurityClause(userId) {
  try {
    const result = await db.query('SELECT data_security FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.data_security || '1=0'; // Default to no access
  } catch (error) {
    console.error('Error fetching user security clause:', error);
    return '1=0'; // Default to no access on error
  }
}



// Middleware to make session user available on req.user for convenience
// app.use((req, res, next) => {
//   if (req.session.user) {
//     console.log("i1   ");
//     req.user = req.session.user;
//   }
//   next();
// });

app.post("/", async (req, res) => {
  const { title, person, date } = req.body;
  console.log("wb1    user(" + person + ") added new task '" + title + "' to their day_task list");
  const nullDesc = {
    "build_id": 0,
    "build_start": "2024-06-24T23:00:00.000Z",
    "build_product": 1,
    "job_id": 8,
    "job_text": "Follow Up",
    "job_target": null,
    "job_completed": null,
    "job_status": null,
    "task_id": 92,
    "task_text": "Design Site plan",
    "task_target": null,
    "task_completed": null,
    "task_status": null
  }

  const q2 = await db.query("INSERT INTO worksheets (title, description, user_id, date, stalled_for) VALUES ($1, $2, $3, $4, $5) RETURNING id", [title, null, person, date, null]);
  // console.log("wb7    ", q2.data);

  res.redirect("/");
});

app.get("/", async (req, res) => {
  if (req.user) {
    console.log("ws1     user(" + req.user.id + ") navigated to HOME page ");
    const iViewDay = parseInt(req.query.view) || 0;
    console.log("ws22     view: ", iViewDay);
    let q1SQL = "";
    let q1Params = [req.user.id];
    if (iViewDay == 0) {
      q1SQL = "SELECT *, to_char(date, 'DD-Mon-YY') AS formatted_date  FROM worksheets WHERE user_id = $1 AND date <= NOW()::date ORDER BY stalled_for, id";
    } else {
      q1SQL = "SELECT *, to_char(date, 'DD-Mon-YY') AS formatted_date  FROM worksheets WHERE user_id = $1 AND date = (NOW()::date + $2 * INTERVAL '1 day') ORDER BY stalled_for, id"
      q1Params.push(iViewDay);
    }
    const q1 = await db.query(q1SQL, q1Params);
    console.log("ws25     tasks to do today: ", q1.rowCount);
    const taskList = q1.rows;

    if (false) {
      const parsedData = [];
      // Parse the JSON data and extract task_id, build_id, and job_id for each object
      for (const row of q1.rows) {
        console.log("ws26     processing row: ", row.id, row.description);
        const description = JSON.parse(row.description || null);         // Parse as null if row.description is empty or not valid

        // Format date to yyyy-mm-dd
        const dateObj = new Date(row.date);
        const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        // Create the base rowData object
        const rowData = {
          ...row,
          task_id: null,
          task_status: null,
          build_id: null,
          job_id: null,
          customer_name: null,
          customer_address: null,
          formatted_date: formattedDate,
        };

        if (description) {
          // Perform a database query to fetch customer information
          const q2 = await db.query(
            "SELECT customers.id, customers.full_name, customers.home_address FROM builds LEFT JOIN customers ON builds.customer_id = customers.id WHERE builds.id = $1",
            [description.build_id]
          );

          // Extract customer name and address from the database result
          const customerInfo = q2.rows[0] || {}; // Use {} as a default value if customer not found
          const { full_name, home_address } = customerInfo;

          // Update rowData with the extracted values
          rowData.task_id = description.task_id;
          rowData.task_status = description.task_status;
          rowData.build_id = description.build_id;
          rowData.job_id = description.job_id;
          rowData.customer_name = full_name;
          rowData.customer_address = home_address;
          rowData.formatted_date = formattedDate;
        }

        // Push the rowData to parsedData
        parsedData.push(rowData);
      }
    }

    // Pass the parsed data to the template
    res.render("home.ejs", { baseURL: process.env.BASE_URL, view: iViewDay, user_id: req.user.id, data: taskList });

  } else {
    console.log("ws1     navigated to HOME page ");
    res.render("home.ejs");
  }
});


//#region Day-Task list

app.get("/daytaskUpdate", (req, res) => {
  console.log("dup1    ");
  main();

  res.redirect("/");
});
//main();     // trigger worksheet update from trigger2.js


app.get("/dtDone", async (req, res) => {
  console.log("dtd1   ", req.query); // Log the incoming request body
  const { id, done } = req.query; // Destructure id and done from request body

  try {
    const fieldID = "jobStatus";
    const newValue = "complete";
    const recordID = id;
    const q3 = await db.query("SELECT * from worksheets WHERE Id = " + id + ";");
    const description = q3.rows[0].description;
    const match = q3.rows[0]?.description?.match(/Job\((\d+)\)/);
    let jobId = match ? parseInt(match[1], 10) : null;
    if (!jobId) {
      jobId = q3.rows[0]?.job_id; // Fallback to job_id if available 
    }
    if (!jobId) {
      console.error("dtd10   User defined task - not associated with any customer");
      const q2 = await db.query("DELETE FROM worksheets WHERE Id = " + id + ";");
    } else {
      console.log("dtd11   extracted jobId:", jobId);

      const q1 = await axios.get(`${process.env.BASE_URL}/update?fieldID=${fieldID}&newValue=${newValue}&whereID=${jobId}`, {
        headers: {
          Cookie: req.headers.cookie // Pass session cookie for authentication
        }
      });

      const q2 = await db.query("DELETE FROM worksheets WHERE Id = " + id + ";");
    }

    return res.status(200).json({ message: "Checkbox status updated" }); // Return a response
  } catch (error) {
    console.error("Error updating checkbox:", error);

    // Send an error response
    res.status(500).json({ error: "Failed to update checkbox" }); // Return error status
  }
});

//#endregion


//#region email and SMTP helper functions

app.get("/updateSMTP", async (req, res) => {
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
    res.render("smtp.ejs", { user: req.user, data: smtpResult.rows[0], decrypted_password: decrypted_password });
  }
});

app.post("/updateSMTP", async (req, res) => {
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


app.post("/send-email", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log("se1    Sending email for user:", req.user.id);
    const { customerId, toEmail, subject, message } = req.body;
    console.log("se1a   Email details - customerId:", customerId, "toEmail:", toEmail, "subject:", subject, "message length:", message?.length);
    
    try {
      // Get user's SMTP settings
      console.log("se1b   Fetching SMTP settings for user:", req.user.id);
      const userResult = await db.query("SELECT email, smtp_host, smtp_password FROM users WHERE id = $1", [req.user.id]);
      if (userResult.rows.length === 0) {
        console.log("se1c   No SMTP settings found for user:", req.user.id);
        return res.status(400).json({ success: false, message: "User SMTP settings not found" });
      }
      
      const smtpPassword = decrypt(userResult.rows[0].smtp_password, process.env.SMTP_ENCRYPTION_KEY);
      const smtpEmail = userResult.rows[0].email;
      const smtpHost = userResult.rows[0].smtp_host;
      console.log("se1d   SMTP settings - email:", smtpEmail, "host:", smtpHost, "password decrypted:", !!smtpPassword);
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 587, // or 465 for SSL
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpEmail,
          pass: smtpPassword
        }
      });
      console.log("se1e   Nodemailer transporter created successfully");
      
      // Send email
      const mailOptions = {
        from: smtpEmail,
        to: toEmail,
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>') // Simple HTML conversion
      };
      console.log("se1f   Sending email with options:", { from: smtpEmail, to: toEmail, subject: subject });
      
      const info = await transporter.sendMail(mailOptions);
      console.log("se2    Email sent successfully:", info.messageId);
      
      // Store sent email in conversations table
      console.log("se2a   Storing email in conversations table");
      const insertQuery = `
        INSERT INTO public.conversations (
          display_name, person_id, subject, message_text, 
          has_attachment, visibility, job_id, post_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const insertParams = [
        `Sent to ${toEmail}`.substring(0, 15), // Truncate to fit varchar(15)
        customerId,
        subject,
        message,
        null,
        'public',
        null,
        new Date()
      ];
      console.log("se2b   Insert query:", insertQuery);
      console.log("se2c   Insert params:", insertParams.map((p, i) => `${i+1}: ${typeof p === 'string' ? p.substring(0, 50) + '...' : p}`));
      
      await db.query(insertQuery, insertParams);
      console.log("se2d   Email stored in database successfully");
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("se3    Error sending email:", error);
      console.error("se3a   Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
        position: error.position
      });
      res.status(500).json({ success: false, message: "Failed to send email: " + error.message });
    }
  } else {
    console.log("se4    User not authenticated");
    res.status(401).json({ success: false, message: "Not authenticated" });
  }
});

app.get("/checkemail", async (req, res) => {
  if (req.isAuthenticated()) {
    //<a href= "/checkemail?btn=103d&customer_id=<%= customer.id %>&returnto=customer/<%= customer.id %>" class="btn btn-primary">check for new emails</a>
    console.log("ce1    USER(" + req.user.id + ") clicked on Check Email button(" + req.query.btn + ") for customer(" + req.query.customer_id + ") ");
    const customerID = req.query.customer_id || 0;

    //connect to email server and check for new emails
    // pass userID and custID to the email server to check for new emails
    let emailResult;
    try {
      emailResult = await axios.get(`${API_URL}/email/${customerID}/${req.user.id}`);
    } catch (error) {
      console.error("ce2a    Error checking email:", error.message);
      emailResult = { data: { success: false, message: error.message } };
    }
    //const emailResult = await axios.get(`${API_URL}/email/${customerID}`);  
    console.log("ce2    ", emailResult.data);
    let emailMessage = "";
    if (emailResult.data.success) {
      console.log("ce9    ", emailResult.data.message);
      emailMessage = emailResult.data.message;
    } else {
      console.log("ce4    No new emails (or) problem reading emails for customer("+ customerID +") ");
      emailMessage = emailResult.data.message || "No new emails or problem reading emails.";
    }
    res.locals.emailMessage = emailMessage;
    console.log("ce51    emailMessage: ", res.locals.emailMessage);
    
    //redirect to customer page
    console.log("ce5    redirecting to customer page ", req.query.returnto);
    const success = emailResult.data.success ? '1' : '0';
    const message = encodeURIComponent(emailMessage);
    
    if (req.query.returnto.search("build") > -1) {
      // res.redirect("/builds/", req.query.returnto);
      // res.redirect("2/build/" + emailResult.data.build_id);
      console.log("ce6    redirecting to build page ", req.query.returnto);
      res.redirect(`${req.query.returnto}?email_check=${success}&email_message=${message}`);
    } else {
      // res.redirect("/2/build/264"); 
      console.log("ce6    redirecting to customer page ", req.query.returnto);
      res.redirect(`${req.query.returnto}?email_check=${success}&email_message=${message}`);
    }
    // res.redirect("/customer/" + customerID); ;
  }
});

//#endregion

//#region Excel to Web - Customer Imports
app.get("/admin/customers/import", (req, res) => {
  const sessionId = req.sessionID?.substring(0, 8) || 'unknown';
  const userId = req.user?.id || 'unknown';
  console.log(`ci1     [${sessionId}] USER(${userId}) navigated to Customer Import page`);

  //FIX: first two columns job_id jmust read into the new customers.sort_order column

  if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
    console.log(`ci2     [${sessionId}] Access denied - USER(${userId}) does not have sysadmin role`);
    return res.status(403).send("Access denied");
  }

  console.log(`ci3     [${sessionId}] Rendering customer import page for USER(${userId})`);
  res.render("customer-import");
});

// MVP: Customer Excel Import Route (POST)
app.post("/admin/customers/import", upload.single("customerFile"), async (req, res) => {
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
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
            const parsedId = colB ? parseInt(colB, 10) : null;
            rowData["id"] = isNaN(parsedId) ? null : parsedId;
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
            id: row["id"] || null,
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
app.get("/admin/customers/import/reverts", async (req, res) => {
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

app.get("/admin/customers/import/revert/:filename", async (req, res) => {
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

app.post("/admin/customers/import/revert/:filename/execute", async (req, res) => {
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


app.post("/admin/customers/import/email-contacts", async (req, res) => {
  // if (!req.user || !req.user.roles || !req.user.roles.includes("sysadmin")) {
  //   return res.status(403).json({ error: "Access denied" });
  // }
  const userID =  2;     //req.user.id ||

  console.log(`ayu1     USER(${userID}) requested email contacts export`);
  
  try {
    const response = await axios.get(`${API_URL}/importSMTPcontacts/${userID}`);
    console.log(`ayu9     USER(${userID}) requested email contacts export`);
  } catch (error) {
    // console.log(`ayu8     Error calling workflow API `);
    console.log(`ayu80    Error details:`, error?.message || error);
    return res.status(500).json({ error: "Error calling workflow API" });
  }
});

//#endregion




//#region Bryans Excel UX style


async function getJobs(parentID, parentTier, logString) {
  try {
    console.log("bb10" + logString + "getting jobID: ", parentID);
    let jobTier = 500;
    let jobsResult;
    let jobsArray = [];
    let children = [];
    let jobID = parentID.substring(1);

    // Get children for parent job
    jobsResult = await db.query(`
      SELECT 
        't' || t.id as id,
        t.display_text,
        $2 as tier,
        t.sort_order,
        t.job_id,
        t.precedence,
        t.free_text,
        t.current_status,
        t.owned_by,
        t.user_date,
        TO_CHAR(t.target_date, 'DD-Mon-YY') AS target_date,
        TO_CHAR(t.completed_date, 'DD-Mon-YY') AS completed_date,
        t.completed_by,
        t.completed_comment,
        t.change_log,
        t.task_template_id,
        t.task_id,
        null as attachments,
        t.completed_by_person
      FROM tasks t
      WHERE t.job_id = $1
      UNION SELECT
        'j' || f.decendant_id AS id,
        j.display_text, 
        f.tier,
        j.sort_order,
        j.id as job_id,
        'jobflow' as precedence,
        j.free_text,
        j.current_status,
        j.user_id as owned_by,
        null as user_date,
        TO_CHAR(j.target_date, 'DD-Mon-YY') AS target_date,
        TO_CHAR(j.completed_date, 'DD-Mon-YY') AS completed_date,
        j.completed_by,
        null as completed_comment,
        j.change_log,
        null as task_template_id,
        null as task_id,
        j.uploaded_docs as attachments,
        j.completed_by_person
      FROM jobs j 
      INNER JOIN job_process_flow f ON j.id = f.decendant_id 
      WHERE f.antecedent_id = $1 AND f.tier = $2
      ORDER BY sort_order
    `, [jobID, '' + (parentTier + 1)]);

    console.log("bb21" + logString + " job(" + jobID + ") checking job_process_flow on tier(" + (parentTier + 1) + ") child relationships. Found: ", jobsResult.rows.length);

    if (jobsResult.rows.length > 0) {
      let daughters = jobsResult.rows;
      // console.table(daughters);

      // Check for pet-sister relationships
      for (const daughter of daughters) {
        console.log("bb30" + logString + "checking daughter: ", daughter.id);
        let childJobID = daughter.id.substring(1);

        const tier = parentTier + 1;
        jobsResult = await db.query(`
          SELECT
            'j' || f.decendant_id AS id,
            j.display_text, 
            f.tier,
            j.sort_order,
            j.id as job_id,
            'jobflow' as precedence,
            j.free_text,
            j.current_status,
            j.user_id as owned_by,
            null as user_date,
            TO_CHAR(j.target_date, 'DD-Mon-YY') AS target_date,
            TO_CHAR(j.completed_date, 'DD-Mon-YY') AS completed_date,
            j.completed_by,
            null as completed_comment,
            j.change_log,
            null as task_template_id,
            null as task_id,
            j.uploaded_docs,
            j.completed_by_person
          FROM jobs j 
          INNER JOIN job_process_flow f ON j.id = f.decendant_id 
          WHERE f.antecedent_id = $1 AND f.tier = $2
          ORDER BY sort_order
        `, [childJobID, tier]);

        if (jobsResult.rows.length > 0) {
          console.log("bb31" + logString + "sisters found: ", jobsResult.rows.length);
          for (const petDaughter of jobsResult.rows) {
            console.log("bb32" + logString + "appending sister: ", petDaughter.id, petDaughter.display_text);
            daughters.push(petDaughter);
          }
        }
      }

      // Process all daughters (original + sisters)
      for (const daughter of daughters) {
        let childJobID = daughter.id;
        const tier = parentTier + 1;
        console.log("bb5 " + logString + "diving deep to get jobID(" + childJobID + ") on tier ", tier);

        const grandDaughters = await getJobs(childJobID, tier, logString + "  ");
        jobsArray.push({
          ...daughter,
          jobs: grandDaughters,
          reminders: [] // Add empty reminders array to match structure
        });
      }
    } else {
      console.log("bb91" + logString + " no children found for jobID: ", jobID);
    }

    return jobsArray;

  } catch (error) {
    console.error("bb8     Error in getJobData:", error);
    throw error;
  }
}




async function getBuildData(buildID, userSecurityClause = '1=1') {
  try {
    console.log("bc1       getBuildData called for buildID: ", buildID);

    // 1. Get build information with customer access verification
    const buildResult = await db.query(`
      SELECT 
        b.id, 
        b.customer_id, 
        b.product_id, 
        TO_CHAR(b.enquiry_date, 'DD-Mon-YY') as enquiry_date, 
        b.job_id,
        b.current_status,
        p.display_text AS product_description
      FROM builds AS b
      JOIN products AS p ON b.product_id = p.id
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1 AND (${userSecurityClause})
    `, [buildID]);

    if (buildResult.rows.length === 0) {
      console.log(`bc18      Build ${buildID} not found or access denied`);
      return [];
    }

    const buildData = buildResult.rows[0];
    const customerID = buildData.customer_id;

    // 2. Get customer information (already verified access above)
    const customerResult = await db.query(`
      SELECT 
        id, sort_order, full_name, home_address, primary_phone, primary_email, 
        contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up, 
        TO_CHAR(date_last_actioned, 'DD-Mon-YY') AS date_last_actioned
      FROM customers 
      WHERE id = $1
    `, [customerID]);

    // 3. Get missing jobs
    // , 
    const missingJobsResult = await db.query(`
      SELECT t.id, t.sort_order, t.display_text,
      (select b.sort_order from job_templates b where t.antecedent_array = b.id::text) as before,
      (select a.sort_order from job_templates a where t.decendant_array = a.id::text) as after
      FROM job_templates t
      WHERE t.product_id = $1 and t.tier = 500 AND t.id NOT IN (
        SELECT j.job_template_id FROM jobs j WHERE j.build_id = $2
      )
    `, [buildData.product_id, buildID]);


    // 4. Get emails
    const emailsResult = await db.query(`
      SELECT * FROM conversations WHERE person_id = $1
    `, [customerID]);

    // 5. Get all top-level jobs for this build
    const jobsResult = await db.query(`
      SELECT
        'j' || j.id AS id,
        j.display_text, 
        j.tier,
        j.sort_order,
        j.id as job_id,
        j.free_text,
        j.job_template_id,
        j.user_id,
        j.role_id,
        j.build_id,
        j.product_id,
        j.reminder_id,
        j.conversation_id,
        TO_CHAR(j.target_date, 'DD-Mon-YY') AS target_date,
        j.created_by,
        j.created_date,
        j.change_array,
        j.completed_by,
        TO_CHAR(j.completed_date, 'DD-Mon-YY') AS completed_date,
        j.current_status,
        j.change_log,
        j.uploaded_docs,
        j.completed_by_person
      FROM jobs j  
      WHERE build_id = $1 AND (tier IS NULL OR tier = 500)
      ORDER BY j.sort_order
    `, [buildID]);

    // 6. Build the jobs hierarchy
    let jobsArray = [];
    for (const job of jobsResult.rows) {
      const jobID = job.id;
      const tier = parseFloat(job.tier) || 500;
      const tasks = await getJobs(jobID, tier, "  ");

      jobsArray.push({
        id: job.job_id,
        display_text: job.display_text,
        free_text: job.free_text,
        job_template_id: job.job_template_id,
        user_id: job.user_id,
        role_id: job.role_id,
        build_id: job.build_id,
        product_id: job.product_id,
        reminder_id: job.reminder_id,
        conversation_id: job.conversation_id,
        target_date: job.target_date,
        created_by: job.created_by,
        created_date: job.created_date,
        change_array: job.change_array,
        completed_by: job.completed_by,
        completed_date: job.completed_date,
        current_status: job.current_status,
        change_log: job.change_log,
        completed_by_person: job.completed_by_person,
        sort_order: job.sort_order,
        attachments: job.uploaded_docs,
        tasks: tasks
      });
    }

    // 7. Build the final structure
    const allCustomers = customerResult.rows.map(customer => ({
      id: customer.id,
      custom_id: customer.sort_order,
      full_name: customer.full_name,
      home_address: customer.home_address,
      primary_phone: customer.primary_phone,
      primary_email: customer.primary_email,
      contact_other: customer.contact_other,
      current_status: customer.current_status,
      follow_up: customer.follow_up,
      date_last_actioned: customer.date_last_actioned,
      builds: [{
        id: buildData.id,
        customer_id: buildData.customer_id,
        product_id: buildData.product_id,
        enquiry_date: buildData.enquiry_date,
        job_id: buildData.job_id,
        current_status: buildData.current_status,
        product_description: buildData.product_description,
        jobs: jobsArray,
        missing_jobs: missingJobsResult.rows
      }],
      emails: emailsResult.rows
    }));

    return allCustomers;

  } catch (error) {
    console.error('bc8       Error fetching build data:', error);
    throw error;
    return [];
  }
}




app.get("/2/build/:id", async (req, res) => {
  // Initialize an empty array to hold all customers
  let allCustomers = [];

  if (req.isAuthenticated()) {
    console.log("b1      navigate to WORKFLOW_LISTVIEW by user(" + req.user.id + ") ")
    const buildID = req.params.id || "";
    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      if (buildID) {
        console.log("b2       retrieving all jobs for build(" + buildID + ")");

        const allCustomers = await getBuildData(buildID, processedSecurityClause);
        if (allCustomers.length === 0) {
          console.log("b2a      No jobs found for build(" + buildID + ") or access denied");
          res.redirect("/");
          return;
        }
        // console.log("b29       jobs for build("+buildID+")", JSON.stringify(allCustomers, null, 2));
        // return allCustomers;
        // printJobHierarchy(tableData);

        const usersList = await db.query("SELECT id, full_name FROM users where org IS NULL ORDER BY full_name");


        console.log("b30   found " + allCustomers.length + " jobs for build(" + buildID + ") with USER(" + req.user.id + ") ");
        res.render("2/customer.ejs", { user: req.user, tableData: allCustomers, baseUrl: process.env.BASE_URL, resources: usersList.rows });

      } else {
        console.log("b3   ");
        // If there's no search term, fetch all customers and their builds with security filtering
        const customersResult = await db.query(`
          SELECT id, sort_order, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up 
          FROM customers c
          WHERE (${processedSecurityClause})
        `);
        // customersResult.rows.forEach(customer => {     // Format follow_up value in short date format
        //   if (customer.follow_up) {
        //       customer.follow_up = new Date(customer.follow_up).toLocaleDateString();
        //   }
        // });
        const buildsResult = await db.query(`
          SELECT 
            b.id, 
            b.customer_id, 
            b.product_id, 
            TO_CHAR(b.enquiry_date, 'DD-Mon-YY') AS enquiry_date , 
            b.job_id,
            b.current_status,
            p.display_text AS product_description
          FROM 
            builds AS b
          JOIN 
            products AS p ON b.product_id = p.id
          WHERE 
            b.customer_id = ANY ($1)
        `, [customersResult.rows.map(customer => customer.id)]);
        // Merge customer and build data
        allCustomers = customersResult.rows.map(customer => {
          const builds = buildsResult.rows.filter(build => build.customer_id === customer.id);
          return {
            customer,
            builds
          };
        });
        console.log("b6   ");

        // If a build is clicked, render customer.ejs
        const customerId = 2;  // Extract customer id from buildId, assuming buildId contains both customer and build ids;
        // Fetch additional data for the selected build, e.g., jobs
        const jobsResult = await db.query("SELECT * FROM jobs WHERE build_id = $1", [req.query.buildId]);

        // Render customer.ejs with customer, builds, and jobs data
        res.render("customer.ejs", { customer: allCustomers.find(customer => customer.id === customerId), builds: allCustomers, jobs: jobsResult.rows });
      }

    } catch (err) {
      console.log("b8   ");
      console.error(err);
      res.redirect("/");
      return;
      // res.status(500).send("Internal Server Error");
    }
    console.log("b99   user (" + req.user.id + ")");
  } else {
    console.log("b9   ");
    res.redirect("/login");
  }
});

app.get("/2/customers", async (req, res) => {
  console.log("d1      nagivate to CUSTOMER_LISTVIEW")
  if (req.isAuthenticated()) {
    // console.log("d12    user variable from session: ", req.user);

    const query = req.query.query || "";
    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      let allCustomers;
      if (query) {
        console.log("d2      User serched for a term: ", query);
        // Enhanced search query with security filtering
        const customersQuery = `
          SELECT 
            c.id, 
            c.sort_order,
            c.full_name, 
            c.home_address, 
            c.primary_phone, 
            c.primary_email, 
            c.contact_other, 
            c.current_status AS customer_status, 
            TO_CHAR(c.follow_up, 'DD-Mon-YY') AS follow_up,
            b.id AS build_id, 
            b.product_id, 
            b.enquiry_date, 
            b.job_id, 
            b.current_status AS build_status
          FROM 
            customers c
          LEFT JOIN 
            builds b ON b.customer_id = c.id
          WHERE 
            (
              c.full_name ILIKE $1 
              OR c.primary_phone ILIKE $1 
              OR c.home_address ILIKE $1 
              OR c.primary_email ILIKE $1 
              OR c.contact_other ILIKE $1 
              OR c.current_status ILIKE $1
            ) AND (${processedSecurityClause})
          ORDER BY 
            c.follow_up ASC;
        `;

        const customersResult = await db.query(customersQuery, [`%${query}%`]);
        // console.log("d21        search returned " + customersResult.rowCount + " records");

        if (customersResult.rowCount > 0) {
          // Merge customer and build data
          allCustomers = customersResult.rows.reduce((acc, row) => {
            // Check if the customer already exists in the accumulator
            let customer = acc.find(cust => cust.customer.id === row.id);
            if (!customer) {
              // If not, create a new customer object with an empty builds array
              customer = {
                customer: {
                  id: row.id,
                  full_name: row.full_name,
                  home_address: row.home_address,
                  primary_phone: row.primary_phone,
                  primary_email: row.primary_email,
                  contact_other: row.contact_other,
                  current_status: row.customer_status,
                  follow_up: row.follow_up
                },
                builds: []
              };
              acc.push(customer);
            }
            // Add the build to the customer's builds array
            if (row.build_id) {
              // Only add builds that are not archived
              if (row.build_status !== 'Archive' && row.build_status !== 'complete') {
                customer.builds.push({
                  id: row.build_id,
                  product_id: row.product_id,
                  enquiry_date: row.enquiry_date,
                  job_id: row.job_id,
                  current_status: row.build_status
                });
              }
            }
            return acc;
          }, []);

          // console.log("d22   ", allCustomers);
        } else {
          console.log("d24      No customers found");
          allCustomers = [];
        }

      } else {
        console.log("d31      No search terms ");

        // Enhanced no-search query with security filtering
        const customersResult = await db.query(`
          SELECT 
            c.id, 
            c.sort_order,
            c.full_name, 
            c.home_address, 
            c.primary_phone, 
            c.primary_email, 
            c.contact_other, 
            c.current_status AS customer_status, 
            TO_CHAR(c.follow_up, 'DD-Mon-YY') AS follow_up,
            b.id AS build_id, 
            b.product_id, 
            TO_CHAR(b.enquiry_date, 'DD-Mon-YY') AS enquiry_date, 
            b.job_id, 
            b.current_status AS build_status,
            p.display_text AS product_description
          FROM 
            customers c
          LEFT JOIN 
            builds b ON b.customer_id = c.id
          LEFT JOIN 
            products p ON b.product_id = p.id
          WHERE (${processedSecurityClause})
          ORDER BY 
            c.sort_order ASC;
        `);

        // Format follow_up value and structure the data
        allCustomers = customersResult.rows.reduce((acc, row) => {
          // Find or create a customer entry in the accumulator
          let customer = acc.find(cust => cust.customer.id === row.id);
          if (!customer) {
            customer = {
              customer: {
                id: row.id,
                custom_id: row.sort_order,
                full_name: row.full_name,
                home_address: row.home_address,
                primary_phone: row.primary_phone,
                primary_email: row.primary_email,
                contact_other: row.contact_other,
                current_status: row.customer_status,
                follow_up: row.follow_up
              },
              builds: []
            };
            acc.push(customer);
          }

          // Add build to the customer's builds array
          if (row.build_id) {
            customer.builds.push({
              id: row.build_id,
              product_id: row.product_id,
              product_description: row.product_description,
              enquiry_date: row.enquiry_date,
              job_id: row.job_id,
              build_status: row.build_status
            });
          }

          return acc;
        }, []);

        console.log("d39      found " + allCustomers.length + " records");
      }

      // Render the appropriate template based on the scenario
      if (req.query.buildId) {
        console.log("d6   ");

        // If a build is clicked, render customer.ejs
        const customerId = 2;  // Extract customer id from buildId, assuming buildId contains both customer and build ids;
        // Fetch additional data for the selected build, e.g., jobs
        const jobsResult = await db.query("SELECT * FROM jobs WHERE build_id = $1", [req.query.buildId]);
        // Render customer.ejs with customer, builds, and jobs data
        res.render("customer.ejs", { customer: allCustomers.find(customer => customer.id === customerId), builds: allCustomers, jobs: jobsResult.rows });
      } else {
        // console.log("d7   ");
        // If no specific build is clicked, render customers.ejs
        // Grouping customers by current_status

        // const qry1 = await db.query(`SELECT display_text FROM listorder WHERE user_id = $1 AND location_used = 'CustomersStatus' ORDER BY sort_order;`, [req.user.id]);
        const qry1 = await db.query(`SELECT display_text FROM listorder WHERE location_used = 'CustomersStatus' and user_id = 0 ORDER BY sort_order;`);
        let statusOrderList = qry1.rows.map(row => row.display_text);

        // Create a lookup map for quick sorting
        const statusOrderMap = statusOrderList.reduce((acc, status, index) => {
          acc[status] = index; // Assign index based on predefined order
          return acc;
        }, {});

        // Sort the allCustomers array based on the status order
        allCustomers.sort((a, b) => {
          const statusA = a.customer.current_status;
          const statusB = b.customer.current_status;

          // Get the predefined index for each status (default to Infinity if not found)
          const indexA = statusOrderMap[statusA] ?? Infinity;
          const indexB = statusOrderMap[statusB] ?? Infinity;

          return indexA - indexB;
        });

        // Filter statusOrderList to include only statuses that exist in allCustomers
        const existingStatuses = new Set(allCustomers.map(customer => customer.customer.current_status));
        statusOrderList = statusOrderList.filter(status => existingStatuses.has(status));

        // console.log("Sorted allCustomers:", allCustomers);

        res.render("2/customers.ejs", {
          user: req.user,
          tableData: allCustomers,
          baseUrl: process.env.API_URL,
          statusOrderList
        });
      }
    } catch (err) {
      console.log("d8   ");
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("d9       user not authenticated");
    res.redirect("/login");
  }
});



//#endregion


//#region customers

app.get("/3/customers", async (req, res) => {
  console.log("cc1  ");
  if (req.isAuthenticated()) {
    const query = req.query.query || "";     // runs when user logs in and returns all customers
    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      // Enhanced customer search query with security filtering
      const result = await db.query(`
        SELECT * FROM customers c 
        WHERE (c.full_name LIKE $1 OR c.primary_phone LIKE $1 OR c.home_address LIKE $1) 
        AND (${processedSecurityClause})
      `, [`%${query}%`]);
      console.log("cc1  ");

      let allCustomers = result.rows;
      let status = {};
      let openCustomers = [];
      let closedCustomers = [];
      for (let i in result.rows) {
        try {
          status = JSON.parse(result.rows[i].current_status).category;
        } catch (err) {
          status = result.rows[i].current_status
        }
        if (status === "open") {
          openCustomers.push(result.rows[i]);
        } else {
          closedCustomers.push(result.rows[i]);
        }
      }
      allCustomers = { open: openCustomers, closed: closedCustomers };
      console.log("cc5   ", allCustomers);

      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("2/customers.ejs", {
        user: req.user,
        data: openCustomers
      });

    } catch (err) {
      console.error("cc8  " + err);
      // Handle errors appropriately, perhaps render an error page
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/customer/:id", async (req, res) => {
  const custID = parseInt(req.params.id);
  if (req.isAuthenticated()) {
    console.log("c1      navigate to EDIT_CUSTOMER_DETAILS for custID: ", custID);

    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      // Enhanced customer query with security filtering
      const result = await db.query(`
        SELECT * FROM customers c WHERE c.id = $1 AND (${processedSecurityClause})
      `, [custID]);

      let customer = result.rows;
      if (customer.length !== 1) {
        // if (customer.length === 0) {
        //   console.log("c2      Customer not found or access denied for custID: ", custID);
        //   res.redirect("/2/customers"); // Redirect to customer list instead of allowing new customer creation
        //   return;
        // }
        //return to New Customer dialog
        console.error("c28     Error: Expected 1 row, but received " + customer.length + " rows.");
      }

      // Enhanced builds query with customer access verification (customer already verified above)
      const qryBuilds = await db.query("SELECT products.display_text, builds.id, builds.customer_id, builds.product_id, builds.enquiry_date FROM builds INNER JOIN products ON builds.product_id = products.id WHERE customer_id = $1", [custID]);
      let builds = qryBuilds.rows;

      const qryProducts = await db.query("SELECT id, display_text FROM products order by display_text;");
      let products = qryProducts.rows;

      //read emails for the customer (customer access already verified)
      const qryEmails = await db.query("SELECT id, display_name, person_id, subject, message_text, has_attachment, visibility, job_id, post_date FROM conversations WHERE person_id = $1", [custID]);
      let emails = qryEmails.rows;

      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("customer.ejs", {
        data: customer[0],
        builds: builds,
        products: products,
        emails: emails
      });

    } catch (err) {
      console.error(err);
      // Handle errors appropriately, perhaps render an error page
      res.status(500).send("Internal Server Error");
    }


  } else {
    res.redirect("/login");
  }
});

app.get("/customers", async (req, res) => {
  console.log("a1      navigate to EDITOR_LIST page ");
  if (req.isAuthenticated()) {
    const query = req.query.query || "";     // runs when user logs in and returns all customers
    try {
      // Get user's security clause for data access control
      const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
      const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access

      // Replace $USER_ID placeholder with actual user ID for dynamic clauses
      const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);

      // Enhanced status list query with security filtering
      const statusList = await db.query(`
        SELECT DISTINCT c.current_status FROM customers c WHERE (${processedSecurityClause})
      `);

      // Enhanced customer search query with security filtering
      const result = await db.query(`
        SELECT * FROM customers c 
        WHERE (c.full_name LIKE $1 OR c.primary_phone LIKE $1 OR c.home_address LIKE $1) 
        AND (${processedSecurityClause})
      `, [`%${query}%`]);

      const customersByStatus = statusList.rows.reduce((acc, status) => {
        acc[status.current_status] = result.rows.filter(customer => customer.current_status === status.current_status);
        return acc;
      }, {});

      console.log("a2       Grouped Customers by Status:", result.rowCount);
      res.render("listCustomers.ejs", {
        user: req.user,
        data: customersByStatus
      });
      return;



    } catch (err) {
      console.error(err);
      // Handle errors appropriately, perhaps render an error page
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/management-report", async (req, res) => {
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
          c.id, c.sort_order, c.job_no, c.full_name, c.primary_phone, c.current_status, c.invoices_collected,
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

app.post("/addCustomer", async (req, res) => {
  console.log("n1      USER is adding a new customer ");
  if (req.isAuthenticated()) {
    try {
      const currentTime = new Date(); // Get the current time
      currentTime.setDate(currentTime.getDate() + 21); // Add 21 days

      // Get user security clause for duplicate checking
      const userSecurityClause = await getUserSecurityClause(req.user.id);
      const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);

      //check if the customer name already exists
      console.log("n71   checking if name already exists: ", req.body.fullName);
      if (req.body.fullName) {
        const existingCustomer = await db.query(`SELECT * FROM customers c WHERE LOWER(c.full_name) = LOWER($1) `, [req.body.fullName]);
        if (existingCustomer.rows.length > 0) {
          console.log("n81         Customer already exists: ", req.body.fullName);
          res.redirect("/customer/" + existingCustomer.rows[0].id); // Redirect to the existing customer's page
          return;
        }
      }

      console.log("72    check if email already exists", req.body.primaryEmail);
      if (req.body.primaryEmail) {
        const existingEmail = await db.query(`SELECT * FROM customers c WHERE c.primary_email = $1 `, [req.body.primaryEmail]);
        if (existingEmail.rows.length > 0) {
          console.log("n82         Email already exists: ", req.body.primaryEmail);
          res.redirect("/customer/" + existingEmail.rows[0].id); // Redirect to the existing customer's page
          return;
        }
      }
      console.log("73    check if phone number already exists", req.body.primaryPhone);
      if (req.body.primaryPhone) {
        const existingPhone = await db.query(`SELECT * FROM customers c WHERE c.primary_phone = $1 `, [req.body.primaryPhone]);
        if (existingPhone.rows.length > 0) {
          console.log("n83         Phone number already exists: ", req.body.primaryPhone);
          res.redirect("/customer/" + existingPhone.rows[0].id); // Redirect to the existing customer's page
          return;
        }
      }
      console.log("74    check if address already exists", req.body.homeAddress);
      if (req.body.homeAddress) {
        const existingAddress = await db.query(`SELECT * FROM customers c WHERE c.home_address = $1 `, [req.body.homeAddress]);
        if (existingAddress.rows.length > 0) {
          console.log("n84         Address already exists: ", req.body.homeAddress);
          res.redirect("/customer/" + existingAddress.rows[0].id); // Redirect to the existing customer's page
          return;
        }
      }
      console.log("75    check if custom ID already exists", req.body.contactOther);
      if (req.body.contactOther) {
        const existingContact = await db.query(`SELECT * FROM customers c WHERE c.sort_order = $1 `, [req.body.contactOther]);
        if (existingContact.rows.length > 0) {
          console.log("n85         customerID already exists: ", req.body.contactOther);
          res.redirect("/customer/" + existingContact.rows[0].id); // Redirect to the existing customer's page
          return;
        }
      }
      // Insert the new customer into the database
      const result = await db.query(
        "INSERT INTO customers (full_name, home_address, primary_phone, primary_email, sort_order, current_status, follow_up) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [req.body.fullName, req.body.homeAddress, req.body.primaryPhone, req.body.primaryEmail, req.body.customID, "Initial enquiry", currentTime]
      );
      const newCustomer = result.rows[0];

      console.log("n2      new customer added: ", newCustomer.full_name, " with ID: ", newCustomer.id);
      const build = await db.query("INSERT INTO builds (customer_id, product_id, site_address) VALUES ($1, $2, $3) RETURNING *", [newCustomer.id, 8, newCustomer.home_address]);
      const newBuild = build.rows[0];
      const buildID = newBuild.id;

      //start workflow
      console.log("n3        adding the original job for the build(" + buildID + ")");
      const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);     //&product_id=${req.body.product_id}`);
      const q = await db.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID])

      console.log("n4       job added to build: ", response.data.id, " for buildID: ", buildID);
      const q2 = await db.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [req.user.id, buildID])
      console.log("n555       updated count(" + q2.rowCount + ") build(" + buildID + ") with user_id: ", req.user.id);

      return res.redirect("/2/build/" + buildID);

    } catch (err) {
      console.log("n8       ", err);
      return res.status(500).send("Internal Server Error");
    }
    // res.redirect("/2/customers");
    // res.redirect("/jobs/" + response.data.id);
  }
});

app.post("/updateCustomer/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    const action = req.body.action;     // did the user click delete, update, view, or
    const userID = parseInt(req.params.id);

    // Get user security clause for customer access control
    const userSecurityClause = await getUserSecurityClause(req.user.id);
    const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);

    switch (action) {
      case "update":
        // Check access before updating
        const updateAccessCheck = await db.query(`SELECT 1 FROM customers c WHERE c.id = $1 AND (${processedSecurityClause})`, [userID]);
        if (updateAccessCheck.rows.length === 0) {
          console.log("Access denied for customer update: ", userID);
          return res.redirect("/login");
        }

        // Use parameterized query to prevent SQL injection and handle special characters
        const updateSQL = `
              UPDATE customers SET     
                full_name = $1,
                home_address = $2,
                primary_phone = $3,
                primary_email = $4,
                contact_other = $5,
                current_status = $6,
                job_no = $7,
                site_location = $8,
                building_type = $9,
                permit_type = $10,
                slab_size = $11,
                council_responsible = $12,
                owner_builder_permit = $13,
                work_source = $14,
                date_ordered = $15,
                date_bp_applied = $16,
                date_bp_issued = $17,
                date_completed = $18,
                quoted_estimate = $19,
                invoices_collected = $20,
                fees_paid_out = $21,
                job_earnings = $22,
                next_action_description = $23,
                follow_up = $24,
                sort_order = $26,
                date_last_actioned = CURRENT_TIMESTAMP
              WHERE id = $25 
              RETURNING *`;

        const params = [
          req.body.fullName,
          req.body.homeAddress,
          req.body.primaryPhone,
          req.body.primaryEmail,
          req.body.contactOther,
          req.body.currentStatus,
          req.body.jobNo,
          req.body.siteLocation,
          req.body.buildingType,
          req.body.permitType,
          req.body.slabSize,
          req.body.councilResponsible,
          req.body.ownerBuilderPermit === 'on' ? true : false,
          req.body.workSource,
          req.body.dateOrdered || null,
          req.body.dateBpApplied || null,
          req.body.dateBpIssued || null,
          req.body.dateCompleted || null,
          req.body.quotedEstimate || null,
          req.body.invoicesCollected || null,
          req.body.feesPaidOut || null,
          req.body.jobEarnings || null,
          req.body.nextActionDescription,
          req.body.followUp || null,
          userID,
          req.body.customID || null,
        ];

        try {
          const result = await db.query(updateSQL, params);
          const updatedCustomer = result.rows[0];
          console.log("Customer updated successfully:", updatedCustomer.id);
        } catch (err) {
          console.error("Error updating customer:", err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }



        res.redirect("/customer/" + userID);
        break;
      case "delete":
        // Check access before deleting
        const deleteAccessCheck = await db.query(`SELECT 1 FROM customers c WHERE c.id = $1 AND (${processedSecurityClause})`, [userID]);
        if (deleteAccessCheck.rows.length === 0) {
          console.log("Access denied for customer deletion: ", userID);
          return res.redirect("/login");
        }

        try {
          const result = await db.query("DELETE FROM customers WHERE id=" + userID + " RETURNING 1");
          const result2 = await db.query("DELETE FROM builds WHERE customer_id =" + userID + " RETURNING 1");
        } catch (err) {
          console.error(err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        res.redirect("/2/customers");
        break;
      case "view":

        res.redirect("/customer/" + userID);
        break;
      case "edit":
        res.redirect("/customer/" + userID);
        break;
      default:
        console.error("This should never happen 2198442");
        res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error              
    }


  } else {
    res.redirect("/login");
  }
});
//#endregion










//#region builds


app.post("/updateUserStatusOrder", async (req, res) => {
  console.log("us1   ");
  // console.log("us10   User ID:", req.body.userId);
  // console.log("us11   Status Order:", JSON.stringify(req.body.statusOrder, null, 2)); // Pretty print array



  try {
    console.log("us21   ");
    const { userId, statusOrder } = req.body;
    if (!Array.isArray(statusOrder) || statusOrder.length === 0) {
      return res.status(400).json({ error: "Invalid or empty statusOrder array" });
    }
    const values = statusOrder.map((item, index) => `(${userId}, 'CustomersStatus', ${index}, '${item.status.replace(/'/g, "''")}')`).join(",\n");
    const deleteSql = `DELETE from listOrder where location_used = 'CustomersStatus' and user_id = ${userId}; `;
    const insertSql = `INSERT INTO listOrder (user_id, location_used, sort_order, display_text) VALUES ${values};`;
    // console.log("us22   Generated SQL:\n", sql); // Log the generated SQL statement

    await db.query('BEGIN');
    await db.query(deleteSql);
    await db.query(insertSql);
    await db.query('COMMIT');

    res.status(200).json({ message: "UserSpecificStatusOrder updated successfully." });
  } catch (error) {
    console.log("us81   "); // Log the incoming request body
    await db.query('ROLLBACK');
    console.error("Error updating UserSpecificStatusOrder:", error);
    res.status(500).json({ error: "Failed to update UserSpecificStatusOrder." });
  }
});


app.post("/buildComplete", async (req, res) => {
  try {
    console.log("tc1   ", req.body);
    const buildID = req.body.buildId;
    const status = req.body.status;    //string 'true' or 'false'

    // Get user security clause for build access control
    const userSecurityClause = await getUserSecurityClause(req.user.id);
    const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);

    // Fetch the current status of the build from the database with access control
    const result = await db.query(`
        SELECT b.current_status 
        FROM builds b 
        JOIN customers c ON b.customer_id = c.id 
        WHERE b.id = $1 AND (${processedSecurityClause})
    `, [buildID]);

    if (result.rows.length === 0) {
      console.log("tc2   Access denied or build not found: ", buildID);
      return res.status(403).json({ error: "Access denied or build not found" });
    }

    const currentStatus = result.rows[0].current_status;

    // Update logic based on currentStatus and status values
    let newCompleteDate;
    let newCompleteBy;
    let newStatus;
    if (status === 'true') {
      newCompleteDate = new Date();
      newStatus = 'complete';
    } else {
      newCompleteDate = null;
      newStatus = null;     //'pending';
    }
    newCompleteBy = req.user.id || 1;


    // Update the builds table in your database
    const updateResult = await db.query("UPDATE builds SET current_status = $1 WHERE id = $2", [newStatus, buildID]);

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
      console.log(`tc9   build ${buildID} status updated to ${newStatus}`);
      res.status(200).json({ message: `build ${buildID} status updated to ${newStatus}` });
    } else {
      console.log(`tc8     build ${buildID} not found or status not updated`);
      res.status(404).json({ error: `build ${buildID} not found or status not updated` });
    }
  } catch (error) {
    console.error("tc84     Error updating build status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/addBuild", async (req, res) => {

  if (req.isAuthenticated()) {
    try {
      let custID = parseInt(req.body.customer_id);
      let productID = req.body.product_id;
      let custAddress;
      console.log("e1       USER(" + req.user.id + ") is adding a workflow to build() for cust(" + custID + ")", req.body);

      // Get user security clause for customer access control
      const userSecurityClause = await getUserSecurityClause(req.user.id);
      const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);

      const cust = await db.query(`SELECT * FROM customers c WHERE c.id = $1 AND (${processedSecurityClause})`, [custID]);
      if (cust.rows.length === 0) {
        console.log("e12a      Access denied or customer not found: ", custID);
        return res.redirect("/login");
      }

      custAddress = cust.rows[0].home_address;
      console.log("e12       customer address: ", custAddress);

      const result = await db.query("INSERT INTO builds (customer_id, product_id, enquiry_date, site_address) VALUES ($1, $2, $3::timestamp, $4) RETURNING *", [req.body.customer_id, req.body.product_id, req.body.enquiry_date, custAddress]);
      const newBuild = result.rows[0];
      const buildID = newBuild.id;

      //start workflow
      console.log("e3        adding the original job for the build(" + buildID + ")");
      const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);     //&product_id=${req.body.product_id}`);
      const q = await db.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID])
      const q2 = await db.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [req.user.id, buildID])

      // res.redirect("/jobs/" + response.data.id);
      return res.redirect("/2/build/" + buildID);
    } catch (err) {
      console.log(err);
    }
    //res.redirect("/customer/" + req.body.customer_id);
  } else {
    return res.redirect("/login");
  }
});

app.post("/updateBuild/:id", async (req, res) => {
  const buildID = parseInt(req.params.id);
  console.log("f1      navigate to EDIT(JOB) page for build/:" + buildID);
  const action = req.body.action;     // did the user click delete, update, view, or
  console.log("f2       action: ", action, req.body);
  if (req.isAuthenticated()) {

    // Get user security clause for build access control
    const userSecurityClause = await getUserSecurityClause(req.user.id);
    const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);
    let enquiryDate = req.body.enquiry_date = '' ? null : req.body.enquiry_date;

    switch (action) {
      case "update":
        // console.log(action);
        // console.log(req.body);
        const updateSQL = "UPDATE builds SET     " +
          "customer_id='" + req.body.customer_id + "', " +
          "product_id='" + req.body.product_id + "', " +
          "enquiry_date='" + req.body.enquiry_date.slice(0, 19).replace('T', ' ') + "' " +        // Format: YYYY-MM-DD HH:MM:SS
          "WHERE id=" + buildID + " RETURNING *"
        // console.log(updateSQL);
        try {
          const result = await db.query(updateSQL);
          const updatedCustomer = result.rows[0];
          // console.log(updatedCustomer);
        } catch (err) {
          console.error("f38      " + err);
          res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }

        console.log("f3        updated build_" + buildID);
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "delete":
        try {
          // Check access before deleting
          const accessCheck = await db.query(`SELECT 1 FROM builds b JOIN customers c ON b.customer_id = c.id WHERE b.id = $1 AND (${processedSecurityClause})`, [buildID]);
          if (accessCheck.rows.length === 0) {
            console.log("f3a       Access denied for build deletion: ", buildID);
            return res.redirect("/login");
          }
          const result = await db.query("DELETE FROM builds WHERE id=" + buildID + " RETURNING 1");
        } catch (err) {
          console.error(err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        console.log("f3        deleted build_" + buildID);
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "view":
        // Check access before retrieving job_id
        const accessResult = await db.query(`SELECT b.job_id FROM builds b JOIN customers c ON b.customer_id = c.id WHERE b.id = $1 AND (${processedSecurityClause})`, [buildID]);
        if (accessResult.rows.length === 0) {
          console.log("f7a       Access denied for build view: ", buildID);
          return res.redirect("/login");
        }
        // console.log("f7    updateBuild/   case:view    job_id="+result.rows[0]);
        // res.redirect("/jobs/" + result.rows[0].job_id);
        res.redirect("/2/build/" + buildID);

        break;
      default:
        console.error("f8    This should never happen 2198442");
        res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error              
    }


  } else {
    res.redirect("/login");
  }
});

//#endregion






//#region jobs




app.post("/jobComplete", async (req, res) => {
  console.log("jb1      USER is updating status", req.body);
  try {
    const jobID = req.body.jobId;
    const status = req.body.status;    //string 'true' or 'false'

    // Fetch the current status of the job from the database
    console.log("jb11   ", jobID, status);
    const result = await db.query("SELECT current_status, tier FROM jobs WHERE id = $1", [jobID]);
    const currentStatus = result.rows[0].current_status;
    const tier = result.rows[0].tier;

    // Update logic based on currentStatus and status values
    // Update logic based on currentStatus and status values
    let newCompleteDate;
    let newCompleteBy;
    let newStatus;
    if (status === 'true') {
      newCompleteDate = new Date();
      newStatus = 'complete';
    } else {
      newCompleteDate = null;
      newStatus = null     //'pending';
    }
    newCompleteBy = req.user?.id || 1;


    // Update the jobs table in your database
    console.log("jb2    ", newStatus, jobID);
    const updateResult = await db.query("UPDATE jobs SET current_status = $1, completed_date = $3, completed_by = $4  WHERE id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
      // update the status of all child tasks 
      console.log("jb71      ", jobID, newStatus);
      //  const result = await db.query(`UPDATE tasks SET current_status = $2 WHERE job_id = $1`, [jobID, newStatus]);
      //const result = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE job_id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);
      let childStatus = newStatus === 'complete' ? 'complete' : null;
      const result2 = await db.query(`UPDATE jobs SET current_status = $1 WHERE id IN(select j.id from jobs j inner join job_process_flow f ON j.id = f.decendant_id where f.antecedent_id = $2 and f.tier > $3)`, [childStatus, jobID, tier]);
      // console.log("jb72      ", result.rowCount);  
      console.log(`jb9   job(${jobID}) children updated updated to ${childStatus}`);
      res.status(200).json({ message: `job(${jobID}) children updated to ${childStatus}` });

    } else {
      console.log(`jb8     job ${jobID} not found or status not updated`);
      res.status(404).json({ error: `job ${jobID} not found or status not updated` });
    }
  } catch (error) {
    console.error("jb84     Error updating job status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/jobs/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    // console.log("g1      navigate to JOB_EDIT page for /jobs/:", req.params.id);
    //console.log(req.params.id);
    let response
    try {
      response = await axios.get(`${API_URL}/jobs/${req.params.id}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error("g81     Job not found");
        return res.send("g81    cannot find this job"); // Redirect to the home page
      } else {
        // Handle other errors (e.g., 500, network errors)
        console.error("g82      Unexpected error:", error.message);
        return res.status(500).send("Internal Server Error"); // Send a 500 error response
      }
    }
    // console.log("g2  ");
    //console.log(response.data);
    console.log("g9      navigate to JOB_EDIT page for /jobs/:" + req.params.id + " - '" + response.data.job.display_text + "'");
    res.render("editTask.ejs", {
      //res.render("jobs.ejs", {
      siteContent: response.data, baseURL: baseURL
    });
  } else {
    console.log("g8  ");
    res.redirect("/login");
  }
});

app.get("/jobDone/:id", async (req, res) => {
  console.log("j1    Set job(" + req.params.id + ") as done");
  const jobID = parseInt(req.params.id);
  if (req.isAuthenticated()) {
    const response = await axios.get(`${API_URL}/jobDone/${req.params.id}`);
    res.redirect("/jobs/" + jobID);
  } else {
    res.redirect("/login");
  }
});

app.get("/delJob", async (req, res) => {
  if (req.isAuthenticated()) {
    if (req.query.btn) {
      console.log("i1      USER(" + req.user.id + ") clicked btn(" + req.query.btn + ") to delete job(" + req.query.jobnum + ") recursively");
    } else {
      console.log("i1      user(" + req.user.id + ") is deleting job(" + req.query.jobnum + ")");
    }
    const response = await axios.get(`${API_URL}/deleteJob?job_id=${req.query.jobnum}`);
    console.log("i9       USER(" + req.user.id + ") deleted job(" + req.query.jobnum + ") with response: " + response.data.status);
    if (req.query.returnto) {
      console.log("i4       redirecting to build_id: " + req.query.returnto);
      const build_id = req.query.returnto.split("/")[1]; // Extract the build ID from the returnto URL
      console.log("i4       redirecting to build_id: " + build_id);
      res.redirect("/2/build/" + build_id);
    } else {
      res.redirect("/jobs/" + response.data.goToId);
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/addjob", async (req, res) => {
  if (req.isAuthenticated()) {
    if (req.query.btn) {
      console.log("j1      USER(" + req.user.id + ") clicked btn(" + req.query.btn + ") to add a new job ", req.query);
    } else {
      console.log("j1      user(" + req.user.id + ") is adding a new job on tier ", req.query);
      if (!req.query.tier || isNaN(Number(req.query.tier))) {
        console.error("j81       no tier specified or tier is not a number");
        res.redirect("/jobs/" + req.query.jobnum);
        return;
      }
    }

    //Add a single job as a placeholder for further user input (and the relationship)
    const response = await axios.get(`${API_URL}/addjob?tier=${req.query.tier}&precedence=${req.query.type}&id=${req.query.jobnum}`);
    console.log("j9       new job added:", response.data.id);
    // console.log("j39    ", req.query);
    if (req.query.returnto && req.query.returnto.startsWith('build')) {
      // console.log("j41       redirecting to build_id: " + req.query.returnto);
      const build_id = req.query.returnto.replace('build', ''); // Extract the build ID from the returnto URL
      console.log("j42       returning to build_id: " + build_id);
      res.redirect("/2/build/" + build_id);
    } else {
      res.redirect("/jobs/" + req.query.jobnum);
    }
  } else {
    res.redirect("/login");
  }

});

//#endregion









//#region tasks


app.post("/taskComplete", async (req, res) => {
  try {
    console.log("ta1    USER changed task status ", req.body);
    const taskID = req.body.taskId;
    const status = req.body.status;    //string 'true' or 'false'

    // Fetch the current status of the task from the database
    const result = await db.query("SELECT current_status FROM tasks WHERE id = $1", [taskID]);
    console.log("ta11   ", result.rows[0]);
    const result2 = await db.query("SELECT current_status FROM jobs WHERE id = $1", [taskID]);
    console.log("ta12   ", result2.rows[0]);
    const currentStatus = result.rows[0].current_status;

    // Update logic based on currentStatus and status values
    let newStatus;
    let newCompleteDate;
    let newCompleteBy;
    if (status === 'true') {
      // console.log("ta2");
      // if (currentStatus === null || currentStatus === 'pending') {
      //     newStatus = 'active';
      // } else if (currentStatus === 'active') {
      //     newStatus = 'complete';
      // }
      newStatus = 'complete';
      newCompleteDate = new Date();
      newCompleteBy = req.user.id;
    } else {
      // console.log("ta3");
      // If status is not 'true', keep the current status unchanged
      newStatus = 'pending';
      newCompleteDate = null;
      newCompleteBy = req.user.id;
    }

    // Update the tasks table in your database
    const updateResult = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE id = $2", [newStatus, taskID, newCompleteDate, newCompleteBy]);
    // console.log("ta4");

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
      const q4 = await db.query(`DELETE FROM worksheets WHERE description LIKE '%' || '"task_id":' || $1 || ',' || '%'`, [taskID]);
      console.log(`ta9      Task ${taskID} status updated to ${newStatus}`);
      res.status(200).json({ message: `Task ${taskID} status updated to ${newStatus}` });
    } else {
      console.log(`ta8     Task ${taskID} not found or status not updated`);
      res.status(404).json({ error: `Task ${taskID} not found or status not updated` });
    }
  } catch (error) {
    console.error("ta84     Error updating task status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.get("/tasks/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log("m1      ", req.params.id);
    let response
    try {
      response = await axios.get(`${API_URL}/tasks/${req.params.id}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error("m81     Task not found");
        return res.send("m81    cannot find this task"); // Redirect to the home page
      } else {
        // Handle other errors (e.g., 500, network errors)
        console.error("m82      Unexpected error:", error.message);
        return res.status(500).send("Internal Server Error"); // Send a 500 error response
      }
    }
    // console.log("g2  ");
    //console.log(response.data);
    console.log("m9      navigate to JOB_EDIT page for /tasks/:" + req.params.id + " - '" + response.data.job.display_text + "'");
    res.render("editTask.ejs", {
      //res.render("jobs.ejs", {
      siteContent: response.data, baseURL: baseURL
    });
  } else {
    console.log("m8  ");
    res.redirect("/login");
  }
});


app.get("/addtask", async (req, res) => {
  let precedence;
  if (req.isAuthenticated()) {
    if (req.query.type == "parent") {
      precedence = "pretask";
    } else if (req.query.type == "child") {
      precedence = "postask";
    } else {
      console.error("did not understand " + req.query.type)
    }
    const response = await axios.get(`${API_URL}/addtask?precedence=${precedence}&job_id=${req.query.jobnum}`);
    res.redirect("/jobs/" + req.query.jobnum);
  } else {
    res.redirect("/login");
  }
});

app.get("/deltask", async (req, res) => {
  console.log("dlt1    ", req.query)
  let precedence;
  if (req.isAuthenticated()) {
    if (req.query.table == "task") {
      const response = await axios.get(`${API_URL}/deltask?table=${req.query.table}&task_id=${req.query.id}`);
    } else {
      console.error("did not understand " + req.query.type)
    }
    console.log("dlt9   success")
    res.redirect("/jobs/" + req.query.jobnum);
  } else {
    res.redirect("/login");
  }
});

//#endregion




//#region authentication


app.post("/updateRoles", async (req, res) => {
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



app.get("/login", (req, res) => {
  console.log("l1      navigate to LOGIN page")
  res.render("login.ejs");
  baseURL = `${req.protocol}://${req.get('host')}`;
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/2/customers",      // "/2/customers",    //"/jobs/94",     //2/build/16,
    failureRedirect: "/login",
  })
);

app.get("/register", (req, res) => {
  res.render("register.ejs");
  baseURL = `${req.protocol}://${req.get('host')}`;
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);


    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            res.redirect("/login");
          });
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
});

app.get("/logout", (req, res) => {
  console.log("lz1     USER clicked logout")
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      // console.log("pp1     user(" + username + ") is trying to log in on [MAC] at [SYSTIME]"  )
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("pp83     Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              console.log(`pp9    user(${result.rows[0].id}) authenticated on [MAC] at [${getMelbourneTime()}]`);
              logUserActivity(result.rows[0].id, `pp9    user(${result.rows[0].id}) authenticated on [MAC] at [${getMelbourneTime()}]`);
              return cb(null, user);
            } else {
              console.log(`pp81     user(${username}) wrong password on [MAC] at [${getMelbourneTime()}]`);
              return cb(null, false);
            }
          }
        });
      } else {
        console.log("pp82     user(" + username + ") not registered on [MAC] at [SYSTIME]")
        return cb("Sorry, we do not recognise you as an active user of our system.");
        // known issue: page should redirect to the register screen.  To reproduce this error enter an unknown username into the login screen
      }
    } catch (err) {
      console.error(err);
    }
  })
);


passport.serializeUser((user, cb) => {
  console.log('pp95     Serializing user ID:', user.id);
  cb(null, user.id); // Store only user ID in session
});

passport.deserializeUser(async (id, cb) => {
  try {
    // console.log('pp96     Deserializing user ID:', id);
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      cb(null, result.rows[0]); // Return fresh user data from database
    } else {
      cb(new Error('User not found'), null);
    }
  } catch (err) {
    console.error('pp97     Error deserializing user:', err);
    cb(err, null);
  }
});
//#endregion





// ENHANCED UPDATE ROUTE - Using Rule Engine (Stage 1 Demo)
app.get("/update-v2", async (req, res) => {
  if (!req.isAuthenticated()) {
    console.error("ufg89v2  User not authenticated, redirecting to login page");
    return res.redirect("/login");
  }

  try {
    const { fieldID, newValue, whereID: rowID, btn: calledByButton } = req.query;
    const decodedValue = newValue ? decodeURIComponent(newValue) : '';

    console.log(`ufgv2_1  USER(${req.user.id}) updating ${fieldID} to "${decodedValue}" for rowID ${rowID}`);

    // Validate required parameters
    if (!fieldID) {
      console.error("ufgv2_2  Error: fieldID is null");
      return res.status(400).send("Error: fieldID is required");
    }

    if (!rowID) {
      console.error("ufgv2_3  Error: rowID is null");
      return res.status(400).send("Error: rowID is required");
    }

    // Import and initialize the enhanced change processor
    const { default: ChangeProcessor } = await import('./utils/changeProcessor.js');
    const changeProcessor = new ChangeProcessor(db, axios, process.env.API_URL);

    // Process the update using the rule engine
    const updateRequest = {
      fieldID,
      newValue: decodedValue,
      rowID,
      calledByButton,
      originalValue: newValue
    };

    const result = await changeProcessor.processFieldUpdate(updateRequest, req.user);

    if (result.success) {
      console.log(`ufgv2_4  Successfully processed ${fieldID} update`);
      res.status(200).send("Update successful");
    } else if (result.fallbackToLegacy) {
      console.log(`ufgv2_5  Falling back to legacy route for ${fieldID}`);
      // Redirect to legacy route with same parameters
      const queryString = new URLSearchParams(req.query).toString();
      return res.redirect(`/update?${queryString}`);
    } else {
      console.error(`ufgv2_6  Update failed: ${result.error}`);
      res.status(500).send(`Error updating ${fieldID}: ${result.error}`);
    }

  } catch (error) {
    console.error("ufgv2_7  Exception in enhanced update route:", error);
    res.status(500).send("Internal server error");
  }
});

// LEGACY UPDATE ROUTE - Original Implementation
app.get("/update", async (req, res) => {
  if (req.isAuthenticated()) {
    const called_by_button = req.query.btn || 'na';
    const fieldID = req.query.fieldID;
    console.log("ufg0   Raw value:", req.query.newValue); // Might show encoded
    const newValue = req.query.newValue || '';      //decodeURIComponent(req.query.newValue || '');   
    console.log("ufg0   Decoded value:", decodeURIComponent(req.query.newValue)); // Should show \n
    console.log("ufg0   JSON.stringify:", JSON.stringify(decodeURIComponent(req.query.newValue))); // Makes newlines visible
    const rowID = req.query.whereID;
    console.log("ufg1    user(" + req.user.id + ") clicked (" + called_by_button + ") to changed " + fieldID + " to " + newValue + " for rowID " + rowID);
    // console.log("ufg2    inline value edit ", fieldID, newValue, rowID);

    if (!fieldID) {
      console.error("ufg831    Error: fieldID is null - write was cancelled");
      res.status(400).send("Error: fieldID is null");
      return;
    }
    if (!newValue) {
      console.log("ufg832    newValue is null ");
      // console.log("ufg3    inline value edit ", fieldID, newValue, rowID);
      //return res.status(200).send(" newValue is null");
      //return;
    }
    if (!rowID) {
      console.error("ufg833    Error: rowID is null - write was cancelled");
      res.status(400).send("Error: rowID is null");
      return;
    }

    let table = "";
    let columnName = "";
    let value = "";
    let q;
    // console.log("ufg41")
    try {

      switch (fieldID) {
        case "customerFollowUpDate":
          // console.log("ufg41     [" + newValue + "] ")
          table = "customers"
          columnName = "follow_up"
          value = newValue;
          console.log("ufg410     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "customCustomerCode":
          table = "customers"
          columnName = "sort_order"
          value = newValue;
          console.log("ufg410     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;          
        case "jobTargetDate":
          console.log("ufg411     [" + newValue + "] ")
          table = "jobs"
          columnName = "target_date"
          value = newValue;
          if (newValue === "" || JSON.stringify(decodeURIComponent(newValue)) === "\n") {
            console.log("ufg41181      date value is null");
            value = "";
          } else if (isNaN(Date.parse(value))) {
            console.error("ufg4118  Invalid date value:", value);
            return res.status(400).send("Invalid date value");
          }
          console.log("ufg411     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
            console.log("ufg4112     updating worksheet date", value, rowID);
            // let q1 = await db.query("update worksheets set date = $1 where job_id = $2", [value, rowID]);
            try {
              let q1 = await db.query("update worksheets set date = $1 where job_id = $2", [value, rowID]);
              console.log("ufg4113     daytask list was updated successfully");
            } catch (error) {
              console.error("ufg4114     Error updating daytask list:", error);
            }
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "taskTargetDate":
          // console.log("ufg412     [" + newValue + "] ")
          table = "tasks"
          columnName = "target_date"
          value = newValue;
          if (isNaN(Date.parse(value))) {
            console.error("ufg4128  Invalid date value:", value);
            return res.status(400).send("Invalid date value");
          }
          console.log("ufg412     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "dueDate":
          // console.log("ufg42    ")
          table = "jobs";
          columnName = "target_date"
          value = newValue;
          if (isNaN(Date.parse(value))) {
            console.error("ufg4128  Invalid date value:", value);
            return res.status(400).send("Invalid date value");
          }
          console.log("ufg413     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "siteEnquiryDate":
          // console.log("ufg42    ")
          table = "builds";
          columnName = "enquiry_date"
          value = newValue;
          if (isNaN(Date.parse(value))) {
            console.error("ufg482  Invalid date value:", value);
            return res.status(400).send("Invalid date value");
          }
          console.log("ufg4082     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "changeArray":
          // console.log("ufg425    ")
          table = "jobs";
          columnName = "change_array"
          value = newValue;
          console.log("ufg414     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobTier":
          // console.log("ufg43     [" + newValue + "] ")
          table = "jobs"
          columnName = "tier"
          value = newValue;
          console.log("ufg415     update " + table + " set " + columnName + " = " + value);
          try {
            q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

            q = await db.query("SELECT id from job_process_flow where decendant_id = $1", [rowID]);
            for (const row of q.rows) {
              // console.log("ufg431     update job_process_flow " + row.id);
              table = "job_process_flow"
              columnName = "tier"
              value = newValue;
              console.log("ufg416     update " + table + " set " + columnName + " = " + value);
              q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${row.id}`);
            }
          } catch (error) {
            console.error("ufg84     Error updating job tier:", error);
            res.status(500).send("Error updating job tier");
          }
          res.status(200).send("Update successful");
          break;
        case "processChangeArray":
          console.log("ufg45     [" + newValue + "] ")
          table = "job_process_flow"
          columnName = "change_array"
          value = newValue;
          console.log("ufg417     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobDesc":
          console.log("ufg43")
          table = "jobs";
          columnName = "free_text"
          value = encodeURIComponent(newValue);
          console.log("ufg418     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful")
          } else if (q && q.status === 200) {
            res.status(200).send("Field already set to this value")
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobOwner":
          table = "jobs";
          columnName = "user_id";
          if (newValue === null || newValue === "") {
            value = "null";
          } else {
            value = "'" + newValue + "'";
          }
          try {
            // console.log("ufg51     update jobs set user_id = " + newValue);
            console.log("ufg419     update " + table + " set " + columnName + " = " + value);
            const q1 = await db.query("UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");
            // assign the user_id to all child jobs
            // console.log("ufg52     update jobs set user_id = " + value + " where id in(select j.id from jobs j inner join job_process_flow f on j.id = f.decendant_id where f.antecedent_id = " + rowID + ");");
            const q3 = await db.query("UPDATE jobs set user_id = " + value + " where id in(select j.id from jobs j inner join job_process_flow f on j.id = f.decendant_id where f.antecedent_id = " + rowID + " and f.tier > 500);");
            console.log("ufg420     update " + table + " set " + columnName + " = " + value);
            const q2 = await db.query("UPDATE tasks SET owned_by = " + value + " WHERE job_id = " + rowID + ";");
            // console.log('ufg54    Updated job('+ rowID +')');
          } catch (error) {
            console.error("ufg83     Error updating job owner:", error);
            res.status(500).send("Error updating job owner");
          }
          res.status(200).send("Update successful");
          break;
        case "taskDesc":
          table = "tasks";
          columnName = "free_text"
          value = encodeURIComponent(newValue);
          console.log("ufg421     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobTitle":
          table = "jobs";
          columnName = "display_text"
          if (newValue.length > 126) {
            console.warn("ufg4243   Job title exceeds 126 characters, truncating");
            newValue = newValue.substring(0, 123) + "...";
          }
          value = encodeURIComponent(newValue);
          console.log("ufg422     update " + table + " set " + columnName + " = " + value);
          try {
            q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            if (q && q.status === 201) {
              res.status(200).send("Update successful");
            }
            else {
              res.status(500).send("Error updating " + fieldID);
            }
          } catch (error) {
            console.error("ufg4228     Error updating job title:", error.data);
            res.send("Error updating job title");
          }

          break;
        case "taskStatus":
          // console.log("    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
          table = "tasks";
          columnName = "current_status"
          value = newValue;
          console.log("ufg423     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "taskTitle":
          table = "tasks";
          columnName = "display_text"
          if (newValue.length > 126) {
            console.warn("ufg4243   Task title exceeds 126 characters, truncating");
            newValue = newValue.substring(0, 123) + "...";
          }
          value = encodeURIComponent(newValue);
          console.log("ufg424     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;

        case "taskOrder":
          table = "tasks";
          columnName = "sort_order"
          value = newValue;
          try {
            console.log("ufg425     update " + table + " set " + columnName + " = " + value);
            q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            if (q.status === 422) {
              table = "jobs";
              console.log("ufg426     update " + table + " set " + columnName + " = " + value);
              q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            }
          } catch (error) {
            console.error("ufg83     Error updating task order:", error);
            res.status(500).send("Error updating task order");
          }
          res.status(200).send("Update successful");
          break;
        case "taskPerson":
          table = "tasks";
          columnName = "completed_by_person"
          value = newValue;
          console.log("ufg427     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "flowChangeArray":
          console.log("ufg46     [" + newValue + "] ")
          table = "job_process_flow";
          columnName = "change_array"
          value = newValue;
          console.log("ufg428     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "flowTier":
          console.log("ufg47     [" + newValue + "] ")
          table = "job_process_flow";
          columnName = "tier"
          value = newValue;
          console.log("ufg429     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "otherContact":
          table = "customers";
          columnName = "contact_other"
          value = newValue;
          console.log("ufg430     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "contactStatus":
          table = "customers";
          columnName = "current_status"
          value = encodeURIComponent(newValue);
          console.log("ufg431     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;

        case "contactName":
          table = "customers";
          columnName = "full_name"
          value = encodeURIComponent(newValue);
          console.log("ufg432     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "contactAddress":
          table = "customers";
          columnName = "home_address"
          value = encodeURIComponent(newValue);
          console.log("ufg433     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "contactPhone":
          table = "customers";
          columnName = "primary_phone"
          value = newValue;
          console.log("ufg434     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "contactEmail":
          table = "customers";
          columnName = "primary_email"
          value = newValue;
          console.log("ufg435     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "nextJob":
          // console.log("ufg45    User("+req.user.id+") changed next job to " + newValue + " for rowID: " + rowID )
          table = "builds";
          columnName = "job_id"
          value = newValue;
          console.log("ufg436     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "daytaskTitle":
          table = "worksheets";
          columnName = "title"
          value = encodeURIComponent(newValue);
          // console.log(`ufg77   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          console.log("ufg437     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          }
          else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "daytaskPerson":
          try {
            await db.query('BEGIN'); // Start transaction

            table = "worksheets";
            columnName = "user_id";
            value = "" + newValue + "";
            // console.log(`ufg78   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            console.log("ufg438     update " + table + " set " + columnName + " = " + value);
            let q1 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

            // // Execute q2 to retrieve the task_id
            // let q2 = await db.query("SELECT description FROM worksheets WHERE id = $1", [rowID]);
            // let task_id = 0;
            // if (q2.rows.length > 0) {
            //     const description = q2.rows[0].description;
            //     const parsedDescription = JSON.parse(description);
            //     task_id = parsedDescription.task_id;
            //     console.log("ufg439     Task ID:", task_id);
            // }

            // table = "tasks";
            // columnName = "owned_by";
            // value = "" + newValue + "";
            // // console.log(`ufg79   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);
            // console.log("ufg440     update "+ table + " set "+ columnName + " = " + value);          
            // let q3 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);

            await db.query('COMMIT'); // Commit transaction

          } catch (error) {
            await db.query('ROLLBACK'); // Rollback on error
            res.status(500).send("Error updating daytask person");
            console.error("Transaction failed:", error);
          }

          res.status(200).send("Update successful");
          break;
        case "daytaskDate":
          table = "worksheets";
          columnName = "date"
          if (newValue.startsWith("add_")) {
            let dateObj = new Date();
            dateObj.setDate(dateObj.getDate() + parseInt(newValue.replace("add_", "")));
            value = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            value = newValue;
          }

          console.log("ufg441     update " + table + " set " + columnName + " = " + value);
          try {
            if (isNaN(Date.parse(value))) {
              console.error("ufg4428  Invalid date value:", value);
              return res.status(400).send("Invalid date value");
            }
            // const a4 = await db.query("BEGIN;"); // Start transaction
            console.log("ufg4421     ...update worksheetID(" + rowID + ") set target date = " + value);
            const a1 = await db.query("UPDATE worksheets SET date = $1 WHERE id = $2;", [value, rowID]);
            // console.log('ufg00077');
            const a2 = await db.query("SELECT job_id FROM worksheets WHERE id = $1;", [rowID]);
            let taskID = a2.rows[0].job_id;
            console.log("ufg4423     ...found taskID: " + taskID);
            if (taskID) {
              // const descriptionJson = JSON.parse(a2.rows[0].description);
              // const taskId = descriptionJson.task_id;
              console.log("ufg4422   ...update job(" + taskID + ") set target_date = " + value);
              const a3 = await db.query("UPDATE jobs SET target_date = $1 WHERE id = $2;", [value, taskID]);
              // console.log('ufg443');
            }
            // const a5 = await db.query("COMMIT;"); // Commit transaction
          } catch (error) {
            console.error("ufg442  Error updating date:", error);
            res.status(500).send("Error updating date");
          }
          // } else {
          //     console.log("ufg444     Description is null or no record found, breaking out.");
          // }      

          res.status(200).send("Update successful");
          break;
        case "daytaskArchive":
          table = "worksheets";
          columnName = "archive"
          value = (newValue == 1) ? true : false;
          console.log("ufg445     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobOrder":
          // console.log("    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
          table = "jobs";
          columnName = "sort_order"
          value = newValue;
          console.log("ufg446     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobPerson":
          // console.log("    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
          table = "jobs";
          columnName = "user_id"
          value = newValue;
          console.log("ufg447     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "jobStatus":
          console.log("ufg44    changing job status ");
          table = "jobs";
          columnName = "current_status"
          value = newValue;
          // update the job status 
          //#region update job status
          console.log("ufg448     update " + table + " set " + columnName + " = " + value + " for rowID: " + rowID);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          let q2 = await db.query("DELETE FROM worksheets where description like '%Job(" + rowID + ")%' or job_id = $1", [rowID]);

          //update completed date
          if (newValue === 'complete') {
            const dateObj = new Date();
            value = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            // value = "TO_DATE('"+formattedDate+"', 'YYYY-MM-DD')"
          } else {
            value = '';
          }
          columnName = "completed_date";
          console.log("ufg449     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

          //register te user who completed the job
          columnName = "user_id";
          value = req.user.id;
          console.log("ufg450     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

          //update the customer record as recently processed
          let q3 = await db.query("select customer_id from builds where id = (select build_id from jobs where id = $1)", [rowID]);
          if (q3.rows.length > 0) {
            const customerID = q3.rows[0].customer_id;
            if (customerID) {
              columnName = "date_last_actioned";
              const dateObj = new Date();
              value = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              console.log("ufg451     update customers set " + columnName + " = " + value + " for customerID: " + customerID);
              try {
                q = await axios.get(`${API_URL}/update?table=customers&column=${columnName}&value=${value}&id=${customerID}`);
              } catch (error) {
                console.error("ufg4518     Error updating customer last action date:", error);
              }
            } else {
              console.log("ufg452     No customerID found for jobID: " + rowID);
            }
          } else {
            console.log("ufg453     No build found for jobID: " + rowID);
          }


          //#endregion
          //#region --- VALIDATIONS ---
          console.log("ufg4610     no validations for job status change");
          //#endregion
          //#region --- MODIFICATIONS ---
          const q6 = await db.query("SELECT change_array from jobs where id = $1", [rowID]);
          if (q6.rows.length > 0) {
            const changeArray = q6.rows[0].change_array;
            if (changeArray) {
              try {
                //#region internal actions on mother job - on every save
                console.log("ufg4661     found job(" + rowID + ") has [" + q6.rows.length + "] modifications every time it gets updated: \x1b[90m", changeArray, "\x1b[0m");
                // q = await axios.get(`${API_URL}/executeJobAction?changeArray=`+changeArray+`&origin_job_id=`+rowID);
                // // execute the action
                // if (q && q.status === 200) {
                //   console.log("ufg4666     job action executed successfully: ");
                // } else {
                //   console.error("ufg4667     Error executing job action: ", q.status, q.statusText);
                // }
                const response = await axios.get(`${API_URL}/executeJobAction`, {
                  params: {
                    changeArray: changeArray,
                    origin_job_id: rowID
                  },
                  timeout: 10000
                });

                // Check for successful response structure
                if (response.data?.success) {
                  console.log("ufg4283     Action succeeded:", response.data.message);
                  // Update UI accordingly
                } else {
                  // Handle business logic failure (200 with success: false)
                  console.error("ufg4338    Action failed:", response.data?.message);
                  return res.send("Action failed: " + response.data?.error);
                }

                //#endregion
                //#region flow actions - when mother job status changes
                //#endregion
                //#region recursive actions on job process flow tree
                //#endregion
              } catch (error) {
                console.error("ufg4668     Error processing job actions:", error.message);
                // res.status(500).send("Update failed: " + error.message);
              }
            } else {
              console.log("ufg4698     job(" + rowID + ") has no actions: ", changeArray);
            }
          } else {
            console.log("ufg4669     No job record found for job_id: " + rowID);
          }

          //old code - please review, this worked better - I think it does not use the job_process_flow table so well
          if (false) {
            console.log("ufg4570      check job_process_flow for actions triggered because workflow focus has progressed through the process");
            const q7 = await db.query("SELECT * from job_process_flow where antecedent_id = $1", [rowID]);
            if (q7.rows.length > 0) {
              console.log("ufg457     job_process_flow found for job_id: " + rowID);
              for (const row of q7.rows) {
                console.log("ufg458     job_process_flow row: ", row);
                const flowID = row.id;
                const flowAntecedentID = row.antecedent_id;
                const flowDecendantID = row.decendant_id;
                let flowAction = row.change_array || `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;
                const flowTier = row.tier;

                // Perform actions based on the flowAction
                try {
                  // flowAction ? flowAction : `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;
                  console.log("ufg4591     Processing job_process_flow ", flowAction);
                  let flowActionJson;
                  try {
                    flowActionJson = JSON.parse(flowAction.trim());
                  } catch (error) {
                    console.error("ufg45908     Error parsing flowAction JSON: ", error);
                    flowAction = `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;;
                    flowActionJson = JSON.parse(flowAction.trim());
                  }
                  console.log("ufg4592     flowActionJson for job_id: " + rowID + " - ", JSON.stringify(flowActionJson, null, 2));
                  for (const flowRule of flowActionJson) {
                    console.log("ufg4593     Checking flowRule: ", flowRule);
                    if ((flowRule.antecedent === "completed" && newValue === "complete") || (flowRule.antecedent === "pending" && newValue === "pending")) {
                      for (const action of flowRule.decendant) {
                        if (action.status !== undefined) {
                          const statusValue = action.status === "" ? null : action.status;
                          console.log(`ufg4593     Setting status of job(${flowDecendantID}) to ${statusValue} `);
                          const jobId = flowDecendantID;
                          const updateStatus = await db.query("UPDATE jobs SET current_status = $1 WHERE id = $2", [statusValue, flowDecendantID]);
                        }
                        if (action.target) {
                          // console.log(`ufg460     set target date for job(${flowDecendantID}): ${action.log_trigger}`);
                          //append to jobs.change_log column as an array. include a date and user
                          //const logTrigger = await db.query("UPDATE jobs SET change_log = change_log || $1 || E'\n' WHERE id = $2",[`${new Date().toISOString()} - ${req.user.email} - ${action.log_trigger}`, flowDecendantID]);
                          //if action.target = "today [n]" then add that number of days to todays date
                          let targetDate;
                          if (action.target.startsWith("today")) {
                            const today = new Date();
                            const daysToAdd = parseInt(action.target.split(" ")[1], 10);
                            today.setDate(today.getDate() + daysToAdd);
                            targetDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                          } else {
                            //check if format is yyyy-mm-dd
                            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                            if (dateRegex.test(action.target)) {
                              targetDate = action.target; // Use the date as is
                            } else {
                              // If not in the correct format, assume it's a string and use it directly
                              // This could be a date string like "2023-10-01" or similar
                              // You might want to add additional validation here
                              console.log("ufg4601     Invalid date format for target date: " + action.target);
                            }
                          }
                          console.log(`ufg461     Setting target date of job(${flowDecendantID}) to ${targetDate}`);
                          const updateTarget = await db.query("UPDATE jobs SET target_date = $1 WHERE id = $2", [targetDate, flowDecendantID]);
                        }
                      }
                    }
                  }



                } catch (error) {
                  console.error("ufg4618     Error processing job_process_flow actions:", error);

                }

              }
            } else {
              console.log("ufg462     No job_process_flow found for job_id: " + rowID);
            }
          }

          //#endregion
          //#region --- NOTIFICATIONS ---
          console.log("ufg4710     no notifications for actions triggered by job status change");
          //#endregion
          res.status(200).send("Update successful");
          break;

        // Job Templates fields
        case "display_text":
          table = "job_templates";
          columnName = "display_text";
          value = encodeURIComponent(newValue);
          console.log("ufg_jt1     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "user_id":
          table = "job_templates";
          columnName = "user_id";
          value = newValue === '' ? null : parseInt(newValue);
          console.log("ufg_jt2     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "role_id":
          table = "job_templates";
          columnName = "role_id";
          value = newValue === '' ? null : parseInt(newValue);
          console.log("ufg_jt3     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "product_id":
          table = "job_templates";
          columnName = "product_id";
          value = newValue === '' ? null : parseInt(newValue);
          console.log("ufg_jt4     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "sort_order":
          table = "job_templates";
          columnName = "sort_order";
          value = newValue;
          console.log("ufg_jt5     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "tier":
          table = "job_templates";
          columnName = "tier";
          value = newValue === '' ? null : parseFloat(newValue);
          console.log("ufg_jt6     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "xtier":
          table = "job_templates";
          columnName = "tier";
          value = newValue === '' ? null : parseFloat(newValue);
          console.log("ufg_jt6     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "free_text":
          table = "job_templates";
          columnName = "free_text";
          value = newValue;
          console.log("ufg_jt7     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "antecedent_array":
          table = "job_templates";
          columnName = "antecedent_array";
          value = newValue;
          console.log("ufg_jt8     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "decendant_array":
          table = "job_templates";
          columnName = "decendant_array";
          value = newValue;
          console.log("ufg_jt9     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "decendant_array":
          table = "job_templates";
          columnName = "decendant_array";
          value = newValue;
          console.log("ufg_jt9     update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "job_change_array":
          table = "job_templates";
          columnName = "job_change_array";
          value = newValue;
          console.log("ufg_jt10    update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;
        case "flow_change_array":
          table = "job_templates";
          columnName = "flow_change_array";
          value = newValue;
          console.log("ufg_jt11    update " + table + " set " + columnName + " = " + value);
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q && q.status === 201) {
            res.status(200).send("Update successful");
          } else {
            res.status(500).send("Error updating " + fieldID);
          }
          break;

        default:
          console.error("ufg8    Unknown field was edited: " + fieldID);
          res.status(500).send("Error updating " + fieldID);

      }

    } catch (error) {
      console.error("ufg8    Error occurred while updating: " + error);
      res.status(500).send("Error updating " + fieldID);
    }
    return;

  } else {
    console.error("ufg89    User not authenticated, redirecting to login page. [MAC] at [SYSTIME]");
    res.redirect("/login");
  }

})



app.listen(port, () => {
  console.log(`re9     STARTED running on port ${port}`);
  
});
