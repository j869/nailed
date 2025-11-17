# SSL Logout Bug

## Description
The application experiences session authentication failures on AJAX requests (specifically GET /update for job status updates) after a user logs in. The session cookie is sent, but the server treats the user as unauthenticated, redirecting to /login. This results in "User not authenticated" errors and broken functionality for editing workflows.

## Symptoms
- User logs in successfully (POST /login succeeds, redirects to /2/customers).
- Navigating to a workflow page (/2/build/ID) loads, but editing a job status triggers GET /update.
- /update logs show:
  - Cookie header present: connect.sid=s%3A[sessionID].[signature]
  - Session ID extracted.
  - Session object keys: ['cookie'] (no 'passport' object with user ID).
  - req.isAuthenticated() returns false.
  - Redirect to /login (302).
- No "pp" logs from deserializeUser for /update, indicating deserialization isn't called because the session is invalid.
- Login POST /login is not visible in server logs during tests, suggesting the form submission may not reach the Node app or is failing silently.

## Environment Details
- **Server Setup**: Node.js/Express app on port 3000, behind Apache reverse proxy with HTTPS termination.
- **Proxy Config**: 
  - X-Forwarded-Proto: https
  - X-Forwarded-For: client IP
  - X-Forwarded-Host: buildingbb.com.au
  - Handles HTTPS, but may interfere with POST bodies or cookies for /login.
- **Project Path**: Server running from /home/john/Public/nailed, but VSCode cwd is /home/john/Documents/nailed – possible multiple instances or copy issue.
- **.env**: Loaded correctly on startup:
  - SESSION_SECRET: set (length: 13) – short, but valid; recommend 64+ chars for production.
  - PG_USER: postgres
  - PG_HOST: localhost
  - PG_DATABASE: nailed
  - PG_PASSWORD: set
  - PG_PORT: 5432
  - API_URL: https://buildingbb.com.au/api
  - BASE_URL: https://buildingbb.com.au
  - NODE_ENV: production
- **Database**: PostgreSQL (server 16.10), database "nailed".
  - Users table has entries, e.g., id 1: john@buildingbb.com.au.
  - Manual query works: SELECT id, email FROM users LIMIT 1; returns data.

## Logs Analysis
### Startup Logs
- Env loaded successfully (SESSION_SECRET set).
- App starts on port 3000.
- No errors.

### Login Flow
- GET /login: Loads login.ejs.
- POST /login: Expected to authenticate, serialize user ID (1), set session cookie.
  - Logs show "auth_success: user(1) login" if successful.
  - But in tests, no POST /login visible – form may not submit or proxy blocks it.
- Redirect to /2/customers with session cookie set.

### /update Request (Failing)
- Triggered by editing job status in workflow view.
- Logs:
  - x1 NEW REQUEST GET /update from USER(unset) SessionID: [ID]
  - ufg_session_headers: Cookie present, session keys: ['cookie'] (no 'passport').
  - ufg_deserialize_debug: Not triggered (deserialization skipped because session invalid).
  - ufg89 User not authenticated, redirect to /login.
- Cookie is signed but payload not deserialized – indicates session data not persisted or mismatched secret/path.

### Other Observations
- Browser dev tools show cookie sent with /update.
- No CSRF errors or 403s – just auth failure.
- Checkbox /jobComplete works (POST), but /update (GET) fails – different routes, but same session issue.
- Startup has "dd91 day_task trigger" – custom cron/logic, ignore for auth.

## Possible Causes
1. **Proxy Interference with POST /login**:
   - Apache may not forward POST body/cookies correctly for /login form.
   - X-Forwarded-* headers set, but SameSite=Lax or secure flag blocks cookie on POST.
   - Test: Bypass proxy, access http://[server-ip]:3000/login directly.

2. **Login Form Submission Issue**:
   - login.ejs form may use JS/AJAX for submission, failing silently (no POST in logs).
  - No CSRF token or mismatched – check views/login.ejs for <form method="post" action="/login">.
  - Browser blocking mixed content if proxy HTTPS but Node HTTP.

3. **Session Configuration**:
   - SESSION_SECRET short (13 chars) – possible collisions, but unlikely cause.
   - Cookie path/domain mismatch (e.g., / vs root).
   - saveUninitialized: true – sessions created on first request, but not persisting.
   - resave: false – fine, but if session store (memory) not handling proxy IPs.

4. **HTTPS/SSL Mismatch**:
   - Proxy terminates SSL, Node sees HTTP – cookie secure flag or HSTS issues.
   - trust proxy: 1 in app.js – should handle, but verify req.protocol == 'https'.

5. **Multiple Instances/Path Issue**:
   - VSCode in /Documents/nailed, server in /Public/nailed – different .env or code.
   - Ensure .env in server root, permissions 644.

6. **Memory Session Store**:
   - Default memory store not shared across restarts or instances – but single process here.
   - If clustered, sessions not shared.

## Tests Performed
- **DB Connectivity**: Manual psql query succeeds, users exist.
- **Env Loading**: Logs confirm SESSION_SECRET and PG vars set.
- **Startup**: App starts without errors.
- **/update Test**: Cookie sent, but session invalid (no passport.user).
- **Login Test**: No POST /login in logs – form not submitting.
- **Direct Access**: Not tested – recommend bypassing proxy.
- **Cookie Inspection**: Signed, but payload invalid (no deserialization).

## Recommendations/Fixes
1. **Bypass Proxy Test**:
   - Access http://[server-ip]:3000/login directly (ignore SSL warning).
   - If works, issue is Apache config – add ProxyPreserveHost On, RequestHeader set Cookie.

2. **Check Login Form**:
   - Inspect views/login.ejs – ensure <form method="post">, no JS preventing submit.
   - Add logging to POST /login route for body/creds.

3. **Enhance Logging**:
   - Log req.session after login redirect.
   - Log in verify strategy for user serialization.

4. **Apache Config**:
   - Ensure ProxyPass / http://127.0.0.1:3000/ with preserve host/cookies.
   - Add LogLevel debug for proxy logs.

5. **Session Security**:
   - Generate new SESSION_SECRET (64+ chars, openssl rand -hex 32).
   - Set cookie.secure = true only if NODE_ENV=production and req.secure.

6. **Next Steps**:
   - Share login.ejs HTML.
   - Share Apache vhost config (/etc/apache2/sites-enabled/000-default-ssl.conf).
   - Test direct Node access.
   - If fixed, remove temp logs.

## Timeline
- Issue reported: 14/11/2025
- Logging added: 14/11/2025
- Env/DB verified: 14/11/2025
- Updated: 15/11/2025


## apache - site

john@vultr:/etc/apache2/sites-enabled$ cat 000-default-le-ssl.conf 
# Simplified Apache Config: Redirects + Proxy for buildingbb.com.au
# Handles IP access, HTTP→HTTPS www, proxies to app (3000) and API (4000)

# IP HTTP: Redirect direct IP access (e.g., http://67.219.105.53) to HTTPS www
<VirtualHost 67.219.105.53:80>
    ServerName 67.219.105.53
    RewriteEngine On
    RewriteRule ^ https://www.buildingbb.com.au%{REQUEST_URI} [L,R=301]
</VirtualHost>

# NO IP:443 VHost (removed to avoid loop on cert mismatch; falls to *:443 with warning)

# Domain HTTP: Redirect all HTTP domain traffic to HTTPS www
<VirtualHost *:80>
    ServerName buildingbb.com.au
    ServerAlias www.buildingbb.com.au
    RewriteEngine On
    # Single rule: HTTP (domain or www) → HTTPS www
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://www.buildingbb.com.au%{REQUEST_URI} [L,R=301]
</VirtualHost>

# Main HTTPS: Serve secure site, proxy to app (3000) and API (4000), no redirects here
<VirtualHost *:443>
    ServerName www.buildingbb.com.au
    ServerAlias buildingbb.com.au  # Non-www aliases to www (no external 301, internal handle)

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/buildingbb.com.au/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/buildingbb.com.au/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # Security: Force HTTPS (prevents loops, adds HSTS)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Reverse Proxies (internal only)
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"

    # API backend on port 4000 
    ProxyPass /api/ http://127.0.0.1:4000/
    ProxyPassReverse /api/ http://127.0.0.1:4000/

    # Frontend app on port 3000 (root and other paths)
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # WebSocket support for app (consolidated, only if needed for real-time)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]

    # Logging (optional: standardize to access.log)
    CustomLog /var/log/apache2/access.log combined
</VirtualHost>

