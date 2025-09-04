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



router.get("/update", async (req,res) => {
  if (req.isAuthenticated()) {
    const called_by_button = req.query.btn || 'na';
    const fieldID = req.query.fieldID;
    console.log("ufg0   Raw value:", req.query.newValue); // Might show encoded
    const newValue = req.query.newValue || '';      //decodeURIComponent(req.query.newValue || '');   
    console.log("ufg0   Decoded value:", decodeURIComponent(req.query.newValue)); // Should show \n
    console.log("ufg0   JSON.stringify:", JSON.stringify(decodeURIComponent(req.query.newValue))); // Makes newlines visible
    const rowID = req.query.whereID;
    console.log("ufg1    user("+req.user.id+") clicked ("+called_by_button+") to changed "	+ fieldID + " to " + newValue + " for rowID " + rowID);
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
        if (isNaN(Date.parse(value))) {
          console.error("ufg4128  Invalid date value:", value);
          return res.status(400).send("Invalid date value");
        }           
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
        if (isNaN(Date.parse(value))) {
          console.error("ufg4128  Invalid date value:", value);
          return res.status(400).send("Invalid date value");
        }           
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
            console.log("ufg419     update "+ table + " set "+ columnName + " = " + value);          
            const q1 = await db.query("UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID + ";");      
            // assign the user_id to all child jobs
            // console.log("ufg52     update jobs set user_id = " + value + " where id in(select j.id from jobs j inner join job_process_flow f on j.id = f.decendant_id where f.antecedent_id = " + rowID + ");");
            const q3 = await db.query("UPDATE jobs set user_id = "+ value + " where id in(select j.id from jobs j inner join job_process_flow f on j.id = f.decendant_id where f.antecedent_id = " + rowID + " and f.tier > 500);");
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
        if (newValue.length > 126) {
            console.warn("ufg4243   Job title exceeds 126 characters, truncating");
            newValue = newValue.substring(0, 123) + "..."; 
        }        
        value = encodeURIComponent(newValue);
        console.log("ufg422     update "+ table + " set "+ columnName + " = " + value);          
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
        if (newValue.length > 126) {
            console.warn("ufg4243   Task title exceeds 126 characters, truncating");
            newValue = newValue.substring(0, 123) + "...";
        }        
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
        if (newValue.startsWith("add_")) {
            let dateObj = new Date();
            dateObj.setDate(dateObj.getDate() + parseInt(newValue.replace("add_", "")));
            value = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          value =  newValue ;
        }

        console.log("ufg441     update "+ table + " set "+ columnName + " = " + value);        
          try {  
            if (isNaN(Date.parse(value))) {
              console.error("ufg4428  Invalid date value:", value);
              return res.status(400).send("Invalid date value");
            }            
            const a4 = await db.query("BEGIN;"); // Start transaction
            console.log("ufg4421     ...update worksheetID("+rowID+") set target date = " + value );
            const a1 = await db.query("UPDATE worksheets SET date = $1 WHERE id = $2;", [value, rowID]);      
            // console.log('ufg00077');
            const a2 = await db.query("SELECT job_id FROM worksheets WHERE id = $1;", [rowID]);  
            let taskID = a2.rows[0].job_id;    
            if (taskID ) {
              // const descriptionJson = JSON.parse(a2.rows[0].description);
              // const taskId = descriptionJson.task_id;
              console.log("ufg4422   ...update job("+taskID+") set target_date = " + value);
              const a3 = await db.query("UPDATE jobs SET target_date = $1 WHERE id = $2;", [value, taskID]);      
              // console.log('ufg443');
            }
            const a5 = await db.query("COMMIT;"); // Commit transaction
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
        console.log("ufg445     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg446     update "+ table + " set "+ columnName + " = " + value);          
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
        console.log("ufg447     update "+ table + " set "+ columnName + " = " + value);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }
        break;
      case "jobStatus":
        console.log("ufg44    changing job status " );
        table = "jobs";
        columnName = "current_status"
        value = newValue;
        // update the job status 
        //#region update job status
        console.log("ufg448     update "+ table + " set "+ columnName + " = " + value + " for rowID: " + rowID);          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        let q2 = await db.query("DELETE FROM worksheets where description like '%Job(" + rowID + ")%' or job_id = $1", [rowID]);

        ruleEngine("job", rowID, "status", newValue, req.user.id);

        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }        
      // Job Templates fields
      case "display_text":
        table = "job_templates";
        columnName = "display_text";
        value = newValue;
        console.log("ufg_jt1     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt2     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt3     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt4     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt5     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt6     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt6     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt7     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt8     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt9     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt9     update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt10    update "+ table + " set "+ columnName + " = " + value);
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
        console.log("ufg_jt11    update "+ table + " set "+ columnName + " = " + value);
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        if (q && q.status === 201) {
          res.status(200).send("Update successful");
        } else {
          res.status(500).send("Error updating " + fieldID);
        }
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


async function ruleEngine(itemType, itemID, field, newValue, userID) {
  try {
    console.log(`ufg_re1   ruleEngine triggered for ${itemType}(${itemID}) field(${field}) newValue(${newValue}) by user(${userID})`);

        //update completed date
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

        //register te user who completed the job
        columnName = "user_id";
        value = req.user.id;        
        console.log("ufg450     update "+ table + " set "+ columnName + " = " + value );          
        q = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${value}&id=${rowID}`);
        
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
              let flowAction = row.change_array  || `[{"antecedent": "completed","decendant": [{"status": "pending"}, {"target": "today 1"} ]}, { "antecedent": "pending", "decendant": [ {"status": ""}, {"target": "today 2"}]}]`;
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


} catch (error) {
    console.error("ufg_re2   Error in ruleEngine:", error);
  }
}

export default router;