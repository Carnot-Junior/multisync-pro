/**
 * POST /api/proxypay/confirm
 * Body: { transactionId }
 *
 * Chamado pelo frontend quando o polling detecta status='accepted'.
 * Verifica o estado real na Proxypay (anti-fraude) e activa a licença.
 *
 * Requer sessão activa.
 */

const { getSessionUser, updateUser, createPayment, publicUser } = require('../../../lib/auth');
const { getTransaction, getPending, updatePending }             = require('../../../lib/proxypay');
const { sendEmail, emailWelcome }                               = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Sessão inválida.' });

  const { transactionId } = req.body || {};
  if (!transactionId) return res.status(400).json({ message: 'transactionId em falta.' });

  // ── 1. Verificar estado real na Proxypay ──────────────────────────────────
  let tx;
  try {
    tx = await getTransaction(transactionId);
  } catch (err) {
    return res.status(502).json({ message: 'Não foi possível verificar o pagamento: ' + err.message });
  }

  if (tx.status !== 'accepted') {
    return res.status(402).json({
      message: tx.status === 'rejected'
        ? `Pagamento rejeitado (${tx.status_reason || 'sem motivo'}).`
        : 'Pagamento ainda pendente. Aguarda a confirmação no telemóvel.',
      status: tx.status,
    });
  }

  // ── 2. Verificar que este transactionId pertence a este utilizador ────────
  const pending = await getPending(transactionId);
  if (!pending) {
    return res.status(404).json({ message: 'Transacção não encontrada no sistema.' });
  }
  if (pending.userId !== user.id) {
    return res.status(403).json({ message: 'Transacção não pertence a esta conta.' });
  }
  if (pending.status === 'activated') {
    return res.status(200).json({
      licenseKey:       user.licenseKey,
      expiresAt:        user.expiresAt,
      alreadyActivated: true,
    });
  }

  // ── 3. Activar ou renovar licença ─────────────────────────────────────────
  const now = new Date();
  let newExpiresAt;

  if (pending.type === 'renewal') {
    const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    newExpiresAt = new Date(base);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  } else {
    newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  }

  const updatedUser = await updateUser(user.id, {
    status:      'activo',
    expiresAt:   newExpiresAt.toISOString(),
    activatedAt: user.activatedAt || now.toISOString(),
  });

  await createPayment({
    userId:     user.id,
    method:     'proxypay',
    reference:  transactionId,
    proxypayId: transactionId,
    amount:     '10000',
    status:     'confirmado',
  }).catch(() => {});

  await updatePending(transactionId, { status: 'activated' });

  sendEmail(emailWelcome(updatedUser)).catch(() => {});

  return res.status(200).json({
    licenseKey: updatedUser.licenseKey,
    expiresAt:  newExpiresAt.toISOString(),
    userName:   updatedUser.name,
  });
}
