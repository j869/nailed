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

// =========================
// Helper Functions
// =========================

/**
 * Extracts the jobID from a string containing '@XXXX'.
 * If input is '@next', returns the next jobID in sort_order after currentJobID.
 * @param {string} input - The input string (e.g. 'pending@520', 'today_1@1234', '@next')
 * @param {string|number} currentJobID - The current job's ID
 * @returns {Promise<string|null>} The jobID (e.g. '520', '1234'), or null if not found.
 */
async function extractJobID(input, currentJobID) {
  if (input === '@next') {
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

/**
 * Updates the status of a job.
 */
async function updateJobStatus(jobID, value) {
  return pool.query("UPDATE jobs SET current_status = $1 WHERE id = $2 ", [value, jobID]);
}

/**
 * Updates the target date of a job and assigns user.
 */
async function updateJobTargetDate(jobID, value, userID) {
  await pool.query("UPDATE jobs SET target_date = $1 WHERE id = $2 ", [value, jobID]);
  const q = await pool.query("SELECT id, user_id FROM jobs WHERE id = $1", [jobID]);
  let responsibleUser = q.rows[0].user_id ? q.rows[0].user_id : userID;
  await pool.query("UPDATE jobs SET user_id = $1 WHERE id = $2 ", [responsibleUser, jobID]);
}

/**
 * Adds a log entry to a job's change log.
 */
async function addJobLog(jobID, logText, userEmail) {
  await pool.query(
    "UPDATE jobs SET change_log = change_log || $1 || E'\n' WHERE id = $2",
    [`${new Date().toISOString()} - ${userEmail} - ${logText}`, jobID]
  );
}

// =========================
// Main API Route
// =========================

router.get("/executeJobAction", async (req, res) => {
  // Workflow automation for job actions
  // Example changeArray: [{"antecedent": "complete", ...}]
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

    // === Scenario Loop ===
    for (const scenario of changeArrayJson) {
      console.log(`ja4001     IF job(${parentID}) status changes to ${scenario.antecedent} then...`);
      if (scenario.antecedent === parentStatus) {
        // === Decendant Actions ===
        if (scenario.decendant) {
          for (const action of scenario.decendant) {
            let jobID;
            let value;
            if (action.status) {
              jobID = await extractJobID(action.status, parentID);
              value = action.status.split("@")[0];
              const q = await pool.query("SELECT id, current_status FROM jobs WHERE id = $1", [jobID]);
              let oldStatus = q.rows[0].current_status;
              if (oldStatus !== 'complete' && oldStatus !== value) {
                console.log(`ja4107           ...set job(${jobID}) status to ${value} `, action);
                await updateJobStatus(jobID, value);
              } else {
                console.log(`ja4108           ...job(${jobID}) status is already ${value}, or task is completed.`);
              }
            } else if (action.target) {
              jobID = await extractJobID(action.target, parentID);
              value = action.target.split("@")[0];
              if (action.target.startsWith("today")) {
                const daysToAdd = parseInt(value.split("_")[1], 10) || 0;
                let today = new Date();
                today.setDate(today.getDate() + daysToAdd);
                value = today.toISOString().split('T')[0];
                console.log(`ja4207           ...set job(${jobID}) target date to ${value} for user(${userID})`, action);
                await updateJobTargetDate(jobID, value, userID);
              }
            } else if (action.log_trigger) {
              await addJobLog(jobID, action.log_trigger, req.user.email);
            } else {
              console.log("ja4008           ...I dont know what to do with ", action);
            }
          }
        }

        // === Customer Actions ===
        if (scenario.customer) {
          for (const action of scenario.customer) {
            if (action.setCategory) {
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
                await pool.query("UPDATE builds set current_status = 'complete' WHERE id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
                await pool.query("UPDATE jobs SET current_status = 'complete' WHERE build_id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
              }
              if (oldStatus !== value) {
                await pool.query("UPDATE customers SET current_status = $1 WHERE id = $2 ",[value, customerID]);
              } else {
                console.log(`ja5007           ...cust(${customerID}) status is already ${value}`);
              }
            } else {
              console.log("ja5008           ...I dont know what to do with ", action);
            }
          }
        }

        // === Product Actions ===
        if (scenario.product) {
          for (const action of scenario.product) {
            if (action.addWorkflow) {
              const customer = await pool.query("SELECT c.id, c.full_name, c.home_address FROM customers c WHERE id = (select b.customer_id from builds b where id = (select j.build_id from jobs j where id = $1))", [parentID]);
              let customerID = customer.rows[0].id;
              await pool.query("UPDATE builds set current_status = 'complete' WHERE id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
              await pool.query("UPDATE jobs SET current_status = 'complete' WHERE build_id = (select j.build_id from jobs j where j.id = $1)", [parentID]);
              let productID = action.addWorkflow;
              console.log("ja6002      adding a new build for ", customer.rows[0].full_name, " with ID: ", customerID);
              const build = await pool.query("INSERT INTO builds (customer_id, product_id, site_address) VALUES ($1, $2, $3) RETURNING *", [customerID, productID, customer.rows[0].home_address]);
              const newBuild = build.rows[0];    
              const buildID = newBuild.id;
              //start workflow
              console.log("ja6003        adding job for the build(" + buildID + ")");
              const response = await axios.get(`${API_URL}/addjob?precedence=origin&id=${buildID}`);
              await pool.query("UPDATE builds SET job_id = $1 WHERE id = $2 RETURNING 1", [response.data.id, buildID ])
              console.log("ja6004       job added to build: ", response.data.id, " for buildID: ", buildID);
              console.log("ja6005       updating the build("+ buildID +") with user_id: ", userID);
              await pool.query("UPDATE jobs SET user_id = $1 WHERE build_id = $2 RETURNING 1", [userID, buildID ])
              await pool.query("UPDATE customers SET current_status = (select p.display_text from products p where p.id = $1) WHERE id = $2 RETURNING 1", [productID, customerID ])    
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
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: undefined
    });    
  }
});

export default router;