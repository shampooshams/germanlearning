require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const { extractVocabulary } = require('./gemini');

// Locally this points at a file path (./serviceAccountKey.json). On Netlify there's no
// file to point at, so the env var instead holds the raw JSON contents directly.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set');
  return raw.trim().startsWith('{') ? JSON.parse(raw) : require(path.resolve(__dirname, raw));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '../public')));

// Verifies the Firebase ID token sent by the frontend in the Authorization header,
// so we know which user is making the request before touching Gemini/DeepL/Firestore.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Like requireAuth, but lets guests through with req.user = null instead of rejecting.
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await admin.auth().verifyIdToken(token);
  } catch (err) {
    req.user = null;
  }
  next();
}

// Guests are limited per IP to protect the free Gemini quota from being drained by
// strangers/bots once this is public; logged-in users are not subject to this limit.
const GUEST_LIMIT = 5;
const GUEST_WINDOW_MS = 60 * 60 * 1000;
const guestExtractCounts = new Map();

function guestRateLimit(req, res, next) {
  if (req.user) return next();
  const ip = req.ip;
  const now = Date.now();
  const entry = guestExtractCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    guestExtractCounts.set(ip, { count: 1, resetAt: now + GUEST_WINDOW_MS });
    return next();
  }
  if (entry.count >= GUEST_LIMIT) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    return res.status(429).json({
      error: `guests can extract ${GUEST_LIMIT} times per hour. sign in for unlimited use, or try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
    });
  }
  entry.count += 1;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/whoami', requireAuth, (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email });
});

const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

app.post('/api/extract', optionalAuth, guestRateLimit, async (req, res) => {
  const text = (req.body.text || '').trim();
  const level = VALID_LEVELS.includes(req.body.level) ? req.body.level : 'A1';
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 8000) {
    return res.status(400).json({ error: 'text is too long (max 8000 characters)' });
  }
  try {
    const result = await extractVocabulary(text, level);
    res.json(result);
  } catch (err) {
    console.error('extract error:', err.message);
    res.status(502).json({ error: 'vocabulary extraction failed, please try again' });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`VocabFlow server running on http://localhost:${PORT}`);
  });
}

module.exports = { app, requireAuth, admin };
