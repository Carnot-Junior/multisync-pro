/**
 * POST /api/proxypay/callback
 *
 * Webhook assíncrono da Proxypay — chamado quando o estado muda.
 * NÃO requer sessão (é chamado pelo servidor da Proxypay).
 */

const { updateUser, createPayment }           = require('../../../lib/auth');
const { getPending, updatePending,
        verifyWebhookSecret }                 = require('../../../lib/proxypay');
const { sendEmail, emailWelcome }             = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!verifyWebhookSecret(req)) {
    console.warn('[Proxypay callback] Secret inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const { id: transactionId, status, status_reason } = payload || {};

  if (!transactionId || !status) {
    return res.status(400).json({ error: 'Payload inválido.' });
  }

  console.log(`[Proxypay callback] tx=${transactionId} status=${status}`);

  if (status !== 'accepted') {
    await updatePending(transactionId, { status: status === 'rejected' ? 'rejected' : 'pending' });
    return res.status(200).json({ received: true });
  }

  const pending = await getPending(transactionId);

  if (!pending) {
    console.warn('[Proxypay callback] Transacção não encontrada:', transactionId);
    return res.status(200).json({ received: true });
  }

  if (pending.status === 'activated') {
    return res.status(200).json({ received: true, alreadyActivated: true });
  }

  const now        = new Date();
  let   newExpiresAt;

  if (pending.type === 'renewal') {
    // Precisamos saber a expiração actual — buscar o user
    const { supabase } = require('../../../lib/supabase');
    const { data: u } = await supabase.from('users').select('expires_at').eq('id', pending.userId).single();
    const base = u?.expires_at && new Date(u.expires_at) > now ? new Date(u.expires_at) : now;
    newExpiresAt = new Date(base);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  } else {
    newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  }

  const updatedUser = await updateUser(pending.userId, {
    status:      'activo',
    expiresAt:   newExpiresAt.toISOString(),
    activatedAt: now.toISOString(),
  });

  await createPayment({
    userId:     pending.userId,
    method:     'proxypay',
    reference:  transactionId,
    proxypayId: transactionId,
    amount:     pending.amount || '10000',
    status:     'confirmado',
  }).catch(() => {});

  await updatePending(transactionId, { status: 'activated' });

  sendEmail(emailWelcome(updatedUser)).catch(() => {});

  console.log(`[Proxypay callback] Licença activada: ${updatedUser.email}`);

  return res.status(200).json({ received: true, activated: true });
}
