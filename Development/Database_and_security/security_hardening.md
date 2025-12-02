### SQL Injection Vulnerability Assessment and Rollout Plan

#### Conclusion from Review
After reviewing `Development/Database_and_security/security_hardening.md` and `app.js`:
- **Primary Concern: SQL Injection (SQLi) Attacks**. The `app.js` file, particularly the legacy `/update` route (lines ~1400+), constructs SQL queries by directly concatenating unsanitized user inputs from `req.query` (e.g., `fieldID`, `newValue`, `rowID`) into raw SQL strings. Examples include:
  - `"UPDATE jobs SET user_id = " + value + " WHERE id = " + rowID` (direct injection via `newValue` or `rowID`).
  - Similar issues in `/dtDone` route: `"SELECT * from worksheets WHERE Id = " + id`.
- This violates OWASP guidelines by allowing attackers to inject malicious SQL (e.g., via URL params like `newValue='); DROP TABLE users; --`).
- Other routes (e.g., customer updates, job status changes) share this pattern, but `/update` is the core vector as it's called dynamically for field updates across tables (jobs, tasks, customers, etc.).
- Secondary issues: No input whitelisting (e.g., allowed fields), lack of prepared statements with the `pg` module, and reliance on axios forwarding to a potentially vulnerable backend `/update`.
- The enhanced `/update-v2` route (using `ChangeProcessor`) appears safer but falls back to legacy, so full migration is needed.
- No evidence of ORM (e.g., Sequelize); sticking to `pg` for fixes.

This exposes the app to data exfiltration, modification, or deletion. Immediate hardening of `/update` is critical, followed by broader rollout.

#### Rollout Plan Overview
Adapt the phased plan from `security_hardening.md` to this Node.js/Express/pg project. Timeline: 7-10 days (solo developer). Work in a Git branch (`git checkout -b sql-hardening`). Backup DB/code before changes. Use `pg` for parameterization. Whitelist fields to prevent invalid updates. Test with sqlmap on staging.

**Key Principles**:
- Parameterize all queries (no concatenation).
- Whitelist allowed `fieldID` values (e.g., `ALLOWED_FIELDS = ['jobStatus', 'target_date', 'user_id']`).
- Validate/sanitize inputs (e.g., escape dates, limit lengths).
- Defense in Depth: Add logging for suspicious inputs.
- Minimal downtime: Stage changes, test locally.

**Secrets Management Principles**:
- Rotate all critical passwords/secrets immediately after SQLi fixes to mitigate any prior exposure.
- Use strong, unique passwords (20+ chars, mixed case/symbols); generate with tools like pwgen.
- Store in .env (gitignored); never hardcode.
- Enforce least privilege: e.g., Postgres app user (not root), SSH key-only auth.
- Audit changes: Log rotations, test access post-update.

**Phase 0: Secrets Management & Password Rotation (1 day, before Phase 1)**
- [ ] Generate new strong passwords:
  - SSH root/VM users: `pwgen -s 32 1` (install pwgen if needed: `sudo apt install pwgen`).
  - Postgres: New PG_PASSWORD for app user; update root if used.
  - App secrets: New SESSION_SECRET (`openssl rand -hex 32`), SMTP_ENCRYPTION_KEY.
  - Other: Any API keys, nodemailer creds.
- [ ] Update .env file:
  - Replace SESSION_SECRET, PG_PASSWORD, SMTP_PASSWORD (encrypted), etc.
  - Commit .env.example with placeholders; .env remains local.
- [ ] SSH/VM Hardening:
  - SSH into VM: `ssh root@vm-ip`.
  - Update root password: `passwd root`.
  - Disable password auth: Edit `/etc/ssh/sshd_config` (PasswordAuthentication no; PubkeyAuthentication yes); restart SSH (`systemctl restart ssh`).
  - Generate/update SSH keys: `ssh-keygen -t ed25519`; add to authorized_keys.
  - For non-root users: Update passwords, restrict sudo.
- [ ] Postgres Hardening:
  - Connect: `psql -U postgres`.
  - Update passwords: `ALTER USER app_user PASSWORD 'new_strong_pass';` (use parameterized if possible).
  - Enforce policies: Edit pg_hba.conf for md5 auth; restart Postgres (`systemctl restart postgresql`).
  - Revoke unnecessary privileges: e.g., `REVOKE ALL ON SCHEMA public FROM PUBLIC;`.
- [ ] Test Access:
  - Restart app: `npm run dev`; verify DB connections, sessions.
  - Test SSH: Key-based login only.
  - Backup old secrets securely (e.g., encrypted file); destroy after verification.
- [ ] Documentation: Add to md file (this section); notify team of changes (e.g., new SSH keys).
- [ ] Require all users to reset password - currently all users have a simple password that is known by everyone else. require password reset

This phase ensures no weak/default creds remain post-SQLi fix, reducing lateral movement risks.

**Action Items (Phased Checklist)**:
- [ ] **Phase 1: Assessment & Planning (1-2 days)**
  - [ ] Scan codebase: Use `grep -r "UPDATE\|SELECT.*=" app.js views/` to find all dynamic queries. Focus on `/update`, `/dtDone`, customer/job routes.
  - [ ] Inventory affected routes: `/update` (primary), `/dtDone`, `/addCustomer`, `/updateCustomer`, `/jobComplete`, etc. List tables/columns (e.g., jobs.user_id, tasks.current_status).
  - [ ] Create whitelist: Define `ALLOWED_FIELDS` object mapping fieldID to {table, column, type, validation} (e.g., {table: 'jobs', column: 'user_id', type: 'integer', maxLength: 10}).
  - [ ] Set up staging: Mirror prod DB (use pg_dump). Install tools: `npm i eslint-plugin-security`, sqlmap (`sudo apt install sqlmap`).
  - [ ] Run initial sqlmap: `sqlmap -u "http://localhost:3000/update?fieldID=jobStatus&newValue=test&whereID=1" --batch --dbms=postgresql` to confirm exploits.
  - [ ] Backup: `pg_dump -U $PG_USER $PG_DATABASE > backup.sql`; Git commit baseline.

- [ ] **Phase 2: Development & Implementation (2-3 days)**
  - [ ] Refactor `/update` route:
    - Replace switch with dynamic query builder using whitelist.
    - Use parameterized queries: e.g., `await db.query("UPDATE $1 SET $2 = $3 WHERE id = $4", [table, column, value, rowID])` (but escape table/column names safely via whitelist).
    - Sanitize `newValue`: Based on type (e.g., integers: parseInt, dates: validate ISO, strings: trim/limit length).
    - Handle legacy fallback: Migrate all cases to new logic; remove axios forwarding if backend is same app.
    - Add input validation: Reject if `fieldID` not in whitelist; log attempts.
  - [ ] Harden related routes: Parameterize `/dtDone` (e.g., `db.query("SELECT * FROM worksheets WHERE id = $1", [id])`), `/updateCustomer`, etc.
  - [ ] Add middleware: Global query sanitizer (e.g., express-validator for params).
  - [ ] Implement logging: Use Winston for suspicious queries (e.g., if newValue contains ';', log as potential attack).
  - [ ] Consider ORM: Evaluate adding Sequelize for future-proofing, but start with pg params.

- [ ] **Phase 3: Testing & Validation (2 days)**
  - [ ] Unit tests: Use Jest to test parameterized queries with safe/malicious inputs (e.g., `' OR 1=1 --` should fail validation).
  - [ ] Integration tests: Simulate updates via Postman/curl; verify no injection (e.g., check DB unchanged for malicious payloads).
  - [ ] Security scan: Re-run sqlmap on staging; aim for zero vulns. Manual tests: Inject payloads in `/update?fieldID=jobStatus&newValue='); DROP TABLE jobs; --&whereID=1`.
  - [ ] Performance: Benchmark queries before/after (parameterization adds negligible overhead).
  - [ ] Edge cases: Empty values, special chars (\n, ', ;), large inputs, invalid fieldID.
  - [ ] Peer review: Self-review or share branch for feedback.

- [ ] **Phase 4: Deployment (1 day)**
  - [ ] Deploy to staging: `git push origin sql-hardening`; merge to staging branch. Monitor for 24h.
  - [ ] Blue-green: If possible, deploy parallel instance; switch traffic post-verification.
  - [ ] Prod rollout: Off-peak window (e.g., weekend). Update DB privileges (least privilege: read-only where possible).
  - [ ] Post-deploy: Quick sqlmap scan; test key features (e.g., update job status via UI).
  - [ ] Rollback: Keep legacy branch; revert via `git revert` if issues.

- [ ] **Phase 5: Monitoring & Follow-up (Ongoing, start Day 1 post-deploy)**
  - [ ] Logging: Integrate Winston/Morgan for query errors/suspicious inputs (e.g., rate-limit failed validations).
  - [ ] Alerts: Console logs for now; add Slack/Email for high-severity (e.g., injection attempts).
  - [ ] Quarterly scans: Automate sqlmap in CI/CD (GitHub Actions); `npm audit fix`.
  - [ ] Training: Document changes in README; educate on secure coding.
  - [ ] Incident response: If breach, isolate DB, assess logs, notify if data affected.
  - [ ] Metrics: Track vulns (zero SQLi), functionality (no regressions in updates).

**Estimated Timeline & Costs**: 7-10 days total. Costs: Free (open-source tools). Success: Zero SQLi in scans; full functionality preserved.

This plan resolves the `/update` hardening while scaling to the app. Next: Switch to ACT MODE to implement if approved.
