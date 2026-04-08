/**
 * MultiSync Pro — Auth helpers
 * Usa ficheiros JSON locais como base de dados provisória.
 * Em produção substituir por PostgreSQL / Supabase.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// No Vercel (produção) o filesystem é read-only fora de /tmp.
// Usamos /tmp como pasta de dados, semeada a partir dos ficheiros
// incluídos no build na primeira execução de cada instância Lambda.
const IS_PROD   = process.env.NODE_ENV === 'production';
const DATA_DIR  = IS_PROD ? '/tmp/msp-data' : path.join(process.cwd(), 'data');
const SEED_DIR  = path.join(process.cwd(), 'data'); // sempre lê a seed do build
const USERS_FILE    = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// ─── Helpers de ficheiro ─────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Produção: semear /tmp a partir dos ficheiros incluídos no build
  if (IS_PROD) {
    for (const file of ['users.json', 'sessions.json']) {
      const dst = path.join(DATA_DIR, file);
      const src = path.join(SEED_DIR, file);
      if (!fs.existsSync(dst)) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        } else {
          fs.writeFileSync(dst, file === 'users.json' ? '[]' : '{}');
        }
      }
    }
  }
}

function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
    return [];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readSessions() {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, '{}');
    return {};
  }
  return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
}

function writeSessions(sessions) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// ─── Password ────────────────────────────────────────────────────────────────

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

// ─── Geração de tokens ────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateLicenseKey() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MSP-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

// ─── Sessões ──────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function createSession(userId) {
  const token = generateToken();
  const now = Date.now();
  const sessions = readSessions();

  // Limpar sessões expiradas do mesmo utilizador enquanto criamos nova
  for (const [t, s] of Object.entries(sessions)) {
    if (s.expiresAt && s.expiresAt < now) delete sessions[t];
  }

  sessions[token] = {
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: now + SESSION_TTL_MS,
  };
  writeSessions(sessions);
  return token;
}

function getTokenFromReq(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/msp_session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

function getSessionUser(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const sessions = readSessions();
  const session = sessions[token];
  if (!session) return null;
  // Rejeitar sessão expirada
  if (session.expiresAt && session.expiresAt < Date.now()) {
    deleteSession(token);
    return null;
  }
  const users = readUsers();
  return users.find(u => u.id === session.userId) || null;
}

function deleteSession(token) {
  const sessions = readSessions();
  delete sessions[token];
  writeSessions(sessions);
}

// ─── Estado de trial ──────────────────────────────────────────────────────────

const TRIAL_DAYS = 14;

function getTrialDaysLeft(user) {
  if (user.status !== 'trial') return 0;
  // Usa trialExpiresAt se existir (novos registos), senão calcula a partir de trialStartDate
  const ref = user.trialExpiresAt
    ? new Date(user.trialExpiresAt)
    : (() => {
        const d = new Date(user.trialStartDate || user.createdAt);
        d.setDate(d.getDate() + TRIAL_DAYS);
        return d;
      })();
  const diff = Math.ceil((ref - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function isTrialExpired(user) {
  return user.status === 'trial' && getTrialDaysLeft(user) === 0;
}

// ─── Sanitize user para resposta (sem password) ───────────────────────────────

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return {
    ...safe,
    trialDaysLeft: user.status === 'trial' ? getTrialDaysLeft(user) : null,
    trialExpired: isTrialExpired(user),
  };
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function sessionCookie(token) {
  return `msp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearCookie() {
  return `msp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  readUsers,
  writeUsers,
  hashPassword,
  verifyPassword,
  generateToken,
  generateLicenseKey,
  createSession,
  getTokenFromReq,
  getSessionUser,
  deleteSession,
  publicUser,
  sessionCookie,
  clearCookie,
  getTrialDaysLeft,
  isTrialExpired,
  TRIAL_DAYS,
};
