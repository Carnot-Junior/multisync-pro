/**
 * POST /api/payment/confirm
 * Body: { method: 'express' | 'bank', phone?: string, receipt?: string }
 *
 * Requer sessão activa (cookie msp_session).
 * Marca o utilizador como 'activo', define expiresAt (+30 dias).
 */

const { getSessionUser, updateUser, createPayment, publicUser } = require('../../../lib/auth');
const { sendEmail, emailWelcome } = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Tens de iniciar sessão antes de activar.' });

  if (user.status === 'activo') {
    return res.status(200).json({
      licenseKey:    user.licenseKey,
      expiresAt:     user.expiresAt,
      alreadyActive: true,
    });
  }

  const { method, phone, receipt } = req.body || {};

  if (!method || !['express', 'bank'].includes(method))
    return res.status(400).json({ message: 'Método de pagamento inválido.' });
  if (method === 'express' && !phone?.trim())
    return res.status(400).json({ message: 'Número de telefone necessário.' });
  if (method === 'bank' && !receipt?.trim())
    return res.status(400).json({ message: 'Número de comprovativo necessário.' });

  const now      = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const ref = method === 'bank' ? receipt.trim() : phone.trim();

  const updatedUser = await updateUser(user.id, {
    status:        'activo',
    activatedAt:   now.toISOString(),
    expiresAt:     expiresAt.toISOString(),
    paymentMethod: method,
  });

  createPayment({ userId: user.id, method, reference: ref, amount: '10000', status: 'confirmado' }).catch(() => {});
  sendEmail(emailWelcome(updatedUser)).catch(() => {});

  return res.status(200).json({
    licenseKey: updatedUser.licenseKey,
    expiresAt:  expiresAt.toISOString(),
    user:       publicUser(updatedUser),
  });
}
