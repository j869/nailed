# Workflow Setup Scripts

This directory contains scripts to set up and verify the modular permit workflows.

## Files

- **`run_workflow_setup.sh`** - Main setup script that executes the SQL and runs tests
- **`test_workflow_setup.sql`** - Comprehensive test suite to verify setup
- **`schema_workflow.sql`** - The SQL file containing all workflow definitions

## Quick Start

1. **Set up database connection** (modify as needed):
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=nailed
   export DB_USER=postgres
   ```

2. **Run the setup script**:
   ```bash
   ./run_workflow_setup.sh
   ```

3. **Or run components separately**:
   ```bash
   # Execute the SQL setup
   psql -h localhost -d nailed -U postgres -f schema_workflow.sql
   
   # Run verification tests
   psql -h localhost -d nailed -U postgres -f test_workflow_setup.sql
   ```

## What Gets Created

### Products (Workflows)
- **51** - Pre Deposit (Steps 1.00-3.99)
- **52** - Report & Consent (Step 4.00)
- **53** - Planning Permit (Step 5.00)
- **54** - Building Permit (Step 6.00)
- **55** - Active Permit (Steps 7.00-8.99)

### Branching Logic
From **Workflow 51** (Pre Deposit):
- → Workflow 52 (Report & Consent) - Standard path
- → Workflow 53 (Planning Permit) - Skip R&C
- → Workflow 54 (Building Permit) - Skip R&C & PP

From **Workflow 52** (Report & Consent):
- → Workflow 53 (Planning Permit) - Standard path
- → Workflow 54 (Building Permit) - Skip PP

### Job Template Counts
- Workflow 51: 41 templates (including 3 branching options)
- Workflow 52: 14 templates (including 2 branching options)
- Workflow 53: 13 templates
- Workflow 54: 16 templates
- Workflow 55: 19 templates

**Total: 103 job templates**

## Verification Tests

The test suite checks:
1. ✅ All products 51-55 exist
2. ✅ Correct job template counts per workflow
3. ✅ Branching tasks are properly created
4. ✅ Workflow transition triggers are set
5. ✅ ID ranges don't overlap
6. ✅ Task linking (antecedent/descendant) is correct
7. ✅ Summary statistics

## Troubleshooting

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check connection parameters
- Ensure user has appropriate permissions

**SQL Execution Errors:**
- Check if tables exist (products, job_templates)
- Verify no conflicting data
- Review error messages for specific issues

**Test Failures:**
- Review which specific test failed
- Check database state manually
- Verify expected vs actual counts

## ID Ranges Used

- **Workflow 51**: 5110-5235 (126 IDs reserved)
- **Workflow 52**: 5240-5274 (35 IDs reserved)
- **Workflow 53**: 5280-5313 (34 IDs reserved)
- **Workflow 54**: 5320-5365 (46 IDs reserved)
- **Workflow 55**: 5370-5424 (55 IDs reserved)

These ranges ensure no ID conflicts between workflows.
