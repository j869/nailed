-- cleaning database from orphaned records
delete from customers where id in(select c.id from customers c left join products p on c.current_status = p.display_text where p.id is null)
delete from builds b where not exists (select 1 from customers where b.customer_id = id)
delete from jobs j where not exists (select 1 from builds b where j.build_id = b.id)
delete from job_process_flow f where not exists (select 1 from jobs j where f.antecedent_id = j.id or f.decendant_id = j.id)
delete from reminders r where not exists (select 1 from jobs j where r.id = j.reminder_id)
delete from job_templates t where not exists (select 1 from products p where p.id = t.product_id)
drop table user_work_schedule;
drop table work_schedule;

-- contact_other has been used to store the job_no.  Move it to the correct column
update customers set job_no = contact_other where job_no is null;

-- Update customers.next_action_description with the next pending job
-- Relationship: customers -> builds -> jobs
-- Find the first job with current_status = 'pending' ordered by sort_order

UPDATE customers 
SET next_action_description = (
    SELECT j.display_text
    FROM builds b
    JOIN jobs j ON j.build_id = b.id
    WHERE b.customer_id = customers.id
      AND j.current_status = 'pending'
    ORDER BY j.sort_order ASC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM builds b
    JOIN jobs j ON j.build_id = b.id
    WHERE b.customer_id = customers.id
      AND j.current_status = 'pending'
);


-- Query to verify the results
SELECT 
    c.id,
    c.full_name,
    c.next_action_description,
    (
        SELECT COUNT(*)
        FROM builds b
        JOIN jobs j ON j.build_id = b.id
        WHERE b.customer_id = c.id
          AND j.current_status = 'pending'
    ) as pending_jobs_count
FROM customers c
ORDER BY c.id;