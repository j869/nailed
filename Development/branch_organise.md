# Branch `organise` – Standardization & Workflow Refactor

## 1. Purpose
The `organise` branch was created to address inconsistencies in how fields are updated from the UI. The goal is to standardize update logic, validation, and workflow—starting with the `/update` route—so all field changes from the frontend are handled in a predictable, maintainable way.

---

## 2. Application Architecture

- **Backend:** Node.js (Express), PostgreSQL, EJS templating, RESTful endpoints.
- **Frontend:** EJS views, Bootstrap, custom CSS, vanilla JS.
- **Authentication:** Passport.js (local & Google OAuth2).
- **Email/SMTP:** Nodemailer, IMAPFlow.
- **Payments:** Stripe integration.
- **Workflow:** Custom logic for jobs, tasks, customers, with recursive and rule-based updates.

---

## 3. Current Standardization Efforts

- All field updates should encode values, validate types, and handle errors uniformly.
- UI should always reflect the true backend state after an update (rollback on failure).
- Move toward PATCH/POST endpoints for all updates.
- All status changes and key field updates should trigger appropriate workflow actions, using a single source of truth for rules.

---

## 4. Functional Analysis

### 4.1 `/update` Endpoint Refactor
- Validation is being refactored: some strict checks (e.g., date parsing, string length) have been relaxed for flexibility, but this is under review for consistency.
- Response handling is being standardized.

### 4.2 Client-Side Update Logic
- Editable fields in EJS views use `contenteditable` or form elements.
- On `blur` or change, JS triggers a fetch to `/update` (or, in some cases, a more RESTful PATCH endpoint).
- Some views encode values before sending; others do not—this is being standardized.

### 4.3 UI/UX
- Modular EJS templates for header, footer, and main content.
- Notification UI is being simplified/removed in favor of more robust error handling.

---

## 5. Analysis of Editable Field Usage

| File                        | Line  | Usage Context                | Notes                                  |
|-----------------------------|-------|------------------------------|----------------------------------------|
| views/home.ejs              | 183   | blur event, inline editing   | Standard update                        |
| views/editTask.ejs          | 218   | blur event, inline editing   | Standard update                        |
| views/2/customer.ejs        | 817   | (commented out)              | Replaced by PATCH to /api/jobs         |
| views/2/customer.ejs        | 1084  | sort order update            | Updates jobOrder field                 |
| views/2/customers.ejs       | 258   | blur event, inline editing   | Encodes value before sending           |

---

## 6. Recommended RESTful PATCH/POST Endpoints

**Jobs:**  
- PATCH /api/jobs/:id/title  
- PATCH /api/jobs/:id/description  
- PATCH /api/jobs/:id/status  
- PATCH /api/jobs/:id/target-date  
- PATCH /api/jobs/:id/sort-order  
- PATCH /api/jobs/:id/owner  
- PATCH /api/jobs/:id/tier  
- PATCH /api/jobs/:id/change-array  

**Tasks:**  
- PATCH /api/tasks/:id/title  
- PATCH /api/tasks/:id/description  
- PATCH /api/tasks/:id/status  
- PATCH /api/tasks/:id/target-date  
- PATCH /api/tasks/:id/sort-order  
- PATCH /api/tasks/:id/owner  
- PATCH /api/tasks/:id/completed-by  

**Customers:**  
- PATCH /api/customers/:id/name  
- PATCH /api/customers/:id/address  
- PATCH /api/customers/:id/phone  
- PATCH /api/customers/:id/email  
- PATCH /api/customers/:id/other-contact  
- PATCH /api/customers/:id/status  

**Builds:**  
- PATCH /api/builds/:id/next-job  

**Worksheets (Daytasks):**  
- PATCH /api/worksheets/:id/title  
- PATCH /api/worksheets/:id/person  
- PATCH /api/worksheets/:id/date  
- PATCH /api/worksheets/:id/archive  

**Workflow/Process Flow:**  
- PATCH /api/job-process-flow/:id/tier  
- PATCH /api/job-process-flow/:id/change-array  

---

## 7. Flexible Trigger Rule System

- Store rules as structured JSON in the database (e.g., `trigger_rules` field).
- Use a rule engine/interpreter to evaluate and execute rules at runtime.
- Map action types to handler functions (not a switch statement).
- UI should help users build valid rules (no custom JS actions allowed).
- Example rule:
  ```json
  [
    {
      "on": "status:complete",
      "actions": [
        { "set": "next_job.status", "to": "active" },
        { "notify": "user", "message": "Job completed!" }
      ]
    }
  ]
  ```

---

## 8. Next Steps

- Complete migration to consistent fetch/patch patterns in the UI.
- Refactor `/update` to use a single, well-documented validation and dispatch layer.
- Replace the massive switch statement in `app.js` with the new rule engine architecture.
- Continue improving error handling and user feedback in the UI.

---

## 9. Implementation Tranches

### Stage 1: Demo Form for Trigger Rule System ✅ COMPLETED
- **Goal:** Implement a standalone demo form for the new trigger rule system, as described above, without modifying the existing production code.
- **Purpose:**
  - Safely prototype the rule engine and rule editing UI.
  - Allow for rapid iteration and testing of rule logic and handler functions.
  - Gather feedback and iron out logical issues before integrating with the main application.
- **Scope:**
  - Create a new route and view for the demo form (e.g., `/demo/rules`).
  - Implement rule storage (in-memory or test table).
  - Build a simple UI for adding, editing, and testing rules (JSON editor or form-based).
  - Implement a minimal rule engine/interpreter and action handler map.
  - Provide test cases and example scenarios.
- **Status:** ✅ Complete - Demo rule engine with visual builder, JSON import/export, and comprehensive testing interface implemented in `/admin/rule-engine-demo`

### Stage 2: Database Integration (CURRENT STAGE)
- **Goal:** Integrate the demo rule engine with real database tables while preserving all existing application logic unchanged.
- **Purpose:**
  - Transition from mock data to real database operations
  - Create persistent rule storage and template management
  - Enable real-world rule analysis and validation
  - Build foundation for future backend integration
  - Maintain full backward compatibility with existing workflows
- **Database Schema Changes Required:**
  
  #### New Tables:
  ```sql
  -- Rule Templates Table
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

  -- Rule Executions Log (Future Feature)
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
  ```

  #### Enhanced Existing Tables (Future Features):
  ```sql
  -- These will be added in future iterations based on MVP learnings
  ALTER TABLE jobs ADD COLUMN rule_config JSONB;
  ALTER TABLE job_templates ADD COLUMN default_rules JSONB;
  ALTER TABLE customers ADD COLUMN rule_overrides JSONB;
  ALTER TABLE jobs ADD COLUMN last_rule_execution TIMESTAMP;
  ```

- **Integration Scope (MVP):**
  - **System Status Tab**: Read from real `jobs` and `job_templates` tables for basic analysis
  - **Rule Templates**: Basic CRUD operations for rule template storage
  - **Simple Rule Analysis**: Count existing patterns in job status changes and workflows
  - **Template Management**: Save, load, edit, and delete rule templates
  - **JSON Import/Export**: Basic rule template sharing capabilities

- **Preserved Elements:**
  - All existing `/update` endpoint logic remains unchanged
  - No modification to current workflow processing (massive switch statement in `app.js`)
  - No integration with `utils/changeProcessor.js` (reserved for Stage 3)
  - All existing UI update patterns remain functional
  - Current field validation and encoding logic preserved
  - Existing authentication and authorization unchanged

- **New Capabilities (MVP):**
  - Basic rule analysis based on actual job and template data
  - Simple rule template library with database persistence
  - Basic rule pattern identification (status changes, common workflows)
  - Rule template import/export for backup and sharing
  - Foundation for advanced features in future iterations

- **Risk Mitigation:**
  - All rule engine operations are read-only or additive (no modification of existing data)
  - Demo interface clearly separated from production update paths
  - Comprehensive logging of all rule engine activities
  - Rollback capabilities for rule template changes
  - Validation against existing data before rule activation

#### Stage 2 Implementation Plan:

**MVP Implementation (Minimum Viable Product)**
1. **Database Schema Setup**:
   - Create `rule_templates` table for basic rule storage
   - Add basic indexes for performance

2. **System Status Tab Integration**:
   - Replace mock data with real database queries from `jobs` and `job_templates`
   - Basic rule pattern analysis (count status change triggers, workflow patterns)
   - Simple rule template CRUD operations (create, read, update, delete)

3. **Rule Template Foundation**:
   - Save/load rule templates to/from database
   - Basic template validation and error handling
   - JSON import/export functionality for rule templates

**MVP Scope**:
- Read-only analysis of existing job/template data
- Basic rule template persistence 
- Foundation for future features
- No rule execution or advanced analytics

**Future Feature Suggestions** (Post-MVP):
- Advanced rule pattern analysis and recommendations
- Rule conflict detection and optimization
- Rule execution logging and monitoring (`rule_executions` table)
- Enhanced rule validation against data constraints
- Rule template sharing and marketplace features
- Automated rule suggestions based on usage patterns
- Performance monitoring and optimization tools
- Integration preparation for Stage 3 backend connection

---

### Stage 3: Backend Integration (FUTURE)
- **Goal:** Integrate the rule template system with the existing `utils/changeProcessor.js` backend execution engine.
- **Purpose:**
  - Connect visual rule builder to production backend processing
  - Enable rule templates to drive actual database updates
  - Provide seamless workflow between rule creation and execution
  - Maintain backward compatibility while adding rule-driven capabilities
- **Integration Scope:**
  - **Template-Driven Execution**: Rule templates from Stage 2 feed into changeProcessor.js
  - **Hybrid Processing**: Visual rules + legacy switch statement fallback
  - **Production Updates**: Actual database modifications using rule engine
  - **Performance Optimization**: Rule caching and execution monitoring
  - **Workflow Automation**: Complete rule-driven workflow processing
  
- **Architecture:**
  ```
  Rule Engine Demo (Frontend) → Rule Templates Database → changeProcessor.js (Backend)
  ```
  
- **Preserved Elements:**
  - All existing update logic remains as fallback
  - Gradual migration path from switch statement to rule engine
  - Full backward compatibility during transition
  - Existing error handling and transaction support

---



---

*This documentation reflects the state of the application as of August 8, 2025.*

---
