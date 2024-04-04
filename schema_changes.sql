
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
INSERT INTO job_templates(user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) 
VALUES 
    (1, 1, 1, 'Site Appraisal', NULL, NULL, 1, NULL),
    (1, 1, 1, 'Concreting', NULL, 1, 2, 1),
    (1, 1, 1, 'Erecting', NULL, 2, 3, 1),
    (1, 1, 1, 'Plumbing', NULL, 3, NULL, 1);



drop table task_templates;
CREATE TABLE task_templates
(
    id SERIAL PRIMARY KEY,
    job_template_id INTEGER,  
    precedence VARCHAR(15) ,     --    pretask, postask, concurrent -1, 0 or 1.... is this task relevent before, during or after completion of the main job?
    display_text VARCHAR(127),
    free_text TEXT,
    owner_id INTEGER   --  if the current user owns the task they can archive or confirm the applicability.  Is it really necessary to call the plumber after you finish a trench?   Bryan can exert some control over the process by adding a task himself
);
INSERT INTO task_templates(job_template_id, precedence, display_text, free_text, owner_id)
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

