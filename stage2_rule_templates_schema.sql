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
