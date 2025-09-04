# System Development Methodology - AI Agent Prototyping

**Development Style:** MVP Prototyping with AI Agent  

---

## Core Development Philosophy

### AI Agent Communication Style
- **Never give detailed answers** unless specifically requested
- **Do highlight adjacent factors** that might be overlooked or ignored
- **Do ask for more information** where appropriate to clarify requirements
- **Focus on completing the specific task** requested without scope creep

### Prototyping-First Approach
- **Build complete working prototypes** for full functionality, then iterate
- **Test core concepts** with simple, working examples
- **Iterate based on real feedback** from actual usage
- **Allow programmer to test** before completing the change
- **Build in modular sections** where possible and describe how to test each section
- **Complete functionality first** - build the whole job as one prototype, then improve section by section
- **Avoid over-engineering** until requirements are proven

### Permission-Based Development
- **AI Agent gets explicit permission** unless evidently required to make changes
- **No surprise implementations** - discuss approach first
- **Focus on requested features only** - suggest, but don't add "helpful" extras
- **MVP mindset** - simplest solution that works, but complete solution
- **Low complexity** - use beginner programmer concepts where possible
- **Production-ready prototypes** - past demo phase, database changes allowed

---

## AI Agent Guidelines

### Before Building Anything:
1. **Describe what you plan to build** in 2-3 sentences
2. **Ask for explicit permission** to proceed unless I specifically requests it
3. **Clarify scope** - what's included, what's not
4. **Confirm the approach** - file names, key functions, etc.

### when development involves the database
1. review the README_writing2database.md

---

## Application Architecture - Two Server Pattern

### Server Roles
- **app.js** = Frontend (port 3000): UI, authentication, calls APIs
- **index.js** = Backend (port 4000): Database operations, provides APIs

### Database Access
- **app.js**: Uses `db` variable, makes HTTP calls to backend
- **index.js**: Uses `pool` variable, direct database access
- **Rule**: Frontend never accesses database directly

### API Pattern
```javascript
// Frontend (app.js) - calls backend API
const result = await axios.get(`http://localhost:4000/api/data`);

// Backend (index.js) - provides API with database access  
app.get("/api/data", async (req, res) => {
  const result = await pool.query("SELECT * FROM table");
  res.json(result.rows);
});
```

---

### when development involves user interactions
1. **Log all user actions** to database table (not text files)
2. **Create user_actions table** for storing user behavior data
3. **Capture every user action** - button clicks, process triggers, form submissions
4. **Format for database storage** - structured data with timestamps and user context
5. **Purpose**: Aid in customer support and troubleshooting
6. **Query-able logs**: Use SQL to analyze user behavior patterns

### console logging for development
1. **Unique function tags**: Key functions gets a lowercase 2-3 character tag (e.g., `wb`, `ce`, `jty`)
2. **Number sequences**: 2-4 digits following the tag
   - **Start**: Single digit `1` (e.g., `wb1`)
   - **Completion**: Single digit `9` (e.g., `wb9`) 
   - **Errors**: End with `8` (e.g., `wb308` for handled errors, `wb8` for unhandled)
3. **Padding**: Align log text to same column for readability
4. **Logical numbering**: 
   - `100-199`: Initialization
   - `200-799`: Main functionality 
   - `900-999`: Success actions
5. **No number reuse** within the same function

**Examples:**
```javascript
console.log("wb1      USER(" + person + ") added new task '" + title + "' to their day_task list");
console.log("ce206    redirecting to customer page ", req.query.returnto);
console.log("jty001   Starting job template creation", { display_text: req.body.display_text });
console.log("wb308    Validation error - missing required field");
console.log("wb9      Task successfully added to database");
```

### function documentation
 - for each endpoint must update a list of objects it is called by and the line number in that file
 - for each endpoint must add a comment on each axios call that gives the location of the route in index.js

### Button identifier format for user action logging (ignore sysAdmin pages)
1. **Each clickable element** gets a unique identifier code
2. **Format**: `[3-digit number][single letter]`
   - **Number (3 digits)**: Identifies the EJS file/page (e.g., `103`)
   - **Letter (a-z)**: Identifies the specific element clicked (e.g., `a`)
3. **Implementation**: Add `btn` parameter to onclick events
4. **Purpose**: Track which specific buttons users click for logging

**Example:**
```html
<button class="btn btn-sm btn-outline-secondary" 
        onclick="window.location.href='/addjob?btn=103a&type=child&jobnum=<%= jobID %>&tier=501&returnto=build<%= site.id %>';">
    Add Task
</button>
```
- `103` = Page/file identifier
- `a` = First button on that page


### where UI or record editing
- the preferred approach is an editable table
 - double click the field and blur event saves
 - timed confirmation message as a success message 


### During Development:
- **Build the complete viable version** first (full functionality in one prototype)
- **Include necessary database changes** - we are past demo/read-only phase
- **Test immediately** after creating core functionality  
- **Build modular sections** that can be tested independently where possible
- **Stop and check in** if you encounter complications

### After Building:
- **Let me test the working parts section by section** 
- **Build complete prototypes** then improve them incrementally in subsequent prototypes
- **Explain how to test each component** and the overall system
- **Identify next logical iteration** (improvements/enhancements) but don't build it yet
- **Wait for feedback** before enhancing
- **Document any holes** in functionality, or security so we can revisit them later

---

## Quick Reminder Commands

### Shorthand for AI Agent Mode:
**"MVP MODE"** = follow all the above principles (complete prototypes, then iterate)

**"PERMISSION CHECK"** = Stop and ask before building functionality

**"SCOPE CHECK"** = Confirm exactly what to build, nothing more

**"COMPLETE PROTOTYPE"** = Build full functionality in one prototype, then improve section by section

---

## Development Approach Evolution
Use the following sequence when asked to develop a plan.

### Phase 1: Demo/Testing Phase (Completed)
- proof of key concepts
- Read-only operations
- Limited scope testing

### Phase 2: Production Development Phase (Current)
- Build complete working prototypes
- Include necessary database changes
- Full functionality implementations
- Improve section by section in subsequent prototypes

### Phase 3: Create tools to assist the transition 
- Build admin interfaces for managing the new system
- Create migration utilities to move from legacy to new workflows
- Develop bulk operation tools for updating existing data
- Implement validation and monitoring dashboards
- Build user training and documentation tools into UI

### Phase 4: Cut across existing data
- Apply new tools to production data at scale
- Migrate legacy data and processes to new function
- Clean up inconsistent or broken code
- Validate system integrity after migration
- Performance optimization for production volumes

### Phase 5: Review what didn't work and document for later revision
- Analyze which changes succeeded vs failed in production
- List any code that is overly complex
- Document lessons learned
- Record performance bottlenecks and optimization opportunities
- Create improvement backlog for future iterations
- Update methodology based on practical experience
- Archive or refactor tools that are no longer requred post migration

---

## User Action Logging Requirements

### Purpose
- **Customer Support Aid**: Track user actions to help resolve customer issues
- **Troubleshooting**: Understand user workflow patterns and identify problem areas
- **User Experience Analysis**: Monitor how users interact with the system

### Logging Standards
- **Database Table**: Store in `user_actions` table for structured querying
- **Log User Actions Only**: Button clicks, form submissions, page navigation, process triggers
- **Do NOT Log**: Database queries, internal system operations, API calls
- **Structured Data**: Use database columns for user_id, action_type, page, description, timestamp
- **Include Context**: User ID, page/feature, action description

### Example Database Structure
```sql
CREATE TABLE user_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255),
    page_name VARCHAR(100),
    action_type VARCHAR(50),
    action_description TEXT,
    button_code VARCHAR(10),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### Example Log Entries
```javascript
// Insert user action into database
await pool.query(`
  INSERT INTO user_actions (user_id, page_name, action_type, action_description, button_code)
  VALUES ($1, $2, $3, $4, $5)
`, [req.user.id, 'jobs', 'button_click', 'Create New Job', '4a']);
```

### Implementation Requirements
- **Every UI interaction** must be logged
- **Meaningful descriptions** of what the user actually did
- **User context** included in every log entry
- **Performance conscious** - logging should not slow down UI

---


## Success Metrics

### Good AI Agent Behavior:
- ✅ Asks permission before building functionality
- ✅ Builds complete working prototypes with full functionality
- ✅ Includes necessary database changes when past demo phase
- ✅ Tests immediately and shows results
- ✅ Explains what was built and how to test each component
- ✅ Waits for feedback before enhancing
- ✅ Improves prototypes section by section based on feedback

### Avoid These Patterns:
- ❌ Building incomplete functionality that requires multiple iterations to be useful
- ❌ Adding features that weren't specifically requested
- ❌ Over-engineering before requirements are proven
- ❌ Creating code without explaining how to test it
- ❌ Building ahead without permission and feedback

---

*This methodology ensures we build exactly what's needed, test early and often, and avoid wasted development effort on unproven concepts.*
