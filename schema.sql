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


create table roles
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    display_text VARCHAR(63),
    escalation_user_id INTEGER
);


drop table jobs;
CREATE TABLE jobs
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127),
    free_text TEXT,
    job_template_id INTEGER,        -- provides some checking if the display_text changes.  when a change occurs it probably means that the user intends to define a different task, but it could just be wording
                                   -- the original task template that was used to draft pre-job and post-job tasks (not changed after creation).  
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
    current_status VARCHAR(127)      
);

CREATE TABLE job_process_flow
(
    id SERIAL PRIMARY KEY,
    antecedent_id INTEGER,     --job_id relating to the parent job
    decendant_id INTEGER        -- job_id relating to the child job
);

CREATE TABLE product_templates   --  What if the build is not a 6x6 garage? you need a different process
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127)     -- american barn, garaport
);

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

CREATE TABLE task_templates
(
    id SERIAL PRIMARY KEY,
    job_template_id INTEGER,  
    precedence VARCHAR(15) ,     --    pretask, postask, concurrent -1, 0 or 1.... is this task relevent before, during or after completion of the main job?
    display_text VARCHAR(127),
    free_text TEXT,
    owner_id INTEGER   --  if the current user owns the task they can archive or confirm the applicability.  Is it really necessary to call the plumber after you finish a trench?   Bryan can exert some control over the process by adding a task himself
);


CREATE TABLE tasks    -- a very large table
(
    id SERIAL PRIMARY KEY,
    display_text VARCHAR(127),
    free_text TEXT,
    job_id INTEGER,
    current_status VARCHAR(127)       -- tentitive: recently created by a task_template on a new job, active: confirmed as applicable against role_id and user_id for this job, complete: task has been performed, archived: task was not relavant or has been supressed (deleted) by the user
);

CREATE TABLE conversations
(
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(15),
    person_id VARCHAR(15),        -- OPTIONAL if you have a link to the user table, or the customer table you can put it here
    message_text TEXT,
    has_attachment VARCHAR(127),           -- defaults to 0.  stores the quantity of attachments and (perhaps) what kind of attachment
    visibility VARCHAR(15)            -- I want everyone to see when the customer isnt happy, site-plans, etc... but only myself to see when we're discussing price
);

drop table attachments;
CREATE TABLE attachments
(
    id SERIAL PRIMARY KEY,
    thumbnail bytea,     -- images and video are stored in a seperate database for performance reasons
    link VARCHAR(1023),
    conversation_id INTEGER
);


drop table reminders;
CREATE TABLE reminders
(
    id SERIAL PRIMARY KEY,
    escalation1_interval VARCHAR(127),
    escalation2_interval VARCHAR(127),
    escalation3_interval VARCHAR(127),
    definition_object TEXT,
    current_status VARCHAR(127),      -- reminder definitions are purged after the job is completed
    created_by INTEGER    -- FK user_id
);


-- John discussed key requirements with Bryan, Alex, and Amandah on 12Feb
-- For future action:
--     > add provision to link to multiple QBE numbers (for quotes), and E-Numbers (for builds)
drop table customers;
CREATE TABLE customers
(
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
	primary_phone VARCHAR(15) NOT NULL,     --     +61409877561
    primary_email VARCHAR(255),
	contact_other TEXT,
	current_status VARCHAR(255),
	contact_history TEXT
);
