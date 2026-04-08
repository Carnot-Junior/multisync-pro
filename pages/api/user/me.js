/**
 * GET /api/user/me
 * Devolve o utilizador da sessão actual.
 * Usado pelo dashboard para carregar dados.
 */

const { getSessionUser, publicUser } = require('../../../lib/auth');

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Não autenticado.' });

  return res.status(200).json({ user: publicUser(user) });
}
