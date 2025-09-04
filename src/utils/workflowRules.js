// how to read a workflow



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


async function getBuildData(buildID, userSecurityClause = '1=1') {
  try {
    console.log("bc1       getBuildData called for buildID: ", buildID);
    
    // 1. Get build information with customer access verification
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
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1 AND (${userSecurityClause})
    `, [buildID]);

    if (buildResult.rows.length === 0) {
      console.log(`bc18      Build ${buildID} not found or access denied`);
      return [];
    }

    const buildData = buildResult.rows[0];
    const customerID = buildData.customer_id;

    // 2. Get customer information (already verified access above)
    const customerResult = await db.query(`
      SELECT 
        id, full_name, home_address, primary_phone, primary_email, 
        contact_other, current_status, TO_CHAR(follow_up, 'DD-Mon-YY') AS follow_up 
      FROM customers 
      WHERE id = $1
    `, [customerID]);

    // 3. Get missing jobs
    // , 
    const missingJobsResult = await db.query(`
      SELECT t.id, t.sort_order, t.display_text,
      (select b.sort_order from job_templates b where t.antecedent_array = b.id::text) as before,
      (select a.sort_order from job_templates a where t.decendant_array = a.id::text) as after
      FROM job_templates t
      WHERE t.product_id = $1 and t.tier = 500 AND t.id NOT IN (
        SELECT j.job_template_id FROM jobs j WHERE j.build_id = $2
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
    console.error('bc8       Error fetching build data:', error);
    throw error;
    return [];
  }
}

export default getBuildData;