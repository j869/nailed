
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


