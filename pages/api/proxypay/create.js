/**
 * POST /api/proxypay/create
 * Body: { mobile, type: 'new' | 'renewal' }
 *
 * Requer sessão activa.
 * Cria uma transacção Proxypay OPG v1 e guarda-a como pendente.
 * Devolve: { transactionId, status: 'pending' }
 */

const { getSessionUser }                         = require('../../../lib/auth');
const { createTransaction, savePending }         = require('../../../lib/proxypay');

const AMOUNT_KZ = 10000; // 10.000 Kz

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Sessão inválida. Faz login primeiro.' });

  const { mobile, type = 'new' } = req.body || {};

  if (!mobile || mobile.replace(/\s/g, '').length < 9) {
    return res.status(400).json({ message: 'Número de telemóvel inválido.' });
  }
  if (!['new', 'renewal'].includes(type)) {
    return res.status(400).json({ message: 'Tipo de pagamento inválido.' });
  }

  try {
    const tx = await createTransaction({
      mobile:    mobile.replace(/\s/g, ''),
      amountKz:  AMOUNT_KZ,
    });

    // Guardar pendente para activar quando o callback chegar
    savePending({
      transactionId: tx.id,
      userId:        user.id,
      type,
      mobile:        mobile.replace(/\s/g, ''),
      amount:        String(AMOUNT_KZ),
    });

    return res.status(201).json({
      transactionId: tx.id,
      status:        tx.status, // 'pending'
      amount:        tx.amount,
      mobile:        tx.mobile,
    });
  } catch (err) {
    console.error('[Proxypay create]', err.message);
    return res.status(502).json({ message: err.message || 'Erro ao criar pagamento Proxypay.' });
  }
}
