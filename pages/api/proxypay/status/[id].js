/**
 * GET /api/proxypay/status/[id]
 *
 * Proxy para GET /opg/v1/transactions/{id} da Proxypay.
 * Usado pelo frontend para polling do estado.
 * Requer sessão activa.
 *
 * Devolve: { status: 'pending' | 'accepted' | 'rejected', statusReason, statusDatetime }
 */

const { getSessionUser }    = require('../../../../lib/auth');
const { getTransaction }    = require('../../../../lib/proxypay');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Sessão inválida.' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'ID da transacção em falta.' });

  try {
    const tx = await getTransaction(id);

    return res.status(200).json({
      status:          tx.status,           // 'pending' | 'accepted' | 'rejected'
      statusReason:    tx.status_reason,    // 'approved' | código de rejeição
      statusDatetime:  tx.status_datetime,
      amount:          tx.amount,
      mobile:          tx.mobile,
    });
  } catch (err) {
    console.error('[Proxypay status]', err.message);
    return res.status(502).json({ message: err.message });
  }
}
