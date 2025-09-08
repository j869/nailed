import express from 'express';
const router = express.Router();
import axios from "axios";

import pg from "pg";
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();



router.get("/executeJobAction", async (req, res) => {
                  // execute the action
          //[{"antecedent": "complete", "build": [{"status": "Archive"}], "decendant": [{"status": "pending@520"}, {"target": "today_1@520"}]}]

  try {
    const parentID = req.query.origin_job_id || null;
    const changeArrayJson = JSON.parse(req.query.changeArray);
    console.log("ja1      executing changeArray: ", changeArrayJson);
    const jobRec = await pool.query("SELECT id, current_status, user_id FROM jobs WHERE id = $1", [parentID]);
    if (jobRec.rows.length === 0) {
      console.error("ja300     Job not found for job_id:", parentID);
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const parentStatus = jobRec.rows[0].current_status;
    const userID = jobRec.rows[0].user_id;
    for (const scenario of changeArrayJson) {
      // console.log("ufg4664     antecedent(" +  scenario.antecedent + ") = job_status(" + parentStatus + ")");
      console.log("ja4001     IF job("+parentID+") status changes too " + scenario.antecedent + " then... ");
      if (scenario.antecedent === parentStatus) {   
        //check if scenario.decendant exists 
        if (scenario.decendant) {
          for (const action of scenario.decendant) {
            let jobID;
            let value;
            if (action.status) {
              //{"status": "pending@520"} or {"status": "pending@next"}
              jobID = await extractJobID(action.status, parentID);
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
              //{"target": "today_1@520"}
            //   jobID = action.target.split("@")[1] ; 
              jobID = await extractJobID(action.status, parentID);
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
                const updateStatus = await pool.query("UPDATE customers SET current_status = $1 WHERE id = $2 ",[value, customerID]);
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
              const q = await pool.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID ])

              console.log("ja6004       job added to build: ", response.data.id, " for buildID: ", buildID);
              console.log("ja6005       updating the build("+ buildID +") with user_id: ", userID);
              const q2 = await pool.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [userID, buildID ])
                  
              const q3 = await pool.query("UPDATE customers SET current_status = (select p.display_text from products p where p.id = $1) WHERE id = $2 RETURNING 1", [productID, customerID ])    

              console.log(`ja5005           ...incomplete code `, action);
            } else {
              console.log("ja5008           ...I dont know what to do with ", action);
            }
          }
        }


      }
    }
    console.log("ja9    job action executed for jobID: ", parentID);
    return res.status(200).json({ success : true, message: 'Job action executed successfully' });
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

/**
 * Extracts the jobID from a string containing '@XXXX'.
 * If input is '@next', returns the next jobID in sort_order after currentJobID.
 * @param {string} input - The input string (e.g. 'pending@520', 'today_1@1234', '@next')
 * @param {string|number} currentJobID - The current job's ID
 * @returns {Promise<string|null>} The jobID (e.g. '520', '1234'), or null if not found.
 */
async function extractJobID(input, currentJobID) {
  if (input === '@next') {
    // Find the next job in sort_order after currentJobID
    const currentJob = await pool.query("SELECT sort_order, build_id FROM jobs WHERE id = $1", [currentJobID]);
    if (currentJob.rows.length === 0) return null;
    const { sort_order, build_id } = currentJob.rows[0];
    const nextJob = await pool.query(
      "SELECT id FROM jobs WHERE build_id = $1 AND sort_order > $2 ORDER BY sort_order ASC LIMIT 1",
      [build_id, sort_order]
    );
    return nextJob.rows.length > 0 ? String(nextJob.rows[0].id) : null;
  }
  const match = input.match(/@([0-9]+)/);
  return match ? match[1] : null;
}

export default router;