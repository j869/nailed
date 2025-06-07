//#region imports
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import { main }  from './trigger2.js';
import moment from 'moment';
import e from "express";



const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";
let baseURL = "";
const saltRounds = 10;
env.config();

app.use(express.json());    //// Middleware to parse JSON bodies
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false,  // Use secure: true in production with HTTPS
      httpOnly: true
    }
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();
//#endregion



// Middleware to make session user available on req.user for convenience
app.use((req, res, next) => {
  if (req.session.user) {
    console.log("i1   ");
    req.user = req.session.user;
  }
  next();
});

app.post("/", async (req, res) => {
  const { title, person, date } = req.body;
  console.log("wb1    user("+ person +") added new task '" + title + "' to their day_task list");
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
    "task_status": "pending"
  }
  
  const q2 = await db.query("INSERT INTO worksheets (title, description, user_id, date) VALUES ($1, $2, $3, $4) RETURNING id", [title, null, person, date]);
  // console.log("wb7    ", q2.data);

  res.redirect("/") ;

})

app.get("/", async (req, res) => {

  if (req.user) {
    console.log("ws1     user(" + req.user.id + ") navigated to HOME page ");
    const iViewDay = parseInt(req.query.view) || 0;
    console.log("ws22     view: ", req.query.view);
    let q1SQL = "";
    let q1Params = [req.user.id];
    if (iViewDay == 0) {
      q1SQL = "SELECT * FROM worksheets WHERE user_id = $1 AND date <= NOW()::date ORDER BY id";
    } else {
      q1SQL = "SELECT * FROM worksheets WHERE user_id = $1 AND date = (NOW()::date + $2 * INTERVAL '1 day') ORDER BY id"
      q1Params.push(iViewDay);
    } 
    const q1 = await db.query(q1SQL, q1Params);    
    console.log("ws25     tasks to do today: ", q1.rowCount);

    // Parse the JSON data and extract task_id, build_id, and job_id for each object
    const parsedData = [];
    for (const row of q1.rows) {
      const description = JSON.parse(row.description || null); // Parse as null if row.description is empty or not valid

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

    // Pass the parsed data to the template
    res.render("home.ejs", { baseURL: process.env.BASE_URL, view: iViewDay, user_id: req.user.id, data: parsedData });

  } else {
    console.log("ws1     navigated to HOME page ");
    res.render("home.ejs");

  }

});



app.get("/daytaskUpdate", (req, res) => {
  console.log("dup1    ");
  main();

  res.redirect("/") ;
})
    //main();     // trigger worksheet update from trigger2.js


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
      res.render("smtp.ejs", { user: req.user, data: smtpResult.rows[0], decrypted_password : decrypted_password });
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
  

app.get("/checkemail", async (req, res) => {
  if (req.isAuthenticated()) {
    //<a href= "/checkemail?btn=103d&customer_id=<%= customer.id %>&returnto=customer/<%= customer.id %>" class="btn btn-primary">check for new emails</a>
    console.log("ce1    USER("+ req.user.id +") clicked on Check Email button(" + req.query.btn + ") for customer("+ req.query.customer_id +") ");
    const customerID = req.query.customer_id || 0;

    //connect to email server and check for new emails
    // pass userID and custID to the email server to check for new emails
    const emailResult = await axios.get(`${API_URL}/email/${customerID}/${req.user.id}`);
    //const emailResult = await axios.get(`${API_URL}/email/${customerID}`);  
    console.log("ce2    ", emailResult.data);
    if (emailResult.data.success) {
      console.log("ce9    ", emailResult.data.message);
    } else {
      console.log("ce4    No new emails (or) problem reading emails for customer("+ customerID +") ");
    }
    
    //redirect to customer page
    console.log("ce5    redirecting to customer page ", req.query.returnto);
    if (req.query.returnto.search("build") > -1) {
      // res.redirect("/builds/", req.query.returnto);
      // res.redirect("2/build/" + emailResult.data.build_id);
      console.log("ce6    redirecting to build page ", req.query.returnto);
      res.redirect(""+ req.query.returnto);
    } else {
      // res.redirect("/2/build/264"); 
      console.log("ce6    redirecting to customer page ", req.query.returnto);
      res.redirect(""+ req.query.returnto);
    }
    // res.redirect("/customer/" + customerID); ;
  }
});





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
        j.completed_by_person
      FROM jobs j 
      INNER JOIN job_process_flow f ON j.id = f.decendant_id 
      WHERE f.antecedent_id = $1 AND f.tier = $2
      ORDER BY sort_order
    `, [jobID, '' + (parentTier + 1)]);

    console.log("bb21" + logString + " job("+jobID+") checking job_process_flow on tier("+(parentTier+1)+") child relationships. Found: ", jobsResult.rows.length);
    
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




async function getBuildData(buildID) {
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

    if (buildResult.rows.length === 0) {
      throw new Error(`Build ${buildID} not found`);
    }

    const buildData = buildResult.rows[0];
    const customerID = buildData.customer_id;

    // 2. Get customer information
    const customerResult = await db.query(`
      SELECT 
        id, full_name, home_address, primary_phone, primary_email, 
        contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up 
      FROM customers 
      WHERE id = $1
    `, [customerID]);

    // 3. Get missing jobs
    const missingJobsResult = await db.query(`
      SELECT id, display_text 
      FROM job_templates 
      WHERE product_id = $1 AND id NOT IN (
        SELECT job_template_id FROM jobs WHERE build_id = $2
      )
    `, [buildData.product_id, buildID]);

    // 4. Get emails
    const emailsResult = await db.query(`
      SELECT 
        id, display_name, person_id, message_text, 
        has_attachment, visibility, job_id, post_date 
      FROM conversations 
      WHERE person_id = $1
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
        tasks: tasks
      });
    }

    // 7. Build the final structure
    const allCustomers = customerResult.rows.map(customer => ({
      id: customer.id,
      full_name: customer.full_name,
      home_address: customer.home_address,
      primary_phone: customer.primary_phone,
      primary_email: customer.primary_email,
      contact_other: customer.contact_other,
      current_status: customer.current_status,
      follow_up: customer.follow_up,
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
    console.error('Error fetching build data:', error);
    throw error;
  }
}




app.get("/2/build/:id", async (req, res) => {
// Initialize an empty array to hold all customers
let allCustomers = [];

  if (req.isAuthenticated()) {
    console.log("b1      navigate to WORKFLOW_LISTVIEW by user("+ req.user.id +") ")
    const buildID = req.params.id || "";
      try {
  
          if (buildID) {
            console.log("b2       retrieving all jobs for build("+buildID+")");

         

            const allCustomers = await getBuildData(buildID);
            console.log("b29       jobs for build("+buildID+")", JSON.stringify(allCustomers, null, 2));
            // return allCustomers;
            // printJobHierarchy(tableData);
            console.log("b30   ");
            res.render("2/customer.ejs", { user : req.user, tableData : allCustomers, baseUrl : process.env.BASE_URL });
            
          } else {
            console.log("b3   ");
            // If there's no search term, fetch all customers and their builds
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up FROM customers");
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
          res.status(500).send("Internal Server Error");
      }
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

              let allCustomers;
              if (query) {
                console.log("d2      User serched for a term: ", query);
                // If there is a search term, fetch matching customers and their builds
                const customersQuery = `
                    SELECT 
                        c.id, 
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
                        ) AND (
                            EXISTS (
                              SELECT 1 
                              FROM jobs j 
                              WHERE j.build_id = b.id 
                              AND j.user_id = $2
                            )     OR EXISTS (
                              SELECT 1
                              FROM users u
                              WHERE u.id = $2
                              AND u.roles = 'sysadmin'
                            )
                        )
                    ORDER BY 
                        c.follow_up ASC;
                `;
        
                const customersResult = await db.query(customersQuery, [`%${query}%`, req.user.id]);
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
                            customer.builds.push({
                                id: row.build_id,
                                product_id: row.product_id,
                                enquiry_date: row.enquiry_date,
                                job_id: row.job_id,
                                current_status: row.build_status
                            });
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

            // Execute query to get customers and builds for the given user_id
            const customersResult = await db.query(`
                SELECT 
                    c.id, 
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
                WHERE 
                    EXISTS (
                      SELECT 1 
                      FROM jobs j 
                      WHERE j.build_id = b.id 
                      AND j.user_id = $1
                    )     OR EXISTS (
                      SELECT 1
                      FROM users u
                      WHERE u.id = $1
                      AND u.roles = 'sysadmin'
                    )
                ORDER BY 
                    c.contact_other ASC;
            `, [req.user.id]);
        
        
            // Format follow_up value and structure the data
            allCustomers = customersResult.rows.reduce((acc, row) => {
                
        
                // Find or create a customer entry in the accumulator
                let customer = acc.find(cust => cust.customer.id === row.id);
                if (!customer) {
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
      // Perform the search operation based on the query
      // For example, you might want to search for customers with names matching the query
      const result = await db.query("SELECT * FROM customers WHERE full_name LIKE $1 OR primary_phone LIKE $1 OR home_address LIKE $1", [`%${query}%`]);
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
      allCustomers = {open : openCustomers, closed : closedCustomers};
      console.log("cc5   ", allCustomers);

      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("2/customers.ejs", {
        user : req.user, 
        data : openCustomers
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
      const result = await db.query("SELECT * FROM customers WHERE id = $1", [custID]);
      let customer = result.rows;
      if (customer.length !== 1) {
        if (customer.length === 0) {       
          //add new customer
          console.log("c2      new customer being added: ", custID);
          res.render("customer.ejs", { user : req.user });
          return;
        }
        console.error("c28     Error: Expected 1 row, but received " + customer.length + " rows.");      
      }

      const qryBuilds = await db.query("SELECT products.display_text, builds.id, builds.customer_id, builds.product_id, builds.enquiry_date FROM builds INNER JOIN products ON builds.product_id = products.id WHERE customer_id = $1", [custID]);
      let builds = qryBuilds.rows;

      const qryProducts = await db.query("SELECT id, display_text FROM products ");
      let products = qryProducts.rows;

      //read emails for the customer
      const qryEmails = await db.query("SELECT id, display_name, person_id, message_text, has_attachment, visibility, job_id, post_date FROM conversations WHERE person_id = $1", [custID]);
      let emails = qryEmails.rows;


      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("customer.ejs", {
        data : customer[0],
        builds : builds,
        products : products,
        emails : emails
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
      // Perform the search operation based on the query
      // For example, you might want to search for customers with names matching the query

      const statusList = await db.query("SELECT DISTINCT current_status FROM customers");
      const result = await db.query("SELECT * FROM customers WHERE full_name LIKE $1 OR primary_phone LIKE $1 OR home_address LIKE $1", [`%${query}%`]);

      const customersByStatus = statusList.rows.reduce((acc, status) => {
        acc[status.current_status] = result.rows.filter(customer => customer.current_status === status.current_status);
        return acc;
      }, {});

      console.log("a2       Grouped Customers by Status:", result.rowCount);
      res.render("listCustomers.ejs", {
        user : req.user,
        data : customersByStatus
      });
      return;

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
        console.log("a5   ", status, i);
        if (status === "closed") {
          closedCustomers.push(result.rows[i]);
        } else {
          openCustomers.push(result.rows[i]);
        }
      }
      allCustomers = {open : openCustomers, closed : closedCustomers};
      
      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("listCustomers.ejs", {
        user : req.user,
        data : allCustomers
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

app.post("/addCustomer", async (req, res) => {
  console.log("n1      USER is adding a new customer ");
  if (req.isAuthenticated()) {
    try {
    const currentTime = new Date(); // Get the current time
    currentTime.setDate(currentTime.getDate() + 21); // Add 21 days
    
    //check if the customer name already exists
    if (req.body.fullName) {
      const existingCustomer = await db.query("SELECT * FROM customers WHERE full_name = $1", [req.body.fullName]);
      if (existingCustomer.rows.length > 0) {
        console.log("n81         Customer already exists: ", req.body.fullName);
        res.redirect("/customer/" + existingCustomer.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if email already exists
    if (req.body.primaryEmail) {
      const existingEmail = await db.query("SELECT * FROM customers WHERE primary_email = $1", [req.body.primaryEmail]);
      if (existingEmail.rows.length > 0) {
        console.log("n82         Email already exists: ", req.body.primaryEmail);
        res.redirect("/customer/"+existingEmail.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if phone number already exists
    if (req.body.primaryPhone) {
      const existingPhone = await db.query("SELECT * FROM customers WHERE primary_phone = $1", [req.body.primaryPhone]);
      if (existingPhone.rows.length > 0) {
        console.log("n83         Phone number already exists: ", req.body.primaryPhone);
        res.redirect("/customer/"+existingPhone.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if address already exists
    if (req.body.homeAddress) {
      const existingAddress = await db.query("SELECT * FROM customers WHERE home_address = $1", [req.body.homeAddress]);
      if (existingAddress.rows.length > 0) {
        console.log("n84         Address already exists: ", req.body.homeAddress);
        res.redirect("/customer/"+existingAddress.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if other contact already exists
    if (req.body.contactOther) {
      const existingContact = await db.query("SELECT * FROM customers WHERE contact_other = $1", [req.body.contactOther]);
      if (existingContact.rows.length > 0) {
        console.log("n85         Other contact already exists: ", req.body.contactOther);
        res.redirect("/customer/"+existingContact.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    // Insert the new customer into the database
    const result = await db.query(
      "INSERT INTO customers (full_name, home_address, primary_phone, primary_email, contact_other, current_status, follow_up) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.body.fullName, req.body.homeAddress, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, "new", currentTime]
    );
    const newCustomer = result.rows[0];

    //add workflow to new customer so that the current user can find them in their list of customers
    console.log("n2      new customer added: ", newCustomer.id);
    const q1 = await db.query(
      "INSERT INTO jobs (display_text, user_id) VALUES ($1, $2) RETURNING id",
      ['new Customer', req.user.id]
    );
    console.log("n4      new job added: ", q1.rows[0].id);
    // const q4 = await db.query(
    //   "INSERT INTO job_process_flow (antecedent_id, decendant_id, tier) VALUES ($1, $2, $3) RETURNING id",
    //   [q1.rows[0].id, q1.rows[0].id, 500]
    // );
    // console.log("n45     new job process flow added: ", q4.rows[0].id);
    const q3 = await db.query(
      "INSERT INTO builds (customer_id, product_id, job_id, current_status, enquiry_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [newCustomer.id, 3, q1.rows[0].id, "new", currentTime]
    );
    console.log("n3      new build added: ", q3.rows[0].id);
    //add build_id to the job
    const q5 = await db.query("UPDATE jobs SET build_id = $1 WHERE id = $2", [q3.rows[0].id, q1.rows[0].id]);
    // const newJob = result.rows[0];
    // const q2 = await db.query(
    //   "INSERT INTO tasks (display_text, job_id, owned_by) VALUES ($1, $2, $3) RETURNING iD",
    //   ['Assign new customer to a sales person', newJob.id, req.user.id]
    // );
    // console.log("n5      new task added: ", q2.rows[0].id);
            
            
  } catch (err) {
    console.log(err);  
  }  
  res.redirect("/customers");
}
});

app.post("/updateCustomer/:id", async (req, res) => {
  if (req.isAuthenticated()) {
    const action = req.body.action;     // did the user click delete, update, view, or
    const userID = parseInt(req.params.id);
    switch (action) {
      case "update":
            // a known fault is that this will not set non alphabetical characters {} " ' etc - you need to excape them for security reasons too
            const updateSQL = "UPDATE customers SET     " +
            "full_name='" + req.body.fullName + "', " +
            "home_address='" + req.body.homeAddress + "', " +
            "primary_phone='" + req.body.primaryPhone + "', " +
            "primary_email='" + req.body.primaryEmail + "', " +
            "contact_other='" + req.body.contactOther + "', " + 
            "current_status='" + req.body.currentStatus + "' " +
            "WHERE id=" + userID + " RETURNING *"    
            try {
              //  "UPDATE customers SET full_name='$1', primary_phone='$2', primary_email='$3', contact_other='$4', current_status='$5', contact_history='$6') WHERE id=$7 RETURNING *",
              //  [req.body.fullName, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, null, req.body.contactHistory, 5]
              const result = await db.query(updateSQL);
              const updatedCustomer = result.rows[0];
            } catch (err) {
              console.error(err);
              //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
            }



            res.redirect("/customer/" + userID);
            break;
      case "delete":
            try {
              const result = await db.query("DELETE FROM customers WHERE id=" + userID + " RETURNING 1" );
              const result2 = await db.query("DELETE FROM builds WHERE customer_id =" + userID + " RETURNING 1" );
            } catch (err) {
              console.error(err);
              //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
            }
            res.redirect("/customers");
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







app.post("/buildComplete", async (req, res) => {
try {
    console.log("tc1   ", req.body);
    const buildID = req.body.buildId;
    const status = req.body.status;    //string 'true' or 'false'

    // Fetch the current status of the build from the database
    const result = await db.query("SELECT current_status FROM builds WHERE id = $1", [buildID]);
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
        newStatus = 'pending';
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






//#region builds

app.post("/addBuild", async (req, res) => {
  console.log("e1       action: add");
  console.log("e2        AddingBuild for customer_" + req.body.customer_id)
  let productID = req.body.product_id;
  
  if (req.isAuthenticated()) {
    try {
      const result = await db.query(
        "INSERT INTO builds (customer_id, product_id, enquiry_date) VALUES ($1, $2, $3::timestamp) RETURNING *",
        [req.body.customer_id, req.body.product_id, req.body.enquiry_date]
      );
      const newBuild = result.rows[0];    

      //start workflow
      console.log("e3        adding the original job for the build(" + result.rows[0].id + ")");
      const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${newBuild.id}`);     //&product_id=${req.body.product_id}`);
      const q = await db.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, result.rows[0].id ])

      res.redirect("/jobs/" + response.data.id);
          
    } catch (err) {
      console.log(err);  
    }  
    //res.redirect("/customer/" + req.body.customer_id);
  }
});

app.post("/updateBuild/:id", async (req, res) => {
  const buildID = parseInt(req.params.id);
  console.log("f1      navigate to EDIT(JOB) page for build/:"+ buildID);
  const action = req.body.action;     // did the user click delete, update, view, or
  console.log("f2       action: ", action);
  if (req.isAuthenticated()) {
    
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
        
        console.log("f3        updated build_"+buildID );
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "delete":
        try {
          const result = await db.query("DELETE FROM builds WHERE id=" + buildID + " RETURNING 1" );
        } catch (err) {
          console.error(err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        console.log("f3        deleted build_"+buildID);
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "view":
        const result = await db.query("SELECT job_id FROM builds WHERE id=" + buildID  );
        // console.log("f7    updateBuild/   case:view    job_id="+result.rows[0]);
        res.redirect("/jobs/" + result.rows[0].job_id);
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




//test



//#region jobs
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
    console.log("g9      navigate to JOB_EDIT page for /jobs/:"+ req.params.id + " - '" + response.data.job.display_text + "'");
    res.render("editTask.ejs", {
    //res.render("jobs.ejs", {
      siteContent : response.data, baseURL : baseURL
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
      console.log("i1      USER("+ req.user.id +") clicked btn(" + req.query.btn + ") to delete job("+req.query.jobnum+")");
    } else {
      console.log("i1      user("+ req.user.id +") is deleting job("+req.query.jobnum+")");
    }   
    const response = await axios.get(`${API_URL}/deleteJob?job_id=${req.query.jobnum}`);
    console.log("i9       USER("+ req.user.id +") deleted job("+req.query.jobnum+") with response: "+ response.data.status);
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
      console.log("j1      USER("+ req.user.id +") clicked btn(" + req.query.btn + ") to add a new job");
    } else {
      console.log("j1      user("+ req.user.id +") is adding a new job on tier ", req.query);
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
      const build_id = req.query.returnto.replace('build',''); // Extract the build ID from the returnto URL
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
    console.log("m9      navigate to JOB_EDIT page for /tasks/:"+ req.params.id + " - '" + response.data.job.display_text + "'");
    res.render("editTask.ejs", {
    //res.render("jobs.ejs", {
      siteContent : response.data, baseURL : baseURL
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
  console.log("dlt1    ", req.query )
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


//#region user metadata

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




//#region authentication

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
              console.log("pp9    user(" + result.rows[0].id + ") authenticated on [MAC] at [SYSTIME]"  )
              return cb(null, user);
            } else {
              console.log("pp81     user(" + username + ") wrong password on [MAC] at [SYSTIME]"  )
              return cb(null, false);
            }
          }
        });
      } else {
        console.log("pp82     user(" + username + ") not registered on [MAC] at [SYSTIME]"  )
        return cb("Sorry, we do not recognise you as an active user of our system.");
        // known issue: page should redirect to the register screen.  To reproduce this error enter an unknown username into the login screen
      }
    } catch (err) {
      console.error(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`re9     STARTED running on port ${port}`);
});

//#endregion



 
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
          const q4 = await db.query(`DELETE FROM worksheets WHERE description LIKE '%' || '"task_id":' || $1 || ',' || '%'`,[taskID]);
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




app.post("/jobComplete", async (req, res) => {
  console.log("jb1      USER is updating status", req.body);
  try {
    const jobID = req.body.jobId;
    const status = req.body.status;    //string 'true' or 'false'

    // Fetch the current status of the job from the database
    const result = await db.query("SELECT current_status FROM jobs WHERE id = $1", [jobID]);
    const currentStatus = result.rows[0].current_status;

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
        newStatus = 'pending';
    }
    newCompleteBy = req.user.id || 1;


    // Update the jobs table in your database
    // console.log("jb2   ", newStatus, jobID);
    const updateResult = await db.query("UPDATE jobs SET current_status = $1, completed_date = $3, completed_by = $4  WHERE id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
        // update the status of all child tasks 
        // console.log("jb71      ", jobID, newStatus);  
    //  const result = await db.query(`UPDATE tasks SET current_status = $2 WHERE job_id = $1`, [jobID, newStatus]);
        const result = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE job_id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);
        // console.log("jb72      ", result.rowCount);  
        res.status(200).json({ message: `job ${jobID} status updated to ${newStatus}` });
        console.log(`tb9   job ${jobID} status updated to ${newStatus}`);

    } else {
        console.log(`tb8     job ${jobID} not found or status not updated`);
        res.status(404).json({ error: `job ${jobID} not found or status not updated` });
    }
  } catch (error) {
    console.error("jb84     Error updating job status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/dtDone", async (req, res) => {
  console.log("dtd1   ", req.query); // Log the incoming request body
  const { id, done } = req.query; // Destructure id and done from request body

  try {
    const q1 = await db.query("SELECT * from worksheets WHERE Id = " + id + ";");
    console.log("dtd2    ", q1.rows);

    if (q1.rows.description == null) {
      const q2 = await db.query("DELETE FROM worksheets WHERE Id = " + id + ";");
      console.log("dtd3    deleted: ", q2.rowCount)
    } else {
      console.log("dtd4    ");
      // const fieldID = 'current_status';
      // const newValue = 'complete';
      // const recordID = id;

      // const response = await fetch('/taskComplete', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ taskId: 1, status: 'true' })
      // });
      
      res.redirect("/") ;
    }

    res.status(200).json({ message: "Checkbox status updated" }); // Return a response
  } catch (error) {
    console.error("Error updating checkbox:", error);
    
    // Send an error response
    res.status(500).json({ error: "Failed to update checkbox" }); // Return error status
  }
});


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


app.get("/update", async (req,res) => {
  if (req.isAuthenticated()) {
    const fieldID = req.query.fieldID;
    const newValue = (req.query.newValue || '');   
    const rowID = req.query.whereID;
    console.log("ufg1    user("+req.user.id+") changed "	+ fieldID + " to " + newValue + " for rowID " + rowID);
    // console.log("ufg2    inline value edit ", fieldID, newValue, rowID);

    if (!fieldID) {
      console.error("ufg831    Error: fieldID is null - write was cancelled");
      res.status(400).send("Error: fieldID is null");
      return;
    }
    if (!newValue) {
      console.log("ufg832    Error: newValue is null - write was cancelled");
      // console.log("ufg3    inline value edit ", fieldID, newValue, rowID);
      //res.status(400).send("Error: newValue is null");
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
    let q ;
    // console.log("ufg41")

    switch (fieldID) {
      case "customerFollowUpDate":
        // console.log("ufg41     [" + newValue + "] ")
        table = "customers"
        columnName = "follow_up"
        value = newValue;
        console.log("ufg410     update "+ table + " set "+ columnName + " = " + value);
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        }
        else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;
      case "jobTargetDate":
        // console.log("ufg411     [" + newValue + "] ")
        table = "jobs"
        columnName = "target_date"
        value = newValue;
        console.log("ufg411     update "+ table + " set "+ columnName + " = " + value);
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
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
        console.log("ufg412     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg413     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg414     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg415     update "+ table + " set "+ columnName + " = " + value);
        try {
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

          q = await db.query("SELECT id from job_process_flow where decendant_id = $1", [rowID]);
          for (const row of q.rows) {
            // console.log("ufg431     update job_process_flow " + row.id);
            table = "job_process_flow"
            columnName = "tier"   
            value = newValue;       
            console.log("ufg416     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg417     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg418     update "+ table + " set "+ columnName + " = " + value);
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        }
        else {
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
            console.log("ufg419     update "+ table + " set "+ columnName + " = " + value);          
            const q1 = await db.query("UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");      
            console.log("ufg420     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg421     update "+ table + " set "+ columnName + " = " + value);          
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
        value = encodeURIComponent(newValue);
        console.log("ufg422     update "+ table + " set "+ columnName + " = " + value);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        }
        else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;
      case "taskStatus":
        // console.log("ufg44    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
        table = "tasks";
        columnName = "current_status"
        value = newValue;
        console.log("ufg423     update "+ table + " set "+ columnName + " = " + value);          
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
        value = encodeURIComponent(newValue);
        console.log("ufg424     update "+ table + " set "+ columnName + " = " + value);          
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
          console.log("ufg425     update "+ table + " set "+ columnName + " = " + value);          
          q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
          if (q.status === 422) {
            table = "jobs";
            console.log("ufg426     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg427     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg428     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg429     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg430     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg431     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg432     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg433     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg434     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg435     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg436     update "+ table + " set "+ columnName + " = " + value);          
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
        value =  encodeURIComponent(newValue) ;
        // console.log(`ufg77   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        console.log("ufg437     update "+ table + " set "+ columnName + " = " + value);          
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
              console.log("ufg438     update "+ table + " set "+ columnName + " = " + value);          
              let q1 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
              
              // Execute q2 to retrieve the task_id
              let q2 = await db.query("SELECT description FROM worksheets WHERE id = $1", [rowID]);
              let task_id = 0;
              if (q2.rows.length > 0) {
                  const description = q2.rows[0].description;
                  const parsedDescription = JSON.parse(description);
                  task_id = parsedDescription.task_id;
                  console.log("ufg439     Task ID:", task_id);
              }
              
              table = "tasks";
              columnName = "owned_by";
              value = "" + newValue + "";
              // console.log(`ufg79   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);
              console.log("ufg440     update "+ table + " set "+ columnName + " = " + value);          
              let q3 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);
              
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
        value =  newValue ;
        console.log("ufg441     update "+ table + " set "+ columnName + " = " + value);        
        try {  
          const a1 = await db.query("UPDATE worksheets SET date = $1 WHERE id = $2;", [value, rowID]);      
          // console.log('ufg00077');
          const a2 = await db.query("SELECT description FROM worksheets WHERE id = $1;", [rowID]);      
        } catch (error) {
            console.error("ufg442  Error updating date:", error);
            res.status(500).send("Error updating date");
        }
        if (a2.rows.length > 0 && a2.rows[0].description !== null) {
          try {
                const descriptionJson = JSON.parse(a2.rows[0].description);
                const taskId = descriptionJson.task_id;
                console.log("ufg442   update tasks set target_date = " + value);
                const a3 = await db.query("UPDATE tasks SET target_date = $1 WHERE id = $2;", [value, taskId]);      
                // console.log('ufg443');
            } catch (error) {
                console.error("ufg443  Error parsing JSON:", error);
                
            }
        } else {
            console.log("ufg444     Description is null or no record found, breaking out.");
        }      
                  
        res.status(200).send("Update successful");
        break;
      case "daytaskArchive":
        table = "worksheets";
        columnName = "archive"
        value = (newValue == 1) ? true : false;
        console.log("ufg445     update "+ table + " set "+ columnName + " = " + value);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;      
      case "jobOrder":
        // console.log("ufg44    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
        table = "jobs";
        columnName = "sort_order"
        value = newValue;
        console.log("ufg446     update "+ table + " set "+ columnName + " = " + value);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;
      case "jobPerson":
        // console.log("ufg44    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
        table = "jobs";
        columnName = "user_id"
        value = newValue;
        console.log("ufg447     update "+ table + " set "+ columnName + " = " + value);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;
      case "jobStatus":
        console.log("ufg44    user("+req.user.id+") changed task status to " + newValue + " for rowID: " + rowID )
        table = "jobs";
        columnName = "current_status"
        value = newValue;
        // update the job status, completed_date, and register te user who completed the job
        //#region update job status
        console.log("ufg448     update "+ table + " set "+ columnName + " = " + value + " for rowID: " + rowID);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (newValue === 'complete') {
          const dateObj = new Date();
          value = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          // value = "TO_DATE('"+formattedDate+"', 'YYYY-MM-DD')"
        } else {
          value = '';
        }
        columnName = "completed_date";
        console.log("ufg449     update "+ table + " set "+ columnName + " = " + value );          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        columnName = "user_id";
        value = req.user.id;        
        console.log("ufg450     update "+ table + " set "+ columnName + " = " + value );          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        
        //#endregion
        //#region --- VALIDATIONS ---
        console.log("ufg4610     check validations for job status change");
        //#endregion
        //#region --- MODIFICATIONS ---
        console.log("ufg4660     check job record for actions triggered because this job changed");
        const q6 = await db.query("SELECT change_array from jobs where id = $1", [rowID]);
        if (q6.rows.length > 0) {
          console.log("ufg4661     job record found for job_id: " + rowID);
          const changeArray = q6.rows[0].change_array;
          if (changeArray) {
            try {
              const changeArrayJson = JSON.parse(changeArray);
              console.log("ufg4664     change_array for job_id: " + rowID + " - ", changeArrayJson);
              if (changeArrayJson.on_me_status === "completed" && newValue === "complete") {
                for (const action of changeArrayJson.actions) {
                  if (action.set_job_status) {
                    value = action.set_job_status ? '' : null;
                    console.log(`ufg4665     Setting status of job(${action.for_job_id}) to ${value} `);
                    const updateStatus = await db.query(
                      "UPDATE jobs SET current_status = $1 WHERE id = $2",
                      [value, action.for_job_id]
                    );
                  }
                  if (action.log_trigger) {
                    console.log(`ufg4667     Logging trigger for job(${rowID}): ${action.log_trigger}`);
                    //append to jobs.change_log column as an array. include a date and user
                    const logTrigger = await db.query(
                      "UPDATE jobs SET change_log = change_log || $1 || E'\n' WHERE id = $2",
                      [`${new Date().toISOString()} - ${req.user.email} - ${action.log_trigger}`, rowID]
                    );
                  }
                }
              }
            } catch (error) {
              console.error("ufg4668     Error processing job actions:", error);
              res.status(500).send("Update failed: " + error.message);
            }
          } else {
            console.log("ufg4668     No change_array found for job_id: " + rowID);
          }
        } else {
          console.log("ufg4669     No job record found for job_id: " + rowID);
        }
        


        console.log("ufg4570      check job_process_flow for actions triggered because workflow focus has progressed through the process");
        const q7 = await db.query("SELECT * from job_process_flow where antecedent_id = $1", [rowID]);
        if (q7.rows.length > 0) {
          console.log("ufg457     job_process_flow found for job_id: " + rowID);
          for (const row of q7.rows) {
            console.log("ufg458     job_process_flow row: ", row);
            const flowID = row.id;
            const flowAntecedentID = row.antecedent_id;
            const flowDecendantID = row.decendant_id;
            let flowAction = row.change_array  || `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;
            const flowTier = row.tier;

            // Perform actions based on the flowAction
            try {
              // flowAction ? flowAction : `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;
              console.log("ufg4591     Processing job_process_flow ", flowAction);
              const flowActionJson = JSON.parse(flowAction.trim());
              console.log("ufg4592     flowActionJson for job_id: " + rowID + " - ", JSON.stringify(flowActionJson, null, 2));
              for (const flowRule of flowActionJson) {
                console.log("ufg4593     Checking flowRule: ", flowRule);
                if ((flowRule.antecedent === "completed" && newValue === "complete") || (flowRule.antecedent === "pending" && newValue === "pending")) {
                  for (const action of flowRule.decendant) {
                    if (action.status !== undefined) {
                      const statusValue = action.status === "" ? null : action.status;
                      console.log(`ufg4593     Setting status of job(${flowDecendantID}) to ${statusValue} `);
                      const jobId = flowDecendantID;
                      const updateStatus = await db.query("UPDATE jobs SET current_status = $1 WHERE id = $2",[statusValue, flowDecendantID]);
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
                      const updateTarget = await db.query("UPDATE jobs SET target_date = $1 WHERE id = $2",[targetDate, flowDecendantID]);
                    }
                  }
                }
              }
              

         
            } catch (error) {
              console.error("ufg461     Error processing job_process_flow actions:", error);
              res.status(500).send("Update failed: " + error.message);   
            }

          }
        } else {
          console.log("ufg462     No job_process_flow found for job_id: " + rowID);
        }
        //#endregion
        //#region --- NOTIFICATIONS ---
        console.log("ufg4710     check notifications for actions triggered by job status change");
        //#endregion
        res.status(200).send("Update successful");   
        break;
      default:
        console.error("ufg8    Unknown field was edited: " + fieldID );
        res.status(500).send("Error updating " + fieldID);    

    }
    return;

  } else {
    console.error("ufg89    User not authenticated, redirecting to login page. [MAC] at [SYSTIME]"  );
    res.redirect("/login");
  }
  
})




//#region not in use

//#endregion


