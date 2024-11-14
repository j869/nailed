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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
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




app.post("/", async (req, res) => {
  console.log("wb1   ", req.body);

  const { title, person, date } = req.body;
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
  console.log("wb7    ", q2.data);

  res.redirect("/") ;

})

app.get("/", async (req, res) => {
  console.log("ws1     ");

  if (req.user) {
    console.log("ws21     current logged in user: ", req.user.id);
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
    console.log("ws25    rows", q1.rowCount);

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
  console.log("b1   ")
  if (req.isAuthenticated()) {
      const buildID = req.params.id || "";
      try {
          let allCustomers;
          if (buildID) {
              console.log("b2   ", buildID);
              const jobsResult = await db.query("SELECT * FROM jobs WHERE build_id = $1 order by id", [buildID]);
              console.log("b21   ", jobsResult.rows);

              const jobIDArray = jobsResult.rows.map(job => job.id);
              console.log("b215    ", jobIDArray)
              const tasksResult = await db.query("SELECT * FROM tasks WHERE job_id = ANY ($1) order by id", [jobIDArray]);

              const taskIDArray = tasksResult.rows.map(task => task.id);
              console.log("b217    ", taskIDArray)
              const remindersResult = await db.query("SELECT * FROM reminders WHERE task_id = ANY ($1) order by id", [taskIDArray]);
              

              console.log("b22   ")
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
              console.log("b23    ", buildsResult.rows[0]);

              const custID = buildsResult.rows[0].customer_id

              // If there is a search term, fetch matching customers and their builds
              console.log("b24   ", custID)
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers WHERE id = $1 ORDER BY id", [custID]);
              console.log("b25   ", customersResult.rows[0])

              console.log("b26   ")
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


            

              console.log("b29   ")
          } else {
            console.log("b3   ");
            // If there's no search term, fetch all customers and their builds
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers");
              // customersResult.rows.forEach(customer => {     // Format follow_up value in short date format
              //   if (customer.follow_up) {
              //       customer.follow_up = new Date(customer.follow_up).toLocaleDateString();
              //   }
              // });
              console.log("b31   ", customersResult.rows[0]);
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
              console.log("b32    ", buildsResult.rows[0]);
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
              console.log("b7   ", process.env.API_URL);
              // If no specific build is clicked, render customers.ejs
              res.render("2/customer.ejs", { tableData : allCustomers, baseUrl : process.env.BASE_URL });
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
  console.log("d1   ")
  if (req.isAuthenticated()) {
      const query = req.query.query || "";
      try {
          let allCustomers;
          if (query) {
              console.log("d2   ");
              // If there is a search term, fetch matching customers and their builds
              //const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers WHERE full_name LIKE $1 OR primary_phone LIKE $1 OR home_address LIKE $1", [`%${query}%`]);
              const customersResult = await db.query(
                "SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers WHERE full_name ILIKE $1 OR primary_phone ILIKE $1 OR home_address ILIKE $1 OR primary_email ILIKE $1 OR contact_other ILIKE $1 OR current_status ILIKE $1 ORDER BY contact_other asc",
                [`%${query}%`]
              );
              const customerIds = customersResult.rows.map(customer => parseInt(customer.id, 10));
              console.log("d21  ", customersResult.rowCount, customerIds);

              if (customerIds.length > 0) {
                  const placeholders = customerIds.map((_, index) => `$${index + 1}`).join(', ');
                  const buildsQuery = `SELECT id, customer_id, product_id, enquiry_date, job_id, current_status FROM builds WHERE customer_id IN (${placeholders})`;
                  const buildsResult = await db.query(buildsQuery, customerIds);
                  console.log("d22   ", buildsResult.rowCount);
                  // const buildsResult = await db.query("SELECT id, customer_id, product_id, enquiry_date, job_id, current_status FROM builds WHERE customer_id IN ($1)", [customersResult.rows.map(customer => parseInt(customer.id, 10))]);
                  // console.log("d22   ", buildsResult.rowCount);

                  // Merge customer and build data
                  console.log("d211    ", customerIds)
                  allCustomers = customersResult.rows.map(customer => {
                    const builds = buildsResult.rows.filter(build => build.customer_id === customer.id);
                    return {
                        customer,
                        builds
                    };
                  });
                  console.log("d23   ", allCustomers.rowCount);
                } else {
                  console.log("d24   No customers found");
                  allCustomers = [];
                }

          } else {
            console.log("d3   ");
            // If there's no search term, fetch all customers and their builds
              const customersResult = await db.query("SELECT id, full_name, home_address, primary_phone, primary_email, contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY hh:mm') AS follow_up FROM customers order by contact_other asc" );
              customersResult.rows.forEach(customer => {     // Format follow_up value in short date format
                if (customer.follow_up) {
                    customer.follow_up = new Date(customer.follow_up).toLocaleDateString();
                }
              });
              //console.log("d31   ", customersResult.rows[0]);
              const buildsResult = await db.query(`
                                    SELECT 
                                        b.id, 
                                        b.customer_id, 
                                        b.product_id, 
                                        TO_CHAR(b.enquiry_date, 'DD-Mon-YY') as enquiry_date , 
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
              //console.log("d32    ", buildsResult.rows[0]);
              // Merge customer and build data
              allCustomers = customersResult.rows.map(customer => {
                  const builds = buildsResult.rows.filter(build => build.customer_id === customer.id);
                  return {
                      customer,
                      builds
                  };
              });
              console.log("d33    ");
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
              console.log("d7   ");
              // If no specific build is clicked, render customers.ejs
              // Grouping customers by current_status
              const groupedCustomers = allCustomers.reduce((acc, customer) => {
                const status = customer.customer.current_status;
                if (!acc[status]) {
                    acc[status] = [];
                }
                acc[status].push(customer);
                return acc;
              }, {});
              console.log("d71   ");
              res.render("2/customers.ejs", { tableData : allCustomers,  baseUrl: process.env.API_URL });
          }
      } catch (err) {
          console.log("d8   ");
          console.error(err);
          res.status(500).send("Internal Server Error");
      }
  } else {
      console.log("d9   ");
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
      console.log("d1  ");

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
      console.log("d5   ", allCustomers);

      // Render the search results page or handle them as needed
      //res.render("searchResults.ejs", { results: searchResults });
      res.render("2/customers.ejs", {
        data : openCustomers
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

app.get("/customer/:id", async (req, res) => {
  const custID = parseInt(req.params.id);
  if (req.isAuthenticated()) {
    console.log("c1   ", custID);


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
  console.log("a1  ");
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

      console.log("a2     Grouped Customers by Status:");
      res.render("listCustomers.ejs", {
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
          //newCompleteBy = req.user.id || 1;
      } else {
        console.log("ta3");
        // If status is not 'true', keep the current status unchanged
          newStatus = 'pending';
          newCompleteDate = null;
          //newCompleteBy = req.user.id || 1;
      }

      // Update the tasks table in your database
      const updateResult = await db.query("UPDATE tasks SET current_status = $1, completed_date = $3, completed_by = $4 WHERE id = $2", [newStatus, taskID, newCompleteDate, 1]);
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
    let newStatus;
    
    if (status === 'true') {
        // if (currentStatus === null || currentStatus === 'pending') {
        //     newStatus = 'active';
        // } else if (currentStatus === 'active') {
        //     newStatus = 'complete';
        // }
        newStatus = 'complete';

    } else {
        // If status is not 'true', keep the current status unchanged
        newStatus = 'pending';

    }

    // Update the jobs table in your database
    const updateResult = await db.query("UPDATE jobs SET current_status = $1 WHERE id = $2", [newStatus, jobID]);

    // Check if the update was successful
    if (updateResult.rowCount === 1) {
        // update the status of all child tasks 
        console.log("tb71      ", jobID, newStatus);  
        const result = await db.query(`UPDATE tasks SET current_status = $2 WHERE job_id = $1`, [jobID, newStatus]);
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
    let newStatus;
    if (status === 'true') {
        // if (currentStatus === null || currentStatus === 'pending') {
        //     newStatus = 'active';
        // } else if (currentStatus === 'active') {
        //     newStatus = 'complete';
        // }
        newStatus = 'complete';
    } else {
        // If status is not 'true', keep the current status unchanged
        newStatus = 'pending';
    }

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
  console.log("e1    ", req.body);
  console.log("e2    AddBuild() on " + API_URL)
  let productID = req.body.product_id;
  
  if (req.isAuthenticated()) {
    try {
      const result = await db.query(
        "INSERT INTO builds (customer_id, product_id, enquiry_date) VALUES ($1, $2, $3::timestamp) RETURNING *",
        [req.body.customer_id, req.body.product_id, req.body.enquiry_date]
      );
      const newBuild = result.rows[0];    

      //start workflow
      console.log("e3    adding the original job for the build(" + result.rows[0].id + ")");
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
  console.log("f1    ", buildID);
  const action = req.body.action;     // did the user click delete, update, view, or
  console.log("f2    ", action);
  if (req.isAuthenticated()) {
    
    switch (action) {
      case "update":
        console.log(action);
        console.log(req.body);
        console.log();
        const updateSQL = "UPDATE builds SET     " +
        "customer_id='" + req.body.customer_id + "', " +
        "product_id='" + req.body.product_id + "', " +
        "enquiry_date='" + req.body.enquiry_date.slice(0, 19).replace('T', ' ') + "' " +        // Format: YYYY-MM-DD HH:MM:SS
        "WHERE id=" + buildID + " RETURNING *"    
        console.log(updateSQL);
        try {
          const result = await db.query(updateSQL);
          const updatedCustomer = result.rows[0];
          console.log(updatedCustomer);
        } catch (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "delete":
        try {
          const result = await db.query("DELETE FROM builds WHERE id=" + buildID + " RETURNING 1" );
        } catch (err) {
          console.error(err);
          //res.status(500).send("Internal Server Error");         // I need to create and render an error page that notifies me of the error
        }
        res.redirect("/customer/" + req.body.customer_id);
        break;
      case "view":
        const result = await db.query("SELECT job_id FROM builds WHERE id=" + buildID  );
        console.log("f7    updateBuild/   case:view    job_id="+result.rows[0]);
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
    console.log("g1    as2987");
    //console.log(req.params.id);
    const response = await axios.get(`${API_URL}/jobs/${req.params.id}`);
    console.log("g2  ");
    //console.log(response.data);
    res.render("editTask.ejs", {
    //res.render("jobs.ejs", {
      siteContent : response.data, baseURL : baseURL
    });
    console.log("g9  ");
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
  console.log("i1    ");
  if (req.isAuthenticated()) {
    const response = await axios.get(`${API_URL}/deleteJob?job_id=${req.query.jobnum}`);
    res.redirect("/jobs/1");
  } else {
    res.redirect("/login");
  }
});

app.get("/addjob", async (req, res) => {
  console.log("j1    ");
  if (req.isAuthenticated()) {
    
    //Add a single job as a placeholder for further user input (and the relationship)
    const response = await axios.get(`${API_URL}/addjob?precedence=${req.query.type}&id=${req.query.jobnum}`);
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







//#region authentication

app.get("/login", (req, res) => {
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
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
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
  console.log(`Server running on port ${port}`);
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


app.get("/update", async (req,res) => {
  console.log("ufg1     "	)
  const fieldID = req.query.fieldID;
  const newValue = (req.query.newValue || '');   
  const rowID = req.query.whereID;
  console.log("ufg2    inline value edit ", fieldID, newValue, rowID);
  let table = "";
  let columnName = "";
  let value = "";
  let q ;

  switch (fieldID) {
    case "dueDate": 
      table = "jobs";
      columnName = "target_date"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "jobDesc":
      table = "jobs";
      columnName = "free_text"
      value = newValue;
      q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
      break;
    case "jobOwner":
        table = "jobs";
        columnName = "user_id";
        value = "'" + newValue + "'";
        // q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);

        console.log('ufg00050');
        const q1 = await db.query("UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");      
        console.log('ufg00051');
        const q2 = await db.query("UPDATE tasks SET owned_by = " + value + " WHERE job_id = " + rowID + ";");      
        console.log('ufg00052');
            
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


