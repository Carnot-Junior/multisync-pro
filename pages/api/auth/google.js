/**
 * POST /api/auth/google
 * Body: { credential } — Google ID token (JWT) do botão Google
 *
 * Verifica o token com a API do Google, encontra ou cria o utilizador,
 * e cria uma sessão normal (cookie msp_session).
 */

const {
  findUserByEmail,
  createUser,
  generateLicenseKey,
  createSession,
  publicUser,
  sessionCookie,
} = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ message: 'Token Google em falta.' });

  // Verificar o token com a API do Google
  let googleUser;
  try {
    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    googleUser = await r.json();
    if (!r.ok || googleUser.error) throw new Error(googleUser.error || 'Token inválido');
  } catch (err) {
    return res.status(401).json({ message: 'Token Google inválido.' });
  }

  // Verificar que o token é para a nossa app
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (clientId && googleUser.aud !== clientId) {
    return res.status(401).json({ message: 'Token Google não autorizado.' });
  }

  const { email, name, sub: googleId } = googleUser;
  if (!email) return res.status(400).json({ message: 'Email não disponível.' });

  // Encontrar ou criar utilizador
  let user = await findUserByEmail(email);

  if (!user) {
    // Novo utilizador via Google — criar conta trial
    const now = new Date();
    const trialEnds = new Date(now);
    trialEnds.setDate(trialEnds.getDate() + 14);

    user = await createUser({
      name:           name || email.split('@')[0],
      email:          email.toLowerCase(),
      phone:          '',
      passwordHash:   `google:${googleId}`,
      licenseKey:     generateLicenseKey(),
      status:         'trial',
      trialExpiresAt: trialEnds.toISOString(),
      devices:        [],
    });
  }

  const token = await createSession(user.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ user: publicUser(user) });
}
