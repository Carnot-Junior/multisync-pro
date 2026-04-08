/**
 * POST /api/auth/register
 * Body: { name, email, phone, password }
 * Cria utilizador com status 'trial' (14 dias gratuitos).
 * Devolve utilizador + seta cookie de sessão.
 */

const crypto = require('crypto');
const {
  readUsers, writeUsers,
  hashPassword,
  generateLicenseKey,
  createSession,
  publicUser,
  sessionCookie,
} = require('../../../lib/auth');
const { rateLimit, getIp } = require('../../../lib/rateLimit');

// Regex de email robusto
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
// Telefone angolano: 9XX XXX XXX (só dígitos, 9 caracteres)
const PHONE_REGEX = /^9[0-9]{8}$/;

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limiting: 5 registos por hora por IP
  const rl = rateLimit(getIp(req), { max: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ message: 'Demasiados registos. Aguarda um momento.' });
  }

  const { name, email, phone, password } = req.body || {};

  // Validação de tipos
  if ([name, email, phone, password].some(v => typeof v !== 'string')) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }

  // Validação de campos obrigatórios
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  // Limites de comprimento
  if (name.trim().length > 100) {
    return res.status(400).json({ message: 'Nome demasiado longo.' });
  }
  if (email.length > 254) {
    return res.status(400).json({ message: 'Email inválido.' });
  }
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ message: 'A password deve ter entre 6 e 128 caracteres.' });
  }

  // Validação de formato
  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ message: 'Email inválido.' });
  }
  const phoneDigits = phone.replace(/\s/g, '');
  if (!PHONE_REGEX.test(phoneDigits)) {
    return res.status(400).json({ message: 'Número de telefone inválido. Usa o formato angolano (9XX XXX XXX).' });
  }

  const users = readUsers();

  // Email já existe?
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
    return res.status(409).json({ message: 'Este email já está registado.' });
  }

  // Criar utilizador
  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + 14);

  const newUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phoneDigits,
    passwordHash: hashPassword(password),
    licenseKey: generateLicenseKey(),
    status: 'trial',
    trialStartDate: now.toISOString(),
    trialExpiresAt: trialEnds.toISOString(),
    payments: [],
    devices: [],
    emailsSent: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  const token = createSession(newUser.id);

  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(201).json({ user: publicUser(newUser) });
}
