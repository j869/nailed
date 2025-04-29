
-- Add tier column with more precision
ALTER TABLE jobs
ADD COLUMN tier DECIMAL(7, 4);

ALTER TABLE job_templates
ADD COLUMN tier DECIMAL(7, 4);

ALTER TABLE job_process_flow
ADD COLUMN tier DECIMAL(7, 4);

UPDATE jobs
SET tier = 500;

UPDATE job_templates
SET tier = 500;

UPDATE job_process_flow
SET tier = 500;


ALTER TABLE files
ADD COLUMN build_id INT,
ADD COLUMN job_id INT;


ALTER TABLE users RENAME COLUMN system_access_type TO roles;


insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 100, 'Initial Enquiry'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 200, 'Sales System'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 300, 'Awaiting Deposit'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 400, 'Permits'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 500, 'Engineering'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 600, 'Production Ordered'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 700, 'Delivery Scheduled'); 
insert into listorder (user_id, location_used, sort_order, display_text) values (0, 'CustomersStatus', 800, 'Pre-Production & Final Check'); 



alter table job_process_flow 
add column change_array TEXT           -- Task definition type datapoints only (i.e due date, person responsible, job name, etc)


alter table jobs 
add column change_array TEXT;

