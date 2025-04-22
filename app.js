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


//#region Bryans Excel UX style

app.get("/2/build/:id", async (req, res) => {
  console.log("b1      navigate to WORKFLOW_LISTVIEW by user("+ req.user.id +") ")
  if (req.isAuthenticated()) {
      const buildID = req.params.id || "";
      try {
          let allCustomers;
          if (buildID) {
              console.log("b2       retrieving all jobs for build("+buildID+")");
              const jobsResult = await db.query("SELECT * FROM jobs WHERE build_id = $1 order by id", [buildID]);

              const jobIDArray = jobsResult.rows.map(job => job.id);
              const tasksResult = await db.query("SELECT * FROM tasks WHERE job_id = ANY ($1) order by id", [jobIDArray]);

              const taskIDArray = tasksResult.rows.map(task => task.id);
              const remindersResult = await db.query("SELECT * FROM reminders WHERE task_id = ANY ($1) order by id", [taskIDArray]);
              
              // const buildsResult = await db.query("SELECT id, customer_id, product_id, enquiry_date, job_id FROM builds WHERE id = $1", [buildID]);
              // console.log("b23   ", buildsResult.rows[0]);
              const buildsResult = await db.query(`
                                    SELECT 
                                        b.id, 
                                        b.customer_id, 
                                        b.product_id, 
                                        TO_CHAR(b.enquiry_date, 'DD-Mon-YY') as enquiry_date, 
                                        b.job_id,
                                        b.current_status,
                                        p.display_text AS product_description
                                    FROM 
                                        builds AS b
                                    JOIN 
                                        products AS p ON b.product_id = p.id
                                    WHERE 
                                        b.id = $1
                                    ORDER BY
                                        b.id
                                     `, [buildID]);

              const custID = buildsResult.rows[0].customer_id

              // If there is a search term, fetch matching customers and their builds
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers WHERE id = $1 ORDER BY id", [custID]);

              // console.log("b26   ")
// Merge customer, build, and jobs data
// Sort tasks by sort_order
const sortedTasks = tasksResult.rows.sort((a, b) => {
  if (a.sort_order === null) return -1; // Treat null as a lower value
  if (b.sort_order === null) return 1;  // Treat null as a lower value
  return a.sort_order.localeCompare(b.sort_order);
});

// Map through customers
allCustomers = customersResult.rows.map(customer => {
  const builds = buildsResult.rows.filter(build => build.customer_id === customer.id);
  const buildsWithJobs = builds.map(build => {
    const jobs = jobsResult.rows.filter(job => job.build_id === build.id);
    const jobsWithTasks = jobs.map(job => {
      const tasks = sortedTasks.filter(task => task.job_id === job.id); // Use sortedTasks for sorting tasks
      const tasksWithReminders = tasks.map(task => {
        const remindersForTask = remindersResult.rows.filter(reminder => reminder.task_id === task.id);
        return {
          ...task,
          reminders: remindersForTask
        };
      });
      return {
        ...job,
        tasks: tasksWithReminders
      };
    });
    return {
      ...build,
      jobs: jobsWithTasks
    };
  });
  return {
    customer,
    builds: buildsWithJobs
  };
});


            

              // console.log("b29   ")
          } else {
            console.log("b3   ");
            // If there's no search term, fetch all customers and their builds
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers");
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
              console.log("b33    ");
          }
          
          // Render the appropriate template based on the scenario
          if (req.query.buildId) {
              console.log("b6   ");

              // If a build is clicked, render customer.ejs
              const customerId = 2;  // Extract customer id from buildId, assuming buildId contains both customer and build ids;
              // Fetch additional data for the selected build, e.g., jobs
              const jobsResult = await db.query("SELECT * FROM jobs WHERE build_id = $1", [req.query.buildId]);
              // Render customer.ejs with customer, builds, and jobs data
              res.render("customer.ejs", { customer: allCustomers.find(customer => customer.id === customerId), builds: allCustomers, jobs: jobsResult.rows });
          } else {
              // console.log("b91      returning page");
              // If no specific build is clicked, render customers.ejs
              res.render("2/customer.ejs", { user : req.user, tableData : allCustomers, baseUrl : process.env.BASE_URL });
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
                        TO_CHAR(c.follow_up, 'DD-Mon-YY hh:mm') AS follow_up,
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
                        )
                        AND EXISTS (
                            SELECT 1 
                            FROM jobs j 
                            WHERE j.build_id = b.id 
                            AND j.user_id = $2
                        )
                    ORDER BY 
                        c.follow_up ASC;
                `;
        
                const customersResult = await db.query(customersQuery, [`%${query}%`, req.user.id]);
                // console.log("d21  ", customersResult.rowCount);
        
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
                    TO_CHAR(c.follow_up, 'DD-Mon-YY hh:mm') AS follow_up,
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
                    )
                ORDER BY 
                    c.contact_other ASC;
            `, [req.user.id]);
        
        
            // Format follow_up value and structure the data
            allCustomers = customersResult.rows.reduce((acc, row) => {
                // Format follow_up to a short date
                if (row.follow_up) {
                    row.follow_up = new Date(row.follow_up).toLocaleDateString();
                }
        
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
              const qry1 = await db.query(`SELECT display_text FROM listorder WHERE location_used = 'CustomersStatus' ORDER BY sort_order;`);
              const statusOrderList = qry1.rows.map(row => row.display_text);

            
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
            
            // console.log("Sorted allCustomers:", allCustomers);
            
            res.render("2/customers.ejs", { 
                user: req.user,  
                tableData: allCustomers,  
                baseUrl: process.env.API_URL 
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
      if (customer.length !== 1) {        console.error("Error: Expected 1 row, but received " + customer.length + " rows.");      }

      const qryBuilds = await db.query("SELECT products.display_text, builds.id, builds.customer_id, builds.product_id, builds.enquiry_date FROM builds INNER JOIN products ON builds.product_id = products.id WHERE customer_id = $1", [custID]);
      let builds = qryBuilds.rows;

      const qryProducts = await db.query("SELECT id, display_text FROM products ");
      let products = qryProducts.rows;

      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("customer.ejs", {
        data : customer[0],
        builds : builds,
        products : products
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
  if (req.isAuthenticated()) {
    try {
    const currentTime = new Date(); // Get the current time
    currentTime.setDate(currentTime.getDate() + 21); // Add 21 days
    
    const result = await db.query(
      "INSERT INTO customers (full_name, home_address, primary_phone, primary_email, contact_other, current_status, follow_up) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [req.body.fullName, req.body.homeAddress, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, "open", currentTime]
    );
    const newCustomer = result.rows[0];
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
            "contact_other='" + req.body.contactOther + "' " + 
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





app.post("/taskComplete", async (req, res) => {
  try {
      console.log("ta1   ", req.body);
      const taskID = req.body.taskId;
      const status = req.body.status;    //string 'true' or 'false'

      // Fetch the current status of the task from the database
      const result = await db.query("SELECT current_status FROM tasks WHERE id = $1", [taskID]);
      const currentStatus = result.rows[0].current_status;

      // Update logic based on currentStatus and status values
      let newStatus;
      let newCompleteDate;
      let newCompleteBy;
      if (status === 'true') {
          console.log("ta2");
          // if (currentStatus === null || currentStatus === 'pending') {
          //     newStatus = 'active';
          // } else if (currentStatus === 'active') {
          //     newStatus = 'complete';
          // }
          newStatus = 'complete';
          newCompleteDate = new Date();
          newCompleteBy = req.user.id;
      } else {
        console.log("ta3");
        // If status is not 'true', keep the current status unchanged
          newStatus = 'pending';
          newCompleteDate = null;
          newCompleteBy = req.user.id;
      }

      // Update the tasks table in your database
      const updateResult = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE id = $2", [newStatus, taskID, newCompleteDate, newCompleteBy]);
      console.log("ta4");

      // Check if the update was successful
      if (updateResult.rowCount === 1) {
          console.log(`ta9   Task ${taskID} status updated to ${newStatus}`);
          const q4 = await db.query(`DELETE FROM worksheets WHERE description LIKE '%' || '"task_id":' || $1 || ',' || '%'`,[taskID]);
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
try {
    console.log("tb1   ", req.body);
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
    console.log("tb2   ", newStatus, jobID);
    const updateResult = await db.query("UPDATE jobs SET current_status = $1, completed_date = $3, completed_by = $4  WHERE id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
        // update the status of all child tasks 
        console.log("tb71      ", jobID, newStatus);  
    //  const result = await db.query(`UPDATE tasks SET current_status = $2 WHERE job_id = $1`, [jobID, newStatus]);
        const result = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE job_id = $2", [newStatus, jobID, newCompleteDate, newCompleteBy]);
        console.log("tb72      ", result.rowCount);  
        console.log(`tb9   job ${jobID} status updated to ${newStatus}`);
        res.status(200).json({ message: `job ${jobID} status updated to ${newStatus}` });

    } else {
        console.log(`tb8     job ${jobID} not found or status not updated`);
        res.status(404).json({ error: `job ${jobID} not found or status not updated` });
    }
} catch (error) {
    console.error("tb84     Error updating job status:", error);
    res.status(500).json({ error: "Internal Server Error" });
}
});


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
  console.log("h1    ");
  const jobID = parseInt(req.params.id);
  if (req.isAuthenticated()) {
    const response = await axios.get(`${API_URL}/jobDone/${req.params.id}`);
    res.redirect("/jobs/" + jobID);
  } else {
    res.redirect("/login");
  }
});

app.get("/delJob", async (req, res) => {
  console.log("i1      user("+ req.user.id +") is deleting job("+req.query.jobnum+")");
  if (req.isAuthenticated()) {
    const response = await axios.get(`${API_URL}/deleteJob?job_id=${req.query.jobnum}`);
    console.log("i9       job deleted with response: "+ response.data.status);
    res.redirect("/jobs/" + response.data.goToId);
  } else {
    res.redirect("/login");
  }
});

app.get("/addjob", async (req, res) => {
  console.log("j1      user("+ req.user.id +") is adding a new job");
  if (req.isAuthenticated()) {
    
    //Add a single job as a placeholder for further user input (and the relationship)
    const response = await axios.get(`${API_URL}/addjob?precedence=${req.query.type}&id=${req.query.jobnum}`);
    console.log("j9       new job added:", response.data.id);
    res.redirect("/jobs/" + req.query.jobnum);
  } else {
    res.redirect("/login");
  }
});

//#endregion









//#region tasks

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
    successRedirect: "/2/customers",
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
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              console.log("pp81    user(" + result.rows[0].id + ") authenticated on [MAC] at [SYSTIME]"  )
              return cb(null, user);
            } else {
              console.log("pp9     user(" + username + ") wrong password on [MAC] at [SYSTIME]"  )
              return cb(null, false);
            }
          }
        });
      } else {
        console.log("pp9     user(" + username + ") not registered on [MAC] at [SYSTIME]"  )
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
    const deleteSql = `DELETE from listOrder where location_used = 'CustomersStatus'; `;
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
  const fieldID = req.query.fieldID;
  const newValue = (req.query.newValue || '');   
  const rowID = req.query.whereID;
  console.log("ufg1    user("+req.user.id+") changed "	+ fieldID + " to " + newValue )
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
    case "dueDate": 
    console.log("ufg42")
    table = "jobs";
      columnName = "target_date"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "jobDesc":
      console.log("ufg43")
      table = "jobs";
      columnName = "free_text"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "jobOwner":
        table = "jobs";
        columnName = "user_id";
        if (newValue === null || newValue === "") {
          value = "null";
        } else {
          value = "'" + newValue + "'";
        }
        // console.log("ufg51   set jobs.user_id = " + newValue)
        // q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

        // console.log("ufg52      UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");
        const q1 = await db.query("UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");      
        // console.log('ufg53');
        const q2 = await db.query("UPDATE tasks SET owned_by = " + value + " WHERE job_id = " + rowID + ";");      
        console.log('ufg54    Updated job('+ rowID +')');
            
        break;
    case "taskDesc":
      table = "tasks";
      columnName = "free_text"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;      
    case "jobTitle":
      table = "jobs";
      columnName = "display_text"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "taskTitle":
      table = "tasks";
      columnName = "display_text"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
  
    case "taskOrder":
      table = "tasks";
      columnName = "sort_order"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "taskPerson":
      table = "tasks";
      columnName = "completed_by_person"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;

    case "otherContact":
      table = "customers";
      columnName = "contact_other"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "contactStatus":
      table = "customers";
      columnName = "current_status"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
  
    case "contactName":
      table = "customers";
      columnName = "full_name"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "contactAddress":
      table = "customers";
      columnName = "home_address"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "contactPhone":
      table = "customers";
      columnName = "primary_phone"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "contactEmail":
      table = "customers";
      columnName = "primary_email"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;

    case "daytaskTitle":
      table = "worksheets";
      columnName = "title"
      value =  newValue ;
      console.log(`ufg77   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "daytaskPerson":
        try {
            await db.query('BEGIN'); // Start transaction
    
            table = "worksheets";
            columnName = "user_id";
            value = "" + newValue + "";
            console.log(`ufg78   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            let q1 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
            
            // Execute q2 to retrieve the task_id
            let q2 = await db.query("SELECT description FROM worksheets WHERE id = $1", [rowID]);
            let task_id = 0;
            if (q2.rows.length > 0) {
                const description = q2.rows[0].description;
                const parsedDescription = JSON.parse(description);
                task_id = parsedDescription.task_id;
                console.log("ufg787     Task ID:", task_id);
            }
            
            table = "tasks";
            columnName = "owned_by";
            value = "" + newValue + "";
            console.log(`ufg79   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);
            let q3 = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${task_id}`);
            
            await db.query('COMMIT'); // Commit transaction
    
        } catch (error) {
            await db.query('ROLLBACK'); // Rollback on error
            console.error("Transaction failed:", error);
        }


      break;
    case "daytaskDate":
      table = "worksheets";
      columnName = "date"
      value =  newValue ;
      // console.log(`ufg78   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      // q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

      console.log('ufg00076');
      const a1 = await db.query("UPDATE worksheets SET date = $1 WHERE id = $2;", [value, rowID]);      
      console.log('ufg00077');
      const a2 = await db.query("SELECT description FROM worksheets WHERE id = $1;", [rowID]);      
      if (a2.rows.length > 0 && a2.rows[0].description !== null) {
        try {
              const descriptionJson = JSON.parse(a2.rows[0].description);
              const taskId = descriptionJson.task_id;
              console.log("ufg00071   Task ID:", taskId);
              const a3 = await db.query("UPDATE tasks SET target_date = $1 WHERE id = $2;", [value, taskId]);      
              console.log('ufg00079');
          } catch (error) {
              console.error("ufg00078 Error parsing JSON:", error);
          }
      } else {
          console.log("ufg00072  Description is null or no record found, breaking out.");
      }      
                

      break;
    case "daytaskArchive":
      table = "worksheets";
      columnName = "archive"
      value = (newValue == 1) ? true : false;
      console.log(`ufg78   ${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;      

    default:
      console.error("ufg8    Unknown field was edited: " + fieldID );
  }
})




//#region not in use

//#endregion


