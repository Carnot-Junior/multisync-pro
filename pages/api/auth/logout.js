/**
 * POST /api/auth/logout
 * Apaga a sessão e limpa o cookie.
 */

const { getTokenFromReq, deleteSession, clearCookie } = require('../../../lib/auth');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = getTokenFromReq(req);
  if (token) deleteSession(token);

  res.setHeader('Set-Cookie', clearCookie());
  return res.status(200).json({ ok: true });
}
