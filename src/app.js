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
// import moment from 'moment';
// import e from "express";
import fs from "fs";
import path from "path";



const app = express();
// Set view engine
app.set("view engine", "ejs");
app.set("views", "./views");
const port = 3000;
let baseURL = "";
const saltRounds = 10;

env.config();
const API_URL = process.env.API_URL     //"http://localhost:4000";

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
  // console.log('x3        with SessionID:', req.sessionID);
  // console.log('x4        and Cookies:', req.headers.cookie);
  next();
});
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false,  httpOnly: true }
  }));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // console.log('x2       req.user:', req.user?.id || 'unset');
  console.log(`x9          ...from USER(${req.user?.id || 'unset'}) with SessionID: ${req.sessionID} `);
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
//#endregion


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
    "task_status": null
  }
  
  const q2 = await db.query("INSERT INTO worksheets (title, description, user_id, date) VALUES ($1, $2, $3, $4) RETURNING id", [title, null, person, date]);
  // console.log("wb7    ", q2.data);

  res.redirect("/") ;

})

app.get("/", async (req, res) => {

  if (req.user) {
    console.log("ws1     user(" + req.user.id + ") navigated to HOME page ");
    const iViewDay = parseInt(req.query.view) || 0;
    console.log("ws22     view: ", iViewDay);
    let q1SQL = "";
    let q1Params = [req.user.id];
    if (iViewDay == 0) {
      q1SQL = "SELECT *, to_char(date, 'DD-Mon-YY') AS formatted_date  FROM worksheets WHERE user_id = $1 AND date <= NOW()::date ORDER BY id";
    } else {
      q1SQL = "SELECT *, to_char(date, 'DD-Mon-YY') AS formatted_date  FROM worksheets WHERE user_id = $1 AND date = (NOW()::date + $2 * INTERVAL '1 day') ORDER BY id"
      q1Params.push(iViewDay);
    } 
    const q1 = await db.query(q1SQL, q1Params);    
    console.log("ws25     tasks to do today: ", q1.rowCount);
    const taskList = q1.rows;

    // Pass the parsed data to the template
    res.render("home.ejs", { baseURL: process.env.BASE_URL, view: iViewDay, user_id: req.user.id, data: taskList });

  } else {
    console.log("ws1     navigated to HOME page ");
    res.render("home.ejs");

  }

});


//#region Day Task Report


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


app.get("/daytaskUpdate", (req, res) => {
  console.log("dup1    ");
  main();

  res.redirect("/") ;
})

//#endregion


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

import getBuildData from './utils/workflowRules.js';




app.get("/2/build/:id", async (req, res) => {
// Initialize an empty array to hold all customers
let allCustomers = [];

  if (req.isAuthenticated()) {
    console.log("b1      navigate to WORKFLOW_LISTVIEW by user("+ req.user.id +") ")
    const buildID = req.params.id || "";
      try {
          // Get user's security clause for data access control
          const securityResult = await db.query('SELECT data_security FROM users WHERE id = $1', [req.user.id]);
          const securityClause = securityResult.rows[0]?.data_security || '1=0'; // Default to no access
          
          // Replace $USER_ID placeholder with actual user ID for dynamic clauses
          const processedSecurityClause = securityClause.replace(/\$USER_ID/g, req.user.id);
  
          if (buildID) {
            console.log("b2       retrieving all jobs for build("+buildID+")");

            const allCustomers = await getBuildData(buildID, processedSecurityClause);
            if (allCustomers.length === 0) {
              console.log("b2a      No jobs found for build("+buildID+") or access denied");
              res.redirect("/");
              return;
            }
            // console.log("b29       jobs for build("+buildID+")", JSON.stringify(allCustomers, null, 2));
            // return allCustomers;
            // printJobHierarchy(tableData);
            console.log("b30   found " +allCustomers.length+" jobs for build("+buildID+") with USER("+ req.user.id +") ");
            res.render("2/customer.ejs", { user : req.user, tableData : allCustomers, baseUrl : process.env.BASE_URL });
            
          } else {
            console.log("b3   ");
            // If there's no search term, fetch all customers and their builds with security filtering
              const customersResult = await db.query(`
                SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up 
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
      console.log("b99   user ("+ req.user.id +")");
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
                    c.contact_other ASC;
            `);
        
        
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
        if (customer.length === 0) {
          console.log("c2      Customer not found or access denied for custID: ", custID);
          res.redirect("/2/customers"); // Redirect to customer list instead of allowing new customer creation
          return;
        }
        console.error("c28     Error: Expected 1 row, but received " + customer.length + " rows.");      
      }

      // Enhanced builds query with customer access verification (customer already verified above)
      const qryBuilds = await db.query("SELECT products.display_text, builds.id, builds.customer_id, builds.product_id, builds.enquiry_date FROM builds INNER JOIN products ON builds.product_id = products.id WHERE customer_id = $1", [custID]);
      let builds = qryBuilds.rows;

      const qryProducts = await db.query("SELECT id, display_text FROM products order by display_text;");
      let products = qryProducts.rows;

      //read emails for the customer (customer access already verified)
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
        user : req.user,
        data : customersByStatus
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
    if (req.body.fullName) {
      const existingCustomer = await db.query(`SELECT * FROM customers c WHERE LOWER(c.full_name) = LOWER($1) AND (${processedSecurityClause})`, [req.body.fullName]);
      if (existingCustomer.rows.length > 0) {
        console.log("n81         Customer already exists: ", req.body.fullName);
        res.redirect("/customer/" + existingCustomer.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if email already exists
    if (req.body.primaryEmail) {
      const existingEmail = await db.query(`SELECT * FROM customers c WHERE c.primary_email = $1 AND (${processedSecurityClause})`, [req.body.primaryEmail]);
      if (existingEmail.rows.length > 0) {
        console.log("n82         Email already exists: ", req.body.primaryEmail);
        res.redirect("/customer/"+existingEmail.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if phone number already exists
    if (req.body.primaryPhone) {
      const existingPhone = await db.query(`SELECT * FROM customers c WHERE c.primary_phone = $1 AND (${processedSecurityClause})`, [req.body.primaryPhone]);
      if (existingPhone.rows.length > 0) {
        console.log("n83         Phone number already exists: ", req.body.primaryPhone);
        res.redirect("/customer/"+existingPhone.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if address already exists
    if (req.body.homeAddress) {
      const existingAddress = await db.query(`SELECT * FROM customers c WHERE c.home_address = $1 AND (${processedSecurityClause})`, [req.body.homeAddress]);
      if (existingAddress.rows.length > 0) {
        console.log("n84         Address already exists: ", req.body.homeAddress);
        res.redirect("/customer/"+existingAddress.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    //check if other contact already exists
    if (req.body.contactOther) {
      const existingContact = await db.query(`SELECT * FROM customers c WHERE c.contact_other = $1 AND (${processedSecurityClause})`, [req.body.contactOther]);
      if (existingContact.rows.length > 0) {
        console.log("n85         Other contact already exists: ", req.body.contactOther);
        res.redirect("/customer/"+existingContact.rows[0].id); // Redirect to the existing customer's page
        return;
      }
    }
    // Insert the new customer into the database
    const result = await db.query(
      "INSERT INTO customers (full_name, home_address, primary_phone, primary_email, contact_other, current_status, follow_up) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.body.fullName, req.body.homeAddress, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, "Initial enquiry", currentTime]
    );
    const newCustomer = result.rows[0];

      console.log("n2      new customer added: ", newCustomer.full_name, " with ID: ", newCustomer.id);
      const build = await db.query("INSERT INTO builds (customer_id, product_id, site_address) VALUES ($1, $2, $3) RETURNING *", [newCustomer.id, 8, newCustomer.home_address]);
      const newBuild = build.rows[0];    
      const buildID = newBuild.id;

      //start workflow
      console.log("n3        adding the original job for the build(" + buildID + ")");
      const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);     //&product_id=${req.body.product_id}`);
      const q = await db.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID ])

      console.log("n4       job added to build: ", response.data.id, " for buildID: ", buildID);
      console.log("n5       updating the build("+ buildID +") with user_id: ", req.user.id);
      const q2 = await db.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [req.user.id, buildID ])
          
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
              userID
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
              const result = await db.query("DELETE FROM customers WHERE id=" + userID + " RETURNING 1" );
              const result2 = await db.query("DELETE FROM builds WHERE customer_id =" + userID + " RETURNING 1" );
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






//#region builds

app.post("/addBuild", async (req, res) => {
  
  if (req.isAuthenticated()) {
    try {
      let custID = parseInt(req.body.customer_id);
      let productID = req.body.product_id;
      let custAddress;
      console.log("e1       USER("+req.user.id+") is adding a workflow to build() for cust(" + custID + ")", req.body);

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
      const q = await db.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID ])
      const q2 = await db.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [req.user.id, buildID ])

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
  console.log("f1      navigate to EDIT(JOB) page for build/:"+ buildID);
  const action = req.body.action;     // did the user click delete, update, view, or
  console.log("f2       action: ", action);
  if (req.isAuthenticated()) {
    
    // Get user security clause for build access control
    const userSecurityClause = await getUserSecurityClause(req.user.id);
    const processedSecurityClause = userSecurityClause.replace(/\$USER_ID/g, req.user.id);
    
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
          // Check access before deleting
          const accessCheck = await db.query(`SELECT 1 FROM builds b JOIN customers c ON b.customer_id = c.id WHERE b.id = $1 AND (${processedSecurityClause})`, [buildID]);
          if (accessCheck.rows.length === 0) {
            console.log("f3a       Access denied for build deletion: ", buildID);
            return res.redirect("/login");
          }
          const result = await db.query("DELETE FROM builds WHERE id=" + buildID + " RETURNING 1" );
        } catch (err) {
          console.error(err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        console.log("f3        deleted build_"+buildID);
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
      console.log("i1      USER("+ req.user.id +") clicked btn(" + req.query.btn + ") to delete job("+req.query.jobnum+") recursively");
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
      console.log("j1      USER("+ req.user.id +") clicked btn(" + req.query.btn + ") to add a new job ", req.query);
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


//#region job templates

app.get("/job-templates", async (req, res) => {
  if (req.isAuthenticated()) {
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
      const { product_id } = req.query;
      let apiUrl = `${API_URL}/job-templates`;
      
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
    } catch (error) {
      console.error("Error fetching job templates:", error);
      res.render("jobTemplates.ejs", {
        jobTemplates: [],
        products: [],
        selectedProductId: '',
        error: "Error loading job templates",
        baseURL: baseURL,
        user: req.user
      });
    }
  } else {
    res.redirect("/login");
  }
});

//#endregion

//#region admin user management

// ...existing code...
// Mount admin router
import adminRouter from './routes/admin.js';
app.use('/admin', adminRouter);

//#endregion


//#region user metadata



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
  console.log('pp95     Serializing user ID:', user.id);
  cb(null, user.id); // Store only user ID in session
});

passport.deserializeUser(async (id, cb) => {
  try {
    console.log('pp96     Deserializing user ID:', id);
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
    newCompleteBy = req.user.id || 1;


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



// ...existing code...
// Mount updates router
import updatesRouter from './routes/fieldUpdates.js';
app.use('/updates', updatesRouter);



//#region not in use

//#endregion


// Application routes overview:
// Customer routes:
// /customer/:id
// /customers
// /2/customers
// /3/customers
// /addCustomer
// /updateCustomer/:id
// Build routes:
// /2/build/:id
// /addBuild
// /updateBuild/:id
// /buildComplete
// Job routes:
// /jobs/:id
// /jobDone/:id
// /delJob
// /addjob
// /jobComplete
// Task routes:
// /tasks/:id
// /addtask
// /deltask
// /taskComplete
// Job template routes:
// /job-templates
// Management/report routes:
// /management-report
// Authentication routes:
// /login
// /register
// /logout
// Miscellaneous/utility routes:
// /update
// /updateSMTP
// /checkemail
// /updateRoles
// /updateUserStatusOrder
// /dtDone
// /daytaskUpdate
