/**
 * POST /api/proxypay/confirm
 * Body: { transactionId }
 *
 * Chamado pelo FRONTEND quando o polling detecta status='accepted'.
 * Verifica o estado real na Proxypay (anti-fraude) e activa a licença.
 *
 * Requer sessão activa.
 * Devolve: { licenseKey, expiresAt, userName }
 */

const { getSessionUser, readUsers, writeUsers, publicUser } = require('../../../lib/auth');
const { getTransaction, getPending, updatePending }         = require('../../../lib/proxypay');
const { sendEmail, emailWelcome }                           = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getSessionUser(req);
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
  const pending = getPending(transactionId);
  if (!pending) {
    return res.status(404).json({ message: 'Transacção não encontrada no sistema.' });
  }
  if (pending.userId !== user.id) {
    return res.status(403).json({ message: 'Transacção não pertence a esta conta.' });
  }
  if (pending.status === 'activated') {
    // Já foi activado (dupla chamada) — devolver dados actuais
    const users = readUsers();
    const u = users.find(x => x.id === user.id);
    return res.status(200).json({ licenseKey: u?.licenseKey, expiresAt: u?.expiresAt, alreadyActivated: true });
  }

  // ── 3. Activar ou renovar licença ─────────────────────────────────────────
  const now    = new Date();
  const users  = readUsers();
  const idx    = users.findIndex(u => u.id === user.id);
  if (idx === -1) return res.status(404).json({ message: 'Utilizador não encontrado.' });

  const paymentRecord = {
    date:   now.toISOString(),
    method: 'proxypay',
    ref:    transactionId,
    mobile: tx.mobile,
    amount: '10.000 Kz',
    status: 'confirmado',
    type:   pending.type,
  };

  const existingPayments = Array.isArray(users[idx].payments) ? users[idx].payments : [];

  let newExpiresAt;
  if (pending.type === 'renewal') {
    // Extensão: max(agora, expiração actual) + 30 dias
    const base = users[idx].expiresAt && new Date(users[idx].expiresAt) > now
      ? new Date(users[idx].expiresAt)
      : now;
    newExpiresAt = new Date(base);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  } else {
    // Nova activação: agora + 30 dias
    newExpiresAt = new Date(now);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
  }

  users[idx] = {
    ...users[idx],
    status:      'activo',
    expiresAt:   newExpiresAt.toISOString(),
    activatedAt: users[idx].activatedAt || now.toISOString(),
    renewedAt:   pending.type === 'renewal' ? now.toISOString() : users[idx].renewedAt,
    payments:    [...existingPayments, paymentRecord],
    updatedAt:   now.toISOString(),
  };

  writeUsers(users);
  updatePending(transactionId, { status: 'activated', activatedAt: now.toISOString() });

  // Email de confirmação (não bloqueia resposta)
  sendEmail(emailWelcome(users[idx])).catch(() => {});

  return res.status(200).json({
    licenseKey: users[idx].licenseKey,
    expiresAt:  newExpiresAt.toISOString(),
    userName:   users[idx].name,
  });
}
