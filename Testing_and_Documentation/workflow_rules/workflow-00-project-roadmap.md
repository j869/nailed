# Workflow Rules Migration Project Roadmap

**Project:** Migration to New Workflow Rules Engine  
**Branch:** organise  
**Development Style:** MVP Prototyping (following meth.md)  
**Status:** In Progress  
**Created:** 4 September 2025  

---

## MVP Development Approach

### Core Principles (From meth.md)
- **Build minimal working prototypes** before full implementations
- **Test core concepts** with simple, working examples  
- **Allow programmer to test** before completing changes
- **Low complexity** - use beginner programmer concepts where possible
- **Permission-based development** - get approval before building

### Project Mission
Create a **simple, testable workflow validator** that identifies broken workflows, then incrementally build supporting tools based on real usage feedback.

### MVP Project Scope
- **IN SCOPE:** One working workflow validator prototype, basic admin interface
- **OUT OF SCOPE:** Complex migration tools, bulk operations, advanced features
- **TEST-FIRST:** Every component must be testable in isolation

---

## Current State Assessment

### ✅ Working Foundation 
- **Rule Engine Demo** (`/admin/rule-engine-demo`) - Testable prototype exists
- **Database Access** - PostgreSQL connection and query patterns established
- **Legacy Documentation** - Workflow logic is documented and understood

### 🎯 Current Focus (Tool 2 - Workflow Validator)
**Goal:** Build ONE simple validator that finds broken workflows
**Success Metric:** Show me 3 specific broken workflows in the database

---

## MVP Development Phases

## **PROTOTYPE 1: Complete Workflow Validator (Week 1)**
*Following meth.md: Build complete working prototype, then iterate*

### What We'll Build
A **complete workflow validation system** that identifies all types of workflow problems in one functional prototype.

### Scope Check - Complete Validator
- **Build:** Full validation function covering all workflow issues
- **Database:** Schema changes allowed - add system_comments column and workflow_problems table
- **Functionality:** 
  - JSON structure validation for change_arrays
  - Workflow completeness checking  
  - Broken antecedent/descendant chain detection
  - Template link validation
  - Tier inheritance rule checking
- **Test:** Against real database with all active jobs
- **Show:** Comprehensive list of all workflow problems by type
- **NOT building:** Admin interface (that's Prototype 2)

### Permission Check Required
Before I build this complete prototype, I need your permission to:
1. **Database changes:** Add system_comments column and workflow_problems table
2. **Create comprehensive validator:** `utils/workflowValidator.js` with all validation types
3. **Add test route:** `/test-validator` showing all problem types
4. **Test against full dataset:** All active customers and workflows

### Database Changes Included
```sql
-- Add system tracking
ALTER TABLE jobs ADD COLUMN system_comments TEXT;
ALTER TABLE job_templates ADD COLUMN system_comments TEXT;

-- Create problems tracking table
CREATE TABLE workflow_problems (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL, 
    problem_type VARCHAR(100) NOT NULL,
    problem_description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    detected_date TIMESTAMP DEFAULT NOW(),
    resolved_date TIMESTAMP NULL,
    resolved_by INTEGER NULL
);

-- Auto-clear template links when workflows change
CREATE TRIGGER jobs_template_link_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION clear_job_template_link();
```

**Deliverable:** Complete working workflow validator identifying all problem types

---

## **PROTOTYPE 2: Admin Interface (Week 2)**
*Add usable interface to complete validator*

### What We'll Build (AFTER testing Prototype 1)
Professional admin interface displaying validation results in organized, actionable format.

### Scope Check
- **Build:** Complete `/admin/workflow-validator` route and EJS view
- **Features:** Tabbed interface (Overview, JSON Errors, Missing Steps, Broken Chains, Template Issues)
- **Display:** Organized by customer, severity, problem type
- **Actions:** View details, mark as reviewed, export reports
- **Test:** Load real validation data and display clearly
- **NOT building:** Auto-fixing tools, bulk operations

### Permission Check Required
Will ask permission after Prototype 1 is tested and proven valuable.

**Deliverable:** Production-ready admin interface for workflow validation

---

## **PROTOTYPE 3: Enhanced Validation Logic (Week 3)**
*Improve specific validation areas based on real usage*

### What We'll Build (AFTER testing Prototype 2)
Enhanced validation logic for specific problem areas discovered during testing.

### Potential Improvements (Based on Prototype 1 & 2 feedback)
- **Deeper JSON validation:** Check antecedent/action field logic
- **Product-specific rules:** Validate workflows against product requirements  
- **Performance optimization:** Handle large datasets efficiently
- **Custom workflow detection:** Identify jobs modified from templates
- **Severity classification:** Better problem prioritization

### Permission Check Required
Will ask permission after Prototype 2 feedback and identify specific enhancement needs.

**Deliverable:** Enhanced validator with improved accuracy and performance

---

## **PROTOTYPE 4: Workflow Problem Resolution Tools (Week 4)**
*Add tools to fix identified problems*

### What We'll Build (AFTER testing Prototype 3)
Basic tools to resolve common workflow problems identified by the validator.

### Potential Features (Based on validation results)
- **Template link repair:** Reconnect jobs to correct templates
- **JSON repair tools:** Fix common change_array syntax errors
- **Workflow completion:** Add missing workflow steps
- **Bulk problem resolution:** Fix multiple similar issues at once

### Permission Check Required
Will ask permission after Prototype 3 testing reveals which problems are most common and fixable.

**Deliverable:** Problem resolution tools for most common workflow issues

---

## Database Approach (Following README_writing2database.md)

### Complete Validation System Pattern
```javascript
// Complete workflow validator endpoint
app.get("/test-validator", async (req, res) => {
  try {
    // Get all active workflows
    const result = await pool.query(`
      SELECT 
        j.id, j.display_text, j.change_array, j.job_template_id,
        j.current_status, j.build_id,
        c.id as customer_id, c.full_name,
        b.product_id, p.display_text as product_name,
        jt.antecedent_array, jt.decendant_array, jt.tier
      FROM jobs j
      LEFT JOIN builds b ON j.build_id = b.id  
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN products p ON b.product_id = p.id
      LEFT JOIN job_templates jt ON j.job_template_id = jt.id
      WHERE c.current_status NOT LIKE 'Archive%'
    `);
    
    // Complete validation logic
    const validator = new WorkflowValidator();
    const allProblems = {
      jsonErrors: [],
      missingSteps: [],
      brokenChains: [],
      templateIssues: [],
      tierViolations: []
    };
    
    // Validate all aspects
    result.rows.forEach(job => {
      allProblems.jsonErrors.push(...validator.validateJSON(job));
      allProblems.missingSteps.push(...validator.validateCompleteness(job));
      allProblems.brokenChains.push(...validator.validateChains(job));
      allProblems.templateIssues.push(...validator.validateTemplateLinks(job));
      allProblems.tierViolations.push(...validator.validateTierInheritance(job));
    });
    
    // Store problems in database
    await validator.storeProblems(allProblems);
    
    // Return comprehensive results
    res.json({ 
      summary: validator.generateSummary(allProblems),
      problems: allProblems,
      totalJobs: result.rows.length,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Schema Changes Implementation
```javascript
// Schema migration function
async function migrateWorkflowSchema() {
  try {
    // Add system comments columns
    await pool.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS system_comments TEXT;
      ALTER TABLE job_templates ADD COLUMN IF NOT EXISTS system_comments TEXT;
    `);
    
    // Create workflow problems table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_problems (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL, 
        problem_type VARCHAR(100) NOT NULL,
        problem_description TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        detected_date TIMESTAMP DEFAULT NOW(),
        resolved_date TIMESTAMP NULL,
        resolved_by INTEGER NULL
      );
    `);
    
    // Create template link clearing function and trigger
    await pool.query(`
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
      
      DROP TRIGGER IF EXISTS jobs_template_link_trigger ON jobs;
      CREATE TRIGGER jobs_template_link_trigger
          BEFORE UPDATE ON jobs
          FOR EACH ROW
          EXECUTE FUNCTION clear_job_template_link();
    `);
    
    console.log('Workflow schema migration completed successfully');
  } catch (error) {
    console.error('Schema migration failed:', error);
    throw error;
  }
}
```

### Testing Strategy
- **Full dataset:** Test against all active customers and workflows
- **Real problems:** Identify actual workflow issues in production data
- **Performance testing:** Handle large result sets efficiently  
- **Manual verification:** Verify validation results against known issues

---

## Success Metrics (MVP Style)

### Prototype 1 Success (Complete Validator)
- [ ] **Schema deployed:** system_comments columns and workflow_problems table active
- [ ] **Template trigger working:** job_template_id cleared when change_array modified
- [ ] **Comprehensive validation:** Identifies JSON errors, missing steps, broken chains, template issues, tier violations
- [ ] **Real problems found:** Discovers actual workflow issues in production database
- [ ] **Performance acceptable:** Processes all active workflows in reasonable time
- [ ] **Stored results:** Problems logged to workflow_problems table

### Prototype 2 Success (Admin Interface)
- [ ] **Usable interface:** Admin can view all problem types clearly
- [ ] **Organized display:** Problems grouped by type, customer, severity
- [ ] **Actionable information:** Enough detail to understand and fix issues
- [ ] **Real value:** Saves significant time identifying workflow problems

### Prototype 3 Success (Enhanced Logic)
- [ ] **Improved accuracy:** Better problem detection based on real usage
- [ ] **Performance optimized:** Handles large datasets efficiently
- [ ] **Enhanced classification:** Better severity and priority assignment

### Prototype 4 Success (Resolution Tools)
- [ ] **Problem fixing:** Can resolve common workflow issues
- [ ] **Bulk operations:** Fix multiple similar problems efficiently
- [ ] **Template repair:** Restore broken template linkages

---

## Risk Management (Production Ready)

### Database Changes Risk
- **Schema migration testing:** Test all changes in development first
- **Backup before changes:** Full database backup before schema modifications
- **Rollback capability:** Script to reverse all schema changes if needed
- **Trigger testing:** Verify template link clearing works correctly

### Performance Risk
- **Large dataset handling:** Optimize queries for production data volumes
- **Query optimization:** Index key fields used in validation
- **Batch processing:** Process workflows in manageable chunks if needed

### Data Integrity Risk  
- **Validation accuracy:** Ensure validator correctly identifies real problems
- **False positives:** Minimize incorrect problem identification
- **Template link clearing:** Verify trigger only clears when appropriate

---

## Next Actions (This Week)

### Immediate Next Step
**PERMISSION CHECK:** Do you want me to build Prototype 1 (Complete Workflow Validator)?

If yes, I will build the complete system including:

1. **Schema Migration:**
   - Add system_comments columns to jobs and job_templates tables
   - Create workflow_problems table for tracking issues
   - Implement template link clearing trigger

2. **Complete Validator (`utils/workflowValidator.js`):**
   - JSON structure validation for change_arrays
   - Workflow completeness checking
   - Broken antecedent/descendant chain detection  
   - Template link validation
   - Tier inheritance rule checking

3. **Test Route (`/test-validator`):**
   - Process all active workflows
   - Store problems in workflow_problems table
   - Return comprehensive validation results
   - Performance metrics and timing

4. **Testing Against Production Data:**
   - Run against all active customers
   - Identify real workflow problems
   - Verify validation accuracy
   - Check performance with full dataset

### After Your Testing
- You test Prototype 1 with real production data
- You review all identified workflow problems
- You tell me what validation logic needs improvement
- We decide if Prototype 2 (Admin Interface) is needed
- **No building ahead** - wait for your feedback on complete validator first

### Scope Confirmation
This builds the complete Tool 2 (Workflow Validator) from your planning documents as one working prototype, then we iterate on improvements based on real usage.

---

*Following meth.md: Build complete working prototype, allow testing, iterate based on feedback.*
