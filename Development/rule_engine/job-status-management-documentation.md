# Job Status Management Documentation

## 1. On Job Completion

### Functions Associated with Job Completion

#### Job Done Route (`/jobDone/:id`) - **jd** codes
- **Function**: `app.get("/jobDone/:id", ...)`
- **Location**: `index.js:784-803`
- **UI Form**: `editTask.ejs` - "Mark Done" link in job editing interface
- **Logging Codes**:
  - `jd1` - Job completion request received
  - `jd8` - Error handling for job completion failures
- **Operations**:
  - Updates job status to 'completed'
  - Sets completion date and user
  - Triggers recursive relationship checks
  - Calls `getJobFlow()` to analyze dependencies

```sql
UPDATE jobs SET current_status = 'completed', completed_date = LOCALTIMESTAMP, completed_by = null WHERE id = ?
```

#### Job Complete (User Interface) - **jb** codes
- **Function**: `app.post("/jobComplete", ...)` 
- **Location**: `app.js:1758-1813`
- **UI Form**: `2/customer.ejs` - Job completion checkboxes in customer build view
- **Logging Codes**:
  - `jb1` - User status update initiated
  - `jb2` - Job completion processing
  - `jb71` - Child job status cascading
  - `jb72` - Child task status updates
- **Operations**:
  - Handles user checkbox interactions
  - Updates job completion status and timestamps
  - Cascades status to child jobs and tasks

```sql
UPDATE jobs SET current_status = ?, completed_date = ?, completed_by = ? WHERE id = ?
UPDATE jobs SET current_status = ? WHERE id IN(SELECT j.id FROM jobs j INNER JOIN job_process_flow f ON j.id = f.decendant_id WHERE f.antecedent_id = ? AND f.tier > ?)
```

## 2. Action Execution

### Execute Job Action Route (`/executeJobAction`) - **ja** codes
- **Function**: `app.get("/executeJobAction", ...)`
- **Location**: `index.js:814-970`
- **UI Form**: **⚠️ NOT DIRECTLY CALLED BY UI** - Internal API called by `/update` route in `app.js:2484`
- **Logging Codes**:
  - `ja1` - Change array execution started
  - `ja4001` - Workflow condition evaluation
  - `ja4107` - Job status update executed
  - `ja4108` - Job status already at target (skip)
  - `ja4207` - Target date update
  - `ja4208` - User assignment defaulting
  - `ja4007` - Change log entry
  - `ja4008` - Unknown action type
  - `ja5005` - Customer status update
  - `ja5007` - Customer status already correct
  - `ja5008` - Unknown customer action
  - `ja6002` - New build creation
  - `ja6003` - Job addition to build
  - `ja6004` - Job-build linking
  - `ja6005` - Build user assignment
  - `ja9` - Action execution completed

### Workflow Logic
- Processes JSON change arrays with conditional logic
- Updates job status based on antecedent conditions
- Handles target date calculations (today + offset)
- Manages customer status inheritance
- Creates new builds for workflow continuation

```sql
UPDATE jobs SET current_status = ? WHERE id = ?
UPDATE jobs SET target_date = ? WHERE id = ?
UPDATE customers SET current_status = ? WHERE id = ?
```

## 3. Cascading Job Completion

### Build Job Flow (`getJobFlow`) - **bb** codes
- **Function**: `async function getJobFlow(parentID, parentTier, logString)`
- **Location**: `index.js:608-698`
- **UI Form**: **⚠️ NOT DIRECTLY CALLED BY UI** - Internal function called by `/jobDone` route
- **Logging Codes**:
  - `bb10` - Job flow analysis started
  - `bb21` - Child relationship check
  - `bb30` - Daughter job processing
  - `bb31` - Sister job relationships found
  - `bb32` - Sister job appending
  - `bb33` - No sisters found
  - `bb5` - Deep dive into job hierarchy
  - `bb91` - No children found

### Build Data Retrieval (`getBuild`) - **bc** codes
- **Function**: `async function getBuild(buildID)`
- **Location**: `index.js:708-783`
- **UI Form**: **⚠️ NOT DIRECTLY CALLED BY UI** - Internal function used by job flow analysis
- **Logging Codes**:
  - `bc1` - Build data retrieval started
  - `bc2` - Recursive process initialization
  - `bc5` - Deep job hierarchy traversal

### Operations
- Analyzes job hierarchy relationships
- Identifies parent-child dependencies
- Maps job flow structures for workflow management
- Supports recursive job completion cascading

## 4. Manual Updates

### Generic Update Route (`/update`) - **ud** codes
- **Function**: `app.get("/update", ...)` in index.js
- **Location**: `index.js:975-1038`
- **UI Form**: **⚠️ NOT DIRECTLY CALLED BY UI** - Internal API endpoint
- **Logging Codes**:
  - `ud1` - User update initiated
  - `ud1a` - Current value query
  - `ud2` - No change detected (optimization)
  - `ud7` - Template synchronization
  - `ud9` - Successful update
  - `ud18` - Bad request (missing ID)

### Main Update Route (`/update`) - **ufg** codes
- **Function**: `app.get("/update", ...)` in app.js
- **Location**: `app.js:1886-2570`
- **UI Forms**: Multiple EJS templates call this route:
  - `home.ejs` - Day task date buttons and inline editing
  - `editTask.ejs` - Inline field editing in task editor
  - `2/customers.ejs` - Customer field updates
  - `2/customer.ejs` - Job order updates and field editing
- **Logging Codes**:
  - `ufg0` - Raw and decoded value logging
  - `ufg1` - User action logging
  - `ufg410-ufg832` - Various field update operations
  - `ufg4661` - Job change array processing (triggers executeJobAction)

### Legacy Update Route - **ua** codes
- **Function**: `app.get("/update", ...)` (duplicate/legacy)
- **Location**: `index.js:1115-1143`
- **UI Form**: **⚠️ LEGACY CODE** - Appears to be unused duplicate
- **Logging Codes**:
  - `ua1` - Legacy user update
  - `ua7` - Template update confirmation

### Operations
- Validates input parameters
- Checks for actual value changes (optimization)
- Updates database records
- Synchronizes job templates when job display_text changes
- Provides comprehensive error handling
- **Key Feature**: Automatically triggers `executeJobAction` when jobs have change_array data

```sql
SELECT ? FROM ? WHERE id = ?
UPDATE ? SET ? = ? WHERE id = ?
UPDATE job_templates SET display_text = ? WHERE id = (SELECT job_template_id FROM jobs WHERE id = ?)
```

## 5. Task Status Updates

### Task Completion - **ta** codes
- **Function**: `app.post("/taskComplete", ...)`
- **Location**: `app.js:1704-1757`
- **UI Forms**: 
  - `home.ejs` - Task completion checkboxes in daily task list
  - `2/customer.ejs` - Task completion checkboxes in customer build view
- **Logging Codes**:
  - `ta1` - Task status change initiated
  - `ta11` - Current task status check
  - `ta12` - Related job status check
  - `ta9` - Task status update successful

### New Task Creation - **t** codes
- **Function**: `app.get("/addtask", ...)`
- **Location**: `index.js:1091-1113`
- **UI Form**: `editTask.ejs` - "Add New +" buttons for parent and child tasks
- **Logging Codes**:
  - `t1` - New task creation started
  - `t9` - Task creation completed

### Operations
- Toggles task status between 'pending' and 'complete'
- Sets completion timestamps and user attribution
- Removes completed tasks from daily worksheets
- Creates new tasks with default 'active' status

```sql
UPDATE tasks SET current_status = ?, completed_date = ?, completed_by = ? WHERE id = ?
INSERT INTO tasks (display_text, job_id, current_status, precedence, sort_order) VALUES ('UNNAMED', ?, 'active', ?, 't2')
DELETE FROM worksheets WHERE description LIKE '%' || '"task_id":' || ? || ',' || '%'
```

## 6. New Job Creation

### Add Job Route - **a** codes
- **Function**: `app.get("/addjob", ...)`
- **Location**: `index.js:1175-1586`
- **UI Forms**: Multiple EJS templates create new jobs:
  - `editTask.ejs` - "Add" buttons for parent and child jobs
  - `2/customer.ejs` - "Add Stage", "Add Task", and template-based job creation buttons
- **Logging Codes**:
  - `a001` - New job creation initiated
  - `a800` - Template SQL query
  - `a822` - Workflow template count

### New Customer/Build Workflow - **wb** codes
- **Function**: `app.post("/", ...)` 
- **Location**: `app.js:73-97`
- **UI Form**: `home.ejs` - Day task creation form (main page POST)
- **Logging Codes**:
  - `wb1` - Day task creation
  - `wb7` - Response data logging

### Operations
- Creates jobs with hierarchical relationships
- Applies job templates for workflow automation
- Handles different precedence types (parent, child, origin)
- Generates workflow chains from templates
- Creates initial job status based on template configuration

```sql
INSERT INTO jobs (display_text, ..., current_status, ...) VALUES (?, ..., 'active', ...)
INSERT INTO job_process_flow (antecedent_id, decendant_id, tier, change_array) VALUES (?, ?, ?, ?)
```

### instances
| Function Name         | Location (File:Line)         | Console.log / Logging Code | Description & Contrast                                                                                   |
|-----------------------|------------------------------|---------------------------|---------------------------------------------------------------------------------------------------------|
| `app.get("/addjob")`  | index.js:1175-1586           | `a001`, `a800`, `a822`    | Main job creation route. Handles hierarchical relationships, applies templates, and logs creation steps. |
| `app.post("/")`       | app.js:73-97                 | `wb1`, `wb7`              | user defined tasks on Day task List
| `/jobDone/:id`        | index.js:784-803             | `jd1`, `jd8`              | Marks an existing job as completed, not for creation. Logs completion request and errors.               |
| `/jobComplete`        | app.js:1758-1813             | `jb1`, `jb2`, `jb71`      | Updates job status via UI checkbox, cascades completion to child jobs/tasks. Not for initial creation.  |
| `/executeJobAction`   | index.js:814-970             | `ja6002`, `ja6003`,       | Internal API for workflow automation. Can create new builds/jobs as part of workflow rules.             |
| SQL Direct Insert     | Various (see documentation)  | N/A                       | Direct SQL: `INSERT INTO jobs ...` used in multiple places, sometimes without explicit logging.         |



## 7. Job Reads

### Job Details Retrieval - **gd** codes
- **Function**: `app.get("/jobs/:id", ...)`
- **Location**: `index.js:430-602`
- **UI Forms**: Multiple EJS templates link to job details:
  - `editTask.ejs` - Job antecedent/descendant "update" and "Edit" links
  - `2/customer.ejs` - "Edit Category" buttons in customer build view
- **Logging Codes**:
  - `gd117` - Tier calculation
  - `gd18` - Missing job ID error
  - `gd281` - Job not found
  - `gd282` - Query execution error
  - `gd7` - Processing stage
  - `gd9` - Successful data retrieval

### Task Details Retrieval - **me** codes
- **Function**: `app.get("/tasks/:id", ...)`
- **Location**: `index.js:1042-1087`
- **UI Form**: **⚠️ NO UI CALLS FOUND** - Appears to be unused or legacy endpoint
- **Logging Codes**:
  - `me1` - Task info request
  - `me81` - Missing task ID error
  - `me9` - Successful task data retrieval

### Operations
- Retrieves comprehensive job details including status
- Loads related conversation data
- Fetches job relationships (antecedents/descendants)
- Provides task hierarchy information
- Returns formatted data for UI consumption

```sql
SELECT id, display_text, ..., current_status, ... FROM jobs WHERE id = ?
SELECT j.id, j.display_text, j.current_status, j.free_text FROM jobs j INNER JOIN job_process_flow r ON ... WHERE ...
```

## 8. Conditional Status Logic

### Key Conditional Patterns

#### Status Validation
- Prevents overwriting 'complete' status unless explicitly allowed
- Checks current vs. new values to avoid unnecessary updates
- Validates user permissions and authentication

#### Workflow Rules
- **Antecedent Conditions**: IF job status = X THEN execute actions
- **Cascading Logic**: Parent completion triggers child status updates
- **Template Inheritance**: New jobs inherit status from templates

#### Business Rules
- Customer status inherits from product workflow names
- Build completion sets all related jobs to 'complete'
- Task completion removes items from daily worksheets
- Job template updates synchronize with job instances

#### Error Handling
- Missing ID validation
- Database constraint checking
- Transaction rollback on failures
- Comprehensive error logging with specific codes

### Status State Machine
```
null/pending → active → complete
     ↑           ↑         ↓
     └───────────┴─────────┘
        (manual override)
```

---

## Summary of UI Integration

### Functions Called Directly by UI Forms:
- **Job Completion**: `/jobDone` (editTask.ejs), `/jobComplete` (2/customer.ejs)
- **Task Management**: `/taskComplete` (home.ejs, 2/customer.ejs), `/addtask` (editTask.ejs)
- **Job Creation**: `/addjob` (editTask.ejs, 2/customer.ejs)
- **Job Details**: `/jobs/:id` (editTask.ejs, 2/customer.ejs)
- **Field Updates**: `/update` (home.ejs, editTask.ejs, 2/customers.ejs, 2/customer.ejs)
- **Day Tasks**: `/` POST (home.ejs)

### Functions NOT Called by UI (Internal APIs):
- **⚠️ `/executeJobAction`** - Internal workflow automation (called by `/update`)
- **⚠️ `getJobFlow()`** - Internal job hierarchy analysis
- **⚠️ `getBuild()`** - Internal build data processing  
- **⚠️ `/tasks/:id`** - Appears unused (legacy endpoint)
- **⚠️ Legacy `/update` in index.js** - Duplicate/unused code

### Key Integration Points:
1. **editTask.ejs** - Primary job management interface
2. **2/customer.ejs** - Customer build management with job/task completion
3. **home.ejs** - Daily task management and scheduling
4. **2/customers.ejs** - Customer field updates

*Documentation generated from codebase analysis focusing on job status management patterns and UI integration.*
