import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMelbourneTime } from './datetime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Logs user activity to a separate file for each user based on user ID.
 * @param {Object|number} req - Express request object containing user session or user ID as number.
 * @param {string} activity - Description of the activity to log.
 * 
 */
export function logUserActivity(req, activity) {
    console.log('og1    logUserActivity called with activity:', activity);
    try {
        let userId;
        let windowId = 'unknown';
        let ipAddress = 'unknown';
        let userAgent = 'unknown';
        let referer = 'unknown';
        let sessionID = 'unknown';
        
        if (typeof req === 'number') {
            // If req is a number, treat it as userId
            userId = req;
        } else if (req && req.user && req.user.id) {
            // If req is an object with user info
            userId = req.user.id;
            windowId = req.headers['x-window-id'] || 'unknown';
            ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
            userAgent = req.headers['user-agent'] || 'unknown';
            sessionID = req.sessionID || 'unknown';
            referer = req.headers['referer'] || 'unknown';
        } else {
            console.warn('og83       logUserActivity: No user ID found in req.user', req.user);
            return;
        }

        const logsDir = path.join(__dirname, '..', 'logs', 'user_activity');
        
        // Ensure the logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logFile = path.join(logsDir, `u${userId.toString().padStart(5, '0')}.log`);
        const now = getMelbourneTime();    //returns type Intl.DateTimeFormat
        const timestamp = now.split(', ')[1];
        const logEntry = `${timestamp} | ${sessionID.toString().padStart(32, ' ')} | ${windowId} | ${ipAddress.toString().padStart(15, ' ')} | ${userAgent.substring(0, 30).toString().padStart(30, ' ')} | ${referer.toString().padEnd(50, ' ')} | ${activity} \n`;

        fs.appendFile(logFile, logEntry, (err) => {
            if (err) {
                console.error('og81    Error writing to disk:', err);
            }
        });
    } catch (error) {
        console.error('og82    Error logging user activity:', error);
    }
}



