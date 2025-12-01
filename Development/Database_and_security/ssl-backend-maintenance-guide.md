# Backend API Security and Maintenance Guide

## Date Created: 2025-01-12
## Current Time: 4:40 PM Australia/Melbourne
## Author: AI Assistant (based on setup by John)

### Overview
This guide documents the secure setup of the Node.js backend API (port 4000) integrated with the frontend (port 3000) on a single Debian 12 VM (IP: 67.219.105.53). The architecture uses Apache as a reverse proxy to enforce HTTPS via Let's Encrypt, hide internal ports, and route API calls through `/api/*` (no subdomain like api.buildingbb.com.au). This replaces direct/insecure calls (e.g., http://67.219.105.53:4000).

**Key Components**:
- **Frontend**: Express app on localhost:3000 (UI, EJS views, client-side JS). Served via Apache on https://buildingbb.com.au (ports 80/443).
- **Backend**: Node.js API on localhost:4000 (index.js/server.js, endpoints like /update, /fileUpload, /addjob). Proxied via /api (internal-only access).
- **Apache**: Reverse proxy (enabled modules: proxy, ssl, rewrite). Configs in /etc/apache2/sites-enabled/: 000-default.conf (HTTP to HTTPS redirect for www.buildingbb.com.au and buildingbb.com.au), 100-default-le-ssl.conf (HTTPS VHost on *:443 with ProxyPass /api/ http://127.0.0.1:4000/, ProxyPass / http://127.0.0.1:3000/, WebSocket support, detailed logging to /var/log/apache2/100-le-ssl_access.log and error.log), 999-local-logviewer.conf (VHost on *:49157 exposing /apache (/var/log/apache2) and /logs (~/Public/nailed/logs) with basic auth via /etc/apache2/.htpasswd-logviewer, Options Indexes, Require valid-user).
- **Firewall (UFW)**: Allows 22 (SSH), 80/443 (Apache), 49157 (log viewer); denies 3000, 4000, 5432 (external). Internal localhost traffic allowed.
- **Database**: PostgreSQL on localhost:5432 (nailed DB, internal-only).
- **Domain**: buildingbb.com.au (A/AAAA records → 67.219.105.53/IPv6). Cert: Let's Encrypt (/etc/letsencrypt/live/buildingbb.com.au/).
- **Deployment**: VM (Vultr, Ubuntu/Debian). SSH: john@67.219.105.53 (password: dnrejm2s – CHANGE IMMEDIATELY). Processes: PM2 (pm2 restart all).
- **Project Paths**: Frontend: ~/Public/nailed (app.js, views/, public/js/). Backend: ~/ (index.js/server.js). Logs: ~/Public/nailed/logs/ (app-generated logs in subdirs like customer_imports/, user_activity/ with ACLs for www-data:r-x), /var/log/apache2/ (Apache logs, accessible via /apache in log viewer).

**Security Benefits**: All traffic HTTPS (no MITM), ports hidden (UFW deny), no direct backend exposure. Client calls (fetch) use relative /api (proxied). Server-side (axios) uses full https://buildingbb.com.au/api. Secure log access via authenticated viewer on port 49157 (basic auth, ACL-protected app logs).

### Rationale for Key Choices
The setup prioritizes simplicity, security, and maintainability on a single VM. Deviations from "expected" (e.g., subdomain, absolute URLs) are explained below:

1. **Proxy on /api Instead of Subdomain (api.buildingbb.com.au)**:
   - **Rationale**: Same VM for frontend/backend → No DNS changes needed (avoids propagation delays, as experienced with main domain). Leverages existing Apache cert/VHost (one config for root / → 3000, /api → 4000). Simpler than A/AAAA records + new Certbot run.
   - **Deviation**: Expected: Separate subdomain for API (isolated). Actual: Path-based (/api) – still secure (Apache terminates SSL, forwards internally). If scaling to multi-VM, migrate to subdomain later.
   - **Impact**: All API calls via https://buildingbb.com.au/api/* (e.g., fetch('/api/update')). Hides port 4000 entirely.

2. **Relative /api in Client-Side JS (Browser Fetch/AJAX)**:
   - **Rationale**: Inherits page origin (HTTPS in prod, HTTP in dev). Flexible (no hardcoding domain/port). Works with proxy (browser resolves /api → Apache → backend). Avoids mixed-content errors (HTTP in HTTPS page).
   - **Deviation**: Expected: Full absolute URLs (e.g., "https://buildingbb.com.au/api"). Actual: Relative – simpler, auto-adapts (e.g., local: http://localhost:3000/api). If CORS issues, add full with credentials: 'include'.
   - **Impact**: In views/2/customer.ejs: `fetch('/api/fileUpload')` → Proxied. Old hack (baseUrl.replace("3000", "4000")) removed (obsolete, caused 404s).

3. **Full Absolute API_URL in .env for Server-Side Calls (Node Axios)**:
   - **Rationale**: Node.js axios requires full URL (no origin like browser). .env: API_URL="https://buildingbb.com.au/api" ensures server-to-server calls (e.g., app.js /update → axios(`${API_URL}/update`)) hit proxy. BASE_URL="https://buildingbb.com.au" for frontend links.
   - **Deviation**: Expected: Relative everywhere. Actual: Full for Node (absolute needed); relative for browser JS. Fallback in app.js: `if (API_URL.startsWith('/')) API_URL = BASE_URL + API_URL;`.
   - **Impact**: Fixes "Invalid URL" errors (e.g., axios('/api/update') → TypeError). Dev fallback: .env.local with "http://localhost:3000/api".

4. **UFW Deny Internal Ports (3000/4000/5432 External)**:
   - **Rationale**: Hides services (prevents direct scans/exploits). Allows localhost (127.0.0.1) for proxy/DB. 80/443 open for Apache (public-facing).
   - **Deviation**: Expected: Allow ports with auth. Actual: Deny external entirely – forces proxy (SSL enforcement, logging). Internal calls (e.g., Apache ProxyPass) use loopback (unaffected).
   - **Impact**: curl http://67.219.105.53:4000 → Refused (secure). Proxy: curl https://buildingbb.com.au/api/update → Success.

5. **No Backend Changes for Proxy**:
   - **Rationale**: Apache ProxyPreserveHost On + ProxyPass /api/ http://127.0.0.1:4000/ preserves paths/headers (e.g., /api/update → backend /update). No rewrite needed.
   - **Deviation**: Expected: Backend listen on 0.0.0.0:4000 (exposed). Actual: localhost:4000 (internal-only). Backend code unchanged (e.g., app.post('/fileUpload')).
   - **Impact**: Seamless – backend sees requests as /api/* (strip prefix if needed via backend middleware).

6. **PM2 for Process Management**:
   - **Rationale**: Auto-restart on crash, clustering for load. Logs: pm2 logs (frontend/backend separate: pm2 logs nailed, pm2 logs api).
   - **Deviation**: None – Standard for Node prod.
   - **Impact**: `pm2 restart all` after changes.

7. **Parameterized SQL in Backend (Recommended, Not Enforced Here)**:
   - **Rationale**: Prevents injection (e.g., UPDATE ... SET free_text = $1). Frontend logs showed raw SQL (harmless console.log), but backend should use pg params.
   - **Deviation**: Expected: Raw queries. Actual: Suggest pg.query('UPDATE jobs SET free_text = $1 WHERE id = $2', [value, id]).
   - **Impact**: Add in backend /update route to fix potential "syntax error" (e.g., unquoted 'test').

### Maintenance Tasks (Weekly/Monthly)
Run on server (SSH: `ssh john@67.219.105.53`).

1. **SSL Cert Renewal** (Auto: Certbot cron; Manual Check Monthly):
   - Test: `sudo certbot renew --dry-run` (should succeed).
   - If fail: `sudo certbot renew` → Restart Apache (`sudo systemctl restart apache2`).
   - Monitor: /var/log/letsencrypt/letsencrypt.log. Expires: 2026-02-02 (check: `sudo certbot certificates`).
   - Rationale: 90-day auto-renew; dry-run prevents live issues.

2. **UFW/Firewall Verification** (Weekly):
   - `sudo ufw status verbose` → Confirm: ALLOW 22/80/443/49157; NO 3000/4000/5432.
   - Test Block: From local machine, `curl -I http://67.219.105.53:4000` → Refused/Timeout.
   - Test Proxy: `curl -I https://buildingbb.com.au/api/update` → 200/404 (backend response).
   - Test Log Viewer: `curl -I http://67.219.105.53:49157/apache` → 401 (auth required).
   - Update: If new ports (e.g., add 5432 for remote DB): `sudo ufw allow from YOUR.IP/32 to any port 5432 && sudo ufw reload`.
   - Rationale: Ensures no exposure; default deny policy.

3. **Apache Config/Proxy Check** (Monthly):
   - `sudo apache2ctl configtest` → "Syntax OK".
   - `sudo systemctl status apache2` → Active.
   - Logs: `sudo tail -n 50 /var/log/apache2/100-le-ssl_error.log` (no proxy/SSL errors); `sudo tail -n 50 /var/log/apache2/100-le-ssl_access.log | grep /api` (200s for API calls); check 999-logviewer-error.log for auth issues.
   - Backup: `sudo cp -r /etc/apache2 /etc/apache2.backup.$(date +%Y%m%d)`.
   - Rationale: Proxy rules in 100-default-le-ssl.conf (ProxyPass /api http://127.0.0.1:4000/, ProxyPass / http://127.0.0.1:3000/) and log viewer in 999-local-logviewer.conf must stay intact.

4. **Node Processes and Logs** (Weekly):
   - `pm2 status` → Active (nailed for 3000, api for 4000).
   - Restart: `pm2 restart all` (after .env/code changes).
   - Logs: `pm2 logs` (errors like "Invalid URL" → Check .env API_URL); `pm2 logs --lines 100 nailed` (frontend); app-generated logs in ~/Public/nailed/logs/customer_imports/ and user_activity/ (view via https://buildingbb.com.au:49157/logs with auth).
   - ACL Check: `getfacl ~/Public/nailed/logs/` → Confirm www-data:r-x and defaults.
   - DB Connect: `psql -U postgres -d nailed -c "\dt"` (tables OK).
   - Rationale: PM2 auto-restarts; logs catch proxy/auth issues.

4.5. **Log Viewer Maintenance** (Monthly):
   - Access Test: Browser to http://67.219.105.53:49157/apache (enter .htpasswd creds) → List logs; check /logs for app files.
   - Auth: `sudo htpasswd -c /etc/apache2/.htpasswd-logviewer john` (update password); verify Require valid-user in 999-local-logviewer.conf.
   - ACLs: `sudo setfacl -R -m u:www-data:r-x ~/Public/nailed/logs/` if permissions drift; test `sudo -u www-data ls ~/Public/nailed/logs/`.
   - Rationale: Ensures secure, readable access to logs without exposing sensitive data.

5. **.env and Code Verification** (After Changes):
   - `cat ~/Public/nailed/.env` → BASE_URL="https://buildingbb.com.au", API_URL="https://buildingbb.com.au/api".
   - Grep Hardcodes: `grep -r "3000\|4000\|67.219.105.53" ~/Public/nailed/ --include="*.js" --include="*.ejs"` → Empty (except comments/docs).
   - Test Calls: Browser F12 → Network tab → Edit field/upload → 200 on /api/*.
   - Rationale: Ensures no regressions (e.g., old localhost:4000).

6. **Backups** (Weekly):
   - Configs: `sudo tar -czf /root/backups/apache_$(date +%Y%m%d).tar.gz /etc/apache2 /etc/letsencrypt /etc/apache2/.htpasswd-logviewer`.
   - DB: `pg_dump -U postgres nailed > /root/backups/db_$(date +%Y%m%d).sql`.
   - Code: `git commit -am "Backup $(date)"` (if using Git).
   - Files: `tar -czf /root/backups/uploads_$(date +%Y%m%d).tar.gz ~/uploads/` (attachments); include ~/Public/nailed/logs/ if needed.
   - Rationale: Quick recovery from misconfigs (e.g., bad ProxyPass, lost auth file).

7. **Performance/Monitoring** (Monthly):
   - `htop` or `top` → Node/Apache CPU/Mem <80%.
   - `sudo netstat -tuln | grep :80` → Apache listening.
   - SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=buildingbb.com.au → A grade.
   - Logs Rotation: Apache auto (/etc/logrotate.d/apache2); PM2: `pm2 flush`.
   - Rationale: Prevent overload; early detection of issues.

### Debugging Common Problems
Use SSH + commands below. Check timestamps in logs (AEDT/Melbourne).

1. **404 on /api/* (e.g., File Upload/Download)**:
   - **Symptoms**: Browser Network: 404 on /api/fileUpload; Frontend logs: "NEW REQUEST POST /fileUpload" (no /api).
   - **Cause**: JS uses wrong apiUrl (e.g., old replace hack).
   - **Debug**:
     - Browser Console: Check "Fixed apiUrl: /api" log.
     - Grep: `grep -r "apiUrl\|replace.*3000" views/` → Fix to `apiUrl = '/api';`.
     - Test: `curl -X POST https://buildingbb.com.au/api/fileUpload -F "file=@test.txt"` → 200.
     - Apache: `sudo tail -f /var/log/apache2/access.log | grep /api` → 404? Check ProxyPass in /etc/apache2/sites-available/redirect-to-3000.conf.
   - **Fix**: Update JS (as in previous response); restart frontend.

2. **TypeError [ERR_INVALID_URL] (e.g., on /update)**:
   - **Symptoms**: Frontend logs: "Error occurred while updating: TypeError [ERR_INVALID_URL]"; ufg* logs before axios.
   - **Cause**: Node axios gets relative "/api/update" (no http://).
   - **Debug**:
     - Frontend logs: `pm2 logs nailed | grep API_URL` → Should be full "https://buildingbb.com.au/api".
     - .env: `cat ~/Public/nailed/.env` → API_URL full?
     - Test: Add `console.log('Axios URL:', ${API_URL}/update?...);` in app.js /update → Check logs.
   - **Fix**: .env API_URL="https://buildingbb.com.au/api"; app.js fallback: `if (API_URL.startsWith('/')) API_URL = BASE_URL + API_URL;`. Restart.

3. **500 Internal Error or SQL Syntax (e.g., "update jobs set free_text = test")**:
   - **Symptoms**: Logs: Malformed SQL in console; DB unchanged (SELECT free_text FROM jobs WHERE id=8342; → old value).
   - **Cause**: Backend raw query (no params/quotes); or axios fails before backend.
   - **Debug**:
     - Backend logs: `pm2 logs api | grep update` → See incoming request/SQL error (e.g., "column 'test' does not exist").
     - Test Backend Direct: `curl -X GET "http://localhost:4000/update?table=jobs&column=free_text&value=test&id=8342"` (server) → 201.
     - PG Logs: `tail -f /var/log/postgresql/postgresql-*.log | grep ERROR` → Syntax near "test".
   - **Fix**: Backend /update: Use params `db.query('UPDATE jobs SET free_text = $1 WHERE id = $2', [value, id]);`. Frontend: encodeURIComponent(value).

4. **No Backend Logs on API Calls**:
   - **Symptoms**: Frontend logs request; no pm2 logs api.
   - **Cause**: Proxy not hit (wrong URL) or backend down.
   - **Debug**:
     - Apache Access: `sudo tail -f /var/log/apache2/access.log | grep /api` → 200? If 502: Backend unreachable.
     - PM2: `pm2 status` → api active? `pm2 logs api --lines 10` → Errors?
     - Internal: `curl -I http://localhost:4000` (server) → 200/404.
   - **Fix**: Restart backend (`pm2 restart api`); check ProxyPass (apache2ctl configtest).

5. **Auth/Session Issues (401/Redirect to /login)**:
   - **Symptoms**: API calls fail with 401; "User not authenticated".
   - **Cause**: Session cookie not passed to proxy/backend.
   - **Debug**:
     - Browser: F12 → Application → Cookies → Session ID present?
     - Frontend logs: `pm2 logs | grep SessionID` → Consistent?
     - Axios: Ensure `headers: { Cookie: req.headers.cookie }` in app.js (for server-side).
     - Fetch: Add `credentials: 'include'` in JS.
   - **Fix**: In app.js axios: `{ headers: { Cookie: req.headers.cookie } }`. JS fetch: `{ credentials: 'include' }`.

6. **SSL/Cert Errors (e.g., Expired, Mixed Content)**:
   - **Symptoms**: Browser: "Not Secure" or redirect loops; Logs: SSL warn in Apache.
   - **Cause**: Cert expired or HTTP fallback.
   - **Debug**: `sudo certbot certificates` → Valid? Browser: https://buildingbb.com.au → Green lock?
   - **Fix**: `sudo certbot renew && sudo systemctl restart apache2`. Force HTTPS in Apache (RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI}).

7. **Upload/Download Fails (Post-Fix)**:
   - **Symptoms**: 500 on /api/fileUpload; Multer errors.
   - **Debug**: Backend logs: `pm2 logs api | grep fileUpload` → "No file" or disk full?
   - **Fix**: Ensure backend multer: `upload.single('file')`; Dir: `mkdir ~/backend/uploads && chmod 755`. Limits: 10MB in app.js.

8. **General Tools**:
   - **Grep Hardcodes**: `grep -r "3000\|4000\|67.219.105.53\|http://localhost" ~/Public/nailed/ --include="*.js" --include="*.ejs"` → Empty.
   - **Test Proxy**: `curl -I https://buildingbb.com.au/api` → Backend headers (e.g., X-Powered-By: Express).
   - **DB Query**: `psql -U postgres -d nailed -c "SELECT * FROM jobs WHERE id=8342;"` → Verify updates.
   - **Full Restart**: `pm2 restart all && sudo systemctl restart apache2`.

### History of Actions/Updates
- **2025-11-12**: Created guide. Proxy setup complete (/api → 4000). .env: Full URLs for Node. JS: Relative /api. UFW: Denied 3000/4000/5432. Attachments fixed (no 404).
- **2025-01-12**: Updated guide for accurate Apache configs (000-default.conf, 100-default-le-ssl.conf, 999-local-logviewer.conf), added log viewer maintenance (port 49157, basic auth, ACLs for ~/Public/nailed/logs/), refined UFW (allow 49157), updated logs paths and debugging for specific files, included ACL verification and backups for auth file.

For issues: SSH in, check logs (`pm2 logs`, Apache), test proxy/DB. Contact support if DNS/Cert fails. This setup is robust—minimal maintenance for high security!
