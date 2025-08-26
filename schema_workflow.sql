
-- New Modular Vic Permits Workflows - Breaking down Product 5 into linked phases

-- Workflow 51: Pre Deposit (Steps 1.00 to 3.99)
delete from public.products where id = 51;
insert into products (id, display_text) values (51, 'Pre Deposit');
delete from public.job_templates where product_id = 51;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit', null, '1.00', '500', 51, 1, null, 5120, 5110, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Create Deposit Invoice', null, '1.03', '501', 51, 1, 5110, 5113, 5113, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer consent forms', null, '1.06', '501', 51, 1, 5110, 5116, 5116, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit invoice sent to client', null, '1.09', '501', 51, 1, 5110, 5119, 5119, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer signed consent', null, '1.12', '501', 51, 1, 5110, 5122, 5122, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Deposit paid ', 'Deposit paid date:', '1.15', '501', 51, 1, 5110, 5125, 5125, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Builder', null, '1.18', '501', 51, 1, 5110, 5128, 5128, 13);

INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Document Preparation', null, '2.00', '500', 51, 1, 5128, 5131, 5131, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Property info', 'Upload', '2.03', '501', 51, 1, 5131, 5134, 5134, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Title / POS', 'Upload', '2.06', '501', 51, 1, 5131, 5137, 5137, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Covenants', 'Upload', '2.09', '501', 51, 1, 5131, 5140, 5140, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Elevations', 'Upload', '2.12', '501', 51, 1, 5131, 5143, 5143, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proposed site location', null, '2.15', '501', 51, 1, 5131, 5146, 5146, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Sewer plan', 'Upload', '2.18', '501', 51, 1, 5131, 5149, 5149, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('BAL rating / BMO', null, '2.21', '501', 51, 1, 5131, 5152, 5152, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('LPOD', 'Upload', '2.24', '501', 51, 1, 5131, 5155, 5155, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit', '(if required)', '2.27', '501', 51, 1, 5131, 5158, 5158, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RBP selected', null, '2.30', '501', 51, 1, 5131, 5161, 5161, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Kit quote', null, '2.33', '501', 51, 1, 5131, 5164, 5164, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Construction quote', null, '2.36', '501', 51, 1, 5131, 5167, 5167, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Draft Site plan sent to design', null, '2.39', '501', 51, 1, 5131, 5170, 5170, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan returned from design', null, '2.42', '501', 51, 1, 5131, 5173, 5173, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Engineering', 'Upload', '2.45', '501', 51, 1, 5131, 5176, 5176, 13);

INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site Plan', null, '3.00', '500', 51, 1, 5131, 5179, 5179, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan task', null, '3.01', '501', 51, 1, 5179, 5182, 5182, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Apex', null, '3.03', '501', 51, 1, 5179, 5185, 5185, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('SW/DP', null, '3.06', '501', 51, 1, 5179, 5188, 5188, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Street Name', null, '3.09', '501', 51, 1, 5179, 5191, 5191, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Property Dimentions', null, '3.12', '501', 51, 1, 5179, 5194, 5194, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('AHD''s', null, '3.15', '501', 51, 1, 5179, 5197, 5197, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Sewer Details', null, '3.18', '501', 51, 1, 5179, 5200, 5200, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Existing Developments', null, '3.21', '501', 51, 1, 5179, 5203, 5203, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Lot & PS#', null, '3.24', '501', 51, 1, 5179, 5206, 5206, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Shed Size', null, '3.27', '501', 51, 1, 5179, 5209, 5209, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Compass', null, '3.30', '501', 51, 1, 5179, 5212, 5212, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check block Info', null, '3.33', '501', 51, 1, 5179, 5215, 5215, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check doors & Windows', null, '3.36', '501', 51, 1, 5179, 5218, 5218, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Confirm cut/fill', null, '3.39', '501', 51, 1, 5179, 5221, 5221, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check customer quote validity', null, '3.42', '501', 51, 1, 5179, 5224, 5224, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan sent to customer', null, '3.45', '501', 51, 1, 5179, 5227, 5227, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Site plan approved', null, '3.48', '501', 51, 1, 5179, 5230, 5230, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Report & Consent', null, '3.99', '501', 51, 1, 5179, null, 5233, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Planning Permit (Skip R&C)', null, '3.98', '501', 51, 1, 5179, null, 5234, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Building Permit (Skip R&C & PP)', null, '3.97', '501', 51, 1, 5179, null, 5235, 13);
-- Apply standard completion flow for all tasks except the final ones
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 51 and tier = 501 and decendant_array is not null;
-- Final task triggers for different workflows
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "52"}]}]' where id = 5233 and product_id = 51 and tier = 501;
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "53"}]}]' where id = 5234 and product_id = 51 and tier = 501;
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "54"}]}]' where id = 5235 and product_id = 51 and tier = 501;

-- Workflow 52: Report & Consent (Step 4.00)
delete from public.products where id = 52;
insert into products (id, display_text) values (52, 'Report & Consent');
delete from public.job_templates where product_id = 52;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Report & Consent / Buildover', null, '4.00', '500', 52, 1, null, 5240, 5240, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced R&C', null, '4.03', '501', 52, 1, 5240, 5243, 5243, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit fee paid', 'Date paid:', '4.06', '501', 52, 1, 5240, 5246, 5246, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit submitted', 'Date submitted: ', '4.09', '501', 52, 1, 5240, 5249, 5249, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit contact', 'Name: ', '4.12', '501', 52, 1, 5240, 5252, 5252, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI', 'Upload', '4.15', '501', 52, 1, 5240, 5255, 5255, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Follow up schedule', null, '4.18', '501', 52, 1, 5240, 5258, 5258, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '4.21', '501', 52, 1, 5240, 5261, 5261, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '4.24', '501', 52, 1, 5240, 5264, 5264, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '4.27', '501', 52, 1, 5240, 5267, 5267, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('R&C permit issued', null, '4.30', '501', 52, 1, 5240, 5270, 5270, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Planning Permit', null, '4.99', '501', 52, 1, 5240, null, 5273, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Building Permit (Skip PP)', null, '4.98', '501', 52, 1, 5240, null, 5274, 13);
-- Apply standard completion flow for all tasks except the final ones
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 52 and tier = 501 and decendant_array is not null;
-- Final task triggers for different workflows
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "53"}]}]' where id = 5273 and product_id = 52 and tier = 501;
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "54"}]}]' where id = 5274 and product_id = 52 and tier = 501;

-- Workflow 53: Planning Permit (Step 5.00)
delete from public.products where id = 53;
insert into products (id, display_text) values (53, 'Planning Permit');
delete from public.job_templates where product_id = 53;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning Permit', null, '5.00', '500', 53, 1, null, 5280, 5280, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced PP', null, '5.03', '501', 53, 1, 5280, 5283, 5283, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit fee paid', 'Date paid:', '5.06', '501', 53, 1, 5280, 5286, 5286, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit submitted', 'Date submitted: ', '5.09', '501', 53, 1, 5280, 5289, 5289, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit contact', 'Name: ', '5.12', '501', 53, 1, 5280, 5292, 5292, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI', 'Upload', '5.15', '501', 53, 1, 5280, 5295, 5295, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Follow up schedule', null, '5.18', '501', 53, 1, 5280, 5298, 5298, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '5.21', '501', 53, 1, 5280, 5301, 5301, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '5.24', '501', 53, 1, 5280, 5304, 5304, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '5.27', '501', 53, 1, 5280, 5307, 5307, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Planning permit issued', null, '5.30', '501', 53, 1, 5280, 5310, 5310, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Building Permit', null, '5.99', '501', 53, 1, 5280, null, 5313, 13);
-- Apply standard completion flow for all tasks except the final one
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 53 and tier = 501 and decendant_array is not null;
-- Final task triggers next workflow
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "54"}]}]' where id = 5313 and product_id = 53 and tier = 501;

-- Workflow 54: Building Permit (Step 6.00)
delete from public.products where id = 54;
insert into products (id, display_text) values (54, 'Building Permit');
delete from public.job_templates where product_id = 54;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Permit', null, '6.00', '500', 54, 1, null, 5320, 5320, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Customer invoiced BP', null, '6.03', '501', 54, 1, 5320, 5323, 5323, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('BP fee paid', 'Date paid: ', '6.06', '501', 54, 1, 5320, 5326, 5326, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Signed Building Surveyor appointed', null, '6.09', '501', 54, 1, 5320, 5329, 5329, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Submit building permit', 'Date submitted: ', '6.12', '501', 54, 1, 5320, 5332, 5332, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI received', 'Upload', '6.15', '501', 54, 1, 5320, 5335, 5335, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 1', null, '6.18', '501', 54, 1, 5320, 5338, 5338, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 2', null, '6.21', '501', 54, 1, 5320, 5341, 5341, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI action required 3', null, '6.24', '501', 54, 1, 5320, 5344, 5344, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Owner builder / builder contract', null, '6.27', '501', 54, 1, 5320, 5347, 5347, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('RFI responded', null, '6.30', '501', 54, 1, 5320, 5350, 5350, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Surveyor Invoice received', null, '6.33', '501', 54, 1, 5320, 5353, 5353, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check all payments made', null, '6.36', '501', 54, 1, 5320, 5356, 5356, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Building Surveyor Invoice paid', null, '6.39', '501', 54, 1, 5320, 5359, 5359, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Permit issued date', null, '6.42', '501', 54, 1, 5320, 5362, 5362, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Proceed to Active Permit', null, '6.99', '501', 54, 1, 5320, null, 5365, 13);
-- Apply standard completion flow for all tasks except the final one
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 54 and tier = 501 and decendant_array is not null;
-- Final task triggers next workflow
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "55"}]}]' where id = 5365 and product_id = 54 and tier = 501;

-- Workflow 55: Active Permit (Steps 7.00 to 8.99)
delete from public.products where id = 55;
insert into products (id, display_text) values (55, 'Pre-Archive');
delete from public.job_templates where product_id = 55;
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Permit Approved', null, '7.00', '500', 55, 1, null, 5370, 5370, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Ensure permit was paid', null, '7.03', '501', 55, 1, 5370, 5373, 5373, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Double check builder & planning permit # on Form 2', null, '7.06', '501', 55, 1, 5370, 5376, 5376, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check planning conditions & BAL & Soil Type', null, '7.09', '501', 55, 1, 5370, 5379, 5379, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Forward notice to Bryan, Eureka & builder', '(if required)', '7.12', '501', 55, 1, 5370, 5382, 5382, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Forward to owner, less applicant doc', null, '7.15', '501', 55, 1, 5370, 5385, 5385, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Update financials & move over', null, '7.18', '501', 55, 1, 5370, 5388, 5388, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Move on server, emails & Move copy to permit folder to B.S. server', null, '7.21', '501', 55, 1, 5370, 5391, 5391, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Upload permit documents', '(below)', '7.24', '501', 55, 1, 5370, 5394, 5394, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Amendment', null, '8.00', '500', 55, 1, 5370, 5397, 5397, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Check for planing or R&C amendment required', null, '8.03', '501', 55, 1, 5394, 5400, 5400, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Invoice customer for secondary consent', null, '8.06', '501', 55, 1, 5394, 5403, 5403, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Apply for amendment', null, '8.09', '501', 55, 1, 5394, 5406, 5406, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Approved Amendment', null, '8.12', '501', 55, 1, 5394, 5409, 5409, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Invoice for BP Amend', null, '8.15', '501', 55, 1, 5394, 5412, 5412, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Provide to Building Surveyor', null, '8.18', '501', 55, 1, 5394, 5415, 5415, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Approved documents', 'Give to owner & builder', '8.21', '501', 55, 1, 5394, 5418, 5418, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Upload permit documents', null, '8.24', '501', 55, 1, 5394, 5421, 5421, 13);
INSERT INTO public.job_templates(display_text, free_text, sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id) VALUES ('Complete Permit Process', null, '8.99', '501', 55, 1, 5394, null, 5424, 13);
-- Apply standard completion flow for all tasks except the final one
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 55 and tier = 501 and decendant_array is not null;
-- Final task archives the customer
update public.job_templates set job_change_array = '[{"antecedent": "complete","customer": [{"setCategory": "Archive - Completed Permits"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]' where id = 5424 and product_id = 55 and tier = 501;