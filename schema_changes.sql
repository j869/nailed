delete from job_templates where product_id = 2;
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Pre-Permit', 2, 2, 1, '02')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Document preparation', 2, 2, 1, '10')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Report and Consent Applications', 2, 2, 1, '30')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Planning Permit', 2, 2, 1, '40')
INSERT INTO job_templates ( user_id, role_id, product_id, display_text, antecedent_array, decendant_array, reminder_id, sort_order) VALUES (1, 1, 2, 'Building Permit', 2, 2, 1, '52')


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
