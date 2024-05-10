

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

    