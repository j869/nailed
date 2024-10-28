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
	enquiry_date TIMESTAMP,             -- the start date.. sets the reminder schedule...  otherwise value should be null
    job_id INTEGER,              -- the currently active job in progress
    current_status VARCHAR(127),
    change_log TEXT
);
drop table products;    -- behaves as the build_templates table
CREATE TABLE products   --  What if the build is not a 6x6 garage? you need a different process
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127),     -- american barn, garaport
    change_log TEXT
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
    current_status VARCHAR(127),       -- active, pending, completed
    change_log TEXT
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
    reminder_id INTEGER,   -- what reminder schedule is normally used for this job
    change_log TEXT
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
    owned_by INTEGER,     -- if Bryan assigns a task to a job, you need bryan to remove it
    user_date TIMESTAMP,
    target_date TIMESTAMP,
    completed_date TIMESTAMP,
    completed_by INTEGER,
    completed_comment INTEGER,
    change_log TEXT,
    task_template_id INTEGER,
    task_id INTEGER

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
    owned_by INTEGER,   --  if the current user owns the task they can archive or confirm the applicability.  Is it really necessary to call the plumber after you finish a trench?   Bryan can exert some control over the process by adding a task himself
    change_log TEXT
);
delete from task_templates;
INSERT INTO public.task_templates(job_template_id, precedence, display_text, free_text, owned_by, sort_order)
VALUES 
(1, 'pretask', 'Check site issues', NULL, 1, '1.10'),
(1, 'pretask', 'Confirm siting', NULL, 1, '1.20'),
(2, 'pretask', 'Select contractor', 'Enter name here:', 1, '2.10'),
(2, 'pretask', 'Issue purchase order', NULL, 1, '2.20'),
(2, 'pretask', 'Call up concretor', NULL, 1, '2.30'),
(2, 'pretask', 'Set start date', NULL, 1, '2.40'),
(2, 'pretask', 'Planned pour date', 'Planned date: ', 1, '2.45'),
(2, 'pretask', 'Contact home owner to advise commencement', NULL, 1, '2.50'),
(2, 'pretask', 'Start confirmed with contractor', NULL, 1, '2.60'),
(2, 'pretask', 'Measure set out and slab', NULL, 1, '2.70'),
(2, 'pretask', 'Concrete poured', NULL, 1, '2.80'),
(2, 'postask', 'Advise accounts to invoice', NULL, 1, '2.90'),
(3, 'pretask', 'Select contractor', 'Contractor name: ', 1, '3.10'),
(3, 'pretask', 'Confirm delivery date', 'Delivery date: ', 1, '3.15'),
(3, 'pretask', 'Issue purchase order', NULL, 1, '3.20'),
(3, 'pretask', 'Call up erector - slab pour day', NULL, 1, '3.30'),
(3, 'pretask', 'Set start date - 7 days after slab pour', NULL, 1, '3.40'),
(3, 'pretask', 'Contact home owner to advise erecting commencement date', NULL, 1, '3.50'),
(3, 'pretask', 'Start confirmed with erector', NULL, 1, '3.60'),
(3, 'pretask', 'Confirm frame erected', NULL, 1, '3.70'),
(3, 'pretask', 'Check frame', NULL, 1, '3.75'),
(3, 'postask', 'Advise accounts to Invoice frame', NULL, 1, '3.80'),
(3, 'pretask', 'Confirm cladding complete', NULL, 1, '3.85'),
(3, 'pretask', 'Check cladding', NULL, 1, '3.90'),
(3, 'postask', 'Advise accounts to invoice', NULL, 1, '3.95'),
(4, 'pretask', 'Establish stormwater connection point', NULL, 1, '4.10'),
(4, 'pretask', 'Select plumber', NULL, 1, '4.20'),
(4, 'pretask', 'Book trencher', NULL, 1, '4.30'),
(4, 'pretask', 'Issue Purchase order for plumber', NULL, 1, '4.40'),
(4, 'pretask', 'Confirm trenching day set', 'Date: ', 1, '4.50'),
(4, 'pretask', 'Confirm plumber booked to start', 'Date: ', 1, '4.60'),
(4, 'pretask', 'Confirm trenching done', NULL, 1, '4.65'),
(4, 'pretask', 'Confirm plumber start', 'Date: ', 1, '4.70'),
(4, 'pretask', 'Confirm stormwater installed', NULL, 1, '4.75'),
(4, 'postask', 'Book final inspection by building surveyor', NULL, 1, '4.80'),
(4, 'postask', 'Confirm final certificate is issued', NULL, 1, '4.85'),
(4, 'postask', 'Advise accounts to invoice', NULL, 1, '4.90');

--#endregion



--#region reminders

DROP TABLE IF EXISTS reminders;
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(127),    
    body VARCHAR(511),  
    current_status VARCHAR(127),
    created_by INTEGER,
    trigger_event TEXT,
    medium VARCHAR(127),
    task_id INTEGER,
    escalation1_interval VARCHAR(127),
    escalation2_interval VARCHAR(127),
    escalation3_interval VARCHAR(127),
    definition_object TEXT,
    change_log TEXT
);


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




DROP TABLE IF EXISTS worksheets;
CREATE TABLE worksheets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    user_id INTEGER,
    date DATE
);






CREATE OR REPLACE VIEW combined_tasks AS
SELECT
    b.id as build_id,
	b.enquiry_date as build_start,
	b.product_id as build_product,
    j.id as job_id,
	j.display_text as job_text,
	j.target_date as job_target,
	j.completed_date as job_completed,
	j.current_status as job_status,
    t.id as task_id,
	t.display_text as task_text,
	t.target_date as task_target,
	t.completed_date as task_completed,
	t.current_status as task_status
FROM builds b
LEFT JOIN jobs j ON j.build_id = b.id
LEFT JOIN tasks t ON t.job_id = j.id
order by t.job_id, j.build_id;





--#region  not yet integrated with above SQL




delete from products where display_text <> 'Garage';


ALTER TABLE builds
ADD COLUMN enum VARCHAR(31);










--#region chages already added to prod 

-- add a column so we can move tasks around in the UI

ALTER TABLE jobs
ADD COLUMN completed_by_person VARCHAR(63);

ALTER TABLE tasks
ADD COLUMN completed_by_person VARCHAR(63);

ALTER TABLE job_templates
ADD COLUMN sort_order VARCHAR(7);

ALTER TABLE jobs
ADD COLUMN sort_order VARCHAR(7);

ALTER TABLE tasks
ADD COLUMN sort_order VARCHAR(7);

ALTER TABLE task_templates
ADD COLUMN sort_order VARCHAR(7);

-- pupulate the new column with the id (a proxy for the current order)

UPDATE jobs
SET sort_order = id::VARCHAR(8);

UPDATE job_templates
SET sort_order = id::VARCHAR(8);

UPDATE tasks
SET sort_order = id::VARCHAR(8);

UPDATE task_templates
SET sort_order = id::VARCHAR(8);


-- we need to change the table name for builds, to sites.... its a more accurate concept

delete from task_templates;
INSERT INTO public.task_templates(job_template_id, precedence, display_text, free_text, owned_by, sort_order)
VALUES 
(1, 'pretask', 'Check site issues', NULL, 1, '1.10'),
(1, 'pretask', 'Confirm siting', NULL, 1, '1.20'),
(2, 'pretask', 'Select contractor', 'Enter name here:', 1, '2.10'),
(2, 'pretask', 'Issue purchase order', NULL, 1, '2.20'),
(2, 'pretask', 'Call up concretor', NULL, 1, '2.30'),
(2, 'pretask', 'Set start date', NULL, 1, '2.40'),
(2, 'pretask', 'Planned pour date', 'Planned date: ', 1, '2.45'),
(2, 'pretask', 'Contact home owner to advise commencement', NULL, 1, '2.50'),
(2, 'pretask', 'Start confirmed with contractor', NULL, 1, '2.60'),
(2, 'pretask', 'Measure set out and slab', NULL, 1, '2.70'),
(2, 'pretask', 'Concrete poured', NULL, 1, '2.80'),
(2, 'postask', 'Advise accounts to invoice', NULL, 1, '2.90'),
(3, 'pretask', 'Select contractor', 'Contractor name: ', 1, '3.10'),
(3, 'pretask', 'Confirm delivery date', 'Delivery date: ', 1, '3.15'),
(3, 'pretask', 'Issue purchase order', NULL, 1, '3.20'),
(3, 'pretask', 'Call up erector - slab pour day', NULL, 1, '3.30'),
(3, 'pretask', 'Set start date - 7 days after slab pour', NULL, 1, '3.40'),
(3, 'pretask', 'Contact home owner to advise erecting commencement date', NULL, 1, '3.50'),
(3, 'pretask', 'Start confirmed with erector', NULL, 1, '3.60'),
(3, 'pretask', 'Confirm frame erected', NULL, 1, '3.70'),
(3, 'pretask', 'Check frame', NULL, 1, '3.75'),
(3, 'postask', 'Advise accounts to Invoice frame', NULL, 1, '3.80'),
(3, 'pretask', 'Confirm cladding complete', NULL, 1, '3.85'),
(3, 'pretask', 'Check cladding', NULL, 1, '3.90'),
(3, 'postask', 'Advise accounts to invoice', NULL, 1, '3.95'),
(4, 'pretask', 'Establish stormwater connection point', NULL, 1, '4.10'),
(4, 'pretask', 'Select plumber', NULL, 1, '4.20'),
(4, 'pretask', 'Book trencher', NULL, 1, '4.30'),
(4, 'pretask', 'Issue Purchase order for plumber', NULL, 1, '4.40'),
(4, 'pretask', 'Confirm trenching day set', 'Date: ', 1, '4.50'),
(4, 'pretask', 'Confirm plumber booked to start', 'Date: ', 1, '4.60'),
(4, 'pretask', 'Confirm trenching done', NULL, 1, '4.65'),
(4, 'pretask', 'Confirm plumber start', 'Date: ', 1, '4.70'),
(4, 'pretask', 'Confirm stormwater installed', NULL, 1, '4.75'),
(4, 'postask', 'Book final inspection by building surveyor', NULL, 1, '4.80'),
(4, 'postask', 'Confirm final certificate is issued', NULL, 1, '4.85'),
(4, 'postask', 'Advise accounts to invoice', NULL, 1, '4.90');




-- Insert data into job_templates table with primary key starting at 5 for "Quotes" category
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order)
VALUES 
    ( 1, 1, 1, 'Quotes', 2, 2, 1, '05'),
    ( 1, 1, 1, 'Feeling good quotes', 2, 2, 1, '06'),
    ( 1, 1, 1, 'Pre Deposit', 2, 2, 1, '07'),
    ( 1, 1, 1, 'Deposit', 2, 2, 1, '08'),
    ( 1, 1, 1, 'Distribute information', 2, 2, 1, '09'),
    ( 1, 1, 1, 'Pre-Permit', 2, 2, 1, '10'),
    ( 1, 1, 1, 'Planning Permit', 2, 2, 1, '11'),
    ( 1, 1, 1, 'Building Permit', 2, 2, 1, '12'),
    ( 1, 1, 1, 'Owner doing own Permit', 2, 2, 1, '13'),
    ( 1, 1, 1, 'Kit ordered into Production', 2, 2, 1, '14'),
    ( 1, 1, 1, 'Kit Delivery date set', 2, 2, 1, '15');
    ( 1, 1, 1, 'Document Preparation', 2, 2, 1, '10b'),


-- Insert data into task_templates table with foreign key reference to job_templates table
delete from task_templates where job_template_id > 5;
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text)
VALUES 
    (6, 'Quote sent date', '01', 'pretask', 1, NULL),
    (6, '3 day follow up – received quote check', '02', 'pretask', 1, NULL),
    (6, 'Site visit requested', '03', 'pretask', 1, NULL),
    (6, '14 days later follow up', '04', 'pretask', 1, NULL),
    (6, '21 days later follow up', '05', 'pretask', 1, NULL),
    (6, 'Monthly thereafter follow up (1)', '06', 'pretask', 1, NULL),
    (6, 'Monthly thereafter follow up (2)', '06', 'pretask', 1, NULL),
    (6, 'Final Monthly follow up', '06', 'pretask', 1, NULL),

    --Feeling good quotes
    (7, 'Set follow up date', '01', 'pretask', 1, NULL),
    (7, 'Set follow up schedule', '02', 'pretask', 1, NULL),

    -- Pre Deposit
    (8, 'Site inspection', '01', 'pretask', 1, NULL),
    (8, 'Requotes', '02', 'pretask', 1, NULL),

    --Deposit
    (9, 'Deposit date', '10', 'pretask', 1, NULL),
    (9, 'Distribute information', '20', 'pretask', 1, NULL),
    (9, 'Building permit admin', '30', 'pretask', 1, NULL),
    (9, 'Builder', '40', 'pretask', 1, 'Date: '),


    -- Pre-Permit
    (11, 'Customer quote review / provided', '10', 'pretask', 1, NULL),
    (11, 'Customer quote sent', '20', 'pretask', 1, NULL),
    (11, 'Customer acceptance prepped', '30', 'pretask', 1, NULL),
    (11, 'Customer signed acceptance', '40', 'pretask', 1, 'Date: '),
    (11, 'Customer invoiced PP and BP dep', '50', 'pretask', 1, 'Date: '),
    (11, 'Payment received', '60', 'pretask', 1, 'Date: '),


    --Planning Permit
    (12, 'Design Site plan', '01', 'pretask', 1, NULL),
    (12, 'Planning permit application submitted', '01', 'pretask', 1, 'Date: '),
    (12, 'Planning permit fee paid', '02', 'pretask', 1, 'Date: '),
    (12, 'Planning permit contact', '03', 'pretask', 1, 'Name: '),
    (12, 'Follow up schedule', '07', 'pretask', 1, NULL),
    (12, 'Planning permit issued', '09', 'pretask', 1, 'Date: '),

    --Building Permit
    (13, 'Design Site plan', '01', 'pretask', 1, NULL),
    (13, 'Signed Building Surveyor appointed', '02', 'pretask', 1, NULL),
    (13, 'Building Permit application submitted date', '03', 'pretask', 1, NULL),
    (13, 'RFI received', '04', 'pretask', 1, NULL),
    (13, 'RFI action required 1', '05a', 'pretask', 1, NULL),
    (13, 'RFI action required 2', '05b', 'pretask', 1, NULL),
    (13, 'RFI action required 3', '05c', 'pretask', 1, NULL),
    (13, 'RFI responded', '06', 'pretask', 1, NULL),
    (13, 'Building Surveyor Invoice received', '07', 'pretask', 1, NULL),
    (13, 'Balance of BP to be invoiced or not required', '08', 'pretask', 1, '2 tick options not yet included: Yes or No'),
    (13, 'Building Surveyor Invoice paid', '09', 'pretask', 1, 'Date: '),
    (13, 'Permit issued date', '10', 'pretask', 1, 'Date: '),
    (13, 'Permit Number', '11', 'pretask', 1, 'Enter permit number: '),

    --Owner doing own Permit
    (14, 'Set follow up schedules weekly, fortnightly, monthly', '01', 'pretask', 1, NULL),
    (14, 'Sent Engineering', '02', 'pretask', 1, 'Date: '),
    (14, 'Sent Elevations', '03', 'pretask', 1, 'Date: '),
    (14, 'Permit issued', '01', 'pretask', 1, 'Date: '),
    (14, 'Permit Number', '02', 'pretask', 1, 'Enter permit number: '),
    (15, 'Confirm kit ordered', '01', 'pretask', 1, NULL),
    (16, 'Delivery date set', '02', 'pretask', 1, NULL),

    -- Document preparation
    (17, 'Title / POS', '012', 'pretask', 1, NULL),
    (17, 'Covenants', '013', 'pretask', 1, NULL),
    (17, 'BAL rating / BMO', '014', 'pretask', 1, NULL),
    (17, 'Planning permit if required', '015', 'pretask', 1, NULL),
    (17, 'Proposed site plan', '016', 'pretask', 1, NULL),
    (17, 'Sewer plan', '017', 'pretask', 1, NULL),
    (17, 'LPOD', '018', 'pretask', 1, NULL),
    (17, 'RBP selected', '019', 'pretask', 1, NULL),
    (17, 'Kit quote', '110', 'pretask', 1, NULL),
    (17, 'Construction quote', '111', 'pretask', 1, NULL),
    (17, 'Draft Site plan sent to design', '112', 'pretask', 1, NULL),
    (17, 'Site plan returned from design', '113', 'pretask', 1, NULL),
    (17, 'Engineering', '114', 'pretask', 16, NULL);

    
    --#endregion

--#endregion





--#region defaultData


delete from job_templates where product_id = 2;
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Pre-Permit', 2, 2, 1, '02')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Document preparation', 2, 2, 1, '10')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Report and Consent Applications', 2, 2, 1, '30')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Planning Permit', 2, 2, 1, '40')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Building Permit', 2, 2, 1, '52')



delete from task_templates where job_template_id > 35;
-- Pre-Permit
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Customer Quote review provided', '03', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Customer quote sent', '04', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Customer acceptance prepped', '05', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Customer signed acceptance', '06', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Customer invoiced PP & BP Deposit', '07', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (36, 'Payment Received', '08', 'pretask', 1, null);

-- Document preparation
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Property Planning Report', '11', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Title', '12', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Plan of Subdivision (POS)', '13', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Covenants', '14', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Sewer Plan', '15', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Title, POS and Sewer Plan receipts filed', '16', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Shed Location (Site Map)', '17', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Australian Height Data (AHD)', '18', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Cut/Fill Details', '19', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'BAL rating / BMO', '20', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Site Plan', '21', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Site plan confirmation', '22', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Registered Building Practitioner (RBP) Selected', '23', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Kit Quote', '24', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Construction Quote', '25', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Engineering', '26', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Legal Point of Discharge (LPOD)', '27', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (37, 'Additional tasks', '28', 'pretask', 1, null);

-- Report and Consent Applications
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Report and consent application completed', '31', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Assessment criteria sheet completed', '32', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Neighbour addresses obtained/method identified', '33', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Neighbour consent letters written', '34', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Report and consent application submitted', '35', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'Invoice paid', '36', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'RFI Received', '37', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (38, 'RFI Actioned', '38', 'pretask', 1, null);

-- Planning Permit
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Planning Permit Application Submitted', '41', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Planning Permit Fee Paid', '42', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Planning Permit Contact', '43', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Request For Information (RFI) Received ', '44', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'RFI Action 1', '45', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'RFI Action 2', '46', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'RFI Action 3', '47', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'RFI Responded', '48', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Follow up schedule', '49', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (39, 'Planning Permit Issued', '50', 'pretask', 1, null);

-- Building Permit
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Signed Building Surveyor Appointed', '53', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Building Permit Application Submitted', '54', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Request For Information (RFI) Received ', '55', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'RFI Action 1', '56', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'RFI Action 2', '57', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'RFI Action 3', '58', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'RFI responded', '59', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Building Surveyor Invoice Received', '60', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Balance of BP to be invoiced if required', '61', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Building Surveyor Invoice Paid', '62', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Permit Issued (include Date)', '63', 'pretask', 1, null);
INSERT INTO task_templates (job_template_id, display_text, sort_order, precedence, owned_by, free_text) VALUES (40, 'Permit Number', '64', 'pretask', 1, null);


--endregion
