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

console.log("re1     STARTING on DB ", process.env.PG_DATABASE);


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


  async function getNextTasks2() {
    console.log("gnf1    new get next tasks gangnam style")
    const q1 = await pool.query(`DELETE FROM worksheets where build_id is not null;`);
    const pendingJobs = await pool.query("SELECT * FROM jobs where current_status = 'pending' and tier <> 500 order by build_id, sort_order;");

    for (const job of pendingJobs.rows) {
      try {
        console.log("gnf2   processing build("+job.build_id+") - adding "+job.current_status+" job(" + job.id + ") to user("+ job.user_id +") dayTask list:", job.display_text, )
        let writeRecord = true;
        const title = job.display_text;
        const buildID = job.build_id || 0; // 0 is an error case - if this column is null then it is a user defined task and never updated
        let desc = "unknown customer";
        if (buildID !== 0) {
          const custQuery = await pool.query("select c.id, c.full_name, c.home_address from builds b inner join customers c on b.customer_id = c.id where b.id = $1;", [job.build_id]);
          desc = "Job(" + job.id + ") for " + custQuery.rows[0].full_name + "(" + custQuery.rows[0].id + ") at "+ custQuery.rows[0].home_address ;
        }
        let user_id = job.user_id || 1; // Default to system admin if no user_id is provided
        let targetDate = job.target_date || new Date(); // Default to current date if no target_date is provided

        const q2 = await pool.query(`INSERT INTO worksheets (title, description, user_id, date, build_id) VALUES ($1, $2, $3, $4, $5);`, [title, desc, user_id, targetDate, buildID]);
        console.log("gnf9                ", q2.rowCount, " rows inserted. ");
      } catch {
        console.log("gnf8    failed on job(" + job.id + ")")
      }
    }

  }

  async function getNextTasks() {
    try {
        console.log("gnt1    STARTING on DB ", process.env.PG_DATABASE);
        //rebuild user_id = 1 worksheet
        const q1 = await pool.query(`DELETE FROM worksheets where description is not null;`);
        console.log("gnt08    ", q1.rowCount + " rows deleted from worksheets");

        const buildQuery = await pool.query("SELECT * FROM builds;");
        const builds = buildQuery.rows;
        console.log("gnt09    ", builds.length + " builds found");

        // Loop through each build
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();
        console.log(`gnt10    Current time: ${currentHour}:${currentMinute}:${currentSecond}`);
        console.log("gnt11   updating day_task_list matView")
        for (const build of builds) {
            console.log("gnt31    adding worksheet for build_id: ", build.id)
            
            // Query to get a list of builds
            const combiTasks = await pool.query("SELECT * FROM combined_tasks WHERE task_completed is null and build_id = $1 order by job_sort, task_sort;", [build.id]);
            const tasks = combiTasks.rows;
            // console.log("gnt33     found " +  combiTasks.rowCount + " tasks for build_id: ", build.id);

            // Get the first incomplete task for the current build
            const task = tasks[0];
            // console.log("gnt34    searching build " + build.id + " for first task... task.id " + task.task_id + ", title: " + task.task_text + " , sort_order " + task.task_sort);
            
            // Add the task to the work schedule
            if (task) {
                if (!task.user_id) {
                  console.log("gnt50   Task("+ task.task_id +") user_id is unassigned... skipping task:");
                  continue;
                }

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const formattedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                const targetDate = task.task_target ? task.task_target : formattedDate;
                console.log("gnt51    ", task.task_text, " target date: ", targetDate);

                const q2 = await pool.query(`
                INSERT INTO worksheets (title, description, user_id, date)
                VALUES ($1, $2, $3, $4);
              `, ["Build("+build.id+") " + task.task_text, task, task.user_id, targetDate]);
                console.log("gnt9      ", q2.rowCount + " rows inserted into worksheets for user_id: ", task.user_id);

              // console.log("gnt51      sucessfully add to worksheet for user:", task.user_id);

            }
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
  }
  
  // Function to add task to the work schedule
  function addToWorkSchedule(task) {
    // Implement the logic to add the task to the work schedule here
    console.log("gnz9   Added task to work schedule:", task);
  }
  


  async function main() {
    const now = new Date();
    console.log(`re2    manually triggered at ${now}  `, process.env.PG_DATABASE);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
        await getNextTasks2();

  }
  

async function updateJobsAt6pm() {
    const now = new Date();
    // console.log(`\x1b[32mre21     updateJobsAt6pm() STARTING at ${now} on database \x1b[0m `, process.env.PG_DATABASE);
    const pad2 = n => String(n).padStart(2, '0');
    console.log(`\x1b[32mre21     updateJobsAt6pm() STARTING at ${now.toISOString().split('T')[0]} ${pad2(now.getHours())}:${pad2(now.getMinutes())} on database\x1b[0m`, process.env.PG_DATABASE);
    const options = {
        timeZone: 'Australia/Melbourne',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat('en-AU', options);
    const melbourneTime = formatter.format(now);

    // Parse the Melbourne time to get hours, minutes, and seconds
    const [time, period] = melbourneTime.split(' ');
    let [hours, minutes, seconds] = time.split(':').map(Number);

    // Convert to 24-hour format if necessary
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    let hoursUntil6PM = 17 - hours; // 18 represents 6 PM in 24-hour format
    let minutesUntil6PM = 59 - minutes;
    let secondsUntil6PM = 59 - seconds;

    if (hoursUntil6PM < 0 || (hoursUntil6PM === 0 && minutesUntil6PM < 0) || (hoursUntil6PM === 0 && minutesUntil6PM === 0 && secondsUntil6PM < 0)) {
        // If the current time is already past 6 PM, schedule for the next day
        hoursUntil6PM += 24;
    }

    const millisecondsUntil6PM = (hoursUntil6PM * 60 * 60 + minutesUntil6PM * 60 + secondsUntil6PM) * 1000;

    console.log(`\x1b[32mre61    Starting trigger2.js    \x1b[0m`);
    console.log(`\x1b[32mre63     - Waiting until 6 PM to run the task. Time remaining: ${hoursUntil6PM} hours, ${minutesUntil6PM} minutes, ${secondsUntil6PM} seconds\x1b[0m`);

    setTimeout(async () => {
        await getNextTasks2();
        console.log("\x1b[32mre64   Task executed at 6 PM. Scheduling for the next day...\x1b[0m");


        // Calculate the time until 6 PM the next day
        const nowNextDay = new Date();
        // console.log(`\x1b[32mre65     - Current date: ${nowNextDay.toISOString().split('T')[0]} ${nowNextDay.getHours()}:${nowNextDay.getMinutes()}:${nowNextDay.getSeconds()}\x1b[0m`);
        console.log(`\x1b[32mre65     - Current date: ${nowNextDay.toISOString().split('T')[0]} ${pad2(nowNextDay.getHours())}:${pad2(nowNextDay.getMinutes())} `);
        nowNextDay.setDate(nowNextDay.getDate() + 1); // Move to the next day
        const currentHourNextDay = nowNextDay.getHours();
        const currentMinuteNextDay = nowNextDay.getMinutes();
        const currentSecondNextDay = nowNextDay.getSeconds();

        let hoursUntil6PMNextDay = 17 - currentHourNextDay;
        let minutesUntil6PMNextDay = 59 - currentMinuteNextDay;
        let secondsUntil6PMNextDay = 59 - currentSecondNextDay;

        if (hoursUntil6PMNextDay < 0 || (hoursUntil6PMNextDay === 0 && minutesUntil6PMNextDay < 0) || (hoursUntil6PMNextDay === 0 && minutesUntil6PMNextDay === 0 && secondsUntil6PMNextDay < 0)) {
            hoursUntil6PMNextDay += 24;
        }

        const millisecondsUntil6PMNextDay = (hoursUntil6PMNextDay * 60 * 60 + minutesUntil6PMNextDay * 60 + secondsUntil6PMNextDay) * 1000;

        console.log(`re9    Waiting until 6 PM tomorrow to run the task. Time remaining: ${hoursUntil6PMNextDay} hours, ${minutesUntil6PMNextDay} minutes, ${secondsUntil6PMNextDay} seconds`);

        setTimeout(updateJobsAt6pm, millisecondsUntil6PMNextDay);
    }, millisecondsUntil6PM);
}




  export { main }; // Exporting `main` as a named export


  
  updateJobsAt6pm();