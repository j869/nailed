


alter table builds add column current_status VARCHAR(127);

alter table reminders add column "trigger" VARCHAR(127);    -- event: reminder is triggered by a task or job in the build,    -- time: specify an exact time + date to send the message,    -- location: alert when a user is in the vacinity,   
alter table reminders add column "medium" VARCHAR(127);    -- email, text message, or work_sheet: daily task list of everything they have to do today.

alter table tasks add column "user_date" TIMESTAMP;      -- user specified: user has specified that the task will be performed on the given date
alter table tasks add column "target_date" TIMESTAMP;      --  floating date.  it will change if precedents are delayed.  business rules imply that the task will be performed on this date
alter table tasks add column "completed_date" TIMESTAMP;      -- task was marked done on this date
alter table tasks add column "completed_by" INTEGER;      -- task was marked done by this user
alter table tasks add column "completed_comment" INTEGER;       -- may include a picture
ALTER TABLE tasks RENAME COLUMN owner_id TO owned_by;
ALTER TABLE task_templates RENAME COLUMN owner_id TO owned_by;



alter table tasks add column "change_log" TEXT;
alter table tasks add column "task_template_id" INTEGER;
ALTER TABLE jobs RENAME COLUMN "change_array" TO "change_log";
alter table task_templates add column "change_log" TEXT;
alter table job_templates add column "change_log" TEXT;
alter table jobs add column "change_log" TEXT;
alter table products add column "change_log" TEXT;
alter table builds add column "change_log" TEXT;
alter table reminders add column "change_log" TEXT;
alter table tasks add column "task_id" INTEGER;

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



DROP TABLE IF EXISTS public.reminders;
CREATE TABLE public.reminders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(127),    
    body VARCHAR(511),  
    current_status VARCHAR(127),
    created_by INTEGER,
    trigger VARCHAR(127),
    medium VARCHAR(127),
    change_log TEXT,
    task_id INTEGER,
    escalation1_interval VARCHAR(127),
    escalation2_interval VARCHAR(127),
    escalation3_interval VARCHAR(127),
    definition_object TEXT
);