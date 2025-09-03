# Workflow Template Linkage & Validation System

**Goal:** Build a comprehensive system to track template linkages and validate workflow integrity across all related tables.

**Context:** Tool Gap 3 - Stock Standard Rules Management with automatic template unlinking when workflows are modified.

**Status:** Planning  
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

---

## Project Plan: Template Linkage & Validation System

### Phase 1: Template Link Management ✅ Current Focus

#### Tool 1A: Template Link Monitor
- [ ] **Build template link tracker** - monitor when jobs/tasks diverge from templates
- [ ] **Automatic unlinking system** - clear `job_template_id` when workflows are modified
- [ ] **Template deviation detector** - identify when linked items no longer match templates
- [ ] **Stock standard identifier** - flag jobs/tasks that still match their templates

#### Tool 1B: Template Link Validator  
- [ ] **Cross-table validation** - ensure all template links are valid
- [ ] **Orphan detector** - find jobs/tasks with invalid template references
- [ ] **Template consistency checker** - verify template hierarchies are intact
- [ ] **Link repair tools** - fix broken template relationships

### Phase 2: Workflow Validation Engine

#### Tool 2A: Workflow Integrity Validator
- [ ] **Job workflow validator** - ensure jobs have complete, valid workflows
- [ ] **Task sequence validator** - verify task dependencies and ordering
- [ ] **Process flow validator** - check `job_process_flow` table integrity
- [ ] **Template compliance checker** - validate jobs against their templates

#### Tool 2B: Comprehensive Workflow Auditor
- [ ] **Missing workflow detector** - find jobs without proper workflow definitions
- [ ] **Circular dependency detector** - identify workflow loops
- [ ] **Broken workflow reporter** - catalog all workflow integrity issues
- [ ] **Workflow repair wizard** - guided fixing of workflow problems

### Phase 3: Rule Engine Integration

#### Tool 3A: Rule Template Linkage
- [ ] **Link rule_templates to job_templates** - establish connections between new and old systems
- [ ] **Rule template validator** - ensure rule templates can execute properly
- [ ] **Legacy workflow converter** - convert old workflows to new rule format
- [ ] **Hybrid validation system** - validate both old and new workflow formats

#### Tool 3B: Stock Standard Rules Manager
- [ ] **Stock standard rule library** - catalog and manage standard workflow rules
- [ ] **Custom rule tracker** - identify jobs/templates with custom modifications
- [ ] **Bulk rule updater** - mass update standard rules across the system
- [ ] **Rule versioning system** - track rule changes and template updates

---

## Implementation Strategy

### MVP Approach: Start with Critical Path
1. **Template Link Monitor** (Tool 1A) - Most critical for maintaining data integrity
2. **Workflow Integrity Validator** (Tool 2A) - Essential for identifying current problems
3. **Stock Standard Rules Manager** (Tool 3B) - Your immediate business need

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

### Database Triggers Needed
```sql
-- Auto-clear job_template_id when change_array is modified
CREATE TRIGGER clear_job_template_link 
BEFORE UPDATE ON jobs 
WHEN NEW.change_array != OLD.change_array;

-- Auto-clear task_template_id when task logic changes  
CREATE TRIGGER clear_task_template_link
BEFORE UPDATE ON tasks
WHEN task logic differs from template;
```

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
