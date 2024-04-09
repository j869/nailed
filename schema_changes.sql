




CREATE OR REPLACE VIEW combined_tasks AS
SELECT
    b.id as build_id,
	b.enquiry_date as build_start,
	b.product_id as build_product,
    j.id as job_id,
	j.display_text as job_text,
	j.target_date as job_target,
	j.completed_date as job_completed,
	j.current_status as job_status,
    t.id as task_id,
	t.display_text as task_text,
	t.target_date as task_target,
	t.completed_date as task_completed,
	t.current_status as task_status
FROM builds b
LEFT JOIN jobs j ON j.build_id = b.id
LEFT JOIN tasks t ON t.job_id = j.id
order by t.job_id, j.build_id;