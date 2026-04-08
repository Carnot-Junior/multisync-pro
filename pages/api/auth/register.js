const {
  findUserByEmail,
  createUser,
  hashPassword,
  generateLicenseKey,
  createSession,
  publicUser,
  sessionCookie,
} = require('../../../lib/auth');
const { rateLimit, getIp } = require('../../../lib/rateLimit');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^9[0-9]{8}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rl = rateLimit(getIp(req), { max: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ message: 'Demasiados registos. Aguarda um momento.' });
  }

  const { name, email, phone, password } = req.body || {};

  if ([name, email, phone, password].some(v => typeof v !== 'string')) {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  if (name.trim().length > 100) return res.status(400).json({ message: 'Nome demasiado longo.' });
  if (email.length > 254)       return res.status(400).json({ message: 'Email inválido.' });
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ message: 'A password deve ter entre 6 e 128 caracteres.' });
  }
  if (!EMAIL_REGEX.test(email.trim())) return res.status(400).json({ message: 'Email inválido.' });

  const phoneDigits = phone.replace(/\s/g, '');
  if (!PHONE_REGEX.test(phoneDigits)) {
    return res.status(400).json({ message: 'Número de telefone inválido. Usa o formato angolano (9XX XXX XXX).' });
  }

  const existing = await findUserByEmail(email.trim());
  if (existing) return res.status(409).json({ message: 'Este email já está registado.' });

  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + 14);

  const newUser = await createUser({
    name:           name.trim(),
    email:          email.toLowerCase().trim(),
    phone:          phoneDigits,
    passwordHash:   hashPassword(password),
    licenseKey:     generateLicenseKey(),
    status:         'trial',
    trialExpiresAt: trialEnds.toISOString(),
    devices:        [],
  });

  const token = await createSession(newUser.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(201).json({ user: publicUser(newUser) });
}
