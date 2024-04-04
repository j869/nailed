
INSERT INTO job_templates(user_id, role_id, product_id, display_text, free_text, antecedent_array, decendant_array, reminder_id) 
VALUES 
    (1, 1, 1, 'Site Appraisal', NULL, 1, 1, NULL),
    (1, 1, 1, 'Concreting', NULL, 1, 2, 1),
    (1, 1, 1, 'Erecting', NULL, 2, 3, 1),
    (1, 1, 1, 'Plumbing', NULL, 3, NULL, 1);



INSERT INTO public.task_templates(job_template_id, precedence, display_text, free_text, owner_id)
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

