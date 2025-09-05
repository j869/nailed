# User Activity Logging

## Purpose
`activityLog` records user actions, route access, and custom annotations to per-user log files for auditing, debugging, and security analysis. It is robust against malformed request objects and file system errors.

## Usage

### Import
```javascript
import { activityLog } from './logging.js';
```

### Call in Express Middleware or Route
```javascript
app.use((req, res, next) => {
  activityLog(req, 'Session started');
  next();
});
```
Or inside a route handler:
```javascript
app.post('/customer/save', (req, res) => {
  activityLog(req, 'Customer save attempted');
  // ...rest of handler...
  activityLog(req, '', '--- Custom annotation: axios call completed ---');
});
```

### Standalone Log Entry
You can log a custom annotation or checkpoint without a request object:
```javascript
activityLog(null, 'Assuming council has recieved our application - setting followup timer 28days from now', '');
```

### Arguments
- `req`: Express request object (optional)
- `customStatement`: Custom log statement (optional)
- `annotation`: Annotation or extra log (optional)

### What Gets Logged
- User ID (from `req.user.id` or `req.user`, or 'anonymous')
- HTTP method
- Endpoint (from `req.originalUrl` or `req.url`)
- All parameters (merged from `req.query`, `req.body`, `req.params`)
- Custom statement (if provided)
- Annotation (if provided)
- Succinct one-line log record for easy scanning

### Log File Location
- Each user's activity is written to: `src/logs/userActivity/{userId}.log`
- Errors are written to: `src/logs/userActivity/error.log`

## Log File Size Management
If a log file exceeds 50MB, the oldest 10MB (up to the next newline) is removed for performance. This keeps log files efficient and recent.

## Example Log Entry
```
[2025-09-05T12:34:56.789Z] user:1 method:POST endpoint:/customer/save params:{"fullName":"Test User","email":"test@example.com","id":1}
    > custom:Assuming council has recieved our application - setting followup timer 28days from now
[2025-09-05T12:35:00.000Z] user:1 method:POST endpoint:/test/trim annotation:Testing trim logic after file exceeds 50MB params:{"test":"trim","id":1}
```

## Error Handling
If the request object is malformed or a file system error occurs, the error is logged to `error.log` and does not crash the application.

## Testing Log Size Management
To test log trimming, use the provided script:
```javascript
// testLogSize.js
import { activityLog } from './logging.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userActivityDir = path.join(__dirname, 'userActivity');
const logFile = path.join(userActivityDir, '1.log');

function fillLogFile() {
  const entry = 'FILLER LOG ENTRY\n';
  const targetSize = 52 * 1024 * 1024; // 52MB
  let written = 0;
  const stream = fs.createWriteStream(logFile, { flags: 'w' });
  while (written < targetSize) {
    stream.write(entry);
    written += entry.length;
  }
  stream.end();
  console.log('Filled log file to', (written / (1024 * 1024)).toFixed(2), 'MB');
}

function testTrimLogic() {
  fillLogFile();
  activityLog({
    user: { id: 1 },
    method: 'POST',
    originalUrl: '/test/trim',
    query: {},
    body: { test: 'trim' },
    params: { id: 1 }
  }, '', 'Testing trim logic after file exceeds 50MB');
  const stats = fs.statSync(logFile);
  console.log('Final log file size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
}

testTrimLogic();
```
This script fills the log file, triggers trimming, and prints the final size.

## Running Logging Tests

To run the user activity log test:
```bash
node src/logging/testLog.js
```

To run the log size trimming test:
```bash
node src/logging/testLogSize.js
```

These commands execute your test scripts and print results to the console.
