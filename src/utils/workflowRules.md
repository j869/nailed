# Documentation: jobStatus Update Flow

This document describes the flow for updating the `jobStatus` field in the application, including the inputs, record changes, and outputs. It also covers the invocation of the `ruleEngine` and its relationship to workflow rules.

## Inputs
- **fieldID:** `jobStatus` (from UI or API request)
- **newValue:** The new status value to set (e.g., `complete`, `pending`, etc.)
- **rowID:** The ID of the job record to update
- **req.user.id:** The ID of the authenticated user performing the update

## Record Changes
1. **Update Job Status**
   - Table: `jobs`
   - Column: `current_status`
   - Action: Sets `current_status` to `newValue` for the job with `id = rowID`
   - Logging: Console logs the update action
   - API Call: `axios.get(`${API_URL}/update?table=jobs&column=current_status&value=${newValue}&id=${rowID}`)`

2. **Delete Related Worksheets**
   - Table: `worksheets`
   - Action: Deletes worksheet records where `description` contains `Job(rowID)` or `job_id = rowID`
   - SQL: `DELETE FROM worksheets WHERE description LIKE '%Job(rowID)%' OR job_id = rowID`

3. **Invoke ruleEngine**
   - Function: `ruleEngine("job", rowID, "status", newValue, req.user.id)`
   - Purpose: Triggers workflow logic and additional updates based on the new job status

## ruleEngine Logic
- **Inputs:**
  - `itemType`: "job"
  - `itemID`: job's rowID
  - `field`: "status"
  - `newValue`: new status value
  - `userID`: authenticated user ID

- **Actions:**
  1. If `newValue` is `complete`, sets the job's `completed_date` to today.
  2. Updates the job's `user_id` to the current user.
  3. Fetches the job's `change_array` and, if present, executes job actions via API (`executeJobAction`).
  4. Handles flow actions and recursive updates for related jobs in the process flow tree (e.g., updating status or target dates for descendant jobs).
  5. Logs all actions and errors for audit and debugging.

## Outputs
- **Success:**
  - HTTP 200 response: "Update successful"
  - Job status and related records updated in the database
  - Workflow actions executed as needed

- **Failure:**
  - HTTP 500 response: "Error updating jobStatus" or error details
  - Error logs in the console

## Security and Workflow Rules
- All mapping from fieldID to table/column is handled server-side.
- Only authenticated users can perform updates.
- The ruleEngine enforces workflow rules and triggers additional actions based on job status changes.
- All changes are logged for traceability.

## executeJobAction API

### Overview
The `executeJobAction` API is implemented in `ruleEngine.js` and mounted in `index.js` as `/executeJobAction`. It is called by the workflow engine to process job actions based on workflow rules and change arrays.

### How It Is Called
- In `index.js`:
  ```js
  import ruleAPI from './utils/ruleEngine.js';
  app.use('/executeJobAction', ruleAPI);
  ```
- The API endpoint is `/executeJobAction` and is accessed via HTTP GET requests.
- It is called by the workflow engine (e.g., from `ruleEngine` in `fieldUpdates.js`) using an axios GET request:
  ```js
  axios.get(`${API_URL}/executeJobAction`, {
    params: {
      changeArray: changeArray,
      origin_job_id: rowID
    },
    timeout: 10000
  });
  ```

### Inputs
- **changeArray** (JSON string): Describes workflow actions to perform, e.g.:
  ```json
  [
    {"antecedent": "complete", "build": [{"status": "Archive"}], "decendant": [{"status": "pending@520"}, {"target": "today_1@520"}]}
  ]
  ```
- **origin_job_id**: The job ID for which actions are being executed.

### Main Logic
- Parses `changeArray` and fetches the parent job record.
- For each scenario in the array:
  - If the job's status matches the scenario's antecedent, executes actions for decendant jobs, customers, and products.
  - Supported actions:
    - Update job status or target date for decendant jobs.
    - Update user assignment for jobs.
    - Add entries to job change logs.
    - Update customer status/category.
    - Add new workflow/build for products.
- All database changes are performed using parameterized queries for security.
- Logs all actions and errors for traceability.

### Supported Workflow Rules for executeJobAction

Below are the supported rule actions that can be used in the `changeArray` for workflow automation. Each rule is triggered when the job's status matches the scenario's `antecedent`.

#### 1. Archive Customer
- **Purpose:** Set the customer's category/status to "Archive" when a job is completed, or to the workflow name when pending.
- **Example:**
  ```json
  [{
    "antecedent": "complete",
    "customer": [{"setCategory": "Archive"}]
  },
  {
    "antecedent": "pending",
    "customer": [{"setCategory": "!workflowName"}]
  }]
  ```
- **Effect:** Updates the `current_status` of the customer and related builds/jobs.

#### 2. Add Workflow (Product)
- **Purpose:** Add a new workflow/build for a product when a job is completed.
- **Example:**
  ```json
  [{
    "antecedent": "complete",
    "product": [{"addWorkflow": "5"}]
  }]
  ```
- **Effect:** Creates a new build and job for the specified product and assigns the user.

#### 3. Delay Target Date
- **Purpose:** Set the target date of a job to a future date (e.g., today + N days).
- **Example:**
  ```json
  {"target": "today_1@520"}
  ```
- **Effect:** Updates the `target_date` of the job with ID 520 to today + 1 day.

#### 4. Set Status
- **Purpose:** Set the status of a job to a specific value.
- **Example:**
  ```json
  {"status": "pending@520"}
  ```
- **Effect:** Updates the `current_status` of the job with ID 520 to "pending".

#### 5. Log Trigger
- **Purpose:** Add a custom entry to the job's change log for audit or notification purposes.
- **Example:**
  ```json
  {"log_trigger": "Custom log message"}
  ```
- **Effect:** Appends a log entry to the job's `change_log` field.

#### 6. Set User Assignment
- **Purpose:** Assign a user to a job (usually when updating target date or status).
- **Effect:** Updates the `user_id` field for the job, either to the responsible user or the current user.

---
Each rule can be combined in the `changeArray` to automate complex workflow transitions and ensure business logic is enforced consistently.

### Outputs
- **Success:**
  - HTTP 200 response: `{ success: true, message: 'Job action executed successfully' }`
- **Failure:**
  - HTTP error response: `{ success: false, error: '...' }`

### Security Notes
- Only accessible to authenticated users via server-side calls.
- All mapping and logic is handled server-side; no schema details are exposed to the client.

---
Generated by GitHub Copilot on 2025-09-05.
