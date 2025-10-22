



--auto approve parents when all children are completed
ALTER TABLE jobs ADD COLUMN blocked_by JSONB;
ALTER TABLE users ADD COLUMN org integer;



-- add attachments to task record
ALTER TABLE jobs ADD COLUMN uploaded_docs JSONB;



ALTER TABLE conversations ADD COLUMN subject VARCHAR(255);




ALTER TABLE worksheets ADD COLUMN stalled_for VARCHAR(30);
COMMENT ON COLUMN worksheets.stalled_for IS 'Indicates how long the worksheet has been unactioned. Values represent time periods like "3 days", "2 weeks", etc. Used to visually prioritize older items in the todo list.';


ALTER TABLE customers 
ADD COLUMN sort_order VARCHAR(50);


--#region audit target date

--logging to catch bug where alex pushes target date back, and within a few hours it reverts or gets recalculated back to the original date 
CREATE TABLE jobs_target_date_audit (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    old_target_date DATE,
    new_target_date DATE,
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation_type VARCHAR(10), -- INSERT, UPDATE, DELETE
    source_info TEXT -- optional: store session or application info
);

CREATE OR REPLACE FUNCTION track_target_date_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.target_date IS DISTINCT FROM NEW.target_date THEN
            INSERT INTO jobs_target_date_audit (
                job_id, 
                old_target_date, 
                new_target_date, 
                operation_type,
                source_info
            ) VALUES (
                NEW.id,
                OLD.target_date,
                NEW.target_date,
                TG_OP,
                current_setting('application_name', true) -- captures app source
            );
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO jobs_target_date_audit (
            job_id, 
            old_target_date, 
            new_target_date, 
            operation_type,
            source_info
        ) VALUES (
            NEW.id,
            NULL,
            NEW.target_date,
            TG_OP,
            current_setting('application_name', true)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO jobs_target_date_audit (
            job_id, 
            old_target_date, 
            new_target_date, 
            operation_type,
            source_info
        ) VALUES (
            OLD.id,
            OLD.target_date,
            NULL,
            TG_OP,
            current_setting('application_name', true)
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER jobs_target_date_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION track_target_date_changes();


CREATE VIEW jobs_audit_with_context AS
SELECT 
    ja.changed_at,
    ja.old_target_date,
    ja.new_target_date,
    ja.operation_type,
    j.id as job_id,
    b.id as build_id,
    c.id as customer_id,
    c.full_name as customer_name,
    'customer(' || c.id || ') with build(' || b.id || ') was changed at job(' || j.id || ')' as change_description,
    EXTRACT(EPOCH FROM (ja.new_target_date::timestamp - ja.old_target_date::timestamp)) / 86400 as days_change
FROM jobs_target_date_audit ja
INNER JOIN jobs j ON ja.job_id = j.id
INNER JOIN builds b ON j.build_id = b.id
INNER JOIN customers c ON b.customer_id = c.id;


--#endregion