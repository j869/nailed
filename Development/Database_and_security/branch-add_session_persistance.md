# Session Persistence Implementation Plan

## Overview
This branch implements persistent session storage using Postgres (via `connect-pg-simple`) to address inconsistent session IDs. MemoryStore (default) loses sessions on restarts and doesn't scale. We'll switch to a DB-backed store for persistence across restarts/instances, add cookie timeouts for idle session expiry, and introduce browser fingerprinting (IP + user-agent hash) for cross-session user tracking. This enhances logging in `logUserActivity` for better behavior analysis.

**Goals:**
- Consistent session IDs per browser session.
- Sessions survive server restarts. (optional)
- Automatic expiry after 24 hours (configurable).
- Fingerprint to link logs across sessions/devices.
- Minimal impact on existing code; beginner-friendly.

**Dependencies:** `connect-pg-simple` (installed via `npm install connect-pg-simple`).

**Affected Files:**
- `app.js` (main server): Update session middleware, add fingerprint middleware.
- `index.js` (API server): Similar session updates (current setup is basic MemoryStore).
- `src/logging.js`: Include fingerprint in log entries.
- DB: Auto-creates `user_sessions` table on first use.

**Security Notes:** Fingerprinting uses non-sensitive data; store optionally in DB for auth'd users. Use HTTPS in prod for secure cookies.

## Database Setup
The store auto-creates a `user_sessions` table:
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);
CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions (expire);
```
- prompt developer to create this manually.
- Sessions expire based on `cookie.maxAge`; prune old ones periodically (e.g., cron job: `DELETE FROM user_sessions WHERE expire < NOW();`).

## Code Changes

### 1. app.js (Main Server)
Update session middleware after imports. Use existing `db` (pg.Client) – wrap in Pool if scaling.

**Add import:**
```js
import pgSession from 'connect-pg-simple';
```

**Replace session setup:**
```js
const pgSessionStore = pgSession(session);

app.use(session({
  store: new pgSessionStore({
    pool: new pg.Pool({  // prefer existing db connection
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: process.env.PG_PORT,
    }),
    tableName: 'user_sessions',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,  // identify potentially malicious connections
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours timeout
  },
}));
```

**Add fingerprint middleware (before session middleware):**
```js
import crypto from 'crypto';  // Already imported

app.use((req, res, next) => {
  if (!req.session.fingerprint) {
    const fingerprint = crypto.createHash('sha256')
      .update(req.ip + (req.headers['user-agent'] || '') + (req.headers['x-forwarded-for'] || ''))
      .digest('hex').substring(0, 16);
    req.session.fingerprint = fingerprint;
    // Optional: Log to DB for auth'd users
    if (req.user?.id) {
      // db.query('INSERT INTO user_fingerprints (fingerprint, user_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING', [fingerprint, req.user.id]);
    }
  }
  req.fingerprint = req.session.fingerprint;
  next();
});
```

**Update logging call (in middleware):**
```js
logUserActivity(req, `x1        NEW REQUEST ${req.method} ${req.path} ${variables} | Fingerprint: ${req.fingerprint}`);
```

### 2. index.js (API Server)
Similar to app.js. Current setup uses basic MemoryStore.

**Add imports:**
```js
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';  // Already has pg
```

**Replace session setup (after bodyParser):**
```js
const pgPool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

const pgSessionStore = pgSession(session);

app.use(session({
  store: new pgSessionStore({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
}));
```

**Add fingerprint middleware (before session):**
Same as app.js, using the new `pgPool` for optional DB logging.

### 3. src/logging.js
Update `logUserActivity` to include fingerprint.

**In function, after extracting sessionID:**
```js
let fingerprint = req?.session?.fingerprint || 'unknown';
```

**In logEntry:**
```js
const logEntry = `${timestamp} | ${sessionID.toString().padStart(32, ' ')} | ${fingerprint.padStart(16, ' ')} | ${ipAddress.toString().padStart(15, ' ')} | ${referer.toString().padEnd(50, ' ')} | ${activity} \n`;
```

**refactor file name:** because fingerprint is more consistant than sessionID: `${fingerprint}.log`

## Testing
1. Restart servers: Sessions should persist (check logs for same ID pre/post-restart).
2. Idle timeout: Wait 24h or set shorter maxAge for testing; verify session expiry.
3. Fingerprint: Open incognito/multiple tabs; check logs for consistent fingerprint per browser.
4. Cross-server: Test API calls from app.js; ensure shared store.
5. Commands:
   - Run dev: `nodemon app.js` and `nodemon index.js`.
   - Check sessions: `psql -d yourdb -c "SELECT * FROM user_sessions LIMIT 5;"`
   - Verify logs: Look for fingerprint in new log files.

**Edge Cases:**
- Server restart mid-session: ID preserved.
- IP change: Fingerprint updates but session continues.
- Unauth'd users: Fingerprint still generated.

## Rollout Steps
1. **git branch:** switch to a new branch - not master.
2. **Deploy:** Push changes; install dep on prod (`npm i connect-pg-simple`).
3. **Migrate:** Run DB schema if manual; store auto-creates.
4. **Monitor:** Watch logs for errors; query sessions table.
5. **Fallback:** If issues, revert to master branch.
6. **Prod Config:** Set shorter maxAge (e.g., 12h); enable secure cookies.

**Risks:** DB overload from sessions (prune regularly); fingerprint privacy (anonymize in prod).

Last Updated: 01/12/2025
