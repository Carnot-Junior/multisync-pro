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

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e password são obrigatórios.' });
  }

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Email ou password incorrectos.' });
  }

  const token = createSession(user.id);

  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ user: publicUser(user) });
}
