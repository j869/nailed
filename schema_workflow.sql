-- random workflows
delete from products where id = 3;
insert into products (id, display_text) values (3, 'Internal management');
delete from public.job_templates where product_id = 3;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01', '500', 3, 1, null, null, 300, 1, 'User defined workflow');

-- Archive - Shed Construction workflow
delete from products where id = 42;
insert into products (id, display_text) values (42, 'Archive - Shed Construction');
delete from public.job_templates where product_id = 42;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01', '500', 42, 1, null, null, 4200, 1, 'Complete Shed Construction workflow');
 

-- gangnam style Shed Build workflow
delete from products where id = 4;
insert into products (id, display_text) values (4, 'Shed Construction');
delete from public.job_templates where product_id = 4;
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
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('14.74', '501', 4, 1, 458, 468, 467, 12, 'Concrete poured');   --474 'set start date' is delayed 7 days after 467 'concrete poured'
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
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('17.00', '501', 4, 1, 483, 498, 495, 12, 'Advise accounts to invoice');
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01.09', '501', 4, 1, 495, null, 498, 1, 'Archive this build');
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where product_id = 4 and tier = 501 and decendant_array is not null;
update public.job_templates set job_change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@474"}, {"target": "today_7@474"}, {"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where id = 467;   --474 is delayed 7 days after 467
update jobs set change_array = '[{"antecedent": "complete","decendant": [{"status": "pending@474"}, {"target": "today_7@474"}, {"status": "pending@'||decendant_array||'"}, {"target": "today_1@'||decendant_array||'"}]}]' where job_template_id = 467;  
--update public.job_templates set flow_change_array = null where product_id = 4;
update public.job_templates set job_change_array = '[{"antecedent": "complete","customer": [{"setCategory": "Archive - Initial Enquiry"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]' where id = 498 and product_id = 4 and tier = 501;











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


-- Archive - Completed Permits workflow
delete from products where id = 6;
insert into products (id, display_text) values (6, 'Archive - Completed Permits');
delete from public.job_templates where product_id = 6;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01', '500', 6, 1, null, null, 600, 1, 'Add a workflow to reopen this customer');

-- Archive - customers that never went through with a purchase
delete from products where id = 7;
insert into products (id, display_text) values (7, 'Archive - Initial Enquiry');
delete from public.job_templates where product_id = 7;
INSERT INTO public.job_templates(sort_order, tier, product_id, reminder_id, antecedent_array, decendant_array, id, user_id, display_text) VALUES ('01', '500', 7, 1, null, null, 700, 1, 'Add a workflow to reopen this customer');



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






-- Workflow Validation Schema Migration
-- Prototype 1: Complete Workflow Validator
-- Created: 4 September 2025

-- Add system tracking columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS system_comments TEXT;
ALTER TABLE job_templates ADD COLUMN IF NOT EXISTS system_comments TEXT;

-- Create workflow problems tracking table
CREATE TABLE IF NOT EXISTS workflow_problems (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL, 
    problem_type VARCHAR(100) NOT NULL,
    problem_description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    detected_date TIMESTAMP DEFAULT NOW(),
    resolved_date TIMESTAMP NULL,
    resolved_by INTEGER NULL,
    UNIQUE(table_name, record_id, problem_type) -- Prevent duplicate problems
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_problems_lookup 
ON workflow_problems(table_name, record_id, resolved_date);

-- Function to clear job template links when change_array is modified
CREATE OR REPLACE FUNCTION clear_job_template_link() 
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.change_array IS DISTINCT FROM NEW.change_array THEN
        NEW.job_template_id = NULL;
        NEW.system_comments = COALESCE(NEW.system_comments || '; ', '') || 
                             'Template link cleared - change_array modified ' || NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic template link clearing
DROP TRIGGER IF EXISTS jobs_template_link_trigger ON jobs;
CREATE TRIGGER jobs_template_link_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION clear_job_template_link();

-- Grant permissions for the workflow_problems table
GRANT ALL PRIVILEGES ON workflow_problems TO postgres;
GRANT USAGE ON SEQUENCE workflow_problems_id_seq TO postgres;

-- Insert initial migration record
INSERT INTO workflow_problems (table_name, record_id, problem_type, problem_description, severity)
VALUES ('schema_migrations', 1, 'migration_completed', 'Workflow validation schema deployed successfully', 'info')
ON CONFLICT (table_name, record_id, problem_type) DO NOTHING;


