
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

