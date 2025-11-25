import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import bodyParser from 'body-parser';
import path from 'path';

const app = express();
const PORT = 5000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static('public'));
app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging example
console.log('[SERVER][INIT][INFO] Server initializing...');

// Passport Local Strategy with hardcoded credentials
passport.use(new LocalStrategy(
  (username, password, done) => {
    console.log(`[AUTH][ATTEMPT][INFO] Login attempt for user: ${username}`);
    if (username === 'user' && password === 'pass') {
      console.log('[AUTH][SUCCESS][INFO] Authentication successful');
      return done(null, { username });
    } else {
      console.log('[AUTH][FAILURE][INFO] Authentication failed');
      return done(null, false);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log('[AUTH][SERIALIZE][INFO] Serializing user');
  done(null, user.username);
});

passport.deserializeUser((username, done) => {
  console.log('[AUTH][DESERIALIZE][INFO] Deserializing user');
  done(null, { username });
});

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log(`[AUTH][CHECK][INFO] User ${req.user.username} is authenticated`);
    return next();
  } else {
    console.log('[AUTH][CHECK][WARNING] User not authenticated, redirecting to login');
    res.redirect('/login');
  }
}

// Routes
app.get('/', isAuthenticated, (req, res) => {
  console.log('[ROUTE][HOME][INFO] Serving home page to authenticated user');
  res.render('test', { user: req.user });
});

app.get('/login', (req, res) => {
  console.log('[ROUTE][LOGIN][INFO] Serving login page');
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/protected', isAuthenticated, (req, res) => {
  console.log('[ROUTE][PROTECTED][INFO] Serving protected content');
  res.json({ message: 'This is protected content', user: req.user.username });
});

app.post('/logout', (req, res) => {
  console.log('[AUTH][LOGOUT][INFO] Logging out user');
  req.logout((err) => {
    if (err) {
      console.log('[AUTH][LOGOUT][ERROR] Logout error:', err);
    }
    res.redirect('/login');
  });
});

// AJAX test route (protected)
app.get('/api/test', isAuthenticated, (req, res) => {
  console.log('[AJAX][TEST][INFO] AJAX test endpoint called by user:', req.user.username);
  res.json({ success: true, message: 'AJAX call successful to protected route' });
});

app.listen(PORT, () => {
  console.log(`[SERVER][START][INFO] Test app server running on http://localhost:${PORT}`);
});
