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
- Expand `utils/changeProcessor.js` to handle all workflow rules.
- Continue improving error handling and user feedback in the UI.

---

## 9. Implementation Tranches

### Stage 1: Demo Form for Trigger Rule System
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
- **No changes to existing update logic or production data until the demo is validated.**

---

*This documentation reflects the state of the application as of August 8, 2025.*

---
