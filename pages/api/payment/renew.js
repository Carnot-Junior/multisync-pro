/**
 * POST /api/payment/renew
 * Body: { method: 'express' | 'bank', phone?: string, receipt?: string }
 *
 * Requer sessão activa.
 * Renova a licença por mais 30 dias a partir da expiração actual (ou de agora
 * se já expirou), independentemente do status actual do utilizador.
 */

const { getSessionUser, readUsers, writeUsers, publicUser } = require('../../../lib/auth');
const { sendEmail, emailWelcome } = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Tens de iniciar sessão antes de renovar.' });
  }

  const { method, phone, receipt } = req.body || {};

  if (!method || !['express', 'bank'].includes(method)) {
    return res.status(400).json({ message: 'Método de pagamento inválido.' });
  }
  if (method === 'express' && !phone?.trim()) {
    return res.status(400).json({ message: 'Número de telefone necessário.' });
  }
  if (method === 'bank' && !receipt?.trim()) {
    return res.status(400).json({ message: 'Número de comprovativo necessário.' });
  }

  const now = new Date();

  // Ponto de partida: max(agora, expiração actual) para não perder dias restantes
  const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : now;
  const base    = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + 30);

  const users = readUsers();
  const idx   = users.findIndex(u => u.id === user.id);
  if (idx === -1) return res.status(404).json({ message: 'Utilizador não encontrado.' });

  const paymentRecord = {
    date:   now.toISOString(),
    method,
    ref:    method === 'bank' ? receipt.trim() : phone.trim(),
    amount: '10.000 Kz',
    status: 'confirmado',
    type:   'renewal',
  };

  const existingPayments = Array.isArray(users[idx].payments) ? users[idx].payments : [];

  users[idx] = {
    ...users[idx],
    status:    'activo',
    expiresAt: newExpiry.toISOString(),
    renewedAt: now.toISOString(),
    payments:  [...existingPayments, paymentRecord],
    updatedAt: now.toISOString(),
  };

  writeUsers(users);

  // Enviar email de confirmação (não bloqueia a resposta)
  sendEmail(emailWelcome(users[idx])).catch(() => {});

  return res.status(200).json({
    licenseKey: users[idx].licenseKey,
    expiresAt:  newExpiry.toISOString(),
    user:       publicUser(users[idx]),
  });
}
