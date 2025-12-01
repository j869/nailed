import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMelbourneTime } from './datetime.js';
import fetch from 'node-fetch'; // Assuming node-fetch is installed for Node.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetches geolocation data for a given IP address (IPv4 or IPv6).
 * @param {string} ip - The IP address to geolocate.
 * @returns {string|null} - Geolocation data object or null if error.
 */
export async function getGeolocation(ip) {
    if (ip === 'remoteAddress') return null;     // ip address couldnt not be deduced from the req object
    try {
        const response = await fetch(`http://ipapi.co/${ip}/json/`);
        if (!response.ok) {
            throw new Error(`hj81   HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        let returnValue = data ? `${data.city || 'City'} (${data.org || 'ISP'})` : null;
        console.log('hj9   Geolocation for [' + ip + ']: ', returnValue);
        return returnValue;
    } catch (error) {
        console.error('hj8   Error fetching geolocation for [' + ip + ']... ', error);
        return null;
    }
}

/**
 * Logs user activity to a separate file for each user based on user ID.
 * @param {Object|number} req - Express request object containing user session or user ID as number.
 * @param {string} activity - Description of the activity to log.
 * 
 */
export async function logUserActivity(req, activity) {
    console.log('og1    logUserActivity called with activity:', activity);
    try {
        let userId;
        let windowId = 'unknown';
        let ipAddress = 'unknown';
        let geoLocation = 'unknown';
        let userAgent = 'unknown';
        let referer = 'unknown';
        let sessionID = 'unknown';
        
        if (typeof req === 'number') {
            // If req is a number, treat it as userId
            userId = req;
        } else if (req && req.user && req.user.id) {
            console.log('og2    logUserActivity: Found user ID in req.user:', req);
            // If req is an object with user info
            userId = req.user.id ;
            windowId = req.headers['x-window-id'] || 'x-window-id';
            ipAddress = req.ip || req.connection?.remoteAddress || 'remoteAddress';
            geoLocation = await getGeolocation(ipAddress);
            userAgent = req.headers['user-agent'] || 'user-agent';
            sessionID = req.sessionID || 'sessionID';
            referer = req.headers['referer'] || 'referer';
        } else {
            console.warn('og83       logUserActivity: No user ID found in req.user', req.user);
            userId = 0;  // Use 0 for unauthenticated/guest users
            windowId = req?.headers['x-window-id'] || 'x-window-id';
            ipAddress = req?.ip || req?.connection?.remoteAddress || 'remoteAddress';
            geoLocation = await getGeolocation(ipAddress);
            userAgent = req?.headers['user-agent'] || 'user-agent';
            sessionID = req?.sessionID || 'sessionID';
            referer = req?.headers['referer'] || 'referer';
        }

        const logsDir = path.join(__dirname, '..', 'logs', 'user_activity', geoLocation || 'geoLocation', ipAddress + '_' + userId || 'ip_userId');
        
        // Ensure the logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const logFile = path.join(logsDir, `${sessionID}.log`);
        const now = getMelbourneTime();    //returns type Intl.DateTimeFormat
        const timestamp = now.split(', ')[1];
        const logEntry = `${now} | ${referer.toString().padEnd(50, ' ')} | ${activity} \n`;

        fs.appendFile(logFile, logEntry, (err) => {
            if (err) {
                console.error('og81    Error writing to disk:', err);
            }
        });
    } catch (error) {
        console.error('og82    Error logging user activity:', error);
    }
}
