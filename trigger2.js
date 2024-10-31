// trigger2.cjs
import pg from "pg";
import env from "dotenv";

env.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

console.log("re1    ", process.env.PG_DATABASE);


async function handleTrigger(triggerData) {
    const { table, column, value, modifier } = triggerData;
    console.log("tr1    ", triggerData)

    // Perform the appropriate action based on the trigger type
    console.log("tr2    " + table + column);
    let targetDate
    switch (table + column) {
      case "tasksID":
        console.log("tr401  ", `SELECT target_date FROM ${table} WHERE ${column} = $1;`, value);
        const q1 = await pool.query(`SELECT target_date FROM ${table} WHERE ${column} = $1;`,[value]);
        targetDate = q1.rows[0].target_date;
        if (targetDate) {
            console.log("tr409    Triggered on date:", targetDate + parseint(modifier));
        } else {
            console.log("tr408    no target_date on linked task ");
        }
        
        break;
      case "monthEnd":
        // const taskId = parseInt(value.match(/\d+/)[0]);
        // const days = parseInt(value.match(/[-+]\d+/)[0]);
        console.log(`tr41   Triggered by task ID ${taskId} with ${days} days`);
        // break;
      case "jobsID":
        // const jobId = parseInt(value.match(/\d+/)[0]);
        // const weeks = parseInt(value.match(/[-+]\d+/)[0]);
        console.log(`tr42    Triggered by job ID ${jobId} with ${weeks} weeks`);
        // break;
      case "saleDate":
        // const saleDateOffset = parseInt(value);
        console.log(`tr43   Triggered by sale date with ${saleDateOffset} days`);
        // break;
      case "monthEnd":
        // const monthEndOffset = parseInt(value);
        console.log(`tr44    Triggered by month end with ${monthEndOffset} days`);
        // break;
      default:
        console.log("tr48    Unknown trigger type:", type);
    }
  }

  async function startNewBuilds(){
    console.log("st1")

    try {
        
        const q1 = await pool.query(`SELECT enquiry_date FROM builds WHERE current_status is null;`);
        for (const reminder of q1.rows) {
            const startDate = new Date(q1.rows[0].enquiry_date);
            console.log("st23    ", q1.rows[0].enquiry_date);  
            await startFirstJob()
        }
    } catch (error) {
        console.error("st8   Error:", error.message);
    }
  }

  async function tmp() {
    try {

        const trigger = {
            table: "tasks",
            column: "ID",
            value: "10",
            modifier: "+4"
          };
      
      const q2 = await pool.query(`
        UPDATE reminders set trigger = $1 WHERE id = 10;
      `, [trigger]);
      
        console.log("a9    Inserted into worksheets");
    } catch (error) {
        console.error("a8   Error:", error.message);
    } finally {
      // Close the pool to end the script
        await pool.end();
        process.exit(0);
    }
  }

  async function getNextTasks() {
    console.log("gnt11  ")
    try {
        //rebuild user_id = 1 worksheet
        const q1 = await pool.query(`DELETE FROM worksheets where description is not null;`);

        const buildQuery = await pool.query("SELECT * FROM builds;");
        const builds = buildQuery.rows;

        // Loop through each build
        for (const build of builds) {
            console.log("gnt31  build_id: ", build.id)
            
            // Query to get a list of builds
            const combiTasks = await pool.query("SELECT * FROM combined_tasks WHERE task_completed is null and build_id = $1 order by job_sort, task_sort;", [build.id]);
            const tasks = combiTasks.rows;
            console.log("gnt33  returned ", combiTasks.rowCount);

            // Get the first incomplete task for the current build
            const task = tasks[0];
            console.log("gnt34  task.id " + task.task_id + ", title: " + task.task_text + " , sort_order " + task.sort_order);
            
            // Add the task to the work schedule
            if (task) {
                console.log("gnt51  ")

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const formattedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                const targetDate = task.task_target ? task.task_target : formattedDate;
                
                const q2 = await pool.query(`
                INSERT INTO worksheets (title, description, user_id, date)
                VALUES ($1, $2, $3, $4);
              `, ["Build("+build.id+") " + task.task_text, task, task.user_id, targetDate]);
            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
  }
  
  // Function to add task to the work schedule
  function addToWorkSchedule(task) {
    // Implement the logic to add the task to the work schedule here
    console.log("Added task to work schedule:", task);
  }
  



  async function main() {


    await getNextTasks();



  }
  




  export { main }; // Exporting `main` as a named export
