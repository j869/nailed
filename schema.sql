drop table users;
CREATE TABLE users
(
    id SERIAL PRIMARY KEY,     -- returns an integer from 1 to ?
    email VARCHAR(127) NOT NULL UNIQUE,
    password VARCHAR(127),
    full_name TEXT,
    display_name VARCHAR(15),
    next_task_id VARCHAR(127),
    system_access_type VARCHAR(127)
);

--#region  not yet implemented

drop table roles;
create table roles
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    display_text VARCHAR(63),
    escalation_user_id INTEGER
);



drop table conversations;
CREATE TABLE conversations
(
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(15),
    person_id VARCHAR(15),        -- OPTIONAL if you have a link to the user table, or the customer table you can put it here
    message_text TEXT,
    has_attachment VARCHAR(127),           -- defaults to 0.  stores the quantity of attachments and (perhaps) what kind of attachment
    visibility VARCHAR(15),            -- I want everyone to see when the customer isnt happy, site-plans, etc... but only myself to see when we're discussing price
    job_id INTEGER,          -- link conversation back to the relevant job
    post_date TIMESTAMP      -- order conversation by this
);



drop table attachments;
CREATE TABLE attachments
(
    id SERIAL PRIMARY KEY,
    thumbnail bytea,     -- images and video are stored in a seperate database for performance reasons
    link VARCHAR(1023),
    conversation_id INTEGER
);

--#endregion




--#region builds
drop table builds;
CREATE TABLE builds
(
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,      --one customer, many builds
    product_id INTEGER,
	enquiry_date TIMESTAMP,             -- the active enquiry.. reminder in 2 weeks...  otherwise value should be null
    job_id INTEGER              -- the currently active job in progress
);
drop table products;    -- behaves as the build_templates table
CREATE TABLE products   --  What if the build is not a 6x6 garage? you need a different process
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127)     -- american barn, garaport
);
--#endregion




--#region jobs

drop table jobs;
CREATE TABLE jobs
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127),
    free_text TEXT,
    job_template_id INTEGER,        -- provides some checking if the display_text changes.  when a change occurs it probably means that the user intends to define a different task, but it could just be wording                                   -- the original task template that was used to draft pre-job and post-job tasks (not changed after creation).  
    user_id INTEGER,    -- person responsible
    role_id INTEGER,     -- the task relates to which users role? John has driver, building maintenance, trencher role - this affects the default task_template used
    build_id INTEGER,
    product_id INTEGER,     -- is it an american barn or a dog kennel?
    reminder_id INTEGER,     -- defines how and how often reminders are sent
    conversation_id INTEGER,     -- stays the same across the build.  I want to see all customer interactions for the whole build
    target_date TIMESTAMP,      -- if you miss the target date, this date will increment based on the reminder schedule
    created_by varchar(127),     -- it could be the user_id, but more likely it will be a function() on behalf of a user
    created_date TIMESTAMP,     -- INSERT INTO t (col_timestamp) VALUES ('2022-10-10 11:30:30');     use select LOCALTIMESTAMP(0); to set value because NOW() returns the timezone
    change_array TEXT,      -- who changed it, when, and what did they change?  Excludes changes to the notes, excludes adding to the conversation... Task definition type datapoints only (i.e due date, person responsible, job name, etc)
    completed_by VARCHAR(127),     -- who clicked the 'done' button, and (maybe) which machine were they using?
    completed_date TIMESTAMP,
    current_status VARCHAR(127)       -- active, pending, completed
);



drop table job_templates;
CREATE TABLE job_templates
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER,    --  who are we trying to help? how do THEY do this job?
    role_id INTEGER,     -- what role are they currently in? the 'Monthly Service' is differnet for a truck vs a computer.
    product_id INTEGER,        -- are we building an american barn or a dog kennel?       product template table (doesnt exist yet)
    display_text VARCHAR(127),       --  must be unique against user and role - defines the job, links the job.display_text field
    free_text TEXT,                 -- prepopulate the jobs.free_text field with this value. bryan can use this to add reminders, every time someone does this task. i.e. 'garaports must be RHS and bolted!'
    antecedent_array VARCHAR(127),       --links to job_templates.id                 applied when a customer is created, and will create a process-flow of the build process
    decendant_array VARCHAR(127),        --links to the job_templates.id             to be used recursivly to create the process-flow
    reminder_id INTEGER   -- what reminder schedule is normally used for this job
);
delete from job_templates;
INSERT INTO job_templates(user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) 
VALUES 
    (1, 1, 1, 'Site Appraisal', NULL, 1, 1, NULL),
    (1, 1, 1, 'Concreting', NULL, 1, 2, 1),
    (1, 1, 1, 'Erecting', NULL, 2, 3, 1),
    (1, 1, 1, 'Plumbing', NULL, 3, NULL, 1);


drop table job_process_flow;
CREATE TABLE job_process_flow
(
    id SERIAL PRIMARY KEY,
    antecedent_id INTEGER,     --job_id relating to the parent job
    decendant_id INTEGER        -- job_id relating to the child job
);

--#endregion




--#region tasks

drop table tasks;
CREATE TABLE tasks    -- would this be better named activities??    -- a very large table
(
    id SERIAL PRIMARY KEY,
    job_id INTEGER,
    precedence varchar(15)    -- is it a pre task or a post task
    display_text VARCHAR(127),
    free_text TEXT,
    current_status VARCHAR(127),       -- tentitive/pending: recently created by a task_template on a new job, active: confirmed as applicable against role_id and user_id for this job, complete: task has been performed, archived: task was not relavant or has been supressed (deleted) by the user
    owner_id INTEGER,     -- if Bryan assigns a task to a job, you need bryan to remove it
);
drop table task_templates;
CREATE TABLE task_templates
(
    id SERIAL PRIMARY KEY,
    job_template_id INTEGER,  
    precedence VARCHAR(15) ,     --     pretask, postask, concurrent -1, 0 or 1.... is this task relevent before, during or after completion of the main job?
    display_text VARCHAR(127),
    free_text TEXT,
    current_status VARCHAR(127),     -- default status    
    owner_id INTEGER   --  if the current user owns the task they can archive or confirm the applicability.  Is it really necessary to call the plumber after you finish a trench?   Bryan can exert some control over the process by adding a task himself
);
delete from task_templates;
INSERT INTO public.task_templates(job_template_id, precedence, display_text, free_text, owner_id)
VALUES (1, 'pretask', 'check site issues', NULL, 1),
       (1, 'pretask', 'confirm siting', NULL, 1),
       (2, 'pretask', 'select contractor', NULL, 1),
       (2, 'pretask', 'issue purchasing options', NULL, 1),
       (2, 'pretask', 'call up VP concretor', NULL, 1),
       (2, 'pretask', 'set slant date', NULL, 1),
       (2, 'pretask', 'contact home dringer to louise commencement', NULL, 1),
       (2, 'pretask', 'start confirmed with contractor', NULL, 1),
       (2, 'pretask', 'measure set out and slab', NULL, 1),
       (2, 'pretask', 'concrete poured', NULL, 1),
       (2, 'postask', 'advise accounts to invoice', NULL, 1),
       (3, 'pretask', 'select contractor', NULL, 1),
       (3, 'pretask', 'issue purchase order', NULL, 1),
       (3, 'pretask', 'call up erector - slab pour day', NULL, 1),
       (3, 'pretask', 'set start date - 7 days after slab pour', NULL, 1),
       (3, 'pretask', 'contact home owner to advise erecting commencement date', NULL, 1),
       (3, 'pretask', 'start confirmed with erector', NULL, 1),
       (3, 'pretask', 'confirm ename ealected', NULL, 1),
       (3, 'pretask', 'check frame', NULL, 1),
       (3, 'pretask', 'confirm cladding complete', NULL, 1),
       (3, 'pretask', 'check cladding', NULL, 1),
       (3, 'postask', 'advise accounts to invoice', NULL, 1),
       (4, 'pretask', 'establish stormwater connection point', NULL, 1),
       (4, 'pretask', 'select plumber', NULL, 1),
       (4, 'pretask', 'book trencher', NULL, 1),
       (4, 'pretask', 'issue purchase order from plumber', NULL, 1),
       (4, 'pretask', 'confirm trencing book', NULL, 1),
       (4, 'pretask', 'call up plumber', NULL, 1),
       (4, 'pretask', 'confirm stormwater installed', NULL, 1),
       (4, 'postask', 'book final inspection by building surveyor', NULL, 1),
       (4, 'postask', 'confirm final certificate is issued', NULL, 1),
       (4, 'postask', 'advise accounts to invoice', NULL, 1);

--#endregion



--#region reminders

DROP TABLE IF EXISTS public.reminders;
CREATE TABLE public.reminders (
    id SERIAL PRIMARY KEY,
    escalation1_interval VARCHAR(127),
    escalation2_interval VARCHAR(127),
    escalation3_interval VARCHAR(127),
    definition_object TEXT,
    current_status VARCHAR(127),
    created_by INTEGER,
    trigger VARCHAR(127),
    medium VARCHAR(127),
    change_log TEXT,
    task_id INTEGER
);

drop table reminders;
CREATE TABLE reminders
(
    id SERIAL PRIMARY KEY,
    escalation1_interval VARCHAR(127),
    escalation2_interval VARCHAR(127),
    escalation3_interval VARCHAR(127),
    trigger VARCHAR(127);    -- event: reminder is triggered by a task or job in the build,    -- time: specify an exact time + date to send the message,  
    medium VARCHAR(127),   -- email, text message, or work_sheet: daily task list of everything they have to do today.
    definition_object TEXT,     -- nature of the trigger including which jobID or taskID it relates to, any meta_data regarding how it is sent, escallation sequence, etc
    current_status VARCHAR(127),      -- reminder definitions are purged after the job is completed
    created_by INTEGER    -- which function() created the record... I think this field is unnecessary
);
drop table reminder_templates;
CREATE TABLE reminder_templates
(
    id SERIAL PRIMARY KEY,
    title VARCHAR(127),    
    body VARCHAR(511),   
    "trigger" VARCHAR(127),  
    medium VARCHAR(127),   
    current_status VARCHAR(127),   
    task_template_id INTEGER,
    created_by INTEGER    -- FK user_id... why? is this so that the reminder can't be deleted... I think this field is unnecessary
);
INSERT INTO reminder_templates (task_template_id, title, body, medium, "trigger", current_status, created_by)
VALUES
(1, 'Site Visit Reminder', 'Schedule a site visit to confirm the suitability of the site for the project activities', 'work_sheet', 'saleDate+14', 'pending', 1),
(1, 'Site Visit Reminder', 'Schedule a site visit to confirm the suitability of the site for the project activities', 'work_sheet', 'taskID(2) - 1', 'pending', 1),
(2, 'Site Visit Reminder', 'Schedule a site visit to confirm the suitability of the site for the project activities', 'work_sheet', 'date + 0', 'pending', 1),
(3, 'Contractor Selection Deadline', 'Finalize the selection of the contractor for the project', 'work_sheet', 'taskID(10) - 14', 'pending', 1),
(4, 'Procurement Review', 'Review available purchasing options and finalize procurement decisions', 'work_sheet', 'jobID(2) - 7', 'pending', 1),
(5, 'Concrete Delivery Confirmation', 'Confirm the delivery schedule with the concretor', 'work_sheet', 'taskID(10) - 1', 'pending', 1),
(6, 'Set Slant Date', '', 'work_sheet', 'taskID(5) + 1', 'pending', 1),
(7, 'Contact Home Dringer to Louise Commencement', '', 'work_sheet', 'taskID(6) + 1', 'pending', 1),
(8, 'Start Confirmed with Contractor', '', 'work_sheet', 'taskID(7) + 1', 'pending', 1),
(9, 'Measure Set Out and Slab', '', 'work_sheet', 'taskID(8) + 1', 'pending', 1),
(10, 'Concrete Pouring Reminder', 'FYI only - Schedule the pouring of concrete at the site', 'work_sheet', 'date - 2', 'pending', 1),
(11, 'Invoicing Reminder', 'Send a reminder to the accounts department to generate invoices for completed tasks', 'work_sheet', 'monthEnd - 7', 'pending', 1),
(12, 'Select Contractor', '', 'work_sheet', 'taskID(11) + 1', 'pending', 1),
(13, 'Issue Purchase Order', '', 'work_sheet', 'taskID(12) + 1', 'pending', 1),
(14, 'Call up Erector - Slab Pour Day', '', 'work_sheet', 'taskID(13) + 1', 'pending', 1),
(15, 'Set Start Date - 7 Days After Slab Pour', '', 'work_sheet', 'taskID(14) + 1', 'pending', 1),
(16, 'Contact Home Owner to Advise Erecting Commencement Date', '', 'work_sheet', 'taskID(15) + 1', 'pending', 1),
(17, 'Start Confirmed with Erector', '', 'work_sheet', 'taskID(16) + 1', 'pending', 1),
(18, 'Confirm Ename Elected', '', 'work_sheet', 'taskID(17) + 1', 'pending', 1),
(19, 'Check Frame', '', 'work_sheet', 'taskID(18) + 1', 'pending', 1),
(20, 'Confirm Cladding Complete', '', 'work_sheet', 'taskID(19) + 1', 'pending', 1),
(21, 'Check Cladding', '', 'work_sheet', 'taskID(20) + 1', 'pending', 1),
(22, 'Advise Accounts to Invoice', '', 'work_sheet', 'taskID(21) + 1', 'pending', 1),
(23, 'Establish Stormwater Connection Point', '', 'work_sheet', 'taskID(22) + 1', 'pending', 1),
(24, 'Select Plumber', '', 'work_sheet', 'taskID(23) + 1', 'pending', 1),
(25, 'Book Trencher', '', 'work_sheet', 'taskID(24) + 1', 'pending', 1),
(26, 'Issue Purchase Order from Plumber', '', 'work_sheet', 'taskID(25) + 1', 'pending', 1),
(27, 'Confirm Trenching Book', '', 'work_sheet', 'taskID(26) + 1', 'pending', 1),
(28, 'Call up Plumber', '', 'work_sheet', 'taskID(27) + 1', 'pending', 1),
(29, 'Confirm Stormwater Installed', '', 'work_sheet', 'taskID(28) + 1', 'pending', 1),
(30, 'Book Final Inspection by Building Surveyor', '', 'work_sheet', 'taskID(29) + 1', 'pending', 1),
(31, 'Confirm Final Certificate Is Issued', '', 'work_sheet', 'taskID(30) + 1', 'pending', 1);


--#endregion




-- John discussed key requirements with Bryan, Alex, and Amandah on 12Feb
-- For future action:
--     > add provision to link to multiple QBE numbers (for quotes), and E-Numbers (for builds)
drop table customers;
CREATE TABLE customers
(
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    home_address VARCHAR(511),     -- Bryan order: name, address, phone number, email (26Feb24)
	primary_phone VARCHAR(15) NOT NULL,     --     +61409877561
    primary_email VARCHAR(255),
	contact_other TEXT,                -- notes. wifes name, wifes contact, best time to call
	current_status VARCHAR(255),
    follow_up TIMESTAMP               -- date to next contact the customer, otherwise null
);


drop table product_templates;      -- old name for table products
-- CREATE TABLE product_templates
-- (
--     id SERIAL PRIMARY KEY,
--     display_text VARCHAR(127)     -- american barn, garaport
-- );




