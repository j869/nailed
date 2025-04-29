//#region middleware
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import env from "dotenv";
import multer from "multer";
import cors from "cors";


export const app = express();
const port = 4000;

env.config();
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

app.use(cors({
  origin:  `${process.env.BASE_URL}`, // Allow frontend requests    ${port}
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

//#endregion

// Multer Setup for File Uploads (storing in memory)
const upload = multer({ storage: multer.memoryStorage() });

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
    const result = await pool.query("SELECT id, filename FROM files WHERE build_id = "+ req.query.build_id +" ORDER BY id DESC");

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
      const targetDate = result.rows[0].target_date;
      const jobUser = "" + result.rows[0].user_id + ""

      vSQL = "SELECT * from jobs WHERE id = " + job_id + ";";
      result = await pool.query(vSQL);       
      const tier = result.rows[0].tier 
      const build_id= result.rows[0].build_id 
      const changeArray = result.rows[0].change_array;

      vSQL = "SELECT tier from jobs WHERE build_id = " + build_id + " and tier > "+ tier +" ORDER BY tier ASC;";
      result = await pool.query(vSQL);       
      const decendantTier = result.rows.length > 0 ? result.rows[0].tier : null;

      vSQL = "SELECT tier from jobs WHERE build_id = " + build_id + " and tier < "+ tier +" ORDER BY tier DESC;";
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
        conversation.push( { display_name : result.rows[r].display_name, message_text : result.rows[r].message_text, attachment : result2.rows } )
      }
      
      // console.log("gd4    adding antecedents")
      let job_antecedents = [];
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON j.id = r.antecedent_id WHERE j.tier = " + tier + " and r.decendant_id = " + job_id + " ;";
      result = await pool.query(vSQL);        
      job_antecedents = result.rows;
      
      // console.log("gd5   adding decendants")
      let job_decendants = [];
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON j.id = r.decendant_id WHERE j.tier = " + tier + " and r.antecedent_id = " + job_id + ";";
      result = await pool.query(vSQL);        
      job_decendants = result.rows;

      console.log("gd117   ", tier, decendantTier, job_id, antecedentTier)
      // console.log("gd6 adding tasks")
      let task_antecedents = [];
      if (antecedentTier) {
        vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON j.id = r.antecedent_id WHERE j.tier = " + antecedentTier + " and r.decendant_id = " + job_id + ";";
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
      vSQL = "SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON j.id = r.decendant_id WHERE j.tier = " + decendantTier + " and r.antecedent_id = " + job_id + ";";
      result = await pool.query(vSQL);        
      task_decendants = result.rows;

      
      let data = { 
        job : {
          id : job_id, 
          tier : tier, 
          display_text : jobName, 
          display_name : jobUser, 
          free_text : jobText, 
          target_date : targetDate, 
          change_array : changeArray,
          reminder : reminder,      //{escalation1_interval : 7, escalation2_interval : 21},
          conversation : conversation,
          // [
          //   {display_name : "John", message_text : "see attached pic", attachment : [{thumbnail : "https://icons.iconarchive.com/icons/graphicloads/colorful-long-shadow/128/Attachment-2-icon.png", link : "http://www.google.com"},]}, 
          //   {display_name : "Nick", message_text : "John this is the ...", }, 
          //   {display_name : "Owner", message_text : "when is it done?", }, ]
          }, 
        task_antecedents :  task_antecedents,
        // [
        //   {display_text : "Call Plumber", current_status : true, free_text : ""}, 
        //   {display_text : "vook trencher", current_status : true, free_text : ""}, 
        //   {display_text : "visit reece", current_status : true, free_text : ""}, 
        // ],
        task_decendants :  task_decendants,
        // [
        //   {display_text : "record pics", free_text : ""}, 
        //   {display_text : "confirm plumber availability", free_text : ""}, 
        //   {display_text : "call Bryan", free_text : ""}, ],
        job_antecedents : job_antecedents, 
        // [
        //   {display_text : "Cladding", free_text : "supporting text"}, 
        //   {display_text : "Roofing", free_text : "supporting text"}, ],
        job_decendants : job_decendants,    //[{display_text : "Plumbing", free_text : "supporting text"},  ],
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

app.get("/jobDone/:id", async (req,res) => {
  console.log(req.params);
  const jobID = parseInt(req.params.id);
  try {
    //update table
    const q = await pool.query("UPDATE jobs SET current_status = 'completed', completed_date = LOCALTIMESTAMP, completed_by = 'me' WHERE id = " + jobID + ";");      

//recursivly check all previous jobs in the chain - and set them to completed
// also check pre-tasks and mark them done
// also check all tasks attached to previous jobs and set them done

    if (q.rowCount == 1) {
      res.status(201).json({msg : 'succesfully modified 1 record'});
    }
  } catch (error) {
    console.error('Error marking job as done:', error);
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
  let value = req.query.value;
  //value = value.replace(/%/g,"_");
  const id = req.query.id;
  // console.log("ud1   USER set " + column + " to " + value + " in table " + table + " where id = " + id);
  try {
    // Retrieve the current value from the database
    const currentValueQuery = `SELECT ${column} FROM ${table} WHERE id = $1;`;
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
    const q = await pool.query("UPDATE " + table + " SET " + column + " = $1 WHERE id = $2;", [ value, id]);      
    if (q.rowCount == 1) {
      res.status(201).json({msg : 'succesfully modified 1 record'});
      console.log("ud9   USER set " + column + " to " + value + " in table " + table + " where id = " + id);
      console.log("ud5    succesfully modified the " + table + " record: ");
    }

    if (table === "jobs") {
      // console.log("ud55    updating table 'jobs' and column: " + column);
      if (column === "display_text") {
        // console.log("ud69  sdf")
        const q2 = await pool.query("UPDATE job_templates SET display_text = $1 WHERE id = (SELECT job_template_id FROM jobs WHERE id = $2);", [value, id]);        
        console.log("ud7     ...we also modified the template to reflect this change. ");
      }
    }
    // console.log("ud99");
  } catch (error) {
    
    console.error('ud8   Error updating job:', error);
    // return relevant status code at the end of every API call
    res.status(500).json({ error: 'Failed to add job' });
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
        job : {
          id : 1, 
          display_text : 'test', 
          display_name : 'john', 
          free_text : 'jobText', 
          target_date : 'targetDate', 
          reminder : 'reminder',      //{escalation1_interval : 7, escalation2_interval : 21},
          conversation : 
          [
            {display_name : "John", message_text : "see attached pic", attachment : [{thumbnail : "https://icons.iconarchive.com/icons/graphicloads/colorful-long-shadow/128/Attachment-2-icon.png", link : "http://www.google.com"},]}, 
            {display_name : "Nick", message_text : "John this is the ...", }, 
            {display_name : "Owner", message_text : "when is it done?", }, ]
          }, 
        task_antecedents :  
        [
          {display_text : "Call Plumber", current_status : true, free_text : ""}, 
          {display_text : "vook trencher", current_status : true, free_text : ""}, 
          {display_text : "visit reece", current_status : true, free_text : ""}, 
        ],
        task_decendants :  
        [
          {display_text : "record pics", free_text : ""}, 
          {display_text : "confirm plumber availability", free_text : ""}, 
          {display_text : "call Bryan", free_text : ""}, ],
        job_antecedents :  
        [
          {display_text : "Cladding", free_text : "supporting text"}, 
          {display_text : "Roofing", free_text : "supporting text"}, ],
        job_decendants : [{display_text : "Plumbing", free_text : "supporting text"},  ],
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
    const newTask = await pool.query("INSERT INTO tasks (display_text, job_id, current_status, precedence, sort_order) VALUES ('UNNAMED', "+ job_id +", 'active', '"+ precedence + "', 't2') RETURNING id;");      
    newTaskID = newTask.rows[0].id;
    res.status(201).json({newTaskID : newTaskID });

  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }

  console.log("t9      Successfully added task("+newTaskID+")");
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
    const q = await pool.query("UPDATE " + table + " SET " + column + " = $1 WHERE id = $2;", [ value, id]);      
    if (q.rowCount == 1) {
      res.status(201).json({msg : 'succesfully modified 1 record'});
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
    res.status(201).json({newTaskID : recordsDeleted + ' task(s) were deleted successfully' });

  } catch (error) {
    console.error('tl81   Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }

  console.log("tl9      Successfully deleted task(" + task_id + ") deleting " + recordsDeleted + " records");
});




app.get("/addjob", async (req, res) => {
  // the following are the supported ways of adding a job...
  // parent: add a job and attach it as an antecedent of the job you're looking at
  // child: add a decendant
  // origin: add the first job on a build.  This triggers building out the entire process, based on the job_template table

  const title = req.query.title || 'UNNAMED';
  const precedence = req.query.precedence;
  const tier = req.query.tier;
  let buildID;
  let jobID;
  if (precedence == "origin") {
    buildID = req.query.id;      //this the jobID unless  precedence is of type 'origin' in which case  it is the  build_id 
  } else {
    jobID = req.query.id;      //this the jobID unless  precedence is of type 'origin' in which case  it is the  build_id 
  }
  //  no longer provided... its derived from the buildID record      const productID = req.query.product_id;
  console.log("a01    adding to job("+jobID+") for build(" + buildID + ") on " + precedence + " called " + title);

  try {
    let newJobID;
    //add job and then document the relationship to the new job in job_process_flow
    if (precedence == "parent") {
      if (false) {
        const q4 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
        console.log("a10")
        // Add a single job as a placeholder.  You're looking at a job and you think you want to create a child job.  so use this functino to create it.  Then edit the new child job to fill out other details.
        //get the job_template_id
        const q1 = await pool.query("INSERT INTO job_templates (user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [1,1,productID, title, null, job_template_ID, null, 1]);
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
        console.log ("a19   adding of parents has been retracted... no longer supported functionality")
      }

    } else if (precedence == "child") {
        console.log("a30     new job is a child to job("+ jobID +")");
        //console.log(req.query);
        const q4 = await pool.query("SELECT * FROM jobs WHERE id = " + jobID);
        console.log("a31     based on template_id(" + q4.rows[0].job_template_id + ") for job("+ jobID +")");
        let oldJobTemplateID = q4.rows[0].job_template_id;
        const q1 = await pool.query("INSERT INTO job_templates (user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id", [1,1, q4.rows[0].product_id, title, null, q4.rows[0].job_template_id, null, 1]);
        const q5 = await pool.query("UPDATE job_templates SET decendant_array = '" + q1.rows[0].id + "' where id = " + oldJobTemplateID)     //add this job as a child of the parent template 
        console.log("a32     tempalate updated to insert new jobtemplateID(" + q1.rows[0].id + ")");
        // console.log("a33     updated relationship. decendant_array = '" + q1.rows[0].id + "', where oldJobTemplateID = " + oldJobTemplateID);
        
        let newJob
        try {
        // const newJob = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;", [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id], q4.rows[0].product_id);
        newJob = await pool.query(
            "INSERT INTO jobs (display_text, reminder_id, job_template_id, sort_order, build_id, product_id, tier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;",
            [title, 1, q1.rows[0].id, '0', q4.rows[0].build_id, q4.rows[0].product_id, tier]
          );
        
          console.log("a339    New job inserted successfully. jobID(" + newJob.rows[0].id + ")");
        } catch (error) {
          console.error("a338    Error inserting new job:", error);
        }
        console.log("a34     working with parentJob!build_id=" + q4.rows[0].build_id + ", parentjob!product_id=" + q4.rows[0].product_id);
        newJobID = newJob.rows[0].id;
        const newRelationship = await pool.query("INSERT INTO job_process_flow (antecedent_id, decendant_id) VALUES (" + jobID + ", " + newJobID + ") ;");
        console.log("a39     job relationship added to job_process_flow for " + jobID + " and " + newJobID + " ")
    } else if (precedence == "origin") {
        console.log("a50")
        //pull down the build record.  What kind of build? garage or hay shed?
        const q2 = await pool.query("SELECT product_id FROM builds WHERE builds.id = $1", [buildID]) ;    
        const productID = q2.rows[0].product_id        ;
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
          await createDecendantsForJob(newJobID, pool);      // recursivle build out the build process based on the template");
        } else {
          console.log("3925789 process will fail because newJobID has not been set")
        }
        
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

    const job_id = req.query.job_id;
    const q1 = await client.query("SELECT * FROM job_process_flow WHERE antecedent_id = $1;", [job_id]);  
    console.log("ii3     this job has ["+ q1.rowCount + "] children")
    const q2 = await client.query("SELECT * FROM job_process_flow WHERE decendant_id = $1;", [job_id]);  
    let parentID = q2.rows[0].antecedent_id
    console.log("ii4     job parent is ", parentID )
    const result = await client.query("DELETE FROM jobs WHERE id = $1 RETURNING *;", [job_id]);  
    
    // Check if rowCount is not equal to 1
    if (result.rowCount !== 1) {
      throw new Error("Failed to delete job");
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

export async function createDecendantsForJob(jobID, pool) {
   // Define the function to write a job to the database
  console.log("c11    createDecendantsForJob("+ jobID + ")")
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
      const q3 = await pool.query("SELECT display_text, reminder_id, id, product_id, sort_order FROM job_templates b WHERE b.product_id = " + productID + " AND b.antecedent_array = '"+ oldJob.job_template_id + "'");  
      const newTemplate = q3.rows[0];
      console.log("c16    ", q3.rows);

      // TASKS   ------- read tasks from template file
      const q4 = await pool.query(`
                                      INSERT INTO tasks (display_text, free_text, job_id, current_status, owned_by, task_template_id, precedence, sort_order)
                                      SELECT display_text, free_text, ${jobID}, 'pending', owned_by, id, precedence, sort_order
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
                    'pending',           -- Default status
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

        console.log("c167   ", q5.rows[0]);
        let reminderID = q5.rows[0].id
        let reminderTemplateID= q5.rows[0].template_id
        const triggerTemplate = q5.rows[0].trigger;     // example taskID(10)
        console.log("c171    ", triggerTemplate);
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

     



      if (q3.rowCount !== 0) {       //no more templates defined
          const q2 = await pool.query("INSERT INTO jobs (display_text, reminder_id, job_template_id, product_id, build_id, sort_order) VALUES ('"+ newTemplate.display_text + "', " + newTemplate.reminder_id + ", " + newTemplate.id + ", " + newTemplate.product_id + ", " + oldJob.build_id + ", '" + newTemplate.sort_order + "') returning id")
          console.log("c40");
          console.log("Added " + q2.rows.length + " rows.");
          const newJob = q2.rows[0];     // assumes only 1 child
          console.log("c41");
          if (q2.rowCount !== 0) {
            console.log("c42");
            newJobID = newJob.id
            console.log("c43   just inserted a new job("+ newJobID +"). We will now mark it as a decendant of job("+ oldJob.id +"). "  );
            //newJobID = newJob.rows[0].id;
            console.log("c44");
            const q3 = await pool.query("INSERT INTO job_process_flow (decendant_id, antecedent_id) VALUES (" + newJob.id + ", " + oldJob.id + ") ;");
            console.log("c45   Added " + q3.rowCount + " rows to processflow. Added the relationship.");

            //const q4 = await pool.query("INSERT INTO tasks (display_text, job_id, current_status, precedence) VALUES ('UNNAMED', "+ job_id +", 'active', '"+ precedence + "') RETURNING id;");      


          }

          console.log("c46");
          if (q2.rowCount !== 0) {
            console.log("c47");
            newJobID = newJob.id ;
            console.log("c48");
            console.log("recursivly adding jobs for the new job("+newJobID +")" );
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







app.listen(port, () => {
  console.log(`rd9     STARTED running on port ${port}`);
});



//#region not in use

// GET - Read operation
app.get('/api/resource', readHandler);

// POST - Create operation
app.post('/api/resource', createHandler);

// PUT - Update operation
app.put('/api/resource/:id', updateHandler);

// DELETE - Delete operation
app.delete('/api/resource/:id', deleteHandler);

// Example handler function for reading data
function readHandler(req, res) {
  // Implement logic to retrieve data from the database
  // Return response with retrieved data
  res.json({ message: 'Reading data from the database' });
}

// Example handler function for creating data
function createHandler(req, res) {
  const { table } = req.params; // Assuming you specify the table in the URL parameters
  
  // Implement logic to create data in the specified table
  // Access request body for data to be created (req.body)
  // Execute the appropriate SQL query based on the specified table

  // Example: Using PostgreSQL client library (e.g., pg)
  pool.query(`INSERT INTO ${table} (column1, column2) VALUES ($1, $2)`, [value1, value2], (err, result) => {
      if (err) {
          // Handle error
          return res.status(500).json({ error: 'Failed to create data' });
      }
      res.json({ message: 'Data created successfully' });
  });
}

// Example handler function for updating data
function updateHandler(req, res) {
  // Implement logic to update data in the database
  // Access request parameters for identifying data to be updated (req.params)
  res.json({ message: 'Updating data in the database' });
}

// Example handler function for deleting data
function deleteHandler(req, res) {
  // Implement logic to delete data from the database
  // Access request parameters for identifying data to be deleted (req.params)
  res.json({ message: 'Deleting data from the database' });
}

//#endregion




