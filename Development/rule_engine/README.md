# Workflow Validator Test Suite

## Overview
Debugging and testing tools for the admin workflow validator functionality.

## Test Files

### 1. `test-workflow-validator.js` 
**Purpose**: Database and data validation testing
- Tests data_problems table access
- Validates summary statistics queries  
- Checks join operations with jobs/customers
- Simulates data structure creation
- Verifies summary calculations

**Usage**:
```bash
node tests/test-workflow-validator.js
```

### 2. `test-http-endpoint.js`
**Purpose**: HTTP endpoint testing
- Tests server connectivity
- Validates admin endpoint authentication
- Checks workflow validator test endpoint
- Verifies static resource access

**Usage**:
```bash
# Start server first
node index.js

# Then run test
node tests/test-http-endpoint.js
```

### 3. `run-tests.sh`
**Purpose**: Complete test suite runner
- Runs all tests in sequence
- Provides clear output formatting
- Handles server dependency checking

**Usage**:
```bash
./tests/run-tests.sh
```

## Console Logging
All tests follow meth.md logging standards:
- **tv**: Test Validator (database tests)
- **he**: HTTP Endpoint (endpoint tests)
- **Numbers**: 1=start, 101-199=init, 201-799=functionality, 8=error, 9=complete

## Debugging Workflow
1. Run database tests first: `node tests/test-workflow-validator.js`
2. If database tests pass, start server: `node index.js` 
3. Run HTTP tests: `node tests/test-http-endpoint.js`
4. Check specific errors in console output

## Common Issues
- **Pool not defined**: Route in wrong file (should be in index.js)
- **ECONNREFUSED**: Server not running on port 4000
- **302 Redirects**: Authentication required (expected for admin routes)
- **Missing joins**: Database relationship issues

## Workflow Validator Updates
- **Update Button**: A button has been added to the admin interface to update the rule validator report.
- **API Endpoint**: The button triggers a POST request to `/admin/update-validator-report` to refresh the validation data.
- **User Feedback**: Alerts notify the user of the success or failure of the update operation.

### Workflow Validator Endpoints

The following endpoints are related to the workflow validator:

1. **Frontend**:
   - `/admin/workflow-validator`: Displays the workflow validator interface.

2. **Backend**:
   - `/api/workflow-validator`: Provides workflow validation data.

### Testing Workflow Validator

- **Test Script**: `test-workflow-validator.js`
  - Purpose: Validates the functionality of the workflow validator.
  - Usage: Run the script using `node tests/test-workflow-validator.js`.

- **HTTP Endpoint Test**: `test-http-endpoint.js`
  - Purpose: Tests the `/admin/workflow-validator` endpoint.
  - Usage: Run the script using `node tests/test-http-endpoint.js`.

### Updates

- Added missing `/api/workflow-validator` endpoint in `index.js`.
- Added missing `/admin/workflow-validator` route in `app.js`.
