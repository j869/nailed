# Documentation: fieldUpdates.js Switch Statement

This file documents the main switch statement in `fieldUpdates.js` that handles field update requests for various entities in the application. The switch is based on the `fieldID` parameter received from the client, and each case updates a specific field in the database, often with validation and logging.

## Overview
- The switch statement is located in the `/update` route handler.
- It receives `fieldID`, `newValue`, and `rowID` as query parameters.
- For each supported `fieldID`, it determines the target table and column, performs validation, and executes the update using either direct SQL or an API call.
- Some cases trigger additional logic, such as updating related records or running the `ruleEngine`.

## Supported fieldIDs and Actions

| fieldID                | Table              | Column             | Notes/Validation/Logic |
|------------------------|--------------------|--------------------|-----------------------|
| customerFollowUpDate   | customers          | follow_up          | Simple update         |
| jobTargetDate          | jobs               | target_date        | Date validation       |
| taskTargetDate         | tasks              | target_date        | Date validation       |
| dueDate                | jobs               | target_date        | Date validation       |
| changeArray            | jobs               | change_array       | Simple update         |
| jobTier                | jobs/job_process_flow | tier           | Updates related flows |
| processChangeArray     | job_process_flow   | change_array       | Simple update         |
| jobDesc                | jobs               | free_text          | Encodes value         |
| jobOwner               | jobs/tasks         | user_id/owned_by   | Updates child jobs    |
| taskDesc               | tasks              | free_text          | Encodes value         |
| jobTitle               | jobs               | display_text       | Truncates long values |
| taskStatus             | tasks              | current_status     | Simple update         |
| taskTitle              | tasks              | display_text       | Truncates long values |
| taskOrder              | tasks/jobs         | sort_order         | Handles fallback      |
| taskPerson             | tasks              | completed_by_person| Simple update         |
| flowChangeArray        | job_process_flow   | change_array       | Simple update         |
| flowTier               | job_process_flow   | tier               | Simple update         |
| otherContact           | customers          | contact_other      | Simple update         |
| contactStatus          | customers          | current_status     | Encodes value         |
| contactName            | customers          | full_name          | Encodes value         |
| contactAddress         | customers          | home_address       | Encodes value         |
| contactPhone           | customers          | primary_phone      | Simple update         |
| contactEmail           | customers          | primary_email      | Simple update         |
| nextJob                | builds             | job_id             | Simple update         |
| daytaskTitle           | worksheets         | title              | Encodes value         |
| daytaskPerson          | worksheets/tasks   | user_id/owned_by   | Transactional update  |
| daytaskDate            | worksheets/jobs    | date/target_date   | Date logic            |
| daytaskArchive         | worksheets         | archive            | Boolean conversion    |
| jobOrder               | jobs               | sort_order         | Simple update         |
| jobPerson              | jobs               | user_id            | Simple update         |
| jobStatus              | jobs               | current_status     | Triggers ruleEngine   |
| display_text           | job_templates      | display_text       | Simple update         |
| user_id                | job_templates      | user_id            | Converts to int/null  |
| role_id                | job_templates      | role_id            | Converts to int/null  |
| product_id             | job_templates      | product_id         | Converts to int/null  |
| sort_order             | job_templates      | sort_order         | Simple update         |
| tier                   | job_templates      | tier               | Converts to float     |
| free_text              | job_templates      | free_text          | Simple update         |
| antecedent_array       | job_templates      | antecedent_array   | Simple update         |
| decendant_array        | job_templates      | decendant_array    | Simple update         |
| job_change_array       | job_templates      | job_change_array   | Simple update         |
| flow_change_array      | job_templates      | flow_change_array  | Simple update         |

## Default Case
If the `fieldID` does not match any of the above, an error is logged and a 500 response is sent.

## Example
```js
switch (fieldID) {
  case "customerFollowUpDate":
    // ... update logic ...
    break;
  // ... other cases ...
  default:
    // Error handling
}
```

## Notes
- Many cases include logging for debugging and audit purposes.
- Some cases (e.g., jobOwner, jobTier) update multiple related records.
- The switch is extensible: new fieldIDs can be added as new cases.

---
Generated by GitHub Copilot on 2025-09-05.
