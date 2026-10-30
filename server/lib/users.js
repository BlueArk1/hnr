import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const ALLOWED_ROLES = new Set(['user', 'admin']);
const USERNAME_RE = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,31}$/;

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, '[]', 'utf8');
  }
}

async function readUsers() {
  await ensureFile();
  const raw = await fs.readFile(USERS_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export async function findUser(username) {
  const users = await readUsers();
  return users.find((u) => u.username === username);
}

export async function createUser(username, password, role = 'user') {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    throw new Error('Invalid username');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Invalid role');
  }
  const users = await readUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error(`User "${username}" already exists`);
  }
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    passwordHash: hash,
    role,
    settings: {
      accentColor: '#FF6600',
      fontScale: 1,
      fontFamily: 'system',
    },
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return { username: user.username, role: user.role, settings: user.settings };
}

export async function updateUserPassword(username, newPassword) {
  const users = await readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('User not found');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date().toISOString();
  await writeUsers(users);
  return true;
}

export async function updateUserSettings(username, settings) {
  const users = await readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('User not found');
  user.settings = { ...(user.settings || {}), ...settings };
  await writeUsers(users);
  return user.settings;
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.passwordHash);
}