# Database Update Methods Documentation

## Overview
This document analyzes the current database update patterns in the application and provides recommendations for reliable database operations from UI through API to PostgreSQL.

## Current Database Update Patterns

### 1. Direct API Endpoints (Most Reliable) ✅

**Architecture**: `UI → API Server (index.js) → PostgreSQL`

**Implementation Example**:
```javascript
// Frontend (JavaScript/EJS)
const response = await fetch('/api/job-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    display_text: 'New Task',
    product_id: 51,
    tier: '501'
  })
});

// Backend (index.js)
app.post("/api/job-templates", async (req, res) => {
  try {
    const { display_text, product_id, tier } = req.body;
    
    // Input validation
    if (!display_text) {
      return res.status(400).json({ error: "Display text is required" });
    }
    
    // Parameterized query
    const result = await pool.query(`
      INSERT INTO job_templates (display_text, product_id, tier, user_id) 
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [display_text, product_id, tier, user_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating job template:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
```

**Strengths**:
- ✅ **SQL Injection Protection**: Parameterized queries (`$1, $2, $3...`)
- ✅ **Input Validation**: Explicit validation before database operations
- ✅ **Error Handling**: Comprehensive try/catch with meaningful responses
- ✅ **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- ✅ **JSON Response Format**: Consistent data exchange format
- ✅ **Transaction Safety**: Single point of database interaction

**Use Cases**:
- Job Templates CRUD operations
- New entity creation
- Complex data operations
- Bulk operations

### 2. Proxy Pattern via App Server (Moderate Reliability) ⚠️

**Architecture**: `UI → App Server (app.js) → API Server (index.js) → PostgreSQL`

**Implementation Example**:
```javascript
// Frontend call
const response = await fetch(`/update?fieldID=jobTargetDate&newValue=${newValue}&whereID=${recordId}`);

// App.js proxy handler
app.get("/update", async (req, res) => {
  const fieldID = req.query.fieldID;
  const newValue = req.query.newValue;
  const rowID = req.query.whereID;
  
  switch (fieldID) {
    case "jobTargetDate":
      table = "jobs";
      columnName = "target_date";
      // Proxy to API server
      const apiResponse = await axios.get(`${API_URL}/update?table=${table}&column=${columnName}&value=${newValue}&id=${rowID}`);
      res.status(apiResponse.status).send("Update successful");
      break;
  }
});
```

**Weaknesses**:
- ⚠️ **Double HTTP Calls**: Increased latency and failure points
- ⚠️ **URL Parameter Encoding**: Issues with special characters and JSON
- ⚠️ **Complex Error Handling**: Errors can occur at multiple layers
- ⚠️ **Maintenance Overhead**: Changes require updates in multiple files

**Use Cases**:
- Legacy inline editing
- Quick field updates
- Simple data modifications

### 3. Direct SQL in App Server (Least Reliable) ❌

**Architecture**: `UI → App Server (app.js) → PostgreSQL (Direct)`

**Implementation Example**:
```javascript
// DANGEROUS - String concatenation
app.post("/updateCustomer/:id", async (req, res) => {
  const updateSQL = "UPDATE customers SET " +
    "full_name='" + req.body.fullName + "', " +
    "home_address='" + req.body.homeAddress + "', " +
    "primary_phone='" + req.body.primaryPhone + "' " +
    "WHERE id=" + req.params.id;
  
  const result = await db.query(updateSQL);
});
```

**Critical Issues**:
- ❌ **SQL Injection Vulnerability**: User input directly concatenated into SQL
- ❌ **No Input Validation**: Accepts any input without sanitization
- ❌ **Poor Error Handling**: Limited error recovery options
- ❌ **Security Risk**: Potential for malicious SQL execution

**Status**: **DEPRECATED - DO NOT USE**

## Recommended Database Update Patterns

### Pattern A: RESTful API Endpoints (Preferred)

**When to Use**: New features, complex operations, data integrity critical

**Structure**:
```javascript
// CREATE
POST /api/{resource}
Body: JSON data

// READ
GET /api/{resource}
GET /api/{resource}/{id}

// UPDATE
PUT /api/{resource}/{id}
Body: Complete object
PATCH /api/{resource}/{id}
Body: Partial updates

// DELETE
DELETE /api/{resource}/{id}
```

**Implementation Template**:
```javascript
// Create
app.post("/api/resource", async (req, res) => {
  try {
    const { field1, field2 } = req.body;
    
    // Validation
    if (!field1) {
      return res.status(400).json({ error: "field1 is required" });
    }
    
    // Database operation
    const result = await pool.query(
      "INSERT INTO table_name (field1, field2) VALUES ($1, $2) RETURNING *",
      [field1, field2]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update
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

### Pattern B: Inline Edit Updates (Acceptable)

**When to Use**: Simple field updates, existing functionality maintenance

**Improved Implementation**:
```javascript
// Frontend
async function updateField(fieldName, newValue, recordId) {
  try {
    const response = await fetch('/api/inline-update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'jobs',
        field: fieldName,
        value: newValue,
        id: recordId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Update failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update error:', error);
    alert('Update failed. Please try again.');
  }
}

// Backend
app.patch("/api/inline-update", async (req, res) => {
  try {
    const { table, field, value, id } = req.body;
    
    // Whitelist allowed tables and fields
    const allowedUpdates = {
      'jobs': ['target_date', 'status', 'notes'],
      'customers': ['follow_up', 'status'],
      'job_templates': ['display_text', 'free_text', 'sort_order']
    };
    
    if (!allowedUpdates[table] || !allowedUpdates[table].includes(field)) {
      return res.status(400).json({ error: "Invalid table or field" });
    }
    
    const result = await pool.query(
      `UPDATE ${table} SET ${field} = $1 WHERE id = $2 RETURNING *`,
      [value, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Inline update error:", error);
    res.status(500).json({ error: "Update failed" });
  }
});
```

## Security Best Practices

### 1. Always Use Parameterized Queries
```javascript
// ✅ SECURE
const result = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND status = $2",
  [email, status]
);

// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}' AND status = '${status}'`;
```

### 2. Input Validation
```javascript
// Validate required fields
if (!email || !password) {
  return res.status(400).json({ error: "Email and password required" });
}

// Validate data types
if (typeof age !== 'number' || age < 0) {
  return res.status(400).json({ error: "Invalid age value" });
}

// Validate formats (email, dates, etc.)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: "Invalid email format" });
}
```

### 3. Error Handling
```javascript
try {
  const result = await pool.query(query, params);
  res.json(result.rows);
} catch (error) {
  // Log detailed error for debugging
  console.error("Database error:", error);
  
  // Return generic error to client
  res.status(500).json({ 
    error: "Database operation failed",
    // Only include details in development
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
}
```

### 4. Authentication & Authorization
```javascript
// Check authentication
if (!req.isAuthenticated()) {
  return res.status(401).json({ error: "Authentication required" });
}

// Check permissions (example for admin-only operations)
if (!req.user.roles?.includes('sysadmin')) {
  return res.status(403).json({ error: "Admin access required" });
}
```

## Migration Strategy

### Phase 1: Secure Existing Endpoints
1. **Immediate**: Replace string concatenation with parameterized queries
2. **High Priority**: Add input validation to all endpoints
3. **Medium Priority**: Improve error handling

### Phase 2: Modernize Architecture
1. **Convert proxy patterns** to direct API endpoints
2. **Implement RESTful endpoints** for new features
3. **Add comprehensive testing** for database operations

### Phase 3: Enhancement
1. **Add transaction support** for complex operations
2. **Implement database connection pooling** optimization
3. **Add audit logging** for sensitive operations

## Example: Complete CRUD Implementation

**File: `/routes/api/products.js`**
```javascript
import express from 'express';
const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY display_text');
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const { display_text, description } = req.body;
    
    if (!display_text) {
      return res.status(400).json({ error: 'Display text is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO products (display_text, description) VALUES ($1, $2) RETURNING *',
      [display_text, description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { display_text, description } = req.body;
    
    if (!display_text) {
      return res.status(400).json({ error: 'Display text is required' });
    }
    
    const result = await pool.query(
      'UPDATE products SET display_text = $1, description = $2 WHERE id = $3 RETURNING *',
      [display_text, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
```

## Conclusion

**Recommended Approach**:
1. **Use RESTful API endpoints** for all new database operations
2. **Migrate existing string concatenation** to parameterized queries immediately
3. **Implement proper validation and error handling** consistently
4. **Follow the job templates CRUD pattern** as the standard template

**Priority Actions**:
1. **Security Fix**: Replace vulnerable SQL concatenation in customer updates
2. **Standardization**: Adopt consistent API patterns across all endpoints
3. **Testing**: Add comprehensive database operation testing

This approach ensures reliable, secure, and maintainable database operations throughout the application.
