import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMelbourneTime } from './datetime.js';
import fetch from 'node-fetch'; // Assuming node-fetch is installed for Node.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const geoCache = new Map();



/**
 * Fetches geolocation data for a given IP address (IPv4 or IPv6).
 * @param {string} ip - The IP address to geolocate.
 * @returns {string|null} - Geolocation data object or null if error.
 */
export async function getGeolocation(ip) {
    if (ip === 'remoteAddress') return null;     // ip address couldnt not be deduced from the req object
    try {
        let data;
        if (geoCache.has(ip)) {
            data = geoCache.get(ip);
        } else {
            const response = await fetch(`http://ipapi.co/${ip}/json/`);
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('hj82   Rate limit exceeded when fetching geolocation for [' + ip + ']');
                    return 'geoLocRateLimitExceeded';
                } else {
                    throw new Error(`hj81   HTTP error! status: ${response.status}`);
                }
            }
            data = await response.json();
            geoCache.set(ip, data);
        }
        let returnValue = data ? `${data.city || 'City'} (${data.org || 'ISP'})` : null;
        console.log('hj9   Geolocation for [' + ip + ']: ', returnValue);
        return returnValue;
    } catch (error) {
        console.error('hj8   Error fetching geolocation for [' + ip + ']... ', error);
        return null;
    }
}



// Classify by behavior patterns
function classifyAttacker(req, path) {
    console.log('og1    classifyAttacker called with path:', path);
    const classification = {
        type: 'unknown',
        confidence: 0,
        tags: []
    };
    
    // 1. THE SCRIPT KIDDIE (Most Common)
    if (req.headers['user-agent']?.includes('sqlmap') || 
        path.includes('union') || 
        path.includes('select%20')) {
        classification.type = 'SQL_INJECTION_ATTEMPT';
        classification.confidence = 90;
        classification.tags.push('automated', 'low-skill', 'tool-user');
    }
    
    // 2. THE RECON SPECIALIST
    else if (path.match(/\.(env|git|config|backup|sql)$/i) ||
            path.includes('admin') || 
            path.includes('wp-login')) {
        classification.type = 'RECONNAISSANCE';
        classification.confidence = 85;
        classification.tags.push('targeted', 'pre-attack', 'enumeration');
    }
    
    // 3. THE EXPLOIT HUNTER
    else if (path.includes('.php') && 
            (path.includes('cmd') || 
             path.includes('exec') || 
             path.includes('system'))) {
        classification.type = 'COMMAND_INJECTION';
        classification.confidence = 95;
        classification.tags.push('dangerous', 'execution', 'high-impact');
    }
    
    // 4. THE PATH TRAVERSAL SPECIALIST
    else if (path.includes('..') || 
            path.includes('../') ||
            path.includes('..\\')) {
        classification.type = 'PATH_TRAVERSAL';
        classification.confidence = 98;
        classification.tags.push('file-access', 'lfi', 'critical');
    }
    
    // 5. Short Hash Bruteforce
    else if (path.match(/^\/[a-f0-9]{4}$/)) {
        classification.type = 'SHORT_HASH_BRUTEFORCE';
        classification.confidence = 80;
        classification.tags.push('automated', 'discovery', 'low-noise');
    }

  // XDEBUG ATTACK DETECTION
    else if (req.query.XDEBUG_SESSION_START || 
             req.headers['xdebug-session'] ||
             path.toLowerCase().includes('xdebug')) {
        classification.type = 'XDEBUG_RCE_ATTEMPT';
        classification.confidence = 95;
        classification.tags.push('php', 'debugger', 'rce', 'critical');
        classification.severity = 'CRITICAL';
    }
    
    // Also check for other debugger probes
    else if (req.query.debug || 
             req.query.DEBUG ||
             req.headers['debug']) {
        classification.type = 'DEBUGGER_PROBE';
        classification.confidence = 80;
        classification.tags.push('debug', 'development', 'recon');
    }

    else if (/<script|javascript:|on\w+\s*=|alert\(|eval\(/i.test(path) || 
            req.headers['content-type']?.includes('application/xml') && 
            /<!ENTITY|xxe/i.test(req.body)) {
        classification.type = 'XSS_XXE_ATTEMPT';
        classification.confidence = 85;
        classification.tags.push('client-side', 'injection', 'dom');
    }


    else if (/(169\.254\.169\.254|localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|file:\/\/|gopher:\/\/)/i.test(path)) {
        classification.type = 'SSRF_ATTEMPT';
        classification.confidence = 90;
        classification.tags.push('internal-network', 'server-side', 'proxy-abuse');
    }


    else if (path.match(/\/api\//) && 
            (req.method === 'PUT' || req.method === 'DELETE') &&
            !req.headers['authorization']) {
        classification.type = 'API_AUTH_BYPASS_ATTEMPT';
        classification.confidence = 75;
        classification.tags.push('api', 'authorization', 'idor');
    }


    else if (req.method === 'TRACE' || req.method === 'CONNECT') {
        classification.type = 'HTTP_METHOD_ABUSE';
        classification.confidence = 95;
        classification.tags.push('http-method', 'recon', 'xst');
    }
    else if (req.method === 'OPTIONS' && req.headers['user-agent']?.includes('scan')) {
        classification.type = 'HTTP_RECONNAISSANCE';
        classification.confidence = 70;
        classification.tags.push('recon', 'methods', 'enumeration');
    }

    else if (req.headers['host']?.includes('evil.com') ||
            req.headers['x-forwarded-for'] === '127.0.0.1' ||
            req.headers['x-original-url'] ||
            /\r\n/.test(JSON.stringify(req.headers))) {
        classification.type = 'HEADER_INJECTION';
        classification.confidence = 85;
        classification.tags.push('header-manipulation', 'host-header', 'crlf');
    }

    else if (req.headers['x-forwarded-host'] && 
            req.headers['x-forwarded-host'] !== req.headers['host']) {
        classification.type = 'CACHE_POISONING_ATTEMPT';
        classification.confidence = 75;
        classification.tags.push('cache', 'poisoning', 'header-injection');
    }



    console.log('og9    classifyAttacker result:', classification);
    return classification;
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
        let activityClassification = 'unknown';

        if (typeof req === 'number') {
            // If req is a number, treat it as userId
            userId = req;
            geoLocation = 'successfulLogins';
            activityClassification = 'unknown';
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
            activityClassification = classifyAttacker(req, req.url);
        } else {
            console.warn('og83       logUserActivity: No user ID found in req.user', req.user);
            userId = 0;  // Use 0 for unauthenticated/guest users
            windowId = req?.headers['x-window-id'] || 'x-window-id';
            ipAddress = req?.ip || req?.connection?.remoteAddress || 'remoteAddress';
            geoLocation = await getGeolocation(ipAddress);
            userAgent = req?.headers['user-agent'] || 'user-agent';
            sessionID = req?.sessionID || 'sessionID';
            referer = req?.headers['referer'] || 'referer';
            activityClassification = classifyAttacker(req, req.url);
        }

        let logFile;
        let  logsDir;
        if (activityClassification.type !== 'unknown') {
            logsDir = path.join(__dirname, '..', 'logs', 'user_activity', activityClassification.type || 'attackClass', geoLocation || 'geoLocation');
            logFile = path.join(logsDir, `${activityClassification.type}.log`);
        } else {
            logsDir = path.join(__dirname, '..', 'logs', 'user_activity', geoLocation || 'geoLocation', ipAddress + '_' + userId || 'ip_userId');
            logFile = path.join(logsDir, `${sessionID}.log`);
        }

        // Ensure the logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

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
