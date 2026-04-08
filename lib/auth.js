/**
 * MultiSync Pro — Auth helpers com Supabase
 */

const crypto = require('crypto');
const { supabase } = require('./supabase');

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

// ─── Utilizadores ────────────────────────────────────────────────────────────

async function readUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw new Error('readUsers: ' + error.message);
  return (data || []).map(dbUserToApp);
}

async function writeUsers(users) {
  // Usado apenas em contextos de update em massa — preferir updateUser
  for (const u of users) {
    await supabase.from('users').upsert(appUserToDb(u), { onConflict: 'id' });
  }
}

async function findUserByEmail(email) {
  const { data } = await supabase
    .from('users').select('*')
    .eq('email', email.toLowerCase()).single();
  return data ? dbUserToApp(data) : null;
}

async function findUserByLicenseKey(key) {
  const { data } = await supabase
    .from('users').select('*')
    .ilike('license_key', key).single();
  return data ? dbUserToApp(data) : null;
}

async function createUser(userData) {
  const { data, error } = await supabase
    .from('users').insert(appUserToDb(userData)).select().single();
  if (error) throw new Error('createUser: ' + error.message);
  return dbUserToApp(data);
}

async function updateUser(id, fields) {
  const { data, error } = await supabase
    .from('users').update(appUserToDb(fields)).eq('id', id).select().single();
  if (error) throw new Error('updateUser: ' + error.message);
  return dbUserToApp(data);
}

// ─── Sessões ─────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

async function createSession(userId) {
  const token     = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { error } = await supabase.from('sessions').insert({
    user_id:    userId,
    token,
    expires_at: expiresAt,
  });
  if (error) throw new Error('createSession: ' + error.message);
  return token;
}

function getTokenFromReq(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/msp_session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

async function getSessionUser(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;

  const { data: session } = await supabase
    .from('sessions').select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return null;

  const { data: user } = await supabase
    .from('users').select('*')
    .eq('id', session.user_id).single();

  return user ? dbUserToApp(user) : null;
}

async function deleteSession(token) {
  await supabase.from('sessions').delete().eq('token', token);
}

// ─── Pagamentos ──────────────────────────────────────────────────────────────

async function createPayment(paymentData) {
  const { data, error } = await supabase
    .from('payments').insert({
      user_id:     paymentData.userId,
      method:      paymentData.method,
      reference:   paymentData.reference,
      amount:      paymentData.amount,
      status:      paymentData.status || 'pendente',
      proxypay_id: paymentData.proxypayId,
    }).select().single();
  if (error) throw new Error('createPayment: ' + error.message);
  return data;
}

async function findPaymentByReference(reference) {
  const { data } = await supabase
    .from('payments').select('*')
    .eq('reference', reference).single();
  return data || null;
}

async function updatePayment(id, fields) {
  const { data, error } = await supabase
    .from('payments').update(fields).eq('id', id).select().single();
  if (error) throw new Error('updatePayment: ' + error.message);
  return data;
}

async function getUserPayments(userId) {
  const { data } = await supabase
    .from('payments').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

// ─── Trial ───────────────────────────────────────────────────────────────────

const TRIAL_DAYS = 14;

function getTrialDaysLeft(user) {
  if (user.status !== 'trial') return 0;
  const ref = user.trialExpiresAt
    ? new Date(user.trialExpiresAt)
    : (() => {
        const d = new Date(user.trialStartDate || user.createdAt);
        d.setDate(d.getDate() + TRIAL_DAYS);
        return d;
      })();
  return Math.max(0, Math.ceil((ref - new Date()) / 86400000));
}

function isTrialExpired(user) {
  return user.status === 'trial' && getTrialDaysLeft(user) === 0;
}

// ─── Sanitize ────────────────────────────────────────────────────────────────

function publicUser(user) {
  const { passwordHash, password_hash, ...safe } = user;
  return {
    ...safe,
    trialDaysLeft: user.status === 'trial' ? getTrialDaysLeft(user) : null,
    trialExpired:  isTrialExpired(user),
  };
}

// ─── Cookies ─────────────────────────────────────────────────────────────────

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `msp_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}${secure}`;
}

function clearCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `msp_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

// ─── Mapeamento DB ↔ App ─────────────────────────────────────────────────────

function dbUserToApp(u) {
  if (!u) return null;
  return {
    id:              u.id,
    name:            u.name,
    email:           u.email,
    phone:           u.phone,
    passwordHash:    u.password_hash,
    licenseKey:      u.license_key,
    status:          u.status,
    plan:            u.plan,
    paymentMethod:   u.payment_method,
    activatedAt:     u.activated_at,
    expiresAt:       u.expires_at,
    trialExpiresAt:  u.trial_expires_at,
    devices:         u.devices || [],
    emailsSent:      u.emails_sent || [],
    lastVerifiedAt:  u.last_verified_at,
    createdAt:       u.created_at,
  };
}

function appUserToDb(u) {
  const db = {};
  if (u.id             !== undefined) db.id              = u.id;
  if (u.name           !== undefined) db.name            = u.name;
  if (u.email          !== undefined) db.email           = u.email?.toLowerCase();
  if (u.phone          !== undefined) db.phone           = u.phone;
  if (u.passwordHash   !== undefined) db.password_hash   = u.passwordHash;
  if (u.licenseKey     !== undefined) db.license_key     = u.licenseKey;
  if (u.status         !== undefined) db.status          = u.status;
  if (u.plan           !== undefined) db.plan            = u.plan;
  if (u.paymentMethod  !== undefined) db.payment_method  = u.paymentMethod;
  if (u.activatedAt    !== undefined) db.activated_at    = u.activatedAt;
  if (u.expiresAt      !== undefined) db.expires_at      = u.expiresAt;
  if (u.trialExpiresAt !== undefined) db.trial_expires_at= u.trialExpiresAt;
  if (u.devices        !== undefined) db.devices         = u.devices;
  if (u.emailsSent     !== undefined) db.emails_sent     = u.emailsSent;
  if (u.lastVerifiedAt !== undefined) db.last_verified_at= u.lastVerifiedAt;
  return db;
}

module.exports = {
  // Utilizadores
  readUsers,
  writeUsers,
  findUserByEmail,
  findUserByLicenseKey,
  createUser,
  updateUser,
  // Sessões
  createSession,
  getTokenFromReq,
  getSessionUser,
  deleteSession,
  // Pagamentos
  createPayment,
  findPaymentByReference,
  updatePayment,
  getUserPayments,
  // Password
  hashPassword,
  verifyPassword,
  // Tokens
  generateToken,
  generateLicenseKey,
  // Helpers
  publicUser,
  sessionCookie,
  clearCookie,
  getTrialDaysLeft,
  isTrialExpired,
  TRIAL_DAYS,
};
