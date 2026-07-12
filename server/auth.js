'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSetting, setSetting, DATA_DIR } = require('./db');

const SESSION_TTL = process.env.SESSION_TTL || '30d';
const COOKIE_NAME = 'mma_session';

// Resolve a JWT secret: env var wins, else a persisted random secret.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretFile = path.join(DATA_DIR, '.secret');
  try {
    if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf8').trim();
  } catch (_) { /* ignore */ }
  const secret = crypto.randomBytes(48).toString('hex');
  try { fs.writeFileSync(secretFile, secret, { mode: 0o600 }); } catch (_) { /* ignore */ }
  return secret;
}
const SECRET = resolveSecret();

function isConfigured() {
  return !!getSetting('password_hash');
}

function setPassword(plain) {
  if (!plain || plain.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const hash = bcrypt.hashSync(plain, 12);
  setSetting('password_hash', hash);
}

function verifyPassword(plain) {
  const hash = getSetting('password_hash');
  if (!hash) return false;
  return bcrypt.compareSync(plain || '', hash);
}

function issueToken() {
  return jwt.sign({ sub: 'owner' }, SECRET, { expiresIn: SESSION_TTL });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 365,
  };
}

// Express middleware: require a valid session for API routes.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    jwt.verify(token, SECRET);
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

function isValidToken(token) {
  try { jwt.verify(token, SECRET); return true; } catch (_) { return false; }
}

module.exports = {
  COOKIE_NAME,
  cookieOptions,
  isConfigured,
  setPassword,
  verifyPassword,
  issueToken,
  requireAuth,
  isValidToken,
};
