/**
 * POST /api/auth/login
 * Body: { email, password }
 * Valida credenciais e devolve utilizador + seta cookie de sessão.
 */

const {
  readUsers,
  verifyPassword,
  createSession,
  publicUser,
  sessionCookie,
} = require('../../../lib/auth');
const { rateLimit, getIp } = require('../../../lib/rateLimit');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limiting: 10 tentativas por minuto por IP
  const rl = rateLimit(getIp(req), { max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ message: 'Demasiadas tentativas. Aguarda um momento.' });
  }

  const { email, password } = req.body || {};

  // Validação de input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e password são obrigatórios.' });
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  if (email.length > 254 || password.length > 128) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  // Resposta idêntica quer o utilizador não exista quer a password esteja errada
  // (previne enumeração de utilizadores)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Email ou password incorrectos.' });
  }

  const token = createSession(user.id);

  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ user: publicUser(user) });
}
