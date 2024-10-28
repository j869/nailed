
CREATE OR REPLACE VIEW public.combined_tasks
 AS
 SELECT b.id AS build_id,
    b.enquiry_date AS build_start,
    b.product_id AS build_product,
    j.id AS job_id,
    j.display_text AS job_text,
    j.target_date AS job_target,
    j.completed_date AS job_completed,
    j.current_status AS job_status,
    t.id AS task_id,
    t.display_text AS task_text,
    t.target_date AS task_target,
    t.completed_date AS task_completed,
    t.current_status AS task_status,
	t.owned_by as user_id
   FROM builds b
     LEFT JOIN jobs j ON j.build_id = b.id
     LEFT JOIN tasks t ON t.job_id = j.id
  ORDER BY t.job_id, j.build_id;