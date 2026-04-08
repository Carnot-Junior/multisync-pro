/**
 * POST /api/payment/confirm
 * Body: { method: 'express' | 'bank', phone?: string, receipt?: string }
 *
 * Requer sessão activa (cookie msp_session).
 * Marca o utilizador como 'activo', define expiresAt (+30 dias),
 * e devolve a licenseKey gerada no registo.
 *
 * NOTA: A confirmação é simulada para testes.
 * Em produção: verificar com Express Pay API ou validar comprovativo manualmente.
 */

const { getSessionUser, readUsers, writeUsers, publicUser } = require('../../../lib/auth');
const { sendEmail, emailWelcome } = require('../../../lib/email');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Tens de iniciar sessão antes de activar.' });
  }

  // Se já está activo, devolve a chave existente sem alterar nada
  if (user.status === 'activo') {
    return res.status(200).json({
      licenseKey: user.licenseKey,
      expiresAt: user.expiresAt,
      alreadyActive: true,
    });
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
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30); // licença válida 30 dias

  const users = readUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) return res.status(404).json({ message: 'Utilizador não encontrado.' });

  const paymentRecord = {
    date:   now.toISOString(),
    method,
    ref:    method === 'bank' ? receipt.trim() : phone.trim(),
    amount: '10.000 Kz',
    status: 'confirmado',
  };

  const existingPayments = Array.isArray(users[idx].payments) ? users[idx].payments : [];

  users[idx] = {
    ...users[idx],
    status: 'activo',
    activatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    paymentMethod: method,
    paymentRef: method === 'bank' ? receipt.trim() : phone.trim(),
    payments: [...existingPayments, paymentRecord],
    updatedAt: now.toISOString(),
  };

  writeUsers(users);

  // Email de confirmação de activação
  sendEmail(emailWelcome(users[idx])).catch(() => {});

  return res.status(200).json({
    licenseKey: users[idx].licenseKey,
    expiresAt: expiresAt.toISOString(),
    user: publicUser(users[idx]),
  });
}
