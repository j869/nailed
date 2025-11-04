# Case Study: Implementing SSL/TLS with Let's Encrypt on a Debian 12 Server Using Apache as Reverse Proxy

## Introduction
This tutorial documents the step-by-step process of setting up SSL/TLS certificates using Let's Encrypt (Certbot) on a Debian 12 server (IP: 67.219.105.53) for the domain buildingbb.com.au. The server runs Apache2 as a reverse proxy to a Node.js application on port 3000. The goal is to secure the site with HTTPS, redirect all HTTP traffic to HTTPS, proxy app traffic through Apache, and restrict direct access to port 3000.

**Server Details:**
- OS: Debian 12
- Web Server: Apache2 (reverse proxy)
- App: Node.js on port 3000
- Domain: buildingbb.com.au (registrar: Crazy Domains)
- SSH: john@67.219.105.53 (password: dnrejm2s—change post-setup)
- Timeline: Completed on 04/11/2025 after DNS propagation challenges.

**Challenges Encountered:**
- DNS propagation delay due to cPanel Zone Editor overriding Account Manager (fixed by updating Zone).
- IPv6 AAAA record pointing to old server, causing Certbot challenge failures (updated to server's IPv6).
- Apache config error from missing Certbot files (resolved by disabling conflicting sites).
- No VHost for port 80 (enabled default).

**Benefits:**
- Free, automated SSL certificates with 90-day validity and auto-renewal.
- Secure HTTPS for the app, hiding port 3000.
- Redirects from HTTP/IP to https://buildingbb.com.au.
- Internal-only access to port 3000 via UFW.

## Prerequisites
- Root/sudo access on the server.
- Domain control (A/AAAA records point to server IP/IPv6).
- Apache2 installed and running.
- Node.js app running on localhost:3000.
- Ports 80/443 open in firewall.
- Backup server/configs before changes.

**Server IPv6:** 2401:c080:2000:28f1:5400:4ff:fec5:feb8 (from `ip addr show`).

## Step-by-Step Execution

### Step 1: SSH into the Server
Connect via SSH:
```
ssh john@67.219.105.53
```
Enter password: 

Update system:
```
sudo apt update && sudo apt upgrade -y
```

### Step 2: Update DNS Records (Crazy Domains)
1. Log into Crazy Domains: https://www.crazydomains.com.au/myaccount/.
2. Go to cPanel > Zone Editor > Manage for buildingbb.com.au.
3. Edit A record: Host @, Value 67.219.105.53, TTL 14400s.
4. Edit AAAA record: Host @, Value 2401:c080:2000:28f1:5400:4ff:fec5:feb8, TTL 14400s.
5. Leave subdomains (ftp, cpanel, webmail, etc.) on old IP 103.226.221.2 for email/services.
6. Save. Propagation: ~4-48 hours (TTL 14400s).

**Verification:**
- Authoritative: `dig @ns1.crazydomains.com buildingbb.com.au +short A` (67.219.105.53).
- Public: `dig @8.8.8.8 buildingbb.com.au +short A` (wait for 67.219.105.53).
- IPv6: `dig @8.8.8.8 buildingbb.com.au +short AAAA` (new IPv6).
- Reachability: `ping6 buildingbb.com.au` (server response).

**Troubleshooting:** If delayed, contact Crazy Domains support with Zone screenshot/dig proofs. Flush local cache: `sudo systemd-resolve --flush-caches`.

### Step 3: Install Certbot
```
sudo apt install certbot python3-certbot-apache -y
```
Verify: `certbot --version` (2.1.0).

### Step 4: Configure Firewall (UFW)
Status: `sudo ufw status verbose`.
Allow ports:
```
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```
Restrict app port (internal only):
```
sudo ufw delete allow 3000
sudo ufw reload
```
Verify: 80/443 ALLOW IN Anywhere (IPv4/v6).

### Step 5: Backup Apache Config
```
sudo cp -r /etc/apache2 /etc/apache2.backup.$(date +%Y%m%d)
```
Verify: `ls /etc/apache2.backup*`.

### Step 6: Prepare Apache Config
Enable modules:
```
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite ssl
sudo systemctl restart apache2
```
Disable conflicting sites (if error from missing Certbot files):
```
sudo a2dissite redirect-to-3000  # if present
sudo systemctl reload apache2
```
Test: `sudo apache2ctl configtest` (Syntax OK).

Enable default VHost for port 80:
```
sudo a2ensite 000-default
sudo systemctl reload apache2
```
Verify: `ls /etc/apache2/sites-enabled/` (000-default.conf).

### Step 7: Obtain and Deploy Certificate
Ensure Apache running: `sudo systemctl status apache2`.
Run Certbot:
```
sudo certbot --apache -d buildingbb.com.au -d www.buildingbb.com.au
```
- Email: john@buildingbb.com.au
- Terms: Y
- EFF: N

Certbot:
- Verifies domain on port 80 (IPv4/IPv6).
- Creates certs in /etc/letsencrypt/live/buildingbb.com.au/.
- Deploys to 000-default-le-ssl.conf (HTTPS VHost).
- Adds HTTP to HTTPS redirect in 000-default.conf.
- Restarts Apache.

Verify:
```
sudo certbot certificates
sudo apache2ctl configtest
sudo systemctl status apache2
```

**Output Example:**
- Certificate saved, expires 2026-02-02.
- Deployed to 000-default-le-ssl.conf.
- Auto-renew scheduled.

**Troubleshooting:** If VHost error, ensure *:80 site enabled. If IPv6 fail, use --standalone. Logs: /var/log/letsencrypt/letsencrypt.log.

### Step 8: Configure Reverse Proxy and Redirects
Create/edit /etc/apache2/sites-available/redirect-to-3000.conf (or update 000-default.conf):
```
<VirtualHost *:80>
    ServerName buildingbb.com.au
    ServerAlias www.buildingbb.com.au 67.219.105.53
    RewriteEngine On
    RewriteRule ^ https://www.buildingbb.com.au%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>

<VirtualHost *:443>
    ServerName buildingbb.com.au
    ServerAlias www.buildingbb.com.au

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/buildingbb.com.au/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/buildingbb.com.au/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # Reverse proxy to app on 3000
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]
</VirtualHost>
```
Enable:
```
sudo a2ensite redirect-to-3000
sudo systemctl restart apache2
```
Test: `sudo apache2ctl configtest` (Syntax OK).

**Redirects:**
- HTTP/domain: 301 to https://www.buildingbb.com.au.
- HTTP/IP: 301 to https://www.buildingbb.com.au.
- HTTPS: Proxies to app on 3000 (hides port).

### Step 9: Set Up Auto-Renewal
Certbot scheduled task auto-renews. Test:
```
sudo certbot renew --dry-run
```
Optional cron:
```
sudo crontab -e
```
Add: `0 12 * * * /usr/bin/certbot renew --quiet && sudo systemctl reload apache2`.

### Step 10: Additional Security
1. Install fail2ban:
```
sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban
```
2. SSH key setup:
   - Local: `ssh-keygen -t ed25519`
   - Copy: `ssh-copy-id john@67.219.105.53`
   - Server: Edit /etc/ssh/sshd_config (PasswordAuthentication no), `sudo systemctl restart ssh`.
3. Change password:
```
sudo passwd john
```

### Step 11: Test the Setup
1. HTTPS proxy: `curl -I https://buildingbb.com.au` (200 OK, Express headers).
2. HTTP redirect: `curl -I http://buildingbb.com.au` (301 to HTTPS).
3. IP redirect: `curl -I http://67.219.105.53` (301 to HTTPS).
4. Browser: https://buildingbb.com.au (secure, app loads).
5. SSL test: https://www.ssllabs.com/ssltest/analyze.html?d=buildingbb.com.au (A grade).
6. Certs: `sudo certbot certificates` (valid).

**Test Outputs:**
- HTTPS: HTTP/2 200, X-Powered-By: Express (app proxied).
- HTTP: 301 Moved Permanently to HTTPS.
- Port 3000: Restricted (UFW deny).

## Troubleshooting
- **DNS Propagation:** Flush caches, contact registrar.
- **Certbot Fail:** Port 80 free, VHost enabled, logs /var/log/letsencrypt/.
- **Proxy/Redirect:** Check /var/log/apache2/error.log, configtest.
- **UFW:** `sudo ufw status` for rules.
- **Renewal:** Dry-run test, cron logs.

## Conclusion
SSL is now implemented: The server serves the Node.js app securely over HTTPS at https://buildingbb.com.au, with automatic redirects from HTTP/IP, proxy hiding port 3000, and auto-renewal. Total time: ~3 days (mostly DNS propagation). This setup ensures secure, production-ready HTTPS without exposing internal ports.

For maintenance: Monitor cert renewal, update DNS TTL for future changes, harden SSH.
