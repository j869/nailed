-- Workflow Validation Schema Migration
-- Prototype 1: Complete Workflow Validator
-- Created: 4 September 2025

-- Add system tracking columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS system_comments TEXT;
ALTER TABLE job_templates ADD COLUMN IF NOT EXISTS system_comments TEXT;

-- Create data problems tracking table
CREATE TABLE IF NOT EXISTS data_problems (
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

-- Note: No indexes on admin tables - keep admin tables simple

-- Template link clearing will be handled by explicit application logic
-- No triggers used - all business logic visible in application code

-- Grant permissions for the data_problems table
GRANT ALL PRIVILEGES ON data_problems TO postgres;
GRANT USAGE ON SEQUENCE data_problems_id_seq TO postgres;

-- Insert initial migration record
INSERT INTO data_problems (table_name, record_id, problem_type, problem_description, severity)
VALUES ('schema_migrations', 1, 'migration_completed', 'Workflow validation schema deployed successfully', 'info')
ON CONFLICT (table_name, record_id, problem_type) DO NOTHING;
