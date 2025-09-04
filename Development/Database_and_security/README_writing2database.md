# Database Update Methods

## Database Design Principles

### Admin Table Guidelines
- **No indexes on admin tables** - Keep admin tables simple and lightweight
- **Admin tables** are for configuration, debugging, logging, and management functions
- **Examples**: data_problems, configuration, logs, audit trails
- **Rationale**: Admin tables are typically small and infrequently queried

### Production Table Guidelines  
- **Add indexes strategically** on production tables for performance
- **Production tables** handle user data and high-frequency operations
- **Examples**: jobs, customers, builds, job_templates

## Schema Change Management
- **Add all schema changes to schema_changes.sql** so migration to PROD system is tracked
- **Never delete anything** from schema_changes.sql, just append variations
- **Document reasoning** for each change


## Database Trigger Policy
- **Don't use triggers** - Use explicit application logic instead for debugging clarity
- **Alternative**: Use explicit logic in update endpoints with clear console logging


## Architecture

- **`app## Standard Implementation (index.js Backend API)

### CRUD Template
```javascript
// index.js - Backend API Server
// CREATE
app.post("/api/resource", async (req, res) => {
  try {
    const { field1, field2 } = req.body;
    if (!field1) return res.status(400).json({ error: "field1 is required" });
    
    const result = await pool.query(
      "INSERT INTO table_name (field1, field2) VALUES ($1, $2) RETURNING *",
      [field1, field2]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create error:", error);server (UI, views, user sessions)
- **`index.js`**: Backend API server (database operations, business logic)

## Patterns (Preferred → Avoid)

### 1. Direct API Endpoints ✅ (Required)
**Architecture**: `app.js (Frontend) → index.js (Backend API) → PostgreSQL`

```javascript
// index.js (Backend API Server)
app.post("/api/job-templates", async (req, res) => {
  try {
    const { display_text, product_id, tier } = req.body;
    if (!display_text) return res.status(400).json({ error: "Display text is required" });
    
    const result = await pool.query(
      "INSERT INTO job_templates (display_text, product_id, tier, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [display_text, product_id, tier, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Database error" });
  }
});
```

### 2. Frontend Proxy ⚠️ (Legacy Only)
**Architecture**: `app.js (Frontend) → app.js (Proxy) → index.js (Backend API) → PostgreSQL`

```javascript
// app.js (Frontend Server) - avoid for new features
app.get("/update", async (req, res) => {
  const { fieldID, newValue, whereID } = req.query;
  // Proxy to backend API
  const apiResponse = await axios.post(`${API_URL}/api/inline-update`, {
    table, field: fieldID, value: newValue, id: whereID
  });
  res.status(apiResponse.status).send("Update successful");
});
```

### 3. Direct SQL in Frontend ❌ (Deprecated)
```javascript
// app.js - NEVER USE - SQL injection vulnerability
const updateSQL = "UPDATE customers SET name='" + req.body.name + "' WHERE id=" + req.params.id;
```

## Standard Implementation

### CRUD Template
```javascript
// CREATE
app.post("/api/resource", async (req, res) => {
  try {
    const { field1, field2 } = req.body;
    if (!field1) return res.status(400).json({ error: "field1 is required" });
    
    const result = await pool.query(
      "INSERT INTO table_name (field1, field2) VALUES ($1, $2) RETURNING *",
      [field1, field2]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("XX888 Create error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// UPDATE
app.put("/api/resource/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { field1, field2 } = req.body;
    
    const result = await pool.query(
      "UPDATE table_name SET field1 = $1, field2 = $2 WHERE id = $3 RETURNING *",
      [field1, field2, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resource not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});
```

## Security Requirements

### 1. Parameterized Queries (Required)
```javascript
// ✅ SECURE
const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### 2. Input Validation
```javascript
if (!email || !password) return res.status(400).json({ error: "Email and password required" });
if (typeof age !== 'number') return res.status(400).json({ error: "Invalid age value" });
```

### 3. Authentication & Authorization
```javascript
if (!req.isAuthenticated()) return res.status(401).json({ error: "Authentication required" });
if (!req.user.roles?.includes('sysadmin')) return res.status(403).json({ error: "Admin access required" });
```

### 4. Console Logging Standards
**All functions must use unique tags with numbered sequences:**

- **Tag Format**: `XXX` or `XX` (2-3 characters, unique per function)
- **Number Sequence**: Based on function position within file
- **9 = Completion**, **8 = Error**, **1 = First log**

```javascript
app.post("/api/job-templates", async (req, res) => {
  console.log("JOB1 Starting job template creation", { display_text: req.body.display_text });
  try {
    const { display_text, product_id, tier } = req.body;
    
    if (!display_text) {
      console.log("JOB8 Validation failed - missing display_text");
      return res.status(400).json({ error: "Display text is required" });
    }
    
    console.log("JOB2 Executing database insert", { product_id, tier });
    const result = await pool.query(
      "INSERT INTO job_templates (display_text, product_id, tier, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [display_text, product_id, tier, user_id]
    );
    
    console.log("JOB9 Job template created successfully", { id: result.rows[0].id });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("JOB8 Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});
```

### 5. Record-Level Security (Required for Customer Data)

```javascript
// index.js - Backend API Server
// Helper function
async function getUserSecurityClause(userId) {
  console.log("SEC1 Getting user security clause", { userId });
  try {
    const result = await pool.query('SELECT data_security FROM users WHERE id = $1', [userId]);
    const clause = result.rows[0]?.data_security || '1=0';
    console.log("SEC9 Security clause retrieved", { userId, hasClause: !!result.rows[0] });
    return clause;
  } catch (error) {
    console.error("SEC8 Error fetching security clause:", error);
    return '1=0'; // Default to no access
  }
}

// Apply to queries
app.get("/api/customers", async (req, res) => {
  console.log("CUS1 Starting customer fetch", { userId: req.user.id });
  try {
    const securityClause = await getUserSecurityClause(req.user.id);
    const finalClause = securityClause.replace(/\$USER_ID/g, req.user.id);
    
    console.log("CUS2 Executing customer query with security", { clause: finalClause });
    const result = await pool.query(`SELECT c.* FROM customers c WHERE ${finalClause}`);
    
    console.log("CUS9 Customers fetched successfully", { count: result.rows.length });
    res.json(result.rows);
  } catch (error) {
    console.error("CUS8 Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Validate before updates
app.put("/api/customers/:id", async (req, res) => {
  console.log("UPD1 Starting customer update", { customerId: req.params.id, userId: req.user.id });
  try {
    const { id } = req.params;
    const securityClause = await getUserSecurityClause(req.user.id);
    const finalClause = securityClause.replace(/\$USER_ID/g, req.user.id);
    
    console.log("UPD2 Checking customer access", { customerId: id });
    const accessCheck = await pool.query(`SELECT id FROM customers c WHERE c.id = $1 AND ${finalClause}`, [id]);
    
    if (accessCheck.rows.length === 0) {
      console.log("UPD8 Access denied to customer", { customerId: id, userId: req.user.id });
      return res.status(403).json({ error: "Access denied" });
    }
    
    console.log("UPD9 Customer update access granted", { customerId: id });
    // Proceed with update...
  } catch (error) {
    console.error("UPD8 Error in customer update:", error);
    res.status(500).json({ error: "Update failed" });
  }
});
```

**Security Clause Examples:**
- Admin: `"1=1"`
- User: `"c.id IN (SELECT customer_id FROM user_accessible_customers WHERE assigned_user_id = $USER_ID)"`
- No access: `"1=0"`

## Standards

- **Use index.js** for all database operations (Backend API)
- **Use app.js** for UI/frontend concerns only
- **RESTful endpoints** in index.js for new features
- **Parameterized queries** always
- **Record-level security** for customer data
- **Input validation** on all endpoints
- **Console logging** with unique tags and numbered sequences (1=start, 9=complete, 8=error)
