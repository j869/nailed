//#region middleware
import express, { response } from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import env from "dotenv";
import multer from "multer";
import cors from "cors";
import nodemailer from "nodemailer";
import { ImapFlow } from 'imapflow';
import crypto from 'crypto';   //const crypto = require('crypto');
import axios from "axios";



export const app = express();
const port = 4000;

env.config();
const API_URL = process.env.API_URL     //self assigned for recursive API calls
if (process.env.SESSION_SECRET) {
  console.log("en1    npm middleware loaded ok");
} else {
  console.log(
    "en9    you must run nodemon from Documents/nailed/  : ",
    process.cwd()
  );
  console.log("       rm -R node_modules");
  console.log("       npm cache clean --force");
  console.log("       npm i");
}



// Encryption function
function encrypt(text, key) {
  console.log("ey1    encrypting: ", text);
  //check if text is a string
  if (typeof text !== 'string') {
    console.error("ey2    Encryption failed: text is not a string");
    return null; // Return null or handle the error as needed
  }
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decryption function
// function decrypt(encryptedText, key) {
//   console.log("de1    decrypting: ", key, key.substring(1,32));
//   // let keyBuffer = Buffer.from(key.substring(1,32), 'hex');
//   // console.log("de2    decrypting: ", keyBuffer);
//   // const iv = Buffer.alloc(16, 0);
//   const decipher = crypto.createDecipher('aes-256-cbc', key);
//   let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
//   decrypted += decipher.final('utf8');
//   return decrypted;
// }  

// Decryption function
function decrypt(encryptedText, key) {
  console.log("de1    decrypting: ", encryptedText);
  let decrypted = "";
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  } catch (error) {
    console.error("de2    Decryption failed:", error);
    decrypted = "null"; // Set decrypted to null if decryption fails
  }
  return decrypted;
}

app.use(cors({
  origin: `${process.env.BASE_URL}`, // Allow frontend requests    ${port}
  methods: "GET, POST, DELETE",  // Allow GET, POST, and DELETE methods
  allowedHeaders: "Content-Type"
}));



app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json()); // Middleware to parse JSON bodies

const { Pool } = pg;
export const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});


function getMelbourneTime(format = 'iso') {
  // Get current time in Melbourne's timezone
  const options = {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // 24-hour format
  };

  // Get formatted parts
  const melbourneTime = new Date().toLocaleString('en-AU', options);

  // Parse into usable format (handles DST automatically)
  if (format === 'iso') {
    // Returns: "2024-07-04T14:30:45+10:00" (or +11:00 during DST)
    return new Date(melbourneTime).toISOString();
  } else {
    // Custom format (e.g. "2024-07-04 14:30:45")
    const [date, time] = melbourneTime.split(', ');
    return `${date.replace(/\//g, '-')} ${time}`;
  }
}


//#endregion

// Workflow Validator Admin Interface (No Auth - API Style)
app.get("/admin/workflow-validator", async (req, res) => {
  console.log("wv1      Starting workflow validator admin page");

  try {
    // Get summary statistics
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

    // Get detailed problems by type
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

    // Group problems by type
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

    // Calculate summary statistics
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

    res.render("admin/workflow-validator", {
      user: { id: 'test' },
      problems: problemsByType,
      summary: summary,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error("wv8      Workflow validator error", { error: error.message });
    res.status(500).send("Error loading workflow validator: " + error.message);
  }
});

//#endregion

// Multer Setup for File Uploads (storing in memory)
const upload = multer({ storage: multer.memoryStorage() });


app.get("/encrypt/:text", async (req, res) => {
  try {
    console.log("en1    encrypting: ", req.params);
    const text = req.params.text;
    const key = process.env.SMTP_ENCRYPTION_KEY;
    const encryptedText = encrypt(text, key);
    console.log("en91    encrypted: ", encryptedText);
    const decryptedText = decrypt(encryptedText, key);
    console.log("en92    decrypted: ", decryptedText);
    res.json({ encryptedText });
  } catch (error) {
    console.error("en8    Encryption failed:", error);
    res.status(500).json({ error: "Encryption failed" });
  }
});

app.get("/decrypt/:text", async (req, res) => {
  try {
    console.log("ef1    decrypting: ", req.params);
    const text = req.params.text;
    const key = process.env.SMTP_ENCRYPTION_KEY;
    const decryptedText = decrypt(text, key);
    console.log("ef9    decrypted: ", decryptedText);
    res.json({ decryptedText });
  } catch (error) {
    console.error("ef8    Decryption failed:", error);
    res.status(500).json({ error: "Decryption failed" });
  }
});


/**
 * Route to Upload a File
 */
app.post("/upload", upload.single("file"), async (req, res) => {
  //const buildId = req.query.build_id;
  console.log("uf1      Incoming file upload request... ");

  if (!req.file) {
    console.warn("uf81      Upload failed: No file provided.");
    return res.status(400).send("No file uploaded.");
  }

  try {
    const { originalname, mimetype, buffer } = req.file;
    const build_id = req.body.build_id;

    console.log(`uf2      Uploading on build(${build_id}): ${originalname}, Type: ${mimetype}, Size: ${buffer.length} bytes`);

    const result = await pool.query(
      "INSERT INTO files (filename, mimetype, data, build_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [originalname, mimetype, buffer, build_id]
    );

    console.log(`File uploaded successfully with ID: ${result.rows[0].id}`);
    res.json({ success: true, message: "File uploaded successfully!" });
    //res.redirect("/"); // Refresh page after upload
  } catch (error) {
    console.error("uf82      Error saving file:", error);
    res.status(500).send("Error saving file.");
  }
});


/**
 * Route to list attachments
 */
app.get("/files", async (req, res) => {
  console.log("vf1      Fetching list of uploaded files for build...", req.query.build_id);

  try {
    const result = await pool.query("SELECT id, filename FROM files WHERE build_id = " + req.query.build_id + " ORDER BY id DESC");

    if (result.rows.length === 0) {
      console.warn("vf81      No files found in the database.");
      return res.json([]);
    }

    console.log(`vf2      Found ${result.rows.length} files.`);
    res.json(result.rows);
  } catch (error) {
    console.error("vf8      Error retrieving files:", error);
    res.status(500).send("Error retrieving files.");
  }
});


app.delete("/deletefile/:id", async (req, res) => {
  const fileId = req.params.id;
  console.log(`df1       Request to delete file with ID: ${fileId}`);

  try {
    // Check if file exists
    const checkFile = await pool.query("SELECT * FROM files WHERE id = $1", [fileId]);

    if (checkFile.rows.length === 0) {
      console.warn("File not found for deletion.");
      return res.status(404).json({ message: "File not found." });
    }

    // Delete the file
    await pool.query("DELETE FROM files WHERE id = $1", [fileId]);
    console.log(`File ID ${fileId} deleted successfully.`);

    res.json({ message: "File deleted successfully." });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Error deleting file." });
  }
});



/**
 * Route to Download a File
 */
app.get("/download/:id", async (req, res) => {
  const fileId = req.params.id;
  console.log(`df1      Download request received for file ID: ${fileId}`);

  try {
    const result = await pool.query("SELECT * FROM files WHERE id = $1", [fileId]);

    if (result.rows.length === 0) {
      console.warn(`df81      File not found for ID: ${fileId}`);
      return res.status(404).send("File not found.");
    }

    const file = result.rows[0];
    console.log(`df2      Serving file: ${file.filename} (ID: ${fileId})`);

    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.data);
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).send("Error retrieving file.");
  }
});


/**
 * Main Route - Shows Upload Form & File List
 */

app.get("/testSMTP/:user_id", async (req, res) => {
  console.log("gx1    connectEmail");
  try {
    const userID = parseInt(req.params.user_id);
    const smtpInfo = await pool.query("SELECT id, smtp_host, email, smtp_password FROM users WHERE id = $1", [userID]);
    const { smtp_host, email, smtp_password } = smtpInfo.rows[0];
    const decryptedPassword = decrypt(smtp_password, process.env.SMTP_ENCRYPTION_KEY);
    console.log("gx2    SMTP connection details: ", smtp_host, email, decryptedPassword);

    const imapConfig = {
      host: smtp_host,     //smtpHost,
      port: 993,
      secure: true,
      auth: {
        user: email,
        pass: decryptedPassword
      },
      logger: false  //  Only logs in development    process.env.NODE_ENV === 'development' ? console : false  
    };
    let countInserted = 0;
    const client = new ImapFlow(imapConfig);
    console.log("gx4    Connecting to IMAP server...");
    await client.connect();
    console.log("gx4a   Connected to IMAP server.");
    //check if connection is ok
    if (!client.authenticated) {
      console.error("gx83    Failed to connect to IMAP server.");
      return res.status(500).json({ success: false, message: "Failed to connect to IMAP server" });
    } else {
      console.log("gx83    Successfully connected to IMAP server.", client.authenticated);
      await client.logout();
      return res.json({ success: true, message: "Email connected successfully!" });
    }
  } catch (error) {
    console.error("gx8    Error connecting to email server:", error);
    return res.status(500).json({ success: false, message: "Error connecting to email server: " + error });
  }
});

app.get("/email/:cust_id/:user_id", async (req, res) => {

  console.log("ge1    fetching emails for CustID(" + ")", req.params);
  const customerID = parseInt(req.params.cust_id);
  const userID = parseInt(req.params.user_id);
  let lock;
  let client;
  let countInserted = 0;

  try {
    // Look up the customerID in the database
    const result = await pool.query("SELECT primary_email FROM customers WHERE id = $1", [customerID]);
    if (result.rows.length === 0) {
      console.error("ge18  No email found for customerID:", customerID);
      return res.status(404).json({ success: false, message: "Email not found" });
    }
    const email = result.rows[0].primary_email;
    // console.log("ge2    Looking up user:", userID);
    const userResult = await pool.query("SELECT id, smtp_host, email, smtp_password FROM users WHERE id = $1", [userID]);
    // console.log("ge2a   ", userResult.rows[0].smtp_password, process.env.SMTP_ENCRYPTION_KEY);
    let smtpPassword = decrypt(userResult.rows[0].smtp_password, process.env.SMTP_ENCRYPTION_KEY);
    let smtpEmail = userResult.rows[0].email;
    let smtpHost = userResult.rows[0].smtp_host;
    console.log("ge3    SMTP connection details: ", smtpHost, smtpEmail, smtpPassword);
    const imapConfig = {
      host: smtpHost,       //"mail.privateemail.com",     //smtpHost,
      port: 993,
      secure: true,
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      },
      logger: false  //  Only logs in development    process.env.NODE_ENV === 'development' ? console : false  
    };
    countInserted = 0;
    client = new ImapFlow(imapConfig);
    console.log("ge4    Connecting to IMAP server...");
    await client.connect();
    console.log("ge4a   Connected to IMAP server.");
    //check if connection is ok
    if (!client.authenticated) {
      console.error("ge83    Failed to connect to IMAP server.");
      return res.status(500).json({ success: false, message: "Failed to connect to IMAP server" });
    }
    lock = await client.getMailboxLock('INBOX');
    console.log("ge4b   Lock acquired for mailbox INBOX.");
    //check if mailbox is ok
    if (!lock) {
      console.error("ge84    Failed to lock mailbox.");
      return res.status(500).json({ success: false, message: "Failed to lock mailbox" });
    }
    console.log("ge5    Fetching emails from INBOX where sender = " + email);

    // replace all conversations for this customerID
    await pool.query("DELETE FROM conversations where person_id = $1", [customerID]);
    for await (const message of client.fetch(
      {
        or: [
          { from: email },
          { to: email }
        ]
      },
      {
        envelope: true,
        bodyParts: true,
        bodyStructure: true
      })) {

      //if (message.envelope.from.some(sender => sender.address === email)) {
      let display_name = message.envelope.from[0].name;
      if (display_name.length > 15) { display_name = display_name.substring(0, 12) + "..."; }
      let msgDate = message.envelope.date || new Date();
      let msgSubject = message.envelope.subject || 'unknown';
      await pool.query(`
          INSERT INTO public.conversations (
            display_name, person_id, message_text, 
            has_attachment, visibility, job_id, post_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          display_name,
          customerID,
          msgSubject,
          null,
          'public',
          null,
          msgDate
        ]
      );
      countInserted++;
      // } else {
      //   console.log("ge7m    Email not inserted: ", message.envelope.subject);
      // }

    }
  } catch (err) {
    console.error("ge8    Error processing emails:", err);
    return res.status(500).json({ success: false, message: "Error processing emails: " + err.response });
  } finally {
    lock.release();
    await client.logout();
    console.log("ge9    finished inserting (" + countInserted + ") emails to database");
    let build = await pool.query("SELECT id FROM builds WHERE customer_id = $1", [customerID]);
    return res.json({ success: true, message: "Email processed successfully!", build_id: build.rows[0].id });
  }

});




app.get("/jobs/:id", async (req, res) => {
  //const { username, email } = req.body;
  const job_id = parseInt(req.params.id);
  // console.log("gd1    retrieving page data for job " + job_id + " ")
  if (!job_id) {
    console.error("gd18   Tried to get a job, but not given the Job_ID")
  } else {

    let data = {};
    let result = {};
    let vSQL = "";

    try {
      try {
        // console.log("gd2")
        // result = await pool.query("SELECT * FROM jobs WHERE id = " + job_id + ";");        //'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *', [username, email]
        result = await pool.query("SELECT * FROM jobs WHERE id = $1;", [job_id]); // Use paramet
        if (result.rows.length === 0) {
          // No rows found: job_id does not exist in the table
          console.error("gd281   Job not found for job_id:", job_id);
          return res.status(404).json({ success: false, message: "gd281  Job not found" }); // 404 Not Found
        }
      } catch (error) {
        console.error("gd282   error executing query " + error)
        return;
      }
      const jobName = result.rows[0].display_text;
      const jobText = result.rows[0].free_text;
      const jobTemplateId = result.rows[0].job_template_id;
      const productId = result.rows[0].product_id;
      const targetDate = result.rows[0].target_date;
      const jobUser = "" + result.rows[0].user_id + ""

      vSQL = "SELECT id, display_text, free_text, job_template_id, user_id, role_id, build_id, product_id, reminder_id, conversation_id, TO_CHAR(target_date, 'DD-MON-YY') as target_date, created_by, TO_CHAR(created_date, 'DD-MON-YY') AS created_date, change_log, completed_by, TO_CHAR(completed_date, 'DD-MON-YY') AS completed_date, current_status, sort_order, completed_by_person, tier, change_array from jobs WHERE id = " + job_id + ";";
      result = await pool.query(vSQL);
      const tier = result.rows[0].tier
      const build_id = result.rows[0].build_id
      const changeArray = result.rows[0].change_array;
      const jobStatus = result.rows[0].current_status;


      vSQL = "SELECT tier from jobs WHERE build_id = " + build_id + " and tier > " + tier + " ORDER BY tier ASC;";
      result = await pool.query(vSQL);
      let decendantTier = result.rows.length > 0 ? result.rows[0].tier : null;
      if (isNaN(decendantTier)) {
        decendantTier = null;
      }

      vSQL = "SELECT tier from jobs WHERE build_id = " + build_id + " and tier < " + tier + " ORDER BY tier DESC;";
      result = await pool.query(vSQL);
      const antecedentTier = result.rows.length > 0 ? result.rows[0].tier : null;

      // vSQL = "SELECT escalation1_interval, escalation2_interval FROM reminders WHERE id = " + result.rows[0].reminder_id + ";";
      // result = await pool.query(vSQL);        
      const reminder = []     //result.rows[0];
      // if (result.rows.length === 0) {
      //   reminder = { escalation1_interval: 7, escalation2_interval: 14 };      //default values for new records
      // } else {
      //   reminder = result.rows[0];
      // }

      // console.log("gd3")
      let conversation = [];
      vSQL = "SELECT id, display_name, message_text FROM conversations WHERE job_id = " + job_id + ";";
      result = await pool.query(vSQL);
      for (let r in result.rows) {
        let result2 = await pool.query("SELECT thumbnail, link FROM attachments WHERE conversation_id = " + result.rows[r].id + ";");
        conversation.push({ display_name: result.rows[r].display_name, message_text: result.rows[r].message_text, attachment: result2.rows })
      }

      // console.log("gd4    adding antecedents")
      let job_antecedents = [];
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON j.id = r.antecedent_id WHERE j.tier = " + tier + " and r.decendant_id = " + job_id + " ;";
      result = await pool.query(vSQL);
      job_antecedents = result.rows;

      // console.log("gd5   adding decendants")
      let job_decendants = [];
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text, r.tier, r.change_array, r.id as flow_id FROM jobs j INNER JOIN job_process_flow r ON j.id = r.decendant_id WHERE j.tier = " + tier + " and r.antecedent_id = " + job_id + ";";
      result = await pool.query(vSQL);
      job_decendants = result.rows;

      console.log("gd117   ", tier, decendantTier, job_id, antecedentTier)
      // console.log("gd6 adding tasks")
      let task_antecedents = [];
      if (antecedentTier) {
        vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text, r.tier, r.change_array, r.id as flow_id FROM jobs j INNER JOIN job_process_flow r ON j.id = r.antecedent_id WHERE j.tier = " + antecedentTier + " and r.decendant_id = " + job_id + ";";
        result = await pool.query(vSQL);
        task_antecedents = result.rows;
      } else {
        // vSQL = "SELECT id, display_text, current_status, free_text FROM tasks WHERE precedence = 'pretask' AND job_id = " + job_id + ";";
        // console.log("gd61    jobid" + job_id)
        vSQL = "select build_id from jobs where id = " + job_id + ";";
        result = await pool.query(vSQL);
        const buildId = result.rows[0].build_id
        vSQL = "select customer_id, product_id from builds where id = " + buildId + ";";
        result = await pool.query(vSQL);
        const customerId = result.rows[0].customer_id
        const productId = result.rows[0].product_id
        vSQL = "select * from customers where id = " + customerId + ";";
        result = await pool.query(vSQL);
        const customerName = result.rows[0].full_name
        task_antecedents = [
          {
            id: buildId,
            display_text: 'build(' + buildId + ') for ' + customerName,
            current_status: null,
            change_log: null
          }
        ];
        // task_antecedents = result.rows;
        // console.log(task_antecedents)
      }

      let task_decendants = [];
      // vSQL = "SELECT id, display_text, current_status, free_text FROM tasks WHERE precedence = 'postask' AND job_id = " + job_id + ";";
      // vSQL = "SELECT id, display_text, current_status, free_text FROM jobs WHERE tier = " + decendantTier + " and build_id = " + build_id + ";";
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text, r.tier, r.change_array, r.id as flow_id FROM jobs j INNER JOIN job_process_flow r ON j.id = r.decendant_id WHERE j.tier = " + decendantTier + " and r.antecedent_id = " + job_id + ";";
      console.log("gd7    ")
      result = await pool.query(vSQL);
      task_decendants = result.rows;


      let data = {
        job: {
          id: job_id,
          tier: tier,
          display_text: jobName,
          display_name: jobUser,
          free_text: jobText,
          product_id: productId,
          target_date: targetDate,
          current_status: jobStatus ? jobStatus : "null",
          change_array: changeArray,
          reminder: reminder,      //{escalation1_interval : 7, escalation2_interval : 21},
          job_template_id: jobTemplateId,
          conversation: conversation,
          // [
          //   {display_name : "John", message_text : "see attached pic", attachment : [{thumbnail : "https://icons.iconarchive.com/icons/graphicloads/colorful-long-shadow/128/Attachment-2-icon.png", link : "http://www.google.com"},]}, 
          //   {display_name : "Nick", message_text : "John this is the ...", }, 
          //   {display_name : "Owner", message_text : "when is it done?", }, ]
        },
        task_antecedents: task_antecedents,
        // [
        //   {display_text : "Call Plumber", current_status : true, free_text : ""}, 
        //   {display_text : "vook trencher", current_status : true, free_text : ""}, 
        //   {display_text : "visit reece", current_status : true, free_text : ""}, 
        // ],
        task_decendants: task_decendants,
        // [
        //   {display_text : "record pics", free_text : ""}, 
        //   {display_text : "confirm plumber availability", free_text : ""}, 
        //   {display_text : "call Bryan", free_text : ""}, ],
        job_antecedents: job_antecedents,
        // [
        //   {display_text : "Cladding", free_text : "supporting text"}, 
        //   {display_text : "Roofing", free_text : "supporting text"}, ],
        job_decendants: job_decendants,    //[{display_text : "Plumbing", free_text : "supporting text"},  ],
      };
      console.log("gd9    successfully retrieved data for job " + job_id + " ")
      res.json(data);
      //res.json(result.rows[0]);
    } catch (error) {
      console.error('gd8    Error reading job:', error);
      res.status(500).json({ error: 'Failed to read job' });
    }


    // const post = data;
    // if (!post) return res.status(404).json({ message: "Post not found" });
    // res.json(post);
  }
});



async function getJobFlow(parentID, parentTier, logString) {
  try {
    console.log("bb10" + logString + "getting jobID: ", parentID);
    let jobTier = 500;
    let jobsResult;
    let jobsArray = [];
    let children = [];
    let jobID = parentID.substring(1); // Remove the prefix 't' for tasks and 'j' for jobs
    let childTier = parentTier + 1;


    // get children for parent job
    jobsResult = await db.query(`
      select 't' || t.id as id,
      t.display_text,
      $2 as tier,
      t.sort_order,
      t.current_status
      from tasks t
      where t.job_id = $1
      union select
        'j' || f.decendant_id AS id,
        j.display_text, 
        f.tier,
        j.sort_order,
        j.current_status
      FROM 
        jobs j inner join job_process_flow f on j.id = f.decendant_id 
      where 
        f.antecedent_id = $1 and f.tier = $2
      order by 
        sort_order
    `, [jobID, childTier]);
    console.log("bb21" + logString + " job(" + jobID + ") checking job_process_flow on tier(" + childTier + ") child relationships.  Found: ", jobsResult.rows.length);
    if (jobsResult.rows.length > 0) {
      let daughters = jobsResult.rows;
      console.table(daughters);
      //check if any children have a pet-sister relationship
      for (const daughter of daughters) {
        console.log("bb30" + logString + "checking daughter: ", daughter.id);
        let jobID = daughter.id.substring(1); // Remove the prefix 't' for tasks and 'j' for jobs
        const tier = childTier
        jobsResult = await db.query(`
          select
            'j' || f.decendant_id AS id,
            j.display_text, 
            f.tier,
            j.sort_order,
            j.current_status
          FROM 
            jobs j inner join job_process_flow f on j.id = f.decendant_id 
          where 
            f.antecedent_id = $1 and f.tier = $2
        `, [jobID, tier]);
        if (jobsResult.rows.length > 0) {
          console.log("bb31" + logString + "sisters found: ", jobsResult.rows.length);

          //append to sisters list if any pet-sisters found
          for (const petDaughter of jobsResult.rows) {
            console.log("bb32" + logString + "appending sister: ", petDaughter.id, petDaughter.display_text);
            //append sisters to children
            children.push(petDaughter);
            daughters.push(petDaughter);
          }
          console.log("bb32" + logString + "children after appending sisters: ");
          console.table(children);
          console.table(daughters);
        } else {
          console.log("bb33" + logString + "no sisters found for jobID: ", jobID);
          children.push(daughter);
        }
      }
      // console.log("bb4 " + logString + "children after checking for sisters: ", children);

      //check if any children have grandDaughters
      for (const daughter of daughters) {
        let jobID = daughter.id;
        const tier = childTier
        console.log("bb5 " + logString + "diving deep to get jobID(" + jobID + ") on tier ", tier);
        const grandDaughters = await getJobs(jobID, tier, logString + "  ");
        jobsArray.push({
          ...daughter,
          jobs: grandDaughters
        });
        // console.log("bb6 " + logString + "job " + parentID + " has " + children.length + " daughters and " + grandDaughters.length + " grandDaughters");
      }
    } else {
      console.log("bb91" + logString + " no children found for jobID: ", jobID);
    }

    // console.log("bb9       jobsArray: ", json.stringify(jobsArray, null, 2));
    return jobsArray;

  } catch (error) {
    console.error("bb8     Error in getJobData:", error);

  }
}

async function getBuild(buildID) {
  try {
    console.log("bc1       getBuildData called for buildID: ", buildID);
    // 1. Get build information
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
      WHERE b.id = $1
    `, [buildID]);


    let buildMapping = {}
    console.log("bc2       starting recursive process: ", JSON.stringify(buildMapping, null, 2));


    //get all jobs directly linked under this build
    const jobsResult = await db.query(`
      select
        'j' || j.id AS id,
        j.display_text, 
        j.tier,
        j.sort_order,
        j.current_status
      FROM 
        jobs j  
      where 
        build_id = $1 and (tier IS NULL or tier = 500)
      ORDER BY   
        j.sort_order;
    `, [buildID]);
    const children = jobsResult.rows;
    console.table(children);
    let jobsArray = [];
    // console.log("bb29       getJobData jobResult: ", jobsResult.rows[0]);
    // console.log("bb5   expecting tier to be " + childTier + " found, " + jobResult.rows[0].tier + "";    // Default to 500 if tier is null
    for (const daughter of children) {
      let jobID = daughter.id;
      const tier = parseFloat(daughter.tier) || 500;
      console.log("bc5 diving deep to get jobID: ", jobID, " on tier: ", tier);
      const grandDaughters = await getJobs(jobID, tier, "  ");
      jobsArray.push({
        ...daughter,
        jobs: grandDaughters
      });
      // console.log("bc6 job " + parentID + " has " + sister.length + " daughters and " + nieces.length + " grandDaughters");
    }

    // const jobIDString = 'j' + buildResult.rows[0].job_id
    //const jobsArray = await getJobs(jobIDString, 500, "  ");
    // console.log("bc2    getBuildData jobs: ", JSON.stringify(jobsArray, null, 2));
    buildMapping = {
      build_id: buildID,
      cust_id: buildResult.rows[0].customer_id,
      jobs: jobsArray
    }
    return buildMapping;




    return allCustomers;

  } catch (error) {
    console.error('Error fetching build data:', error);
    throw error;
  }
}


app.get("/jobDone/:id", async (req, res) => {
  console.log("jd1    " + req.params);
  const jobID = parseInt(req.params.id);
  try {
    //update table
    const q = await pool.query("UPDATE jobs SET current_status = 'completed', completed_date = LOCALTIMESTAMP, completed_by = null WHERE id = " + jobID + ";");

    //recursivly check all previous jobs in the chain - and set them to completed
    // also check pre-tasks and mark them done
    // also check all tasks attached to previous jobs and set them done
    const allCustomers = await getBuild(buildID);
    const jobFlowRelationships = await getJobFlow('j' + jobID, 500, "  ");
    console.log("jd1    jobFlowRelationships: ", JSON.stringify(jobFlowRelationships, null, 2));

    if (q.rowCount == 1) {
      res.status(201).json({ msg: 'succesfully updated job status and checked relationships and job target dates' });
    }
  } catch (error) {
    console.error('jd8    Error marking job as done:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
})

// app.get("/daytaskComplete", async (req, res) => {
//   console.log("dte1");
//   const q1 = await pool.query("DELETE FROM worksheet where ID = $1", [req.query.id]);
//   console.log ("dte9    ", q1) ;
// })



app.get("/update", async (req, res) => {
  const table = req.query.table;
  const column = req.query.column;
  console.log("ud001    new value: ", req.query.value);
  let value = decodeURIComponent(req.query.value);
  //value = value.replace(/%/g,"_");
  const id = req.query.id;
  if (id === undefined || id === null) {
    console.log("ud18  bad request: id is required");
    return res.status(400).json({ msg: 'Bad Request: id is required' });
  } else {
    console.log("ud1   USER set " + column + " to " + value + " in table " + table + " where id = " + id);
  }
  // Treat empty string as NULL
  if (value === '') {
    value = null;
  }

  try {
    // Retrieve the current value from the database
    const currentValueQuery = `SELECT ${column} FROM ${table} WHERE id = $1;`;
    console.log("ud1a   currentValueQuery: ", currentValueQuery, " with id: ", id);
    const currentValueResult = await pool.query(currentValueQuery, [id]);
    if (currentValueResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Record not found' });
    }
    const currentValue = currentValueResult.rows[0][column];
    // Check if the new value is the same as the current value
    if (currentValue === value) {
      console.log("ud2   No change to column " + column + " = [" + value + "] in table " + table + " where id = " + id + ".  Update cancelled.");
      return res.status(200).json({ msg: 'No changes made; value is the same' });
    }

    //update table
    const q = await pool.query("UPDATE " + table + " SET " + column + " = $1 WHERE id = $2;", [value, id]);
    // console.log("ud3    UPDATE " + table + " SET " + column + " = " + value + " WHERE id = " + id + ";  updated(" + q.rowCount + ") records");

    if (table === "jobs") {
      // console.log("ud55    updating table 'jobs' and column: " + column);
      if (column === "display_text") {
        // console.log("ud69  sdf")
        const q2 = await pool.query("UPDATE job_templates SET display_text = $1 WHERE id = (SELECT job_template_id FROM jobs WHERE id = $2);", [value, id]);
        console.log("ud7     ...we also modified the template to reflect this change. ");
      }
    }

    if (q.rowCount == 1) {
      console.log("ud9    records succesfully modified in " + table + " table: 1");
      return res.status(201).json({ msg: 'succesfully modified 1 record' });
      // console.log("ud9   USER set " + column + " to " + value + " in table " + table + " where id = " + id);
    } else {
      console.error(`ud8     ${q.rowCount} records were modified. Check your SQL.`);
      return res.status(422).json({ msg: 'Unprocessable Entity: No records were modified' });
    }

    // console.log("ud99");
  } catch (error) {

    console.error('ud8   Error updating job:', error);
    // return relevant status code at the end of every API call
    return res.status(500).json({ msg: error.message });
  }
})



app.get("/tasks/:id", async (req, res) => {
  console.log("me1    DB is reading task info ", req.params)
  const task_id = parseInt(req.params.id);
  if (!task_id) {
    console.error("me81   Tried to get a task, but not given the task_ID")
  } else {
    let conversation = [];



    let data = {
      job: {
        id: 1,
        display_text: 'test',
        display_name: 'john',
        free_text: 'jobText',
        target_date: 'targetDate',
        reminder: 'reminder',      //{escalation1_interval : 7, escalation2_interval : 21},
        conversation:
          [
            { display_name: "John", message_text: "see attached pic", attachment: [{ thumbnail: "https://icons.iconarchive.com/icons/graphicloads/colorful-long-shadow/128/Attachment-2-icon.png", link: "http://www.google.com" },] },
            { display_name: "Nick", message_text: "John this is the ...", },
            { display_name: "Owner", message_text: "when is it done?", },]
      },
      task_antecedents:
        [
          { display_text: "Call Plumber", current_status: true, free_text: "" },
          { display_text: "vook trencher", current_status: true, free_text: "" },
          { display_text: "visit reece", current_status: true, free_text: "" },
        ],
      task_decendants:
        [
          { display_text: "record pics", free_text: "" },
          { display_text: "confirm plumber availability", free_text: "" },
          { display_text: "call Bryan", free_text: "" },],
      job_antecedents:
        [
          { display_text: "Cladding", free_text: "supporting text" },
          { display_text: "Roofing", free_text: "supporting text" },],
      job_decendants: [{ display_text: "Plumbing", free_text: "supporting text" },],
    };
    console.log("me9    successfully retrieved data for job() ")
    res.json(data);

  }

});


app.get("/addtask", async (req, res) => {
  console.log("t1     USER is adding a new task for jobID(" + req.query.job_id + ")");
  const job_id = req.query.job_id;
  const precedence = req.query.precedence;
  let vSQL = "";
  let newTaskID

  try {
    //add task
    // console.log("t2    ");
    const newTask = await pool.query("INSERT INTO tasks (display_text, job_id, current_status, precedence, sort_order) VALUES ('UNNAMED', " + job_id + ", 'active', '" + precedence + "', 't2') RETURNING id;");
    newTaskID = newTask.rows[0].id;
    res.status(201).json({ newTaskID: newTaskID });

  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }

  console.log("t9      Successfully added task(" + newTaskID + ")");
});


app.get("/update", async (req, res) => {
  const table = req.query.table;
  const column = req.query.column;
  let value = req.query.value;
  //value = value.replace(/%/g,"_");
  const id = req.query.id;
  console.log("ua1   USER set " + column + " to " + value + " in table " + table + " where id = " + id);
  try {
    // put every database query into a try - catch block
    //update table
    const q = await pool.query("UPDATE " + table + " SET " + column + " = $1 WHERE id = $2;", [value, id]);
    if (q.rowCount == 1) {
      res.status(201).json({ msg: 'succesfully modified 1 record' });
      // console.log("ua5    succesfully modified the " + table + " record: ");
    }

    if (table === "jobs") {
      // console.log("ua55    updating table 'jobs' and column: " + column);
      if (column === "display_text") {
        // console.log("ua69  sdf")
        const q2 = await pool.query("UPDATE job_templates SET display_text = $1 WHERE id = (SELECT job_template_id FROM jobs WHERE id = $2);", [value, id]);
        console.log("ua7     ...we also modified the template to reflect this change. ");
      }
    }
    // console.log("ua9");
  } catch (error) {

    console.error('ua8   Error updating job:', error);
    // return relevant status code at the end of every API call
    res.status(500).json({ error: 'Failed to add job' });
  }
})

app.get("/deltask", async (req, res) => {
  console.log("tl1     USER is deleting task(??) ");
  const task_id = req.query.task_id;
  const table = req.query.table;
  let vSQL = "";


  let recordsDeleted
  try {
    // console.log("tl2    ", task_id);
    const result = await pool.query("DELETE FROM tasks WHERE id = $1;", [task_id]);
    recordsDeleted = result.rowCount;
    res.status(201).json({ newTaskID: recordsDeleted + ' task(s) were deleted successfully' });

  } catch (error) {
    console.error('tl81   Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }

  console.log("tl9      Successfully deleted task(" + task_id + ") deleting " + recordsDeleted + " records");
});




app.get("/addjob", async (req, res) => {
  // Supported ways of adding a job:
  // - parent: (Deprecated) Intended to add a job as an antecedent (parent) of the current job.
  // - child: Adds a job as a descendant (child) of the specified job.
  // - template: Adds a job based on a template, linking it in the workflow.
  // - origin: Adds the first job for a build, triggering the creation of the entire workflow from the job_templates table.
  // - insert: adds a job after the given record and adjusts flow to the decendant job

  console.log("a001   USER is adding a new job", req.query);

  const title = req.query.title || 'UNNAMED';
  let precedence = req.query.precedence;
  let tier = req.query.tier;
  let buildID, jobID, templateId, firstJobID, template, productID, templateSQL;

  // Default tier if not provided
  if (!tier) {
    console.error("a2      No tier provided, defaulting to 500");
    tier = 500;
  }

  // If adding job from template
  if (precedence.startsWith("template")) {
    templateId = precedence.replace("template", "");
    jobID = req.query.id; // This is the jobID unless 'origin', then it's build_id

    try {
      templateSQL = `SELECT * FROM job_templates WHERE id = ${templateId} or (antecedent_array = '${templateId}' and tier > 500) order by sort_order`;
      console.log("a800     ", templateSQL);
      template = await pool.query(templateSQL);
      productID = template.rows[0].product_id;

      const q1 = await pool.query("SELECT build_id FROM jobs WHERE id = $1", [jobID]);
      buildID = q1.rows[0].build_id;

      if (template.rows.length === 0) {
        console.error("a821     No templates found for this product type.");
      } else {
        console.log("a822     this workflow consists of ", template.rows.length, " templates");
      }
    } catch (error) {
      console.error("a828     Error fetching template:", error);
    }

    precedence = "origin";
  } else {
    if (precedence == "origin") {
      buildID = req.query.id;
      // Get product for build
      const product = await pool.query("SELECT product_id FROM builds WHERE builds.id = $1", [buildID]);
      productID = product.rows[0].product_id;

      // Get first template for product
      const q = await pool.query(
        "SELECT b.id as build_id, m.id as temp_id, m.product_id, m.display_text, sort_order, tier FROM job_templates m INNER JOIN builds b ON m.product_id = b.product_id WHERE b.id = $1 AND m.antecedent_array IS NULL",
        [buildID]
      );
      let firstTemplateID = q.rows[0].id;
      console.log("a81    USER added a new workflow(" + productID + ") for build(" + buildID + "). Beginner template is " + firstTemplateID);

      try {
        templateSQL = `SELECT * FROM job_templates WHERE product_id = ${productID} order by sort_order`;
        template = await pool.query(templateSQL);
        if (template.rows.length === 0) {
          console.error("a821     No templates found for this product type.");
        } else {
          console.log("a822     this workflow consists of ", template.rows.length, " templates");
        }
      } catch (error) {
        console.error("a828     Error fetching template:", error);
      }
    } else if (precedence == "insert") {
      jobID = req.query.id;  // this is the job after which we are inserting the new job
      const q3 = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobID]);
      tier = q3.rows[0].tier;
      precedence = "child";  //inserting a job is the same as adding a child job, except we need to fix up the flow later
      console.log("a782    USER is inserting a new job after job(" + jobID + ") on tier " + tier);
      buildID = q3.rows[0].build_id;

      const q1 = await pool.query("SELECT * FROM job_templates WHERE id = " + templateId);
      const tt = q1.rows[0];
      const q2 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
      const jt = q2.rows[0];
      let new_sort_order = jt.sortOrder + 1;

      let newJob;
      try {
        newJob = await pool.query(
          "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
          [title, 1, jt.job_template_id, new_sort_order, jt.build_id, jt.product_id, jt.tier]
        );
        console.log("a743     based on job ", newJob.rows[0]);

        // Fix up relationships in job_process_flow table
        const q6 = await pool.query(
          "SELECT decendant_id FROM job_process_flow WHERE antecedent_id = $1;",
          [jobID]
        );
        const postJobID = q6.rows[0].decendant_id;
        const preJobID = jobID;
        const newJobID = newJob.rows[0].id;
        console.log("a744     new jobID = " + newJobID + ", preJobID = " + preJobID + ", postJobID = " + postJobID);

        await pool.query(
          "UPDATE job_process_flow SET decendant_id = $1 WHERE antecedent_id = $2 RETURNING id;",
          [newJobID, preJobID]
        );
        await pool.query(
          "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES ($1, $2, $3) RETURNING id;",
          [newJobID, postJobID, tt.tier]
        );

        // Add child tasks from template to the new job
        if (newJobID) {
          await createDecendantsForJob(newJobID, pool, true);
        } else {
          console.log("a748      newJobID has not been set");
        }
        console.log("a7339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
      } catch (error) {
        console.error("a7338    Error inserting new job:", error);
      }
      console.log("a749     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " ");

    } else {
      jobID = req.query.id;
    }
  }

  console.log("a01    adding to job(" + jobID + ") for build(" + buildID + ") on " + precedence + " called " + title);

  try {
    let newJobID;

    // Add job as parent (deprecated)
    if (precedence == "parent") {
      // This block is deprecated and not supported
      console.log("a19   adding of parents has been retracted... no longer supported functionality");
    }
    // Add job as child
    else if (precedence == "child") {
      console.log("a30     new job is a child to job(" + jobID + ")");
      const q4 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
      let oldJobTemplateID = q4.rows[0].job_template_id;

      let newJob;
      try {
        newJob = await pool.query(
          "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
          [title, 1, null, '0', q4.rows[0].build_id, q4.rows[0].product_id, tier]
        );
        console.log("a339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
      } catch (error) {
        console.error("a338    Error inserting new job:", error);
      }

      newJobID = newJob.rows[0].id;
      const newRelationship = await pool.query(
        "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES ($1, $2, $3);",
        [jobID, newJobID, tier]
      );
      console.log("a39     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " on " + tier);
    }
    // Add job from template
    else if (precedence == "template") {
      console.log("a40     new job is a child to job(" + jobID + ") based on template(" + templateId + ")");
      const q1 = await pool.query("SELECT * FROM job_templates WHERE id = " + templateId);
      const tt = q1.rows[0];
      const q2 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
      const jt = q2.rows[0];

      let newJob;
      try {
        newJob = await pool.query(
          "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
          [tt.display_text, 1, tt.id, tt.sort_order, jt.build_id, jt.product_id, tt.tier]
        );
        console.log("a43     based on job ", newJob.rows[0]);

        // Fix up relationships in job_process_flow table
        const q6 = await pool.query(
          "SELECT decendant_id FROM job_process_flow WHERE antecedent_id = $1;",
          [jobID]
        );
        const postJobID = q6.rows[0].decendant_id;
        const preJobID = jobID;
        const newJobID = newJob.rows[0].id;
        console.log("a44     new jobID = " + newJobID + ", preJobID = " + preJobID + ", postJobID = " + postJobID);

        await pool.query(
          "UPDATE job_process_flow SET decendant_id = $1 WHERE antecedent_id = $2 RETURNING id;",
          [newJobID, preJobID]
        );
        await pool.query(
          "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES ($1, $2, $3) RETURNING id;",
          [newJobID, postJobID, tt.tier]
        );

        // Add child tasks from template to the new job
        if (newJobID) {
          await createDecendantsForJob(newJobID, pool, true);
        } else {
          console.log("a48      newJobID has not been set");
        }
        console.log("a339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
      } catch (error) {
        console.error("a338    Error inserting new job:", error);
      }
      console.log("a49     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " ");
    }
    // Add job as origin (new workflow for build)
    else if (precedence == "origin") {
      let parentJobID, parentChangeArray = '', antecedentJobID;
      console.log("a831     Copying template to build and creating jobs ");

      // Loop through each template and create jobs
      for (const t of template.rows) {
        console.log("a832       working with template(", t.id, ") on tier [" + t.tier + "] ...");
        let title = t.display_text;
        let description = t.free_text;
        let userID = t.user_id || 1;
        let tempID = t.id;
        let remID = t.reminder_id || 1;
        let prodID = productID;
        let createdAt = new Date().toISOString();
        let sortOrder = t.sort_order;
        let tier = t.tier;
        let antecedentTemplateID = t.antecedent_array;
        let decendantTemplateID = t.decendant_array;
        let jobChangeArray = t.job_change_array;
        let flowChangeArray = t.flow_change_array;

        try {
          // Find parent job for this template
          const parentJob = await pool.query(
            "SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2",
            [antecedentTemplateID, buildID]
          );
          parentJobID = parentJob.rows.length > 0 ? parentJob.rows[0].id : null;

          // Insert job for this template
          const result = await pool.query(
            `INSERT INTO jobs (display_text, free_text, job_template_id, build_id, product_id, reminder_id, user_id, created_date, sort_order, tier, change_array) VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id;`,
            [title, description, tempID, buildID, prodID, remID, userID, createdAt, sortOrder, tier, jobChangeArray]
          );
          let newJobID = result.rows[0].id;
          console.log("a818       ...template(" + t.id + ") became job(", newJobID, ") " + title);

          // Insert job_process_flow relationship
          await pool.query(
            "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier, change_array) VALUES ($1, $2, $3, $4) RETURNING id;",
            [parentJobID, newJobID, tier, flowChangeArray]
          );

          // Save first jobID to return to caller
          if (!firstJobID) {
            firstJobID = newJobID;
          }
        } catch (error) {
          console.error("a8081     Error inserting new job:", error);
        }
      }

      // Update job change_array references to job IDs
      console.log("a820     Resolving relationships for build(" + buildID + ") with " + template.rows.length + " jobs... ");
      template = await pool.query(templateSQL);
      for (const t of template.rows) {
        let antecedentTemplateID = t.antecedent_array;
        let decendantTemplateID = t.decendant_array;
        let templateID = t.id;
        let jobChangeArray = t.job_change_array;
        let flowChangeArray = t.flow_change_array;
        let replaceTemplateID;
        let job = await pool.query("SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2 ", [templateID, buildID]);
        let jobID = job.rows[0].id;

        // Replace template IDs with job IDs in change_array
        if (jobChangeArray) {
          let c1, c2;
          for (let c = 0; c < jobChangeArray.length; c++) {
            if (jobChangeArray.substring(c, c + 1) == '@') {
              c1 = c + 1;
            }
            if (c1 && jobChangeArray.substring(c, c + 1) == '"') {
              c2 = c;
              replaceTemplateID = jobChangeArray.substring(c1, c2);
              if (replaceTemplateID != 'next') {
                // some workflows are defined without specifying an exact templateID
                let replaceJobID = await pool.query(
                  "SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2",
                  [replaceTemplateID, buildID]
                );
                if (replaceJobID.rows.length > 0) {
                  jobChangeArray = jobChangeArray.replace('@' + replaceTemplateID, '@' + replaceJobID.rows[0].id);
                } else {
                  console.error("a832       ...error in workflow definition... no job found for templateID(" + replaceTemplateID + ") in build(" + buildID + ")");
                }
              }
              c1 = null;
            }
          }
        }
        let result = await pool.query("UPDATE jobs SET change_array = $1 WHERE id = $2 returning change_array", [jobChangeArray, jobID]);
      }

      // Update customer status to match product title
      console.log("a87     updating customer status for build(" + buildID + ") to match product(" + productID + ") title ");
      await pool.query(
        "UPDATE customers SET current_status = (select display_text from products where id = $1) WHERE id = (select customer_id from builds where id = $2)",
        [productID, buildID]
      );

      console.log("a830     added workflow for build(" + buildID + ") starting with next_job", firstJobID);
      newJobID = firstJobID;
    }
    // Unknown precedence
    else {
      console.error("trying to evaluate " + precedence + " but expecting 'parent', 'child'.");
    }

    // Respond with new job ID
    res.status(201).json({ id: newJobID });

  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
});



app.get("/addjob_old", async (req, res) => {
  // the following are the supported ways of adding a job...
  // parent: (Deprecated) Intended to add a job as an antecedent (parent) of the current job.
  // child: Adds a job as a descendant (child) of the specified job.
  // template: Adds a job based on a template, linking it in the workflow.
  // origin: Adds the first job for a build, triggering the creation of the entire workflow from the job_templates table.

  console.log("a001   USER is adding a new job", req.query);
  const title = req.query.title || 'UNNAMED';
  let precedence = req.query.precedence;
  let tier = req.query.tier;
  let buildID;
  let jobID;
  let templateId;
  let firstJobID;
  let template;
  let productID;
  let templateSQL;

  if (tier == "" || tier == undefined) {
    console.error("a2      No tier provided, defaulting to 500");
    tier = 500; // Default tier if not provided
  }
  if (precedence.startsWith("template")) {
    templateId = precedence.replace("template", ""); // Extract the trailing number
    jobID = req.query.id;      //this the jobID unless  precedence is of type 'origin' in which case  it is the  build_id 

    try {
      templateSQL = "SELECT * FROM job_templates WHERE id = " + templateId + " or (antecedent_array = '" + templateId + "' and tier > 500) order by sort_order"
      console.log("a800     ", templateSQL);
      template = await pool.query(templateSQL);

      productID = template.rows[0].product_id;

      const q1 = await pool.query("SELECT build_id FROM jobs WHERE id = $1", [jobID]);
      buildID = q1.rows[0].build_id;

      if (template.rows.length === 0) {
        console.error("a821     No templates found for this product type.");
      } else {
        console.log("a822     this workflow consists of ", template.rows.length, " templates");
        // console.table(template.rows);
      }
    } catch (error) {
      console.error("a828     Error fetching template:", error);
    }

    precedence = "origin";

  } else {
    if (precedence == "origin") {
      buildID = req.query.id;      //this the jobID unless  precedence is of type 'origin' in which case  it is the  build_id 
      //pull down the build record.  What kind of build? garage or hay shed?
      const product = await pool.query("SELECT product_id FROM builds WHERE builds.id = $1", [buildID]);
      productID = product.rows[0].product_id;
      // console.log("a801     " + productID)

      // Does a tempalte exist for this product & user? get the build > check the product_id > get the tempalte for that build
      const q = await pool.query("SELECT b.id as build_id, m.id as temp_id, m.product_id, m.display_text, sort_order, tier FROM job_templates m INNER JOIN builds b ON m.product_id = b.product_id WHERE b.id = $1 AND m.antecedent_array IS NULL", [buildID])   // which job has no parent? its the origin job.  templates can vary based on the product (a garage is a different build process to a house).  in the future templates will vary based on other things (i.e. user, role, business)
      let firstTemplateID = q.rows[0].id;
      console.log("a81    USER added a new workflow(" + productID + ") for build(" + buildID + "). Beginner template is " + firstTemplateID);
      // console.log("a805     firstTemplateID = " + firstTemplateID);

      try {
        templateSQL = "SELECT * FROM job_templates WHERE product_id = " + productID + " order by sort_order"
        template = await pool.query(templateSQL);
        if (template.rows.length === 0) {
          console.error("a821     No templates found for this product type.");
        } else {
          console.log("a822     this workflow consists of ", template.rows.length, " templates");
          // console.table(template.rows);
        }
      } catch (error) {
        console.error("a828     Error fetching template:", error);
      }

    } else {
      jobID = req.query.id;      //this the jobID unless  precedence is of type 'origin' in which case  it is the  build_id 
    }
  }

  //  no longer provided... its derived from the buildID record      const productID = req.query.product_id;
  console.log("a01    adding to job(" + jobID + ") for build(" + buildID + ") on " + precedence + " called " + title);

  try {
    let newJobID;
    //add job and then document the relationship to the new job in job_process_flow
    if (precedence == "parent") {
      if (false) {
        const q4 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
        console.log("a10")
        // Add a single job as a placeholder.  You're looking at a job and you think you want to create a child job.  so use this functino to create it.  Then edit the new child job to fill out other details.
        //get the job_template_id
        const q1 = await pool.query("INSERT INTO job_templates (user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [1, 1, productID, title, null, job_template_ID, null, 1]);
        console.log("updated template to include the new job.  job_template_id=" + q1.rows[0].id);
        console.log("a11")
        // const newJob = await pool.query("INSERT INTO jobs (display_text, reminder_id) VALUES ($1, 1) RETURNING id;", [title]);
        let newJob
        try {
          // const newJob = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;", [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id], q4.rows[0].product_id);
          newJob = await pool.query(
            "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
            [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id, q4.rows[0].product_id, tier]
          );

          console.log("a339    New job inserted successfully:", newJob.rows[0]);
        } catch (error) {
          console.error("a338    Error inserting new job:", error);
        }



        console.log("a12")
        newJobID = newJob.rows[0].id;
        console.log("a13")
        const newRelationship = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id) VALUES (" + newJobID + ", " + jobID + ") ;");
        console.log("a14")
        // console.log(productID);
        // console.log(displayText);
        // console.log(parentID);
        // console.log(childID);
        // console.log(reminderID);
        // const q2 = await pool.query("INSERT INTO job_templates (product_id, display_text, reminder_id) VALUES ($1, $2, $3) RETURNING *;", [productID, 'Follow Up', 1]);     // this will return all the columns, not only the three specified
      } else {
        console.log("a19   adding of parents has been retracted... no longer supported functionality")
      }

    } else if (precedence == "child") {
      console.log("a30     new job is a child to job(" + jobID + ")");
      //console.log(req.query);
      const q4 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);

      console.log("a31     based on template_id(" + q4.rows[0].job_template_id + ") for job(" + jobID + ")");
      let oldJobTemplateID = q4.rows[0].job_template_id;
      // const q1 = await pool.query("INSERT INTO job_templates (user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [1,1, q4.rows[0].product_id, title, null, q4.rows[0].job_template_id, null, 1]);
      // const q5 = await pool.query("UPDATE job_templates SET decendant_array = '" + q1.rows[0].id + "' where id = " + oldJobTemplateID)     //add this job as a child of the parent template 
      // console.log("a32     tempalate updated to insert new jobtemplateID(" + q1.rows[0].id + ")");
      // console.log("a33     updated relationship. decendant_array = '" + q1.rows[0].id + "', where oldJobTemplateID = " + oldJobTemplateID);

      let newJob
      try {
        // const newJob = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;", [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id], q4.rows[0].product_id);
        newJob = await pool.query(
          "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
          [title, 1, null, '0', q4.rows[0].build_id, q4.rows[0].product_id, tier]
        );

        console.log("a339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
      } catch (error) {
        console.error("a338    Error inserting new job:", error);
      }
      console.log("a34     working with parentJob!build_id=" + q4.rows[0].build_id + ", parentjob!product_id=" + q4.rows[0].product_id);
      newJobID = newJob.rows[0].id;
      const newRelationship = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES (" + jobID + ", " + newJobID + ", " + tier + ") ;");
      console.log("a39     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " on " + tier);
    } else if (precedence == "template") {
      console.log("a40     new job is a child to job(" + jobID + ") based on template(" + templateId + ")");
      //console.log(req.query);
      const q1 = await pool.query("SELECT * FROM job_templates WHERE id = " + templateId);
      const tt = q1.rows[0];
      console.log("a41     based on template ", q1.rows[0]);
      const q2 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
      console.log("a42     based on job ", q2.rows[0]);
      const jt = q2.rows[0];

      let newJob
      try {
        // const newJob = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;", [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id], q4.rows[0].product_id);
        newJob = await pool.query(
          "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
          [tt.display_text, 1, tt.id, tt.sort_order, q2.rows[0].build_id, q2.rows[0].product_id, tt.tier]
        );
        console.log("a43     based on job ", newJob.rows[0]);


        //fix up relationships in job_process_flow table
        const q6 = await pool.query(
          "SELECT decendant_id FROM job_process_flow WHERE antecedent_id = $1;",
          [jobID]
        );
        const postJobID = q6.rows[0].decendant_id;
        const preJobID = jobID;
        const newJobID = newJob.rows[0].id;
        console.log("a44     new jobID = " + newJobID + ", preJobID = " + preJobID + ", postJobID = " + postJobID);
        const q7 = await pool.query(
          "UPDATE job_process_flow SET decendant_id = $1 WHERE antecedent_id = $2 RETURNING id;",
          [newJobID, preJobID]
        );
        console.log("a45");
        const q4 = await pool.query(
          "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES ($1, $2, $3) RETURNING id;",
          [newJobID, postJobID, tt.tier]
        );


        //add child tasks from template to the new job
        if (newJobID) {
          console.log("a47");
          await createDecendantsForJob(newJobID, pool, true);      // recursivle build out the build process based on the template");
        } else {
          console.log("a48      newJobID has not been set")
        }


        console.log("a339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
      } catch (error) {
        console.error("a338    Error inserting new job:", error);
      }


      // console.log("a41     based on template ", q1.rows[0]);
      console.log("a49     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " ")
    } else if (precedence == "origin_old") {
      console.log("a50    new job is a new workflow for build(" + buildID + ") ");
      //pull down the build record.  What kind of build? garage or hay shed?
      const q2 = await pool.query("SELECT product_id FROM builds WHERE builds.id = $1", [buildID]);
      const productID = q2.rows[0].product_id;
      console.log("a51 " + productID)
      let jobTemplateID;

      // Does a tempalte exist for this product & user? get the build > check the product_id > get the tempalte for that build
      const q1 = await pool.query("SELECT job_templates.* FROM job_templates INNER JOIN builds ON job_templates.product_id = builds.product_id WHERE builds.id = $1 AND antecedent_array IS NULL", [buildID])   // which job has no parent? its the origin job.  templates can vary based on the product (a garage is a different build process to a house).  in the future templates will vary based on other things (i.e. user, role, business)
      console.log("a52")
      let jobTemplate;
      if (q1.rows.length === 0) {
        console.log("a53")
        //console.log("No templates found for this product type.");
        try {
          // create a tempalte for this product.  The first template must have a NULL antecedent.  At the moment it has no children
          // The default title when there is no template is 'Follow Up'
          console.log("a54")
          const q2 = await pool.query("INSERT INTO job_templates (product_id, display_text, reminder_id) VALUES ($1, $2, $3) RETURNING *;", [productID, 'Follow Up', 1]);     // this will return all the columns, not only the three specified
          //console.log(q2.rows[0]);
          jobTemplateID = q2.rows[0].id;
          console.log("Template inserted: " + jobTemplateID);
          jobTemplate = q2.rows[0];
          console.log("a55")
        } catch (error) {
          console.log("a56")
          console.error("15435 Error inserting into job_templates:", error);
        }
      } else {
        console.log("a60")
        jobTemplate = q1.rows[0];
        console.log("a61")
        jobTemplateID = q1.rows[0].id;
        console.log("a62")
      }





      if (jobTemplateID) {
        //If there is a template already then we have already returned it in q1...
        console.log("a70     ", jobTemplate);
        //create the new job in the database from the parameters read from the tempalte, and link it to the build
        const q2 = await pool.query("INSERT INTO jobs (display_text, job_template_id, build_id, product_id, reminder_id, sort_order, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;", [jobTemplate.display_text, jobTemplateID, buildID, productID, 1, jobTemplate.sort_order, 500]);
        newJobID = q2.rows[0].id;
        // No relationship to define because there is only on Job in the system for this build (at this point)     //const q3 = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id) VALUES (null, " + newJobID + ") ;");             
      }

      if (newJobID) {
        console.log("a78");
        await createDecendantsForJob(newJobID, pool, false);      // recursivle build out the build process based on the template");
      } else {
        console.log("3925789 process will fail because newJobID has not been set")
      }

    } else if (precedence == "origin") {



      let parentJobID;
      let parentChangeArray = '';
      let antecedentJobID;
      console.log("a831     Copying template to build and creating jobs ");
      for (const t of template.rows) {
        console.log("a832       working with template(", t.id, ") on tier [" + t.tier + "] ...");
        // console.table(t);
        // let buildID = buildID; 
        let title = t.display_text;
        let description = t.free_text     //|| '';
        let userID = t.user_id || 1;
        let tempID = t.id;
        let remID = t.reminder_id || 1;
        let prodID = productID;
        let createdAt = new Date().toISOString();
        let sortOrder = t.sort_order;
        let tier = t.tier;
        let antecedentTemplateID = t.antecedent_array;
        let decendantTemplateID = t.decendant_array;
        let jobChangeArray = t.job_change_array;
        let flowChangeArray = t.flow_change_array;
        // console.log("a814     aID"+ antecedentID + ", dID: " + decendantTemplateID + ", jobChangeArray: " + jobChangeArray + ", flowChangeArray: " + flowChangeArray);

        try {
          console.log("a816       ...checking antecedentTemplateID(" + antecedentTemplateID + ") for build(" + buildID + ")");
          const parentJob = await pool.query("SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2", [antecedentTemplateID, buildID]);
          parentJobID = parentJob.rows.length > 0 ? parentJob.rows[0].id : null;
          const result = await pool.query(`INSERT INTO jobs (display_text, free_text, job_template_id, build_id, product_id, reminder_id, user_id, created_date, sort_order, tier, change_array) VALUES
                                                              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id;`,
            [title, description, tempID, buildID, prodID, remID, userID, createdAt, sortOrder, tier, jobChangeArray]);
          let newJobID = result.rows[0].id;
          console.log("a818       ...template(" + t.id + ") became job(", newJobID, ") " + title);
          // console.log("               " + jobChangeArray)

          if (!antecedentTemplateID) {
            console.log("a816       ...starting template - no antecedent provided");
            // const q2 = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id, tier, change_array) VALUES ($1, $2, $3, $4) RETURNING id;", [parentJobID, newJobID, tier, flowChangeArray]);
          }
          if (decendantTemplateID == null) {
            console.log("a816        ...last job in template, decendant not provided");
          }
          console.log("a819       ...joining this job to parent job(" + parentJobID + ") on tier(" + tier + ")");
          const q2 = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id, tier, change_array) VALUES ($1, $2, $3, $4) RETURNING id;", [parentJobID, newJobID, tier, flowChangeArray]);

          console.log("a819       ...inserted _flow(" + q2.rows[0].id + ")");

          // record the first job in the workflow sequence to return to the calling function
          if (!firstJobID) {
            // console.log("a819     ...Saved first jobID("+newJobID+") to add to build record");
            firstJobID = newJobID;
          }

        } catch (error) {
          console.error("a8081     Error inserting new job:", error);
        }

      }


      console.log("a820     Resolving relationships for build(" + buildID + ") with " + template.rows.length + " jobs... ");
      template = await pool.query(templateSQL);
      for (const t of template.rows) {
        let antecedentTemplateID = t.antecedent_array;
        let decendantTemplateID = t.decendant_array;
        let templateID = t.id;
        let jobChangeArray = t.job_change_array;
        let flowChangeArray = t.flow_change_array;
        let replaceTemplateID;
        let job = await pool.query("SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2 ", [templateID, buildID]);
        let jobID = job.rows[0].id;

        console.log("a832       reading template(" + templateID + ")");
        // console.table(t);
        // console.log("a832       reading template("+templateID+"), antecedentID("+antecedentTemplateID+"), decendantID("+decendantTemplateID+") tier("+t.tier+")");
        console.log("             jobChangeArray: " + jobChangeArray);
        // console.log("             flowChangeArray: " + flowChangeArray);
        if (jobChangeArray) {
          let c1;
          let c2;
          for (let c = 0; c < jobChangeArray.length; c++) {
            if (jobChangeArray.substring(c, c + 1) == '@') {
              c1 = c + 1;
            }
            if (c1 && jobChangeArray.substring(c, c + 1) == '"') {
              c2 = c;
              console.log("a832       " + c + " = " + jobChangeArray.substring(c1, c2) + ", c1 = " + c1 + ", c2 = " + c2);
              replaceTemplateID = jobChangeArray.substring(c1, c2);
              let replaceJobID = await pool.query("SELECT id FROM jobs WHERE job_template_id = $1 and build_id = $2", [replaceTemplateID, buildID]);
              if (replaceJobID.rows.length > 0) {
                console.log("a832       ...replacing templateID(" + replaceTemplateID + ") with jobID(" + replaceJobID.rows[0].id + ")");
                jobChangeArray = jobChangeArray.replace('@' + replaceTemplateID, '@' + replaceJobID.rows[0].id);
              } else {
                console.error("a832       ...error in workflow definition... no job found for templateID(" + replaceTemplateID + ") in build(" + buildID + ")");
              }
              c1 = null;
            }
          }
        }
        console.log("a832       ...final jobChangeArray: " + jobChangeArray);
        let result = await pool.query("UPDATE jobs SET change_array = $1 WHERE id = $2 returning change_array", [jobChangeArray, jobID]);
        console.log("a832       ...updated job(" + jobID + ") with change_array: " + result.rows[0].change_array);



      }

      // format customer status to align with new workflow
      // let customer = await pool.query("SELECT * FROM customers WHERE id = (select customer_id from builds where id = $1)", [buildID]);
      // if (customer.rows.length > 0) {
      console.log("a87     updating customer status for build(" + buildID + ") to match product(" + productID + ") title ");
      let q1 = await pool.query("UPDATE customers SET current_status = (select display_text from products where id = $1) WHERE id = (select customer_id from builds where id = $2)", [productID, buildID]);
      // }

      console.log("a830     added workflow for build(" + buildID + ") starting with next_job", firstJobID);
      newJobID = firstJobID
    } else {
      console.error("trying to evaluate " + precedence + " but expecting 'parent', 'child'.");
    }

    //read relevant template
    //apply reminder
    // const reminder = await pool.query("INSERT INTO reminders (escalation1_interval, escalation3_interval, current_status) VALUES (7,14,'active') RETURNING id;;"); 
    // const reminder_id = reminder.rows[0].id;
    // API responce to let calling functino know that the job was completed successfully
    res.status(201).json({ id: newJobID });

  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }

});

app.get("/deleteJob", async (req, res) => {
  const client = await pool.connect();
  console.log("ii1     deleting job: ", req.query.job_id)

  try {
    await client.query('BEGIN'); // Start a transaction

    const job = await client.query("SELECT * FROM jobs WHERE id = $1;", [req.query.job_id]);
    const job_id = req.query.job_id;
    const q1 = await client.query("SELECT * FROM job_process_flow WHERE antecedent_id = $1;", [job_id]);
    console.log("ii3     this job has [" + q1.rowCount + "] children")
    const q2 = await client.query("SELECT * FROM job_process_flow WHERE decendant_id = $1;", [job_id]);
    console.log("ii2     this job has [" + q2.rowCount + "] parents")
    let parentID = 0;
    if (q2.rows.length !== 0) {
      parentID = q2.rows[0].antecedent_id
      console.log("ii4     first job parent is ", parentID, ' - UI will return to this job after delete')
    }

    // delete the job
    const result = await client.query("DELETE FROM jobs WHERE id = $1 RETURNING *;", [job_id]);
    // Check if rowCount is not equal to 1
    if (result.rowCount !== 1) {
      console.error("ii5     Error: Expected to delete 1 job, but deleted " + result.rowCount);
    } else {
      console.log("ii5     deleted job with ID: " + job_id);
    }

    //delete the children
    const removeChildren = await client.query("DELETE FROM jobs WHERE id IN (SELECT decendant_id FROM job_process_flow WHERE antecedent_id = $1 and tier > 500);", [job_id]);
    console.log("ii6     deleted " + removeChildren.rowCount + " children of job(" + job_id + ")");
    const removeFlow = await client.query("DELETE FROM job_process_flow WHERE antecedent_id = $1;", [job_id]);
    console.log("ii6a    DELETE FROM job_process_flow WHERE decendant_id = " + job_id);



    if (parentID == null) {
      //we deleted the first job in the workflow
      console.log("ii7     job_id(" + job_id + ") is build(" + job.rows[0].build_id + ").");
      const q3 = await client.query("SELECT id FROM jobs WHERE build_id = $1 and tier = 500;", [job.rows[0].build_id]);
      console.log("ii8     setting next_job to " + q1.rows[0].id + " for build(" + job_id + ")");
      const q4 = await client.query("update builds set job_id = $1 where id = $2;", [q1.rows[0].id, job_id]);
      console.log("ii9     reassigned build(" + job_id + ") to point to new first job(" + q1.rows[0].id + ") ");
    }


    await client.query('COMMIT'); // Commit the transaction
    res.status(200).send({
      status: "Job deleted successfully",
      goToId: parentID
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    await client.query('ROLLBACK'); // Rollback the transaction
    res.status(500).send({
      status: "Failed to delete job",
      goToId: job_id
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

export async function createDecendantsForJob(jobID, pool, thisJobOnly = false) {
  // Define the function to write a job to the database
  console.log("c11    createDecendantsForJob(" + jobID + ")")
  try {
    console.log("c12");
    const q1 = await pool.query("SELECT * FROM  jobs WHERE id=$1;", [jobID]);
    const oldJob = q1.rows[0];
    let newJobID;
    const productID = oldJob.product_id;

    // JOBS  -----  read jobs from template file 
    console.log("c13   ", productID);
    console.log("c14    ", oldJob.rows);
    console.log("c15");
    const q3 = await pool.query("SELECT display_text, reminder_id, id, product_id, sort_order FROM job_templates b WHERE b.product_id = " + productID + " AND b.antecedent_array = '" + oldJob.job_template_id + "'");
    const newTemplate = q3.rows[0];
    console.log("c16    ", q3.rows);

    // TASKS   ------- read tasks from template file
    const q4 = await pool.query(`
                                      INSERT INTO tasks (display_text, free_text, job_id, current_status, owned_by, task_template_id, precedence, sort_order)
                                      SELECT display_text, free_text, ${jobID}, null, owned_by, id, precedence, sort_order
                                      FROM task_templates
                                      WHERE job_template_id = ${oldJob.job_template_id} RETURNING id, task_template_id;`
    );
    console.log("c165   ", q4.rows);


    // REMINDERS   ------- read from template table
    q4.rows.forEach(async (task) => {
      console.log("c166 : " + task.id + " -> " + task.task_template_id);
      let q5
      try {
        q5 = await pool.query(`
                INSERT INTO reminders (
                    escalation1_interval,
                    escalation2_interval,
                    escalation3_interval,
                    definition_object,
                    title,
                    body,
                    current_status,
                    "trigger",
                    medium,
                    created_by,
                    task_id
                )
                SELECT 
                    null, 
                    null, 
                    null, 
                    null, 
                    rt.title,
                    rt.body,
                    null,           
                    rt."trigger",
                    rt.medium,
                    1,                   -- Assuming a default creator
                    ${task.id}
                FROM 
                    task_templates t
                JOIN 
                    reminder_templates rt ON t.id = rt.task_template_id
                WHERE
                    rt.task_template_id = ($1)
                RETURNING * ;
            `, [task.task_template_id]);

        if (q5.rowCount === 0) {
          console.log("c167   ", q5.rows[0]);
          let reminderID = q5.rows[0].id
          let reminderTemplateID = q5.rows[0].template_id
          const triggerTemplate = q5.rows[0].trigger;     // example taskID(10)
          console.log("c171    ", triggerTemplate);
        }
        try {
          // Extracting table, column, value, and modifier using regular expressions
          const match = triggerTemplate.match(/^(\w+)ID\((\d+)\)(\s*([+-]\s*\d+))?/);
          if (match) {
            const table = match[1] + "s"; // Adding "s" to the table name to make it plural
            const column = "ID"; // Assuming the column is always "ID"
            const value = match[2]; // Extracting the value
            const modifier = match[4] ? parseInt(match[4].replace(/\s+/g, '')) : 0; // Extracting and parsing the modifier, defaulting to 0 if not provided

            console.log("c175   Table:", table);
            console.log("c176   Column:", column);
            console.log("c177   Value:", value);
            console.log("c178   Modifier:", modifier);

            // const q6 = await pool.query(`SELECT * FROM tasks WHERE id = ($1);`, [task.id]);      
            // console.log("c21   ", q6.rows);


            // // modify trigger definition for specific task
            // const q7 = await pool.query(`UPDATE reminders SET trigger = ($1) WHERE id = ($2);`, [newTrigger, reminderID]);      
            // console.log("c22   ", q4.rows);

          } else {
            console.error("c88    Invalid triggerTemplate format:", triggerTemplate);
          }




        } catch {
          console.error("c180   Couldnt interpret trigger code:", triggerTemplate);

        }

      } catch (error) {
        console.error("Error occurred insert database:", error);
      }


    });    //looping through tasks





    if (q3.rowCount !== 0 && !thisJobOnly) {       //no more templates defined
      const q2 = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, product_id, build_id, sort_order) VALUES ('" + newTemplate.display_text + "', " + newTemplate.reminder_id + ", " + newTemplate.id + ", " + newTemplate.product_id + ", " + oldJob.build_id + ", '" + newTemplate.sort_order + "') returning id")
      console.log("c40");
      console.log("Added " + q2.rows.length + " rows.");
      const newJob = q2.rows[0];     // assumes only 1 child
      console.log("c41");
      if (q2.rowCount !== 0) {
        console.log("c42");
        newJobID = newJob.id
        console.log("c43   just inserted a new job(" + newJobID + "). We will now mark it as a decendant of job(" + oldJob.id + "). ");
        //newJobID = newJob.rows[0].id;
        console.log("c44");
        const q3 = await pool.query("INSERT INTO job_process_flow (decendant_id, antecedent_id) VALUES (" + newJob.id + ", " + oldJob.id + ") ;");
        console.log("c45   Added " + q3.rowCount + " rows to processflow. Added the relationship.");

        //const q4 = await pool.query("INSERT INTO tasks (display_text, job_id, current_status, precedence) VALUES ('UNNAMED', "+ job_id +", 'active', '"+ precedence + "') RETURNING id;");      


      }

      console.log("c46");
      if (q2.rowCount !== 0) {
        console.log("c47");
        newJobID = newJob.id;
        console.log("c48      recursivly adding jobs for the new job(" + newJobID + ")");
        //console.log(newJob.rows);
        await createDecendantsForJob(newJobID, pool);
        console.log("c49");

      } else {
        console.log("c50");
        return 1;
      }
    }
    console.log("c88");
  } catch (error) {
    console.log("c99");
    console.error('Error creating decendant for job:', error); // Log the error
    //console.log(newJob);
    throw new Error('Failed to add job'); // Throw a new error
  }
}






// Admin Users API
app.get("/api/admin/users", async (req, res) => {
  console.log("au1      Starting admin users API", { ip: req.ip });

  try {
    const result = await pool.query(`
      SELECT id, email, full_name, display_name, data_security, roles 
      FROM users 
      ORDER BY id
    `);

    console.log("au2      Retrieved users successfully", { count: result.rows.length });

    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error("au8      Admin users API error", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Workflow Validator Admin Interface API
app.get("/api/workflow-problems", async (req, res) => {
  console.log("wv1      Starting workflow validator API", { ip: req.ip });

  try {
    // Get summary statistics
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

    // Get detailed problems by type
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

    // Group problems by type
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

    // Calculate summary statistics
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

    res.json({
      success: true,
      problems: problemsByType,
      summary: summary,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error("wv8      Workflow validator error", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



//#region Job Templates CRUD

// GET - Get all job templates (API)
app.get("/job-templates", async (req, res) => {
  console.log("jt1     Loading job templates with filter:", req.query);
  try {
    const { product_id } = req.query;

    // Get all products for the dropdown
    const productsResult = await pool.query("SELECT id, display_text FROM products ORDER BY id");

    // Build the job templates query with optional product_id filter
    let jobTemplatesQuery = "SELECT * FROM job_templates";
    let queryParams = [];

    if (product_id && product_id !== '') {
      jobTemplatesQuery += " WHERE product_id = $1";
      queryParams.push(product_id);
    }

    jobTemplatesQuery += " ORDER BY sort_order, id";

    const jobTemplatesResult = await pool.query(jobTemplatesQuery, queryParams);

    res.json({
      jobTemplates: jobTemplatesResult.rows,
      products: productsResult.rows,
      selectedProductId: product_id || ''
    });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    res.status(500).json({
      error: "Error loading job templates"
    });
  }
});

// GET - Get single job template (API)
app.get("/api/job-templates/:id", async (req, res) => {
  console.log("ks1     Fetching job template with ID:", req.params.id);
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM job_templates WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job template not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching job template:", error);
    res.status(500).json({ error: "Error fetching job template" });
  }
});

// POST - Create new job template (API)
app.post("/api/job-templates", async (req, res) => {
  console.log("ld1    Creating new job template with data:", req.body);
  try {
    const {
      user_id,
      role_id,
      product_id,
      display_text,
      free_text,
      antecedent_array,
      decendant_array,
      job_change_array,
      flow_change_array,
      reminder_id,
      change_log,
      sort_order,
      tier
    } = req.body;

    console.log("Creating new job template with data:", req.body);

    // Validate required fields
    if (!display_text) {
      return res.status(400).json({ error: "Display text is required" });
    }

    // Get the next available ID since auto-increment is disabled
    const maxIdResult = await pool.query("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM job_templates");
    const nextId = maxIdResult.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO job_templates (
        id, user_id, role_id, product_id, display_text, free_text, 
        antecedent_array, decendant_array, job_change_array, flow_change_array,
        reminder_id, change_log, sort_order, tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING *`,
      [
        nextId,
        user_id || null,
        role_id || null,
        product_id || null,
        display_text,
        free_text || null,
        antecedent_array || null,
        decendant_array || null,
        job_change_array || null,
        flow_change_array || null,
        reminder_id || null,
        change_log || null,
        sort_order || null,
        tier || 500
      ]
    );

    console.log("Job template created successfully:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating job template:", error);
    res.status(500).json({ error: "Error creating job template", details: error.message });
  }
});

// PUT - Update job template (API)
app.put("/api/job-templates/:id", async (req, res) => {
  console.log("kt1     Updating job template with ID:", req.params.id);
  try {
    const { id } = req.params;
    const {
      user_id,
      role_id,
      product_id,
      display_text,
      free_text,
      antecedent_array,
      decendant_array,
      reminder_id,
      change_log,
      sort_order,
      tier
    } = req.body;

    // Validate required fields
    if (!display_text) {
      return res.status(400).json({ error: "Display text is required" });
    }

    const result = await pool.query(`
      UPDATE job_templates SET
        user_id = $1,
        role_id = $2,
        product_id = $3,
        display_text = $4,
        free_text = $5,
        antecedent_array = $6,
        decendant_array = $7,
        reminder_id = $8,
        change_log = $9,
        sort_order = $10,
        tier = $11
      WHERE id = $12
      RETURNING *`,
      [
        user_id || null,
        role_id || null,
        product_id || null,
        display_text,
        free_text || null,
        antecedent_array || null,
        decendant_array || null,
        reminder_id || null,
        change_log || null,
        sort_order || null,
        tier || 500,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job template not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating job template:", error);
    res.status(500).json({ error: "Error updating job template" });
  }
});

// DELETE - Delete job template (API)
app.delete("/api/job-templates/:id", async (req, res) => {
  console.log("ku1     Deleting job template with ID:", req.params.id);
  try {
    const { id } = req.params;

    // Check if template is being used by any jobs
    const jobsUsingTemplate = await pool.query(
      "SELECT COUNT(*) as count FROM jobs WHERE job_template_id = $1",
      [id]
    );

    if (parseInt(jobsUsingTemplate.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete job template as it is being used by existing jobs"
      });
    }

    const result = await pool.query("DELETE FROM job_templates WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job template not found" });
    }

    res.json({ message: "Job template deleted successfully" });
  } catch (error) {
    console.error("Error deleting job template:", error);
    res.status(500).json({ error: "Error deleting job template" });
  }
});

// GET - Get single product (API)
app.get("/api/products/:id", async (req, res) => {
  console.log("kv1     Fetching product with ID:", req.params.id);
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Error fetching product" });
  }
});

// PUT - Update product (API)
app.put("/api/products/:id", async (req, res) => {
  console.log("kw1     Updating product with ID:", req.params.id);
  try {
    const { id } = req.params;
    const { display_text, user_id = 1 } = req.body;

    // Validate required fields
    if (!display_text || display_text.trim() === '') {
      return res.status(400).json({ error: "Display text is required" });
    }

    // Get current product data for change log
    const currentResult = await pool.query("SELECT display_text, change_log FROM products WHERE id = $1", [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const currentProduct = currentResult.rows[0];
    const oldDisplayText = currentProduct.display_text;

    // Create change log entry
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).replace(/ /g, '-');
    const changeEntry = `${currentDate} U${user_id}: name "${oldDisplayText}" → "${display_text}"`;

    // Append to existing change log or create new one
    const existingChangeLog = currentProduct.change_log || '';
    const newChangeLog = existingChangeLog ?
      `${existingChangeLog}; ${changeEntry}` :
      changeEntry;

    // Update the product
    const result = await pool.query(`
      UPDATE products SET
        display_text = $1,
        change_log = $2
      WHERE id = $3
      RETURNING *`,
      [display_text.trim(), newChangeLog, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`Product ${id} updated: "${oldDisplayText}" → "${display_text}" by user ${user_id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error updating product", details: error.message });
  }
});

//#endregion



app.get("/executeJobAction", async (req, res) => {
  // execute the action
  //[{"antecedent": "complete", "build": [{"status": "Archive"}], "decendant": [{"status": "pending@520"}, {"target": "today_1@520"}]}]
  console.log("jn1      executing job action for job: ", req.query);
  try {
    const parentID = req.query.origin_job_id || null;
    const changeArrayJson = JSON.parse(req.query.changeArray);
    // DEBUG LOG 1: Log the entire changeArrayJson before processing
    console.log("DEBUG: changeArrayJson:", JSON.stringify(changeArrayJson, null, 2));
    console.log("ja1      executing changeArray: ", changeArrayJson);
    const jobRec = await pool.query("SELECT id, current_status, user_id, build_id FROM jobs WHERE id = $1", [parentID]);
    if (jobRec.rows.length === 0) {
      console.error("ja300     Job not found for job_id:", parentID);
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    const jobNext = await pool.query("SELECT id, current_status, user_id FROM jobs WHERE build_id = $1 AND sort_order > (SELECT sort_order FROM jobs WHERE id = $2) ORDER BY sort_order ASC LIMIT 1;", [jobRec.rows[0].build_id, parentID]);
    if (jobNext.rows.length === 0) {
      console.log("ja301     No next job found for job_id:\n", `SELECT id, current_status, user_id FROM jobs WHERE build_id = ${jobRec.rows[0].build_id} AND sort_order > (SELECT sort_order FROM jobs WHERE id = ${parentID}) ORDER BY sort_order ASC LIMIT 1;`);
    }
    const childID = jobNext.rows[0].id || null;
    const parentStatus = jobRec.rows[0].current_status;
    const userID = jobRec.rows[0].user_id;
    for (const scenario of changeArrayJson) {
      // DEBUG LOG 2: Log each scenario's antecedent and decendant
      console.log(`DEBUG: scenario antecedent: ${scenario.antecedent}, decendant:`, scenario.decendant);
      // console.log("ufg4664     antecedent(" +  scenario.antecedent + ") = job_status(" + parentStatus + ")");
      console.log("ja4001     IF job(" + parentID + ") status changes too " + scenario.antecedent + " then... ");
      if (scenario.antecedent === parentStatus) {
        //check if scenario.decendant exists 
        //[{"antecedent":"complete","decendant":[{"status":"pending@33078"},{"target":"today_1@33078"},{"insertReminder":"28_day_followup"}]}]
        if (scenario.decendant) {
          for (const action of scenario.decendant) {
            let jobID;
            let value;
            if (action.status) {
              //{"status": "pending@520"}
              jobID = action.status.split("@")[1];
              if (jobID === 'next') { jobID = childID }
              value = action.status.split("@")[0];
              const q = await pool.query("SELECT id, current_status FROM jobs WHERE id = $1", [jobID]);
              let oldStatus = q.rows[0].current_status;
              if (oldStatus !== 'complete' && oldStatus !== value) {
                console.log(`ja4107           ...set job(${jobID}) status to ${value} `, action);
                const updateStatus = await pool.query(
                  "UPDATE jobs SET current_status = $1 WHERE id = $2 ",
                  [value, jobID]
                );
              } else {
                console.log(`ja4108           ...job(${jobID}) status is already ${value}, or task is completed.`);
              }
            } else if (action.target) {
              //{"target": "today_1@next"}
              jobID = action.target.split("@")[1];
              if (jobID === 'next') { jobID = childID }
              value = action.target.split("@")[0];
              if (action.target.startsWith("today")) {
                // console.log(`ufg4666          `, today.toISOString().split('T')[0]);
                const daysToAdd = parseInt(value.split("_")[1], 10) || 0;
                console.log(`ufg4203          ${daysToAdd} days `);
                let today = new Date()       //getMelbourneTime();    //new Date();

                //today.setMinutes(today.getMinutes() + today.getTimezoneOffset());
                // console.log(new Date().toString()); // e.g., "Mon Jul 01 2024 00:30:00 GMT-1100"
                // console.log(new Date().toUTCString()); // e.g., "Mon, 30 Jun 2024 11:30:00 GMT"
                // console.log(Intl.DateTimeFormat().resolvedOptions().timeZone); // e.g., "Pacific/Honolulu"
                console.log(`ufg4204          today is `, today.toISOString().split('T')[0]);
                today.setDate(today.getDate() + daysToAdd);
                console.log(`ufg4205          target is `, today.toISOString().split('T')[0]);
                console.log(`ufg4206          days to add `, daysToAdd, " to today: ", today.getDate(), " ISO string ", today.toISOString().split('T')[0] + 1);    //today.toISOString().split('T')[0]
                value = today.toISOString().split('T')[0];     // Format as text to YYYY-MM-DD
                // console.log(`ufg4666           `, value);
                console.log(`ja4207           ...set job(${jobID}) target date to ${value} for user(${userID})`, action);
                const updateStatus = await pool.query("UPDATE jobs SET target_date = $1 WHERE id = $2 ", [value, jobID]);
                const q = await pool.query("SELECT id, user_id FROM jobs WHERE id = $1", [jobID]);
                let responsibleUser = q.rows[0].user_id ? q.rows[0].user_id : userID;
                console.log(`ja4208         defaulting pending jobID(${jobID}) user_id to ${userID} because it was `, q.rows[0].user_id ? q.rows[0].user_id : "null");
                const updateUser = await pool.query("UPDATE jobs SET user_id = $1 WHERE id = $2 ", [responsibleUser, jobID]);
              }
            } else if (action.insertReminder) {
              //{"insertReminder":"28_day_followup"}
              //{"insertReminder":"28_7_followup"}
              // DEBUG LOG 3: Log when insertReminder block is entered
              console.log("DEBUG: Entered insertReminder block for action:", action);
              console.log(`ja4301           ...insert new job from job(${parentID}) template(${action.insertReminder}) for user(${userID})`, action);
              const daysToAdd = action.insertReminder.split("_")[0];
              console.log(`ufg4303          ${daysToAdd} days `);
              let daysToMin = isNaN(Number(action.insertReminder.split("_")[1])) ? 0 : Number(action.insertReminder.split("_")[1]);
              console.log(`ufg4304          ${daysToMin} days `);
              let today = new Date()       //getMelbourneTime();    //new Date();

              console.log(`ufg4304          today is `, today.toISOString().split('T')[0]);
              let target = new Date();
              target.setDate(target.getDate() + Number(daysToAdd));
              console.log(`ufg4305          target is `, target.toISOString().split('T')[0]);
              console.log(`ufg43051          days to add `, daysToAdd, " to today: ", today.getDate(), " ISO string ", today.toISOString().split('T')[0] + 1);    //today.toISOString().split('T')[0]
              value = today.toISOString().split('T')[0];     // Format as text to YYYY-MM-DD
              const roundedDays = Math.max(Math.ceil(daysToAdd / 2), daysToMin);
              const newChangeArray = `[{ "antecedent": "complete", "decendant": [ {"insertReminder":"${roundedDays}_day_followup"} ] }]`;
              console.log(`ufg4666           wf action change_array`, newChangeArray);
              console.log(`ja4306           ...read job(${parentID}) ` + action.insertReminder + ' for job(' + parentID + ')');
              let jobOld = await pool.query("SELECT id, display_text, reminder_id, sort_order FROM jobs WHERE id = $1", [parentID]);
              let oldSortOrder = jobOld.rows[0].sort_order;
              console.log(`ja43061           ...old sort_order is ${oldSortOrder}`)
              //format of sort order is 4.09   - it needs to increment to 4.10, 4.11 etc
              let newSortOrder = '' + (Math.round((parseFloat(oldSortOrder) + 0.01) * 100) / 100).toFixed(2);
              console.log(`ja43062           ...new sort_order is ${newSortOrder}`);
              // let newFlow = await pool.query("SELECT * FROM job_process_flow where decendant_id = $1", [parentID]);
              let jobNew = await pool.query(
                `INSERT INTO jobs (
                  change_array,
                  display_text,
                  reminder_id,
                  job_template_id,
                  product_id,
                  build_id,
                  sort_order,
                  user_id,
                  current_status,
                  target_date,
                  created_date,
                  tier,
                  snoozed_until,
                  system_comments
                )
                SELECT
                  $7,
                  $6,
                  reminder_id,
                  job_template_id,
                  product_id,
                  build_id,
                  $8,
                  $1,
                  'pending',
                  $2,
                  $4,
                  tier,
                  $2,
                  $5
                FROM jobs WHERE id = $3 RETURNING *`,
                [
                  userID,
                  target,
                  parentID,
                  today,
                  `ja43071   initialise reminder created from job(${parentID})`,
                  'Reminder to follow up council when they recieve application',
                  newChangeArray,
                  newSortOrder
                ]
              );
              console.log(`ja43071           ...created new job(${jobNew.rows[0].id}) from job(${parentID}) for user(${userID}) with target date ${value}`);
              let antFlow = await pool.query("SELECT * FROM job_process_flow where decendant_id = $1", [parentID]);
              console.log(`ja4306           ...antecedant flow is ${antFlow.rows[0].id}`);
              if (antFlow.rows.length == 0) {
                console.error(`ja43062           ...no decendant row found, `);
                continue;
              } else {
                const newFlow = await pool.query("INSERT INTO job_process_flow (decendant_id, antecedent_id, tier) VALUES ($1, $2, $3) returning id", [jobNew.rows[0].id, antFlow.rows[0].antecedent_id, antFlow.rows[0].tier]);
                console.log(`ja43061        ...added newFlow(${newFlow.rows[0].id})`)
              }
              console.log(`ja43072           ...repoint decFlow to newJob`);
              console.log(`ja43073           ...repointed antFlow to newJob`);

            } else if (action.disarmReminder) {
              //{"disarmReminder":"complete@5409"}
              console.log(`ja43074           ...disarming reminder for job(${parentID})`);
              //{"status": "pending@520"}
              let job_template_ID = action.disarmReminder.split("@")[1];
              value = action.disarmReminder.split("@")[0];
              let buildID = jobRec.rows[0].build_id;
              const q = await pool.query("SELECT id, current_status FROM jobs WHERE job_template_id = $1 and current_status != $2 and build_id = $3", [job_template_ID, value, buildID]);
              for (const row of q.rows) {
                console.log(`ja43075           ...set job(${row.id}) status to ${value} `, action);
                const updateStatus = await pool.query(
                  "UPDATE jobs SET current_status = $1 WHERE id = $2 ",
                  [value, row.id]
                );
              }

            } else if (action.log_trigger) {
              console.log(`ja4007           ...add to change_log for job(${parentID}) `, action.log_trigger);
              const logTrigger = await pool.query(
                "UPDATE jobs SET change_log = change_log || $1 || E'\n' WHERE id = $2",
                [`${new Date().toISOString()} - ${req.user.email} - ${action.log_trigger}`, jobID]
              );
            } else {
              console.log("ja4008           ...I dont know what to do with ", action);

            }
          }
        }

        if (scenario.customer) {
          for (const action of scenario.customer) {
            if (action.setCategory) {
              //[{"antecedent": "complete","customer": [{"setCategory": "Archive"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]
              const customer = await pool.query("SELECT c.id FROM customers c WHERE id = (select b.customer_id from builds b where id = (select j.build_id from jobs j where id = $1))", [parentID]);
              let customerID = customer.rows[0].id;
              let value = action.setCategory;
              if (value == "!workflowName") {
                const workflowName = await pool.query("SELECT display_text FROM products WHERE id = (SELECT product_id FROM jobs WHERE id = $1)", [parentID]);
                value = workflowName.rows[0].display_text;
              }
              console.log(`ja5005           ...set cust(${customerID}) for job(${parentID}) to ${value} `, action);
              const q = await pool.query("SELECT id, current_status FROM customers WHERE id = $1", [customerID]);
              let oldStatus = q.rows[0].current_status;
              if (value == "Archive") {
                const q4 = await pool.query("UPDATE builds set current_status = 'complete' WHERE id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
                const q5 = await pool.query("UPDATE jobs SET current_status = 'complete' WHERE build_id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
              }
              if (oldStatus !== value) {
                const updateStatus = await pool.query("UPDATE customers SET current_status = $1 WHERE id = $2 ", [value, customerID]);
              } else {
                console.log(`ja5007           ...cust(${customerID}) status is already ${value}`);
              }
            } else {
              console.log("ja5008           ...I dont know what to do with ", action);
            }
          }
        }

        if (scenario.product) {
          //[{"antecedent": "complete","product": [{"addWorkflow": "5"}]}]
          for (const action of scenario.product) {
            if (action.addWorkflow) {
              const customer = await pool.query("SELECT c.id, c.full_name, c.home_address FROM customers c WHERE id = (select b.customer_id from builds b where id = (select j.build_id from jobs j where id = $1))", [parentID]);
              let customerID = customer.rows[0].id;

              const q4 = await pool.query("UPDATE builds set current_status = 'complete' WHERE id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
              const q5 = await pool.query("UPDATE jobs SET current_status = 'complete' WHERE build_id = (select j.build_id from jobs j where j.id = $1)", [parentID]);

              let productID = action.addWorkflow;
              console.log("ja6002      adding a new build for ", customer.rows[0].full_name, " with ID: ", customerID);
              const build = await pool.query("INSERT INTO builds (customer_id, product_id, site_address) VALUES ($1, $2, $3) RETURNING *", [customerID, productID, customer.rows[0].home_address]);
              const newBuild = build.rows[0];
              const buildID = newBuild.id;

              //start workflow
              console.log("ja6003        adding job for the build(" + buildID + ")");
              const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);     //&product_id=${req.body.product_id}`);
              const q = await pool.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID])

              console.log("ja6004       job added to build: ", response.data.id, " for buildID: ", buildID);
              console.log("ja6005       updating the build(" + buildID + ") with user_id: ", userID);
              const q2 = await pool.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [userID, buildID])

              const q3 = await pool.query("UPDATE customers SET current_status = (select p.display_text from products p where p.id = $1) WHERE id = $2 RETURNING 1", [productID, customerID])

              console.log(`ja5005           ...incomplete code `, action);
            } else {
              console.log("ja5008           ...I dont know what to do with ", action);
            }
          }
        }

      }
    }
    console.log("ja9    job action executed for jobID: ", parentID);
    return res.status(200).json({ success: true, message: 'Job action executed successfully' });
  } catch (error) {
    console.error('ja8    Error executing job action:', error);
    // return res.status(500).json({ error: 'Failed to execute job action' });

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: undefined
    });
  }
});




app.listen(port, () => {
  console.log(`rd9     STARTED running on port ${port}`);
});




