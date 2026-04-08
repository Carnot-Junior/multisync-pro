/**
 * POST /api/payment/renew
 * Body: { method: 'express' | 'bank', phone?: string, receipt?: string }
 *
 * Requer sessão activa.
 * Renova a licença por mais 30 dias a partir da expiração actual.
 */

const { getSessionUser, updateUser, createPayment, publicUser } = require('../../../lib/auth');
const { sendEmail, emailWelcome } = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Tens de iniciar sessão antes de renovar.' });

  const { method, phone, receipt } = req.body || {};

  if (!method || !['express', 'bank'].includes(method))
    return res.status(400).json({ message: 'Método de pagamento inválido.' });
  if (method === 'express' && !phone?.trim())
    return res.status(400).json({ message: 'Número de telefone necessário.' });
  if (method === 'bank' && !receipt?.trim())
    return res.status(400).json({ message: 'Número de comprovativo necessário.' });

  const now           = new Date();
  const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : now;
  const base          = currentExpiry > now ? currentExpiry : now;
  const newExpiry     = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + 30);
  const ref = method === 'bank' ? receipt.trim() : phone.trim();

  const updatedUser = await updateUser(user.id, {
    status:    'activo',
    expiresAt: newExpiry.toISOString(),
  });

  createPayment({ userId: user.id, method, reference: ref, amount: '10000', status: 'confirmado' }).catch(() => {});
  sendEmail(emailWelcome(updatedUser)).catch(() => {});

  return res.status(200).json({
    licenseKey: updatedUser.licenseKey,
    expiresAt:  newExpiry.toISOString(),
    user:       publicUser(updatedUser),
  });
}
