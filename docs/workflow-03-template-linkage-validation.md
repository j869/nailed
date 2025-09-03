# Workflow Template Linkage & Validation System

**Goal:** Build a comprehensive system to track template linkages and validate workflow integrity across all related tables.

**Context:** Tool Gap 3 - Stock Standard Rules Management with automatic template unlinking when workflows are modified.

**Status:** In Progress  
**Date Started:** 3 September 2025  
**Branch:** organise

---

## Problem Statement

**Current Issue:**
- `jobs.job_template_id` links to templates but becomes invalid when users modify workflow logic
- No automatic clearing of template links when workflows diverge from standard
- No validation system to ensure workflow integrity across related tables
- Missing tools to manage template linkages across the entire system

**Business Impact:**
- Can't distinguish between "stock standard" vs "customized" workflows
- Template modifications don't properly invalidate derived jobs
- No way to validate workflow consistency across the system

---

## Template Linkage Analysis

### Tables with Template Links ✅ Identified
1. **`jobs.job_template_id`** → `job_templates.id`
   - **Purpose:** Links job to its original template
   - **Invalidation Trigger:** Any change to workflow logic (`change_array`, workflow steps)

2. **`tasks.task_template_id`** → `task_templates.id`  
   - **Purpose:** Links task to its original template
   - **Invalidation Trigger:** Task modification that differs from template

3. **`task_templates.job_template_id`** → `job_templates.id`
   - **Purpose:** Links task templates to job templates
   - **Validation Need:** Ensure task templates align with job template structure

4. **`reminder_templates.task_template_id`** → `task_templates.id`
   - **Purpose:** Links reminder templates to task templates
   - **Validation Need:** Ensure reminder logic matches task structure

### Tables Missing Template Links ❌ Gaps Identified
1. **`job_process_flow`** - No template linkage for workflow sequences
2. **`rule_templates`** - No linkage to existing job/task templates (our new system)

**Note:** Legacy Product 5 (Vic Permits) uses ID range 5100-5700+. New modular Products 51-55 will use separate ID ranges starting from 6000+ to avoid conflicts:
- **New Workflow 51**: 6110-6235 (Pre Deposit - replaces 5110-5235)
- **New Workflow 52**: 6240-6274 (Report & Consent - replaces 5240-5274)  
- **New Workflow 53**: 6280-6313 (Planning Permit - replaces 5280-5313)
- **New Workflow 54**: 6320-6365 (Building Permit - replaces 5320-5365)
- **New Workflow 55**: 6370-6424 (Active Permit - replaces 5370-5424)

---

## Project Plan: Template Linkage & Validation System

### Phase 2: Build the Missing Tools (Aligned with change_array_rule_templates_linkage.md)

#### Tool 1: Workflow Pattern Scanner
- [ ] **Scan all existing workflows** - What patterns are actually being used?
- [ ] **Find broken workflows** - Which jobs have incomplete or corrupted rules?
- [ ] **Catalog workflow types** - What standard patterns exist?
- [ ] **Identify custom workflows** - Which jobs have been modified from templates?
- [ ] **Build template link tracker** - monitor when jobs/tasks diverge from templates
- [ ] **Automatic unlinking system** - clear `job_template_id` when workflows are modified
- [ ] **Template deviation detector** - identify when linked items no longer match templates
- [ ] **Stock standard identifier** - flag jobs/tasks that still match their templates

#### Tool 2: Workflow Validator (MAIN JOB - Currently Focus)
- [ ] **Check workflow completeness** - Do jobs have all required steps?
- [ ] **Find workflow conflicts** - Are there contradictory rules?
- [ ] **Validate workflow logic** - Do the sequences make sense?
- [ ] **Generate validation reports** - Show all workflow problems found
- [ ] **Cross-table validation** - ensure all template links are valid
- [ ] **Orphan detector** - find jobs/tasks with invalid template references
- [ ] **Template consistency checker** - verify template hierarchies are intact
- [ ] **Circular dependency detector** - identify workflow loops

#### Tool 3: Stock Standard Rules Manager (PREREQUISITE)
- [ ] **Auto-unlink custom workflows** - When users modify workflows, mark them as custom
- [ ] **Find stock standard workflows** - Which jobs still match their templates?
- [ ] **Bulk update standard rules** - Change all standard workflows at once
- [ ] **Template compliance checker** - Verify jobs still match their templates
- [ ] **Stock standard rule library** - catalog and manage standard workflow rules
- [ ] **Custom rule tracker** - identify jobs/templates with custom modifications
- [ ] **Rule versioning system** - track rule changes and template updates

#### Tool 4: Job Templates Rule Updater (LOWEST PRIORITY)
- [ ] **Bulk update job templates** - Change multiple templates at once
- [ ] **Preview template changes** - Show what will be affected before updating
- [ ] **Template validation** - Ensure template changes make sense
- [ ] **Change tracking** - Log what was changed and when
- [ ] **Link rule_templates to job_templates** - establish connections between new and old systems
- [ ] **Rule template validator** - ensure rule templates can execute properly
- [ ] **Legacy workflow converter** - convert old workflows to new rule format
- [ ] **Hybrid validation system** - validate both old and new workflow formats

---

## Implementation Strategy

### Implementation Strategy

### MVP Approach: Start with Critical Path (Following change_array priorities)
1. **Workflow Validator** (Tool 2) - MAIN JOB - Currently focus, build this ASAP
2. **Stock Standard Rules Manager** (Tool 3) - PREREQUISITE - Schema split needed first  
3. **Workflow Pattern Scanner** (Tool 1) - Foundation work to understand current patterns
4. **Job Templates Rule Updater** (Tool 4) - LOWEST PRIORITY - Repurpose after Tool 2 working

### Tools We Can Leverage ✅
- **Rule Engine Demo** - Visual rule builder and test runner
- **WF Rule Report** - Job workflow updating (extend for template validation)
- **MVP Rule Templates Editor** - Basic template management (extend for linkage)

### New Tools Needed ❌
- **Template Link Monitor** - Automatic unlinking when workflows change
- **Workflow Validator** - Comprehensive integrity checking
- **Stock Standard Manager** - Bulk operations on standard vs custom rules

---

## Technical Requirements

### Schema Changes Needed

#### System Comments Column (from change_array approach)
```sql
-- Add system_comments column to jobs table for workflow debugging
ALTER TABLE jobs ADD COLUMN system_comments TEXT;
-- Records assumed patterns, debug problems with engine, list problems for fix-it form

-- Add system_comments column to job_templates table  
ALTER TABLE job_templates ADD COLUMN system_comments TEXT;
-- Track template modification history and validation issues
```

#### Workflow Problems Table (dedicated tracking)
```sql
-- Create dedicated table for workflow problem tracking
CREATE TABLE workflow_problems (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL, 
    problem_type VARCHAR(100) NOT NULL,
    problem_description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    detected_date TIMESTAMP DEFAULT NOW(),
    resolved_date TIMESTAMP NULL,
    resolved_by INTEGER NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);
```

### Database Triggers (ONLY Most Necessary)

```sql
-- ESSENTIAL: Auto-clear job_template_id when change_array is modified
-- This maintains data integrity for template linkage
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

CREATE TRIGGER jobs_template_link_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION clear_job_template_link();
```

**Note:** No triggers on sysadmin tables. Only essential business data integrity triggers.

### Validation Queries Needed
- Cross-reference all template links for validity
- Identify jobs/tasks that no longer match their templates
- Find workflows with missing or broken components
- Validate rule_templates against actual job/task structures

---

## Success Metrics

### Data Integrity Goals
- [ ] All template links are valid or properly cleared
- [ ] All workflows have complete, validated structures
- [ ] Clear distinction between stock standard vs custom workflows

### Management Goals  
- [ ] Can bulk-update all stock standard workflows
- [ ] Can identify and fix workflow corruption quickly
- [ ] Can validate new rules against existing workflow patterns

---

## Next Actions
1. **Build Template Link Monitor** - Start with automatic `job_template_id` clearing
2. **Create Workflow Validator** - Basic integrity checking for jobs and job_process_flow
3. **Extend existing tools** - Add template linkage features to WF Rule Report
