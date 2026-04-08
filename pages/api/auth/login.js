const {
  findUserByEmail,
  verifyPassword,
  createSession,
  publicUser,
  sessionCookie,
} = require('../../../lib/auth');
const { rateLimit, getIp } = require('../../../lib/rateLimit');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rl = rateLimit(getIp(req), { max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ message: 'Demasiadas tentativas. Aguarda um momento.' });
  }

  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email e password são obrigatórios.' });
  }
  if (email.length > 254 || password.length > 128) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }

  const user = await findUserByEmail(email.trim());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Email ou password incorrectos.' });
  }

  const token = await createSession(user.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ user: publicUser(user) });
}
