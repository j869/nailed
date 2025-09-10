


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
