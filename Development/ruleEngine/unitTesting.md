# Unit Testing: Field Update Logic

This document outlines the expected unit and integration tests for the update logic as described in the project TODO list.

## Expected Unit Tests

1. **Field Update Cases**
   - Test each supported `fieldID` to ensure the correct table and column are updated.
   - Validate input values and error handling for invalid data.

2. **Workflow & Cascading Updates**
   - **Purpose:** Ensure that updates to a field correctly trigger workflow rules and propagate changes to related records.
   - **Test Scenarios:**
     - When a job status is updated, verify that the corresponding workflow rules in `changeArray` or `processChangeArray` are executed.
     - Confirm that descendant jobs, customers, or products are updated according to the workflow logic (e.g., status changes, target dates, category updates).
     - Test that the `ruleEngine` correctly identifies and updates the next job in sequence when `@next` is used.
     - Validate that recursive updates do not result in infinite loops or missed updates.
     - Ensure that all triggered actions (e.g., archiving a customer, updating related builds) are logged and reflected in the database.
     - Simulate edge cases, such as missing or malformed workflow rules, and verify graceful error handling.
   - **Assertions:**
     - All related records are updated as specified by the workflow rules.
     - No unintended records are modified.
     - The database state matches expected outcomes after cascading updates.
     - All workflow actions are logged for audit purposes.
     - Errors during cascading updates are handled and reported correctly.

3. **Error Handling**
   - Test error responses for failed updates, invalid fieldIDs, and database errors.
   - Confirm that errors are logged and returned in a standardized format.

