/**
 * POST /api/proxypay/create
 * Body: { mobile, type: 'new' | 'renewal' }
 *
 * Requer sessão activa.
 * Cria uma transacção Proxypay OPG v1 e guarda-a como pendente.
 * Devolve: { transactionId, status: 'pending' }
 */

const { getSessionUser }                 = require('../../../lib/auth');
const { createTransaction, savePending } = require('../../../lib/proxypay');
const { rateLimit, getIp }               = require('../../../lib/rateLimit');

const AMOUNT_KZ = 10000;
// Telefone angolano: começa por 9, 9 dígitos
const PHONE_REGEX = /^9[0-9]{8}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limiting: 5 pagamentos por hora por IP
  const rl = rateLimit(getIp(req), { max: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ message: 'Demasiados pedidos. Aguarda um momento.' });
  }

  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Sessão inválida. Faz login primeiro.' });

  const { mobile, type = 'new' } = req.body || {};

  if (typeof mobile !== 'string') {
    return res.status(400).json({ message: 'Número de telemóvel inválido.' });
  }
  const mobileClean = mobile.replace(/\s/g, '');
  if (!PHONE_REGEX.test(mobileClean)) {
    return res.status(400).json({ message: 'Número de telemóvel inválido. Usa o formato angolano (9XX XXX XXX).' });
  }
  if (!['new', 'renewal'].includes(type)) {
    return res.status(400).json({ message: 'Tipo de pagamento inválido.' });
  }

  try {
    const tx = await createTransaction({
      mobile:   mobileClean,
      amountKz: AMOUNT_KZ,
    });

    savePending({
      transactionId: tx.id,
      userId:        user.id,
      type,
      mobile:        mobileClean,
      amount:        String(AMOUNT_KZ),
    });

    return res.status(201).json({
      transactionId: tx.id,
      status:        tx.status,
      amount:        tx.amount,
      mobile:        tx.mobile,
    });
  } catch (err) {
    console.error('[Proxypay create]', err.message);
    return res.status(502).json({ message: err.message || 'Erro ao criar pagamento Proxypay.' });
  }
}
