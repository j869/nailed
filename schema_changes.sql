




ALTER TABLE worksheets ADD COLUMN job_id integer;
COMMENT ON COLUMN public.worksheets.job_id IS 'References the related job for this worksheet';

update products set display_text = 'Active Permits' where id = 5;



-- cleaning database from orphaned records
delete from customers where id in(select c.id from customers c left join products p on c.current_status = p.display_text where p.id is null)
delete from builds b where not exists (select 1 from customers where b.customer_id = id)
delete from jobs j where not exists (select 1 from builds b where j.build_id = b.id)
delete from job_process_flow f where not exists (select 1 from jobs j where f.antecedent_id = j.id or f.decendant_id = j.id)
delete from reminders r where not exists (select 1 from jobs j where r.id = j.reminder_id)
delete from job_templates t where not exists (select 1 from products p where p.id = t.product_id)
drop table user_work_schedule;
drop table work_schedule;


