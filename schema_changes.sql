

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