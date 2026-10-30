import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { findUser, verifyPassword, updateUserPassword, updateUserSettings } from '../lib/users.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const DEFAULT_SETTINGS = {
  accentColor: '#FF6600',
  fontScale: 1,
  fontFamily: 'system',
};

const ALLOWED_FONTS = new Set(['system', 'serif', 'mono', 'dyslexic']);
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// In-memory per-IP login rate limiter (simple, no external deps).
// Resets after the configured window. Adequate for single-instance deploys.
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 20;
const loginAttempts = new Map();

function checkLoginRate(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.t > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { t: now, n: 1 });
    return true;
  }
  entry.n += 1;
  return entry.n <= LOGIN_MAX_ATTEMPTS;
}

// Express middleware: extract + verify Bearer JWT; attach payload to req.user.
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function createAuthRouter() {
  const router = Router();

  router.post('/login', async (req, res) => {
    const ip = req.ip || 'unknown';
    if (!checkLoginRate(ip)) {
      return res
        .status(429)
        .json({ error: 'Too many login attempts. Try again in a minute.' });
    }
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username ||
      !password
    ) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = await findUser(username);
    if (!user || !(await verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { sub: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        settings: user.settings || { ...DEFAULT_SETTINGS },
      },
    });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await findUser(req.user.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    res.json({
      user: {
        username: user.username,
        role: user.role,
        settings: user.settings || { ...DEFAULT_SETTINGS },
      },
    });
  });

  router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      !newPassword
    ) {
      return res
        .status(400)
        .json({ error: 'Current and new password required' });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 6 characters' });
    }
    if (newPassword.length > 200) {
      return res.status(400).json({ error: 'Password too long' });
    }
    const user = await findUser(req.user.sub);
    if (!user || !(await verifyPassword(user, currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    await updateUserPassword(user.username, newPassword);
    res.json({ success: true });
  });

  router.post('/settings', requireAuth, async (req, res) => {
    const { accentColor, fontScale, fontFamily } = req.body || {};
    const patch = {};

    if (accentColor !== undefined) {
      if (
        typeof accentColor !== 'string' ||
        !HEX_RE.test(accentColor.trim())
      ) {
        return res
          .status(400)
          .json({ error: 'accentColor must be a valid hex color' });
      }
      patch.accentColor = accentColor.trim();
    }

    if (fontScale !== undefined) {
      const scale = Number(fontScale);
      if (!Number.isFinite(scale) || scale < 0.7 || scale > 1.8) {
        return res
          .status(400)
          .json({ error: 'fontScale must be a number between 0.7 and 1.8' });
      }
      patch.fontScale = scale;
    }

    if (fontFamily !== undefined) {
      if (
        typeof fontFamily !== 'string' ||
        !ALLOWED_FONTS.has(fontFamily)
      ) {
        return res
          .status(400)
          .json({ error: 'fontFamily not allowed' });
      }
      patch.fontFamily = fontFamily;
    }

    const updated = await updateUserSettings(req.user.sub, patch);
    res.json({ settings: updated });
  });

  return router;
}