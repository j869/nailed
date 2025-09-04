# Organise Files

This document will serve as a guide to organize files within the `organise` folder. Add details about the purpose and structure of files as they are created.

## Proposed Project Structure

### 1. `src/` - Source Code
- **`src/backend/`**: Contains backend logic and API routes.
  - `index.js`
  - `rule-analysis-route.js`
  - `rule-templates-api.js`
- **`src/frontend/`**: Contains frontend logic and views.
  - `app.js`
  - `views/`
  - `public/`
  - `css/`

### 2. `data/` - Data Files
- **`data/excel/`**: Excel files.
  - `Permit Register - MASTER v2.xlsm`
  - `administration.ods`
  - `administration2.xlsm`
- **`data/sql/`**: SQL scripts.
  - `fix_data_issues.sql`
  - `schema.sql`
  - `schema_changes.sql`
  - `schema_workflow.sql`
  - `schema_workflow_validation.sql`
  - `security_view_implementation.sql`

### 3. `tests/` - Testing
- **`tests/unit/`**: Unit tests.
  - `test-function-references.js`
  - `test-template-literals.js`
- **`tests/integration/`**: Integration tests.
  - `test_complete_workflow.js`
  - `test_import_logic.js`
  - `test_workflow_logic.js`
- **`tests/scripts/`**: Test scripts.
  - `run-tests.sh`

### 4. `docs/` - Documentation
- Markdown files.
  - `DATA_SECURITY_SQL_MODIFICATIONS.md`
  - `IMPLEMENTATION_SUMMARY.md`

### 5. `utils/` - Utilities
- Helper scripts.
  - `analyze-change-arrays.js`
  - `inspect_excel.js`
  - `inspect_excel_values.js`

### 6. `logs/` - Logs
- Log files and temporary files.
  - `lu609717obg.tmp`

## File References

### Source Code
- **`index.js`**:
  - Referenced in: Backend API routes, database operations.
  - Key references:
    - `/api/workflow-validator`
    - `/api/update-validator-report`
    - `/download/:id`
    - `/deletefile/:id`

- **`app.js`**:
  - Referenced in: Frontend logic, API calls to backend.
  - Key references:
    - `/admin/workflow-validator`
    - `/admin/update-validator-report`
    - `/files?build_id`

### Data Files
- **`Permit Register - MASTER v2.xlsm`**:
  - Referenced in: Data import/export operations.
  - Key references:
    - `inspect_excel.js`
    - `inspect_problem_rows.js`

- **`administration2.xlsm`**:
  - Referenced in: Admin data management.
  - Key references:
    - `inspect_excel_values.js`

### Documentation
- **`meth.md`**:
  - Referenced in: Development guidelines.
  - Key references:
    - `organise_files.md`

- **`README.md`**:
  - Referenced in: Project overview.
  - Key references:
    - `tests/README.md`

### Utilities
- **`analyze-change-arrays.js`**:
  - Referenced in: Workflow validation.
  - Key references:
    - `test_workflow_logic.js`

- **`inspect_excel.js`**:
  - Referenced in: Excel data validation.
  - Key references:
    - `test_import_logic.js`

### Tests
- **`test_workflow_logic.js`**:
  - Referenced in: Workflow validation tests.
  - Key references:
    - `run-tests.sh`

- **`test_http_endpoint.js`**:
  - Referenced in: HTTP endpoint tests.
  - Key references:
    - `/admin/workflow-validator`

### Views
- **`views/admin/data-integrity-report.ejs`**:
  - Referenced in: Admin dashboard.
  - Key references:
    - `app.js`

### SQL Files
- **`fix_data_issues.sql`**:
  - Referenced in: Data correction operations.
  - Key references:
    - `schema_workflow.sql`

- **`schema_changes.sql`**:
  - Referenced in: Database schema updates.
  - Key references:
    - `run_schema_changes.sh`

- **`schema_workflow_validation.sql`**:
  - Referenced in: Workflow validation schema.
  - Key references:
    - `test_workflow_logic.js`

- **`security_view_implementation.sql`**:
  - Referenced in: Security view setup.
  - Key references:
    - `schema.sql`

## Next Steps
1. **Create Folders**: Set up the proposed folder structure.
2. **Move Files**: Organize files into their respective folders.
3. **Update References**: Ensure all file references in the code are updated.
4. **Test the Project**: Run tests to confirm everything works as expected.
5. **Document Changes**: Update this file and other relevant documentation to reflect the new structure.
