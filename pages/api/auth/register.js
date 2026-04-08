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

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, password } = req.body || {};

  // Validação
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email inválido.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'A password deve ter pelo menos 6 caracteres.' });
  }

  const users = readUsers();

  // Email já existe?
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'Este email já está registado.' });
  }

  // Criar utilizador
  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + 14); // trial de 14 dias

  const newUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    passwordHash: hashPassword(password),
    licenseKey: generateLicenseKey(),
    status: 'trial',           // 'pendente' | 'trial' | 'activo'
    trialStartDate: now.toISOString(),
    trialExpiresAt: trialEnds.toISOString(),
    payments: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  // Criar sessão
  const token = createSession(newUser.id);

  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(201).json({ user: publicUser(newUser) });
}
