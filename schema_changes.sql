
-- Financial transactions table for detailed payment tracking
CREATE TABLE IF NOT EXISTS public.financials (
    id serial NOT NULL,
    customer_id integer NOT NULL,
    payment_date date NOT NULL,
    amount decimal(10,2) NOT NULL,
    description text NOT NULL,
    category character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    
);

-- Add column comments for financials table
COMMENT ON TABLE public.financials IS 'Detailed financial transactions for customers including payments received and fees paid out';
COMMENT ON COLUMN public.financials.id IS 'Unique transaction identifier';
COMMENT ON COLUMN public.financials.customer_id IS 'Reference to customer record';
COMMENT ON COLUMN public.financials.payment_date IS 'Date transaction occurred';
COMMENT ON COLUMN public.financials.amount IS 'Transaction amount (positive for income, negative for expenses)';
COMMENT ON COLUMN public.financials.description IS 'Detailed description of the transaction';
COMMENT ON COLUMN public.financials.category IS 'Transaction category (e.g., initial_payment, progress_payment, permit_fees, contractor_payment)';
COMMENT ON COLUMN public.financials.created_at IS 'Timestamp when record was created';


-- Add new job information columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS job_no character varying(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS site_location character varying(511);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS building_type character varying(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS permit_type character varying(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS slab_size character varying(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS council_responsible character varying(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_builder_permit boolean DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS work_source character varying(50);

-- Add timeline tracking columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_ordered date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_bp_applied date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_bp_issued date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_completed date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_last_actioned timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS next_action_description text;

-- Add financial summary columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS quoted_estimate decimal(10,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS fees_paid_out decimal(10,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS invoices_collected decimal(10,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS job_earnings decimal(10,2);

-- Add last payment tracking columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_payment_date date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_payment_amount decimal(10,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_payment_description text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financials_customer_id ON public.financials(customer_id);
CREATE INDEX IF NOT EXISTS idx_financials_payment_date ON public.financials(payment_date);
CREATE INDEX IF NOT EXISTS idx_customers_current_status ON public.customers(current_status);
CREATE INDEX IF NOT EXISTS idx_customers_job_no ON public.customers(job_no);
CREATE INDEX IF NOT EXISTS idx_customers_work_source ON public.customers(work_source);


-- Auto-update last payment info when financial record is added
CREATE OR REPLACE FUNCTION update_last_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update for positive amounts (payments received, not expenses)
    IF NEW.amount > 0 THEN
        UPDATE public.customers 
        SET 
            last_payment_date = NEW.payment_date,
            last_payment_amount = NEW.amount,
            last_payment_description = NEW.description,
            date_last_actioned = CURRENT_TIMESTAMP
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_payment ON public.financials;
CREATE TRIGGER trigger_update_last_payment
    AFTER INSERT ON public.financials
    FOR EACH ROW
    EXECUTE FUNCTION update_last_payment();



-- Add column comments for documentation
COMMENT ON COLUMN public.customers.id IS 'Unique customer identifier';
COMMENT ON COLUMN public.customers.full_name IS 'Customer full name';
COMMENT ON COLUMN public.customers.home_address IS 'Customer mailing/billing address';
COMMENT ON COLUMN public.customers.primary_phone IS 'Primary contact phone number';
COMMENT ON COLUMN public.customers.primary_email IS 'Primary email address';
COMMENT ON COLUMN public.customers.contact_other IS 'Additional contact information';
COMMENT ON COLUMN public.customers.current_status IS 'Customer categorization for primary list view (e.g., active, pending, completed)';
COMMENT ON COLUMN public.customers.follow_up IS 'Date when next escalation reminder should be triggered';
COMMENT ON COLUMN public.customers.job_no IS 'Unique job reference number';
COMMENT ON COLUMN public.customers.site_location IS 'Physical location where construction work will be performed';
COMMENT ON COLUMN public.customers.building_type IS 'Type of structure being built (e.g., garage, shed, extension)';
COMMENT ON COLUMN public.customers.permit_type IS 'Type of building permit required (JSON array)';
COMMENT ON COLUMN public.customers.slab_size IS 'Dimensions or size specification of the structure';
COMMENT ON COLUMN public.customers.council_responsible IS 'Local council authority responsible for permits';
COMMENT ON COLUMN public.customers.owner_builder_permit IS 'Whether an Owner Builder permit is required/obtained (OB permit)';
COMMENT ON COLUMN public.customers.work_source IS 'Source of the work (BPA=self-sourced, E=Eureka Sheds, Best Sheds, Facebook Marketing, etc.)';
COMMENT ON COLUMN public.customers.date_ordered IS 'Date when customer placed the order';
COMMENT ON COLUMN public.customers.date_bp_applied IS 'Date building permit application was submitted';
COMMENT ON COLUMN public.customers.date_bp_issued IS 'Date building permit was issued by council';
COMMENT ON COLUMN public.customers.date_completed IS 'Date when job was completed';
COMMENT ON COLUMN public.customers.date_last_actioned IS 'Last time any action was taken on this job';
COMMENT ON COLUMN public.customers.next_action_description IS 'Description of the next action to be taken on this job';
COMMENT ON COLUMN public.customers.quoted_estimate IS 'Expected value of job';
COMMENT ON COLUMN public.customers.fees_paid_out IS 'Total fees paid to suppliers and contractors (override until financials system implemented)';
COMMENT ON COLUMN public.customers.job_earnings IS 'Net earnings from this job (revenue minus costs)';
COMMENT ON COLUMN public.customers.last_payment_date IS 'Date of most recent payment received';
COMMENT ON COLUMN public.customers.last_payment_amount IS 'Amount of most recent payment';
COMMENT ON COLUMN public.customers.last_payment_description IS 'Description of most recent payment';



-- Add data security clearance column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS data_security text;
CREATE INDEX IF NOT EXISTS idx_users_data_security ON public.users(data_security);
COMMENT ON COLUMN public.users.data_security IS 'SQL WHERE clause for user data access control. Use "1=1" for admin access, "c.id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = $USER_ID)" for job-based access, or "1=0" for no access';

-- Create simple security view mapping job user assignments to customer access
DROP VIEW IF EXISTS public.user_accessible_customers;
CREATE VIEW public.user_accessible_customers AS
SELECT DISTINCT 
    c.id as customer_id,
    j.user_id as assigned_user_id
FROM public.customers c
INNER JOIN public.builds b ON c.id = b.customer_id  
INNER JOIN public.jobs j ON b.id = j.build_id
WHERE j.user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);

-- Add documentation
COMMENT ON VIEW public.user_accessible_customers IS 'Simple security view mapping job user assignments to customer access - returns customer_id for each assigned user_id';

-- add security on existing users
UPDATE users SET data_security = 'c.id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = ' || id || ')';
UPDATE users SET data_security = '1=1' WHERE id = 1;




-- Stage 2 Implementation: Rule Templates Database Schema
-- Database Integration for Rule Engine Demo
-- Created: September 2, 2025

-- Rule Templates Table
-- Stores reusable rule definitions for the visual rule builder
CREATE TABLE rule_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'status_change', 'workflow', 'validation', 'custom'
    template_json JSONB NOT NULL,   -- Complete rule definition
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[], -- For categorization and search
    usage_count INTEGER DEFAULT 0
);

-- Add indexes for performance
CREATE INDEX idx_rule_templates_category ON rule_templates(category);
CREATE INDEX idx_rule_templates_active ON rule_templates(is_active);
CREATE INDEX idx_rule_templates_created_by ON rule_templates(created_by);
CREATE INDEX idx_rule_templates_tags ON rule_templates USING GIN(tags);

-- Rule Executions Log (Future Feature - Stage 3)
-- This table structure is prepared but won't be used in Stage 2 MVP
CREATE TABLE rule_executions (
    id SERIAL PRIMARY KEY,
    rule_template_id INTEGER REFERENCES rule_templates(id),
    trigger_event VARCHAR(100) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    execution_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    execution_time_ms INTEGER,
    conditions_result JSONB, -- Results of condition evaluations
    actions_result JSONB,    -- Results of action executions
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_by INTEGER REFERENCES users(id)
);

-- Add indexes for rule executions (for future use)
CREATE INDEX idx_rule_executions_template ON rule_executions(rule_template_id);
CREATE INDEX idx_rule_executions_status ON rule_executions(execution_status);
CREATE INDEX idx_rule_executions_date ON rule_executions(executed_at);

-- Insert some sample rule templates for testing
INSERT INTO rule_templates (name, description, category, template_json, created_by, tags) VALUES 
(
    'Complete Job Workflow', 
    'Automatically update related jobs when a job is marked complete',
    'status_change',
    '{
        "trigger": {
            "on": "status_change",
            "table": "jobs",
            "field": "status",
            "value": "complete"
        },
        "conditions": [
            {
                "field": "next_job_id",
                "operator": "is_not_null"
            }
        ],
        "actions": [
            {
                "type": "updateField",
                "target": "related_job",
                "field": "status",
                "value": "active"
            },
            {
                "type": "notify",
                "message": "Job marked complete, next job activated"
            }
        ]
    }',
    1,
    ARRAY['workflow', 'job_completion', 'automation']
),
(
    'Task Priority Validation',
    'Ensure task priorities are within valid range and business rules',
    'validation',
    '{
        "trigger": {
            "on": "field_change",
            "table": "tasks",
            "field": "priority"
        },
        "validations": [
            {
                "type": "range",
                "min": 1,
                "max": 5,
                "message": "Priority must be between 1 and 5"
            },
            {
                "type": "businessRule",
                "rule": "high_priority_requires_approval",
                "condition": "priority >= 4"
            }
        ],
        "actions": [
            {
                "type": "notify",
                "condition": "priority >= 4",
                "recipients": ["manager"],
                "message": "High priority task requires approval"
            }
        ]
    }',
    1,
    ARRAY['validation', 'task_management', 'priority']
),
(
    'Customer Status Update',
    'Update customer status and trigger relevant workflows',
    'workflow',
    '{
        "trigger": {
            "on": "status_change",
            "table": "customers",
            "field": "status"
        },
        "conditions": [
            {
                "field": "status",
                "operator": "equals",
                "value": "active"
            }
        ],
        "actions": [
            {
                "type": "updateField",
                "field": "last_updated",
                "value": "NOW()"
            },
            {
                "type": "createWorksheet",
                "template": "customer_onboarding"
            }
        ]
    }',
    1,
    ARRAY['customer_management', 'status_change', 'onboarding']
);

-- Add trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_rule_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER rule_templates_updated_at_trigger
    BEFORE UPDATE ON rule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_rule_templates_updated_at();

-- Grant permissions (adjust based on your user management)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rule_templates TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE rule_templates_id_seq TO your_app_user;
