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
