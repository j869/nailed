# Endpoint Logs Documentation

This document lists all the endpoints in the project along with their associated `console.log` statements for debugging and tracking purposes.

## Endpoints and Logs

### Frontend (app.js)

#### `<uvr>` `/admin/update-validator-report`
- **Description**: Triggers the update of the validator report.

#### `/demo/rules`
- **Description**: Displays demo rules.

#### `/demo/rules/test`
- **Description**: Tests demo rules.

#### `/admin/rule-builder`
- **Description**: Provides the rule builder interface.

#### `/admin/workflow-validator`
- **Description**: Displays the workflow validator.

#### `/api/rule-test`
- **Description**: Tests a specific rule.

#### `/api/rules`
- **Description**: Manages rules via API.

#### `/admin/customers/import`
- **Description**: Imports customer data.

#### `/admin/customers/import/reverts`
- **Description**: Lists revert options for customer imports.

#### `/admin/customers/import/revert/:filename`
- **Description**: Reverts a specific customer import.

#### `/`
- **Description**: Main application entry point.

#### `/daytaskUpdate`
- **Description**: Updates day tasks.

#### `/updateSMTP`
- **Description**: Updates SMTP settings.

#### `/checkemail`
- **Description**: Checks email configurations.

#### `/2/build/:id`
- **Description**: Displays build details.

#### `/2/customers`
- **Description**: Lists customers.

#### `/3/customers`
- **Description**: Lists customers in a different view.

### Backend (index.js)

#### `<wv>` `/api/workflow-validator`
- **Description**: Provides workflow validation data.

#### `<uvr>` `/api/update-validator-report`
- **Description**: Updates the validator report in the database.

#### `/encrypt/:text`
- **Description**: Encrypts a given text.

#### `/decrypt/:text`
- **Description**: Decrypts a given text.

#### `/upload`
- **Description**: Uploads a file.

#### `/files`
- **Description**: Lists available files.

#### `/deletefile/:id`
- **Description**: Deletes a specific file.

#### `/download/:id`
- **Description**: Downloads a specific file.

#### `/testSMTP/:user_id`
- **Description**: Tests SMTP for a specific user.

#### `/email/:cust_id/:user_id`
- **Description**: Sends an email to a customer.

#### `/jobs/:id`
- **Description**: Retrieves job details.

#### `/jobDone/:id`
- **Description**: Marks a job as done.

#### `/executeJobAction`
- **Description**: Executes a specific job action.

#### `/update`
- **Description**: Updates a resource.

#### `/tasks/:id`
- **Description**: Retrieves task details.

#### `/addtask`
- **Description**: Adds a new task.

#### `/deltask`
- **Description**: Deletes a task.

#### `/addjob`
- **Description**: Adds a new job.

#### `/deleteJob`
- **Description**: Deletes a job.

#### `/api/workflow-problems`
- **Description**: Retrieves workflow problems.

---

## Notes
- Ensure all endpoints follow the logging standards outlined in `meth.md`.
- Use unique tags and logical numbering for all `console.log` statements.
- Update this document whenever new endpoints or logs are added.
