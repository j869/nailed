
ALTER TABLE public.jobs
RENAME COLUMN target_date TO original_target_date;


-- Add new columns
ALTER TABLE public.jobs 
ADD COLUMN start_date TIMESTAMP ,
ADD COLUMN target_date TIMESTAMP ,
ADD COLUMN approved_at TIMESTAMP ,
ADD COLUMN last_updated_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN snoozed_until TIMESTAMP ;

-- Add comments to columns
COMMENT ON COLUMN public.jobs.start_date IS 'When work began (optional)';
COMMENT ON COLUMN public.jobs.target_date IS 'Current deadline (adjustable)';
COMMENT ON COLUMN public.jobs.original_target_date IS 'Initial deadline (fixed for reference)';
COMMENT ON COLUMN public.jobs.completed_at IS 'When job was marked "Completed"';
COMMENT ON COLUMN public.jobs.approved_at IS 'When job was reviewed/signed off (if needed)';
COMMENT ON COLUMN public.jobs.last_updated_at IS 'Last status/field change';
COMMENT ON COLUMN public.jobs.snoozed_until IS 'If postponed temporarily';
COMMENT ON COLUMN public.jobs.created_at IS 'When the job was created';

-- Update existing column comments
COMMENT ON COLUMN public.jobs.change_log IS 'Audit log of status changes (consider jsonb for structured data)';


-- you may have to check the data for string values
ALTER TABLE jobs
ALTER COLUMN completed_by TYPE integer USING completed_by::integer;


ALTER TABLE worksheets add COLUMN build_id int;
COMMENT ON COLUMN public.worksheets.build_id IS 'if null then this task is user defined and has no customer build';

ALTER TABLE builds add COLUMN site_address VARCHAR(511);
COMMENT ON COLUMN public.builds.site_address IS 'different to address on customer record.  captures the site of the shed.';


DROP SEQUENCE IF EXISTS products_id_seq CASCADE;
ALTER TABLE products ALTER COLUMN id DROP DEFAULT;
COMMENT ON COLUMN public.products.id IS 'free text integer value to allow for custom product IDs.  This is useful for defining workflows that are not in the system by default.';

--template changes
DROP SEQUENCE IF EXISTS job_templates_id_seq CASCADE;
ALTER TABLE job_templates ALTER COLUMN id DROP DEFAULT;
COMMENT ON COLUMN public.job_templates.id IS 'in order to define workflows we want to be able to set the ID of the job template to a specific value.';

ALTER TABLE public.job_templates 
ADD COLUMN job_change_array TEXT ,
ADD COLUMN flow_change_array TEXT;


-- gangnam style Vic Permit Applications
insert into products (id, display_text) values (5, 'Vic Permits');
delete from public.job_templates where product_id = 5;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.00', '500', 5, 1, null, 509, 500, 13, 'Initial Enquiry');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.01', '501', 5, 1, 500, 502, 501, 1, 'Quote created');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.02', '501', 5, 1, 500, 503, 502, 1, 'Quote reviewed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.03', '501', 5, 1, 500, 504, 503, 13, 'Quote sent date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.04', '501', 5, 1, 500, 505, 504, 13, '3 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.05', '501', 5, 1, 500, 506, 505, 13, '14 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text, free_text) VALUES ('01.06', '501', 5, 1, 500, 507, 506, 13, 'Delayed follow up', 'On hold - set the target date as required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text, free_text) VALUES ('01.07', '501', 5, 1, 500, null, 507, 13, 'Archive this job', 'Sale gone cold - this will archive the job');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.00', '500', 5, 1, 500, 514, 509, 13, 'Deposit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.13', '501', 5, 1, 509, 511, 510, 13, 'Deposit date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.14', '501', 5, 1, 509, 512, 511, 13, 'Distribute information');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.15', '501', 5, 1, 509, 513, 512, 13, 'Building permit admin');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.16', '501', 5, 1, 509, 515, 513, 13, 'Builder');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.00', '500', 5, 1, 509, 521, 514, 13, 'Pre-Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.17', '501', 5, 1, 514, 516, 515, 13, 'Customer quote review / provided');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.18', '501', 5, 1, 514, 517, 516, 13, 'Customer quote sent');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.19', '501', 5, 1, 514, 518, 517, 13, 'Customer acceptance prepped');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.20', '501', 5, 1, 514, 519, 518, 13, 'Customer signed acceptance');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.21', '501', 5, 1, 514, 520, 519, 13, 'Customer invoiced PP and BP dep');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.22', '501', 5, 1, 514, 522, 520, 13, 'Payment received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.00', '500', 5, 1, 514, 535, 521, 13, 'Document Preparation');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.23', '501', 5, 1, 521, 523, 522, 13, 'Title / POS');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.24', '501', 5, 1, 521, 524, 523, 13, 'Covenants');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.25', '501', 5, 1, 521, 525, 524, 13, 'BAL rating / BMO');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.26', '501', 5, 1, 521, 526, 525, 13, 'Planning permit if required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.27', '501', 5, 1, 521, 527, 526, 13, 'Proposed site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.28', '501', 5, 1, 521, 528, 527, 13, 'Sewer plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.29', '501', 5, 1, 521, 529, 528, 13, 'LPOD');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.30', '501', 5, 1, 521, 530, 529, 13, 'RBP selected');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.31', '501', 5, 1, 521, 531, 530, 13, 'Kit quote');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.32', '501', 5, 1, 521, 532, 531, 13, 'Construction quote');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.33', '501', 5, 1, 521, 533, 532, 13, 'Draft Site plan sent to design');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.34', '501', 5, 1, 521, 534, 533, 13, 'Site plan returned from design');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.35', '501', 5, 1, 521, 536, 534, 13, 'Engineering');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.00', '500', 5, 1, 521, 542, 535, 13, 'Planning Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.36', '501', 5, 1, 535, 537, 536, 13, 'Design Site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.37', '501', 5, 1, 535, 538, 537, 13, 'Planning permit application submitted');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.38', '501', 5, 1, 535, 539, 538, 13, 'Planning permit fee paid');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.39', '501', 5, 1, 535, 540, 539, 13, 'Planning permit contact');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.40', '501', 5, 1, 535, 541, 540, 13, 'Follow up schedule');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.41', '501', 5, 1, 535, 543, 541, 13, 'Planning permit issued');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.00', '500', 5, 1, 535, null, 542, 13, 'Building Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.42', '501', 5, 1, 542, 544, 543, 13, 'Design Site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.43', '501', 5, 1, 542, 545, 544, 13, 'Signed Building Surveyor appointed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.44', '501', 5, 1, 542, 546, 545, 13, 'Building Permit application submitted date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.45', '501', 5, 1, 542, 547, 546, 13, 'RFI received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.46', '501', 5, 1, 542, 548, 547, 13, 'RFI responded');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.47', '501', 5, 1, 542, 549, 548, 13, 'Building Surveyor Invoice received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.48', '501', 5, 1, 542, 550, 549, 13, 'Balance of BP to be invoiced or not required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.49', '501', 5, 1, 542, 551, 550, 13, 'Building Surveyor Invoice paid');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.50', '501', 5, 1, 542, 552, 551, 13, 'Permit issued date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.51', '501', 5, 1, 542, 553, 552, 13, 'Permit Number');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.52', '501', 5, 1, 542, 554, 553, 13, 'RFI action required 1');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.53', '501', 5, 1, 542, 555, 554, 13, 'RFI action required 2');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.54', '501', 5, 1, 542, null, 555, 13, 'RFI action required 3');
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 5 and tier = 501 and decendant_array is not null;
update public.job_templates set job_change_array = '[{"antecedent": "complete","job": [{"status": "archive"}, {"target": "null"}]}]' where id = 507 and product_id = 5 and tier = 501;



-- gangnam style Shed Build workflow
insert into products (id, display_text) values (4, 'Shed Construction');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.00', '500', 4, 1, null, 389, 380, 1, 'Quotes');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.01', '501', 4, 1, 380, 382, 381, 1, 'Quote sent date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.02', '501', 4, 1, 380, 383, 382, 1, '3 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.03', '501', 4, 1, 380, 384, 383, 1, 'Site visit requested');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.04', '501', 4, 1, 380, 385, 384, 1, '14 days later follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.05', '501', 4, 1, 380, 386, 385, 1, '21 days later follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.06', '501', 4, 1, 380, 387, 386, 1, 'Monthly thereafter follow up (1)');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.07', '501', 4, 1, 380, 388, 387, 1, 'Monthly thereafter follow up (2)');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.08', '501', 4, 1, 380, 390, 388, 1, 'Final Monthly follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.00', '500', 4, 1, 380, 392, 389, 12, 'Feeling good quotes');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.09', '501', 4, 1, 389, 391, 390, 12, 'Set follow up date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.10', '501', 4, 1, 389, 393, 391, 12, 'Set follow up schedule');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.00', '500', 4, 1, 389, 395, 392, 12, 'Pre Deposit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.11', '501', 4, 1, 392, 394, 393, 12, 'Site inspection');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.12', '501', 4, 1, 392, 396, 394, 12, 'Requotes');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.00', '500', 4, 1, 392, 400, 395, 12, 'Deposit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.13', '501', 4, 1, 395, 397, 396, 12, 'Deposit date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.14', '501', 4, 1, 395, 398, 397, 12, 'Distribute information');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.15', '501', 4, 1, 395, 399, 398, 12, 'Building permit admin');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('04.16', '501', 4, 1, 395, 401, 399, 12, 'Builder');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.00', '500', 4, 1, 395, 407, 400, 12, 'Pre-Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.17', '501', 4, 1, 400, 402, 401, 12, 'Customer quote review / provided');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.18', '501', 4, 1, 400, 403, 402, 12, 'Customer quote sent');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.19', '501', 4, 1, 400, 404, 403, 12, 'Customer acceptance prepped');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.20', '501', 4, 1, 400, 405, 404, 12, 'Customer signed acceptance');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.21', '501', 4, 1, 400, 406, 405, 12, 'Customer invoiced PP and BP dep');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('05.22', '501', 4, 1, 400, 408, 406, 12, 'Payment received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.00', '500', 4, 1, 400, 421, 407, 13, 'Document Preparation');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.23', '501', 4, 1, 407, 409, 408, 13, 'Title / POS');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.24', '501', 4, 1, 407, 410, 409, 13, 'Covenants');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.25', '501', 4, 1, 407, 411, 410, 13, 'BAL rating / BMO');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.26', '501', 4, 1, 407, 412, 411, 13, 'Planning permit if required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.27', '501', 4, 1, 407, 413, 412, 13, 'Proposed site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.28', '501', 4, 1, 407, 414, 413, 13, 'Sewer plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.29', '501', 4, 1, 407, 415, 414, 13, 'LPOD');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.30', '501', 4, 1, 407, 416, 415, 13, 'RBP selected');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.31', '501', 4, 1, 407, 417, 416, 13, 'Kit quote');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.32', '501', 4, 1, 407, 418, 417, 13, 'Construction quote');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.33', '501', 4, 1, 407, 419, 418, 13, 'Draft Site plan sent to design');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.34', '501', 4, 1, 407, 420, 419, 13, 'Site plan returned from design');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('06.35', '501', 4, 1, 407, 422, 420, 13, 'Engineering');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.00', '500', 4, 1, 407, 428, 421, 13, 'Planning Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.36', '501', 4, 1, 421, 423, 422, 13, 'Design Site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.37', '501', 4, 1, 421, 424, 423, 13, 'Planning permit application submitted');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.38', '501', 4, 1, 421, 425, 424, 13, 'Planning permit fee paid');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.39', '501', 4, 1, 421, 426, 425, 13, 'Planning permit contact');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.40', '501', 4, 1, 421, 427, 426, 13, 'Follow up schedule');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('07.41', '501', 4, 1, 421, 429, 427, 13, 'Planning permit issued');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.00', '500', 4, 1, 421, 442, 428, 13, 'Building Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.42', '501', 4, 1, 428, 430, 429, 13, 'Design Site plan');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.43', '501', 4, 1, 428, 431, 430, 13, 'Signed Building Surveyor appointed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.44', '501', 4, 1, 428, 432, 431, 13, 'Building Permit application submitted date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.45', '501', 4, 1, 428, 433, 432, 13, 'RFI received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.46', '501', 4, 1, 428, 434, 433, 13, 'RFI responded');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.47', '501', 4, 1, 428, 435, 434, 13, 'Building Surveyor Invoice received');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.48', '501', 4, 1, 428, 436, 435, 13, 'Balance of BP to be invoiced or not required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.49', '501', 4, 1, 428, 437, 436, 13, 'Building Surveyor Invoice paid');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.50', '501', 4, 1, 428, 438, 437, 13, 'Permit issued date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.51', '501', 4, 1, 428, 439, 438, 13, 'Permit Number');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.52', '501', 4, 1, 428, 440, 439, 13, 'RFI action required 1');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.53', '501', 4, 1, 428, 441, 440, 13, 'RFI action required 2');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('08.54', '501', 4, 1, 428, 443, 441, 13, 'RFI action required 3');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.00', '500', 4, 1, 428, 448, 442, 12, 'Owner doing own Permit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.55', '501', 4, 1, 442, 444, 443, 12, 'Set follow up schedules weekly, fortnightly, monthly');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.56', '501', 4, 1, 442, 445, 444, 12, 'Permit issued');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.57', '501', 4, 1, 442, 446, 445, 12, 'Sent Engineering');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.58', '501', 4, 1, 442, 447, 446, 12, 'Permit Number');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('09.59', '501', 4, 1, 442, 449, 447, 12, 'Sent Elevations');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('10.00', '500', 4, 1, 442, 450, 448, 12, 'Kit ordered into Production');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('10.60', '501', 4, 1, 448, 451, 449, 12, 'Confirm kit ordered');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('11.00', '500', 4, 1, 448, 452, 450, 12, 'Kit Delivery date set');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('11.61', '501', 4, 1, 450, 453, 451, 12, 'Delivery date set');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('12.00', '500', 4, 1, 450, 455, 452, 12, 'Site Appraisal');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('12.62', '501', 4, 1, 452, 454, 453, 12, 'Check site issues');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('12.63', '501', 4, 1, 452, 456, 454, 12, 'Confirm siting');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('13.00', '500', 4, 1, 452, 458, 455, 12, 'Contract Preparation');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('13.64', '501', 4, 1, 455, 457, 456, 12, 'Contract Preparation');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('13.65', '501', 4, 1, 455, 459, 457, 12, 'Building construction contract signed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.00', '500', 4, 1, 455, 469, 458, 12, 'Concreting');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.66', '501', 4, 1, 458, 460, 459, 12, 'Select contractor');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.67', '501', 4, 1, 458, 461, 460, 12, 'Issue purchase order');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.68', '501', 4, 1, 458, 462, 461, 12, 'Call up concretor');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.69', '501', 4, 1, 458, 463, 462, 12, 'Set start date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.70', '501', 4, 1, 458, 464, 463, 12, 'Planned pour date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.71', '501', 4, 1, 458, 465, 464, 12, 'Contact home owner to advise commencement');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.72', '501', 4, 1, 458, 466, 465, 12, 'Start confirmed with contractor');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.73', '501', 4, 1, 458, 467, 466, 12, 'Measure set out and slab');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.74', '501', 4, 1, 458, 468, 467, 12, 'Concrete poured');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.75', '501', 4, 1, 458, 470, 468, 12, 'Advise accounts to invoice');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.00', '500', 4, 1, 458, 483, 469, 12, 'Erecting');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.76', '501', 4, 1, 469, 471, 470, 12, 'Select contractor');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.77', '501', 4, 1, 469, 472, 471, 12, 'Confirm delivery date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.78', '501', 4, 1, 469, 473, 472, 12, 'Issue purchase order');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.79', '501', 4, 1, 469, 474, 473, 12, 'Call up erector - slab pour day');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.80', '501', 4, 1, 469, 475, 474, 12, 'Set start date - 7 days after slab pour');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.81', '501', 4, 1, 469, 476, 475, 12, 'Contact home owner to advise erecting commencement date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.82', '501', 4, 1, 469, 477, 476, 12, 'Start confirmed with erector');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.83', '501', 4, 1, 469, 478, 477, 12, 'Confirm frame erected');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.84', '501', 4, 1, 469, 479, 478, 12, 'Check frame');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.85', '501', 4, 1, 469, 480, 479, 12, 'Advise accounts to Invoice frame');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.86', '501', 4, 1, 469, 481, 480, 12, 'Confirm cladding complete');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.87', '501', 4, 1, 469, 482, 481, 12, 'Check cladding');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('15.88', '501', 4, 1, 469, 484, 482, 12, 'Advise accounts to invoice');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.00', '500', 4, 1, 469, null, 483, 12, 'Plumbing');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.89', '501', 4, 1, 483, 485, 484, 12, 'Establish stormwater connection point');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.90', '501', 4, 1, 483, 486, 485, 12, 'Select plumber');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.91', '501', 4, 1, 483, 487, 486, 12, 'Book trencher');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.92', '501', 4, 1, 483, 488, 487, 12, 'Issue Purchase order for plumber');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.93', '501', 4, 1, 483, 489, 488, 12, 'Confirm trenching day set');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.94', '501', 4, 1, 483, 490, 489, 12, 'Confirm plumber booked to start');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.95', '501', 4, 1, 483, 491, 490, 12, 'Confirm trenching done');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.96', '501', 4, 1, 483, 492, 491, 12, 'Confirm plumber start');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.97', '501', 4, 1, 483, 493, 492, 12, 'Confirm stormwater installed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.98', '501', 4, 1, 483, 494, 493, 12, 'Book final inspection by building surveyor');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('16.99', '501', 4, 1, 483, 495, 494, 12, 'Confirm final certificate is issued');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('17.00', '501', 4, 1, 483, null, 495, 12, 'Advise accounts to invoice');

update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 4 and tier = 501 and decendant_array is not null;
--update public.job_templates set flow_change_array = null where product_id = 4;




insert into products (id, display_text) values (4, 'Shed Construction');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.00', '600', 4, 1, null, 389, 380, 1, 'Initial enquiry');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.01', '601', 4, 1, 380, 382, 381, 1, 'Quote created');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.02', '601', 4, 1, 380, 382, 381, 1, 'Quote reviewed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.03', '601', 4, 1, 380, 383, 382, 1, '3 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.04', '601', 4, 1, 380, 384, 383, 1, 'Site visit requested');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.05', '601', 4, 1, 380, 385, 384, 1, '14 days later follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.06', '601', 4, 1, 380, 386, 385, 1, '21 days later follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.07', '601', 4, 1, 380, 387, 386, 1, 'Monthly thereafter follow up (1)');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.08', '601', 4, 1, 380, 388, 387, 1, 'Monthly thereafter follow up (2)');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.09', '601', 4, 1, 380, 390, 388, 1, 'Final Monthly follow up');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.00', '600', 4, 1, 380, 392, 389, 12, 'Feeling good quotes');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.09', '601', 4, 1, 389, 391, 390, 12, 'Set follow up date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('02.10', '601', 4, 1, 389, 393, 391, 12, 'Set follow up schedule');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.00', '600', 4, 1, 389, 395, 392, 12, 'Pre Deposit');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.11', '601', 4, 1, 392, 394, 393, 12, 'Site inspection');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('03.12', '601', 4, 1, 392, 396, 394, 12, 'Requotes');