# Backend Security Setup Progress
## Date: 2025-04-11
## Current Time: 3:33 PM (Australia/Melbourne)

### Overview
- **Project Context**: Securing the Node.js backend API (running on port 4000) which handles database operations and is called directly from the frontend (port 3000). The API is currently unsafe: no SSL/TLS, exposed to direct client calls, and port 4000 is open via UFW.
- **Architecture**:
  - Frontend: Express app on port 3000 (UI, EJS views, client-side JS making API calls to localhost:4000 or domain:4000).
  - Backend: Node.js server on port 4000 (index.js/server.js, API endpoints like /api/data, /admin/*).
  - Deployment: VM at IP 67.219.105.53 (likely Ubuntu/Debian with UFW and Apache).
  - Domain: buildingbb.com.au (frontend likely on www or root; API subdomain planned as api.buildingbb.com.au).
- **Security Issues**:
  - Port 4000 is OPEN (inbound traffic allowed via UFW).
  - Backend accepts direct HTTP calls from clients (no SSL, vulnerable to MITM/eavesdropping).
  - Client API calls (e.g., fetch/axios to http://localhost:4000 or domain:4000) bypass any frontend proxy/SSL.

### Progress So Far
- **DNS Setup**: 
  - Required: A record for `api.buildingbb.com.au` → 67.219.105.53 (IPv4).
  - Required: AAAA record for `api.buildingbb.com.au` → [IPv6 address if available; confirm VM supports IPv6].
  - Status: **NOT added yet**. Propagation testing pending addition.
- **Apache Configuration**:
  - Needed: Reverse proxy setup to terminate SSL on port 443/80 and forward to backend port 4000 internally (e.g., via VirtualHost for api.buildingbb.com.au).
  - Status: **Config files not modified yet**. Let's Encrypt SSL certs assumed available (from ssl-letsencrypt-setup.md).
- **UFW/Firewall**:
  - Port 4000: Currently OPEN (allows external access).
  - Plan: Deny after proxy is live (internal localhost traffic remains allowed).
- **Code Changes**:
  - Client-side: Update EJS/JS to use `https://api.buildingbb.com.au/api/*` (relative or full secure URLs post-DNS). use .env file API_URL="http://67.219.105.53:4000"
  - No proxy in app.js yet—direct calls dominate.
- **Testing**:
  - original propogation issues: buildingbb.com.au still occasionally resolving to old IP - check propogation
  - new DNS propagation: Not tested (records not added).
  - API security: Untested post-changes.


### Next Steps (High-Level Plan)
1. **Test original propogation issues**
2. **Add DNS Records**: Manually add A/AAAA via DNS provider (e.g., Cloudflare, GoDaddy). Wait for propagation (use tools like dig/nslookup to verify).
2. **Configure Apache Reverse Proxy**:
   - Enable SSL module, set up VirtualHost for api.buildingbb.com.au.
   - ProxyPass /api http://localhost:4000/ (internal only).
   - Use Let's Encrypt cert for HTTPS.
3. **Update Client Code**: Switch API URLs to secure subdomain (no port 4000 exposure).
4. **Secure Firewall**: `sudo ufw deny 4000` after verifying proxy works.
5. **Test End-to-End**: External access via browser, check for SSL enforcement, no direct port 4000 access.
6. **Documentation**: append this MD with working history.

This setup (Option 1A as mentioned) routes all API traffic through the secure subdomain, hiding the backend port entirely.  If a subdomain is not available (because of hosting limitations) then apache must be used to redirect www.buildingbb.com.au:4000 to 127.0.0.1:4000 securely

### Actions for tomorrow
- Confirm DNS provider and add the A record (and AAAA if IPv6 is enabled on the VM).
- For propagation testing: Once added, we can use CLI tools (e.g., `dig api.buildingbb.com.au`) or online checkers to verify (TTL typically 1-48 hours, but often faster).
- Apache details: Share any existing config files (e.g., /etc/apache2/sites-available/) if needed for planning mods.
- review and test .env values

ssh 67.219.105.53; cat Public/nailed/.env
john@vultr:~/Public/nailed$ cat .env
BASE_URL="https://buildingbb.com.au"
API_URL="http://localhost:4000"


## History of actions ##

### testing original propogation issues ###

run commands,
<code>
curl -I https://buildingbb.com.au
dig A buildingbb.com.au @8.8.8.8
dig AAAA buildingbb.com.au @8.8.8.8
</code>

