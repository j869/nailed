
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


-- gangnam style Initial Enquiry workflow

delete from products where id = 8;
insert into products (id, display_text) values (8, 'Initial Enquiry');
delete from public.job_templates where product_id = 8;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.00', '500', 8, 1, null, null, 800, 1, 'Initial Enquiry');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.01', '501', 8, 1, 800, 820, 810, 1, 'Quote created');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.02', '501', 8, 1, 800, 830, 820, 1, 'Quote reviewed');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.03', '501', 8, 1, 800, 840, 830, 1, 'Quote sent date');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.04', '501', 8, 1, 800, 850, 840, 1, '3 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.05', '501', 8, 1, 800, 860, 850, 1, '14 day follow up – received quote check');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text, free_text) VALUES ('01.06', '501', 8, 1, 800, 880, 860, 1, 'Delayed follow up', 'On hold - set the target date as required');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text, free_text) VALUES ('01.09', '501', 8, 1, 800, null, 870, 1, 'Archive this customer', 'Sale gone cold - this will archive the job');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.08', '501', 8, 1, 800, null, 880, 1, 'Add permit workflow');
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 8 and tier = 501 and decendant_array is not null;
update public.job_templates set job_change_array = '[{"antecedent": "complete","customer": [{"setCategory": "Archive - Initial Enquiry"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]' where id = 870 and product_id = 8 and tier = 501;
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "5"}]}]' where id = 880 and product_id = 8 and tier = 501;


-- gangnam style Vic Permit Applications
insert into products (id, display_text) values (5, 'Vic Permits');
delete from public.job_templates where product_id = 5;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit', null, '1.00', '500', 5, 1, null, 5200, 5100, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Create Deposit Invoice', null, '1.03', '501', 5, 1, 5100, 5106, 5103, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer consent forms', null, '1.06', '501', 5, 1, 5100, 5109, 5106, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit invoice sent to client', null, '1.09', '501', 5, 1, 5100, 5112, 5109, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer signed consent', null, '1.12', '501', 5, 1, 5100, 5115, 5112, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit paid ', 'Deposit paid date:', '1.15', '501', 5, 1, 5100, 5118, 5115, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Builder', null, '1.18', '501', 5, 1, 5100, 5203, 5118, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Document Preparation', null, '2.00', '500', 5, 1, 5100, 5300, 5200, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Property info', 'Upload', '2.03', '501', 5, 1, 5200, 5206, 5203, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Title / POS', 'Upload', '2.06', '501', 5, 1, 5200, 5209, 5206, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Covenants', 'Upload', '2.09', '501', 5, 1, 5200, 5212, 5209, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Elevations', 'Upload', '2.12', '501', 5, 1, 5200, 5215, 5212, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proposed site location', null, '2.15', '501', 5, 1, 5200, 5218, 5215, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Sewer plan', 'Upload', '2.18', '501', 5, 1, 5200, 5221, 5218, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('BAL rating / BMO', null, '2.21', '501', 5, 1, 5200, 5224, 5221, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('LPOD', 'Upload', '2.24', '501', 5, 1, 5200, 5227, 5224, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit', '(if required)', '2.27', '501', 5, 1, 5200, 5230, 5227, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RBP selected', null, '2.30', '501', 5, 1, 5200, 5233, 5230, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Kit quote', null, '2.33', '501', 5, 1, 5200, 5236, 5233, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Construction quote', null, '2.36', '501', 5, 1, 5200, 5239, 5236, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Draft Site plan sent to design', null, '2.39', '501', 5, 1, 5200, 5242, 5239, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan returned from design', null, '2.42', '501', 5, 1, 5200, 5245, 5242, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Engineering', 'Upload', '2.45', '501', 5, 1, 5200, 5301, 5245, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site Plan', null, '3.00', '500', 5, 1, 5200, 5400, 5300, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan task', null, '3.01', '501', 5, 1, 5300, 5303, 5301, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Apex', null, '3.03', '501', 5, 1, 5300, 5306, 5303, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('SW/DP', null, '3.06', '501', 5, 1, 5300, 5309, 5306, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Street Name', null, '3.09', '501', 5, 1, 5300, 5312, 5309, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Property Dimentions', null, '3.12', '501', 5, 1, 5300, 5315, 5312, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('AHD''s', null, '3.15', '501', 5, 1, 5300, 5318, 5315, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Sewer Details', null, '3.18', '501', 5, 1, 5300, 5321, 5318, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Existing Developments', null, '3.21', '501', 5, 1, 5300, 5324, 5321, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Lot & PS#', null, '3.24', '501', 5, 1, 5300, 5327, 5324, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Shed Size', null, '3.27', '501', 5, 1, 5300, 5330, 5327, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Compass', null, '3.30', '501', 5, 1, 5300, 5333, 5330, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check block Info', null, '3.33', '501', 5, 1, 5300, 5336, 5333, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check doors & Windows', null, '3.36', '501', 5, 1, 5300, 5339, 5336, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Confirm cut/fill', null, '3.39', '501', 5, 1, 5300, 5342, 5339, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check customer quote validity', null, '3.42', '501', 5, 1, 5300, 5345, 5342, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan sent to customer', null, '3.45', '501', 5, 1, 5300, 5348, 5345, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan approved', null, '3.48', '501', 5, 1, 5300, 5403, 5348, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Report & Consent / Buildover', null, '4.00', '500', 5, 1, 5300, 5500, 5400, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced R&C', null, '4.03', '501', 5, 1, 5400, 5406, 5403, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit fee paid', 'Date paid:', '4.06', '501', 5, 1, 5400, 5409, 5406, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit submitted', 'Date submitted: ', '4.09', '501', 5, 1, 5400, 5412, 5409, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit contact', 'Name: ', '4.12', '501', 5, 1, 5400, 5415, 5412, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI', 'Upload', '4.15', '501', 5, 1, 5400, 5418, 5415, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Follow up schedule', null, '4.18', '501', 5, 1, 5400, 5421, 5418, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '4.21', '501', 5, 1, 5400, 5424, 5421, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '4.24', '501', 5, 1, 5400, 5427, 5424, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '4.27', '501', 5, 1, 5400, 5430, 5427, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit issued', null, '4.30', '501', 5, 1, 5400, 5503, 5430, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning Permit', null, '5.00', '500', 5, 1, 5400, 5600, 5500, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced PP', null, '5.03', '501', 5, 1, 5500, 5506, 5503, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit fee paid', 'Date paid:', '5.06', '501', 5, 1, 5500, 5509, 5506, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit submitted', 'Date submitted: ', '5.09', '501', 5, 1, 5500, 5512, 5509, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit contact', 'Name: ', '5.12', '501', 5, 1, 5500, 5515, 5512, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI', 'Upload', '5.15', '501', 5, 1, 5500, 5518, 5515, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Follow up schedule', null, '5.18', '501', 5, 1, 5500, 5521, 5518, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '5.21', '501', 5, 1, 5500, 5524, 5521, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '5.24', '501', 5, 1, 5500, 5527, 5524, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '5.27', '501', 5, 1, 5500, 5530, 5527, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit issued', null, '5.30', '501', 5, 1, 5500, 5603, 5530, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Permit', null, '6.00', '500', 5, 1, 5500, 5700, 5600, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced BP', null, '6.03', '501', 5, 1, 5600, 5606, 5603, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('BP fee paid', 'Date paid: ', '6.06', '501', 5, 1, 5600, 5609, 5606, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Signed Building Surveyor appointed', null, '6.09', '501', 5, 1, 5600, 5612, 5609, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Submit building permit', 'Date submitted: ', '6.12', '501', 5, 1, 5600, 5615, 5612, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI received', 'Upload', '6.15', '501', 5, 1, 5600, 5618, 5615, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '6.18', '501', 5, 1, 5600, 5621, 5618, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '6.21', '501', 5, 1, 5600, 5624, 5621, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '6.24', '501', 5, 1, 5600, 5625, 5624, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Owner builder / builder contract', null, '6.27', '501', 5, 1, 5600, 5627, 5625, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI responded', null, '6.30', '501', 5, 1, 5600, 5630, 5627, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Surveyor Invoice received', null, '6.33', '501', 5, 1, 5600, 5633, 5630, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check all payments made', null, '6.36', '501', 5, 1, 5600, 5636, 5633, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Surveyor Invoice paid', null, '6.39', '501', 5, 1, 5600, 5639, 5636, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Permit issued date', null, '6.42', '501', 5, 1, 5600, 5703, 5639, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Permit Approved', null, '7.00', '500', 5, 1, 5600, 5750, 5700, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Ensure permit was paid', null, '7.03', '501', 5, 1, 5700, 5706, 5703, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Double check builder & planning permit # on Form 2', null, '7.06', '501', 5, 1, 5700, 5709, 5706, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check planning conditions & BAL & Soil Type', null, '7.09', '501', 5, 1, 5700, 5712, 5709, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Forward notice to Bryan, Eureka & builder', '(if required)', '7.12', '501', 5, 1, 5700, 5715, 5712, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Forward to owner, less applicant doc', null, '7.15', '501', 5, 1, 5700, 5718, 5715, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Update financials & move over', null, '7.18', '501', 5, 1, 5700, 5721, 5718, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Move on server, emails & Move copy to permit folder to B.S. server', null, '7.21', '501', 5, 1, 5700, 5724, 5721, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Upload permit documents', '(below)', '7.24', '501', 5, 1, 5700, null, 5724, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Amendment', null, '8.00', '500', 5, 1, 5700, null, 5750, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check for planing or R&C amendment required', null, '8.03', '501', 5, 1, 5750, 5756, 5753, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Invoice customer for secondary consent', null, '8.06', '501', 5, 1, 5750, 5759, 5756, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Apply for amendment', null, '8.09', '501', 5, 1, 5750, 5762, 5759, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Approved Amendment', null, '8.12', '501', 5, 1, 5750, 5765, 5762, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Invoice for BP Amend', null, '8.15', '501', 5, 1, 5750, 5768, 5765, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Provide to Building Surveyor', null, '8.18', '501', 5, 1, 5750, 5771, 5768, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Approved documents', 'Give to owner & builder', '8.21', '501', 5, 1, 5750, 5774, 5771, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Upload permit documents', null, '8.24', '501', 5, 1, 5750, null, 5774, 13);
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 5 and tier = 501 and decendant_array is not null;
update public.job_templates set job_change_array = '[{"antecedent": "complete","customer": [{"setCategory": "Archive - Completed Permits"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]' where id = 5724 and product_id = 5 and tier = 501;
update public.job_templates set job_change_array = '[{"antecedent": "complete","customer": [{"setCategory": "Archive - Completed Permits"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]' where id = 5774 and product_id = 5 and tier = 501;



-- gangnam style Shed Build workflow
insert into products (id, display_text) values (4, 'Shed Construction');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.00', '500', 4, 1, null, 389, 380, 1, 'Initial Enquiry');
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
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.74', '501', 4, 1, 458, 468, 467, 12, 'Concrete poured');   --474 is delayed 7 days after 467
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
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@474"}, {"target": "today_7@474"}, {"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where id = 467;   --474 is delayed 7 days after 467
update jobs set change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@474"}, {"target": "today_7@474"}, {"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where job_template_id = 467;  
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




ALTER TABLE worksheets ADD COLUMN job_id integer;
COMMENT ON COLUMN public.worksheets.job_id IS 'References the related job for this worksheet';

update products set display_text = 'Active Permits' where id = 5;