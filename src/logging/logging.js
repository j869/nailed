


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userActivityDir = path.join(__dirname, 'userActivity');


/**
 * Test function to log sample activity for user 1
 */
export function testActivityLogUser1() {
	const mockReqs = [
		{
			user: { id: 1 },
			method: 'POST',
			originalUrl: '/customer/save',
			query: {},
			body: { fullName: 'Test User', email: 'test@example.com' },
			params: { id: 1 }
		},
		{
			user: { id: 1 },
			method: 'GET',
			originalUrl: '/customer/1',
			query: { view: 'details' },
			body: {},
			params: { id: 1 }
		},
		{
			user: { id: 1 },
			method: 'POST',
			originalUrl: '/updateCustomer',
			query: {},
			body: { action: 'edit', fullName: 'Test User' },
			params: { id: 1 }
		}
	];
	for (const req of mockReqs) {
		activityLog(req);
		// Add a custom annotation log between requests
    	activityLog(req, '', '--- Standalone log: workflow checkpoint reached ---');
	}
	// Log a standalone custom statement (not tied to a req)
		activityLog(null, 'Assuming council has recieved our application - setting followup timer 28days from now', '');
}


if (!fs.existsSync(userActivityDir)) {
	fs.mkdirSync(userActivityDir, { recursive: true });
}

/**
 * Logs user activity to a per-user file in src/logs/userActivity/{userId}.log
 * Extracts user, endpoint, and parameters from req.
 * Optionally accepts a custom statement for context.
 *
 * @param {Object} req - Express request object
 * @param {string} [customStatement] - Optional custom log statement
 */
export function activityLog(req, customStatement = '', annotation = '') {
	try {
        // console.log('pr1  logging started')
		let userId = 'anonymous';
		let endpoint = '';
		let method = '';
		let parameters = {};
		if (req && typeof req === 'object') {
            // console.log('pr2  req object found')
			userId = req.user?.id || req.user || 'anonymous';
			endpoint = req.originalUrl || req.url || '';
			method = req.method || '';
			parameters = {
				...(req.query || {}),
				...(req.body || {}),
				...(req.params || {})
			};
		}
		const logFile = path.join(userActivityDir, `${userId}.log`);
		let logEntry = `\n[${new Date().toISOString()}]`;
		// if (customStatement) {
		// 	logEntry += `\n  CUSTOM: ${customStatement}`;
		// }
		// if (req && typeof req === 'object') {
		// 	logEntry += `\n  METHOD: ${method}`;
		// 	logEntry += `\n  ENDPOINT: ${endpoint}`;
		// 	logEntry += `\n  PARAMS: ${JSON.stringify(parameters, null, 2)}`;
		// }
		// if (annotation) {
		// 	logEntry += `\n  ANNOTATION: ${annotation}`;
		// }
        let oneLine = `[${new Date().toISOString()}] user:${userId} method:${method} endpoint:${endpoint}`;
		if (customStatement) {
            // console.log('pr3  custom statement found', customStatement)
            oneLine = `    > custom:${customStatement}`;
		} else {
            // console.log('pr4  no custom statement', oneLine, annotation)
            if (annotation) oneLine += ` annotation:${annotation}`;
            if (Object.keys(parameters).length) oneLine += ` params:${JSON.stringify(parameters)}`;
        }
		logEntry = `${oneLine}\n`;
		// Check file size and trim if necessary
		const MAX_SIZE = 50 * 1024 * 1024; // 50MB
		if (fs.existsSync(logFile)) {
			const stats = fs.statSync(logFile);
			if (stats.size > MAX_SIZE) {
				console.log('pr5  log file exceeds 50MB (', (stats.size / (1024 * 1024)).toFixed(2), 'MB), trimming...')
				// Remove the oldest 10MB from the start of the file
				const REMOVE_SIZE = 10 * 1024 * 1024; // 10MB
				const data = fs.readFileSync(logFile);
				let start = REMOVE_SIZE;
				// Find the next newline after REMOVE_SIZE for clean cut
				while (start < data.length && data[start] !== 10) { // 10 is '\n' in ASCII
					start++;
				}
				const trimmed = data.slice(start + 1); // skip the newline
				fs.writeFileSync(logFile, trimmed);
                // activityLog(null, `Log file exceeded 50MB, trimmed oldest entries`, '');
			}
		}
		fs.appendFileSync(logFile, logEntry);
		console.log('pr9  log written: ', logEntry)
	} catch (err) {
		const errorLogFile = path.join(userActivityDir, 'error.log');
		const errorEntry = `[${new Date().toISOString()}] ERROR logging: ${err.message}\n`;
		console.error('pr8  Logging error:', err);
        fs.appendFileSync(errorLogFile, errorEntry);
	}
}




/**
 * Logs system activity to a per-user file in src/logs/userActivity/{userId}.log
 * Extracts user, endpoint, and parameters from req.
 * Optionally accepts a custom statement for context.
 *
 * @param {Object} req - Express request object
 * @param {string} [customStatement] - Optional custom log statement
 */
export function systemLog(req, customStatement = '', annotation = '') {
	try {
        // console.log('pr1  logging started')
		let userId = 'anonymous';
		let endpoint = '';
		let method = '';
		let parameters = {};
		if (req && typeof req === 'object') {
            // console.log('pr2  req object found')
			userId = req.user?.id || req.user || 'anonymous';
			endpoint = req.originalUrl || req.url || '';
			method = req.method || '';
			parameters = {
				...(req.query || {}),
				...(req.body || {}),
				...(req.params || {})
			};
		}
		const logFile = path.join(userActivityDir, `system.log`);
		let logEntry = `\n[${new Date().toISOString()}]`;
		// if (customStatement) {
		// 	logEntry += `\n  CUSTOM: ${customStatement}`;
		// }
		// if (req && typeof req === 'object') {
		// 	logEntry += `\n  METHOD: ${method}`;
		// 	logEntry += `\n  ENDPOINT: ${endpoint}`;
		// 	logEntry += `\n  PARAMS: ${JSON.stringify(parameters, null, 2)}`;
		// }
		// if (annotation) {
		// 	logEntry += `\n  ANNOTATION: ${annotation}`;
		// }
        let oneLine = `[${new Date().toISOString()}] user:${userId} method:${method} endpoint:${endpoint}`;
		if (customStatement) {
            // console.log('pr3  custom statement found', customStatement)
            oneLine = `    > custom:${customStatement}`;
		} else {
            // console.log('pr4  no custom statement', oneLine, annotation)
            if (annotation) oneLine += ` annotation:${annotation}`;
            if (Object.keys(parameters).length) oneLine += ` params:${JSON.stringify(parameters)}`;
        }
		logEntry = `${oneLine}\n`;
		// Check file size and trim if necessary
		const MAX_SIZE = 50 * 1024 * 1024; // 50MB
		if (fs.existsSync(logFile)) {
			const stats = fs.statSync(logFile);
			if (stats.size > MAX_SIZE) {
				console.log('pr5  log file exceeds 50MB (', (stats.size / (1024 * 1024)).toFixed(2), 'MB), trimming...')
				// Remove the oldest 10MB from the start of the file
				const REMOVE_SIZE = 10 * 1024 * 1024; // 10MB
				const data = fs.readFileSync(logFile);
				let start = REMOVE_SIZE;
				// Find the next newline after REMOVE_SIZE for clean cut
				while (start < data.length && data[start] !== 10) { // 10 is '\n' in ASCII
					start++;
				}
				const trimmed = data.slice(start + 1); // skip the newline
				fs.writeFileSync(logFile, trimmed);
                // activityLog(null, `Log file exceeded 50MB, trimmed oldest entries`, '');
			}
		}
		fs.appendFileSync(logFile, logEntry);
		console.log('pr9  log written: ', logEntry)
	} catch (err) {
		const errorLogFile = path.join(userActivityDir, 'error.log');
		const errorEntry = `[${new Date().toISOString()}] ERROR logging: ${err.message}\n`;
		console.error('pr8  Logging error:', err);
        fs.appendFileSync(errorLogFile, errorEntry);
	}
}



