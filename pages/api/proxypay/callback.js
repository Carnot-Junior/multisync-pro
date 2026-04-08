/**
 * POST /api/proxypay/callback?secret=<PROXYPAY_WEBHOOK_SECRET>
 *
 * Webhook assíncrono da Proxypay — chamado quando o estado muda.
 * NÃO requer sessão (é chamado pelo servidor da Proxypay).
 *
 * Payload: { id, status, amount, mobile, pos_id, type,
 *            status_reason, status_datetime, parent_transaction_id }
 *
 * NOTA SANDBOX: Em localhost a Proxypay não consegue chamar este endpoint.
 * Para testar localmente usa ngrok:
 *   ngrok http 3000
 * e actualiza NEXT_PUBLIC_SITE_URL com o URL público do ngrok.
 */

const { readUsers, writeUsers }             = require('../../../lib/auth');
const { getPending, updatePending,
        verifyWebhookSecret }               = require('../../../lib/proxypay');
const { sendEmail, emailWelcome }           = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Verificar secret no query param ──────────────────────────────────────
  const { secret } = req.query;
  if (!verifyWebhookSecret(secret)) {
    console.warn('[Proxypay callback] Secret inválido:', secret);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const { id: transactionId, status, status_reason } = payload || {};

  if (!transactionId || !status) {
    return res.status(400).json({ error: 'Payload inválido.' });
  }

  console.log(`[Proxypay callback] tx=${transactionId} status=${status}`);

  // Só processar se aceite
  if (status !== 'accepted') {
    updatePending(transactionId, { status: status === 'rejected' ? 'rejected' : 'pending', statusReason: status_reason });
    return res.status(200).json({ received: true });
  }

  // ── Activar licença ───────────────────────────────────────────────────────
  const pending = getPending(transactionId);

  if (!pending) {
    console.warn('[Proxypay callback] Transacção não encontrada:', transactionId);
    return res.status(200).json({ received: true }); // 200 para Proxypay não reenviar
  }

  if (pending.status === 'activated') {
    return res.status(200).json({ received: true, alreadyActivated: true });
  }

  const now   = new Date();
  const users = readUsers();
  const idx   = users.findIndex(u => u.id === pending.userId);

  if (idx === -1) {
    console.error('[Proxypay callback] Utilizador não encontrado:', pending.userId);
    return res.status(200).json({ received: true });
  }

  const paymentRecord = {
    date:   now.toISOString(),
    method: 'proxypay',
    ref:    transactionId,
    mobile: payload.mobile,
    amount: '10.000 Kz',
    status: 'confirmado',
    type:   pending.type,
  };

  const existingPayments = Array.isArray(users[idx].payments) ? users[idx].payments : [];

  let newExpiresAt;
  if (pending.type === 'renewal') {
    const base = users[idx].expiresAt && new Date(users[idx].expiresAt) > now
      ? new Date(users[idx].expiresAt)
      : now;
    newExpiresAt = new Date(base);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  } else {
    newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  }

  users[idx] = {
    ...users[idx],
    status:      'activo',
    expiresAt:   newExpiresAt.toISOString(),
    activatedAt: users[idx].activatedAt || now.toISOString(),
    payments:    [...existingPayments, paymentRecord],
    updatedAt:   now.toISOString(),
  };

  writeUsers(users);
  updatePending(transactionId, { status: 'activated', activatedAt: now.toISOString() });

  // Email de confirmação
  sendEmail(emailWelcome(users[idx])).catch(() => {});

  console.log(`[Proxypay callback] Licença activada: ${users[idx].email}`);

  // Proxypay precisa de HTTP 200 para não reenviar
  return res.status(200).json({ received: true, activated: true });
}
