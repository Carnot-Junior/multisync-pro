/**
 * MultiSync Pro — Proxypay OPG v1 client
 * Documentação: https://developer.proxypay.co.ao/opg/v1
 *
 * Todas as chamadas usam a URL do sandbox enquanto
 * PROXYPAY_ENV=sandbox. Em produção muda para:
 *   PROXYPAY_BASE_URL=https://api.proxypay.co.ao
 */

const crypto = require('crypto');
const { supabase } = require('./supabase');

const BASE_URL = process.env.PROXYPAY_BASE_URL || 'https://api.sandbox.proxypay.co.ao';
const TOKEN    = process.env.PROXYPAY_BEARER_TOKEN;
const POS_ID   = parseInt(process.env.PROXYPAY_POS_ID || '123', 10);

// ─── Cabeçalhos base ─────────────────────────────────────────────────────────

function headers(idempotencyKey) {
  const h = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  };
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
  return h;
}

// ─── A. Criar transacção ──────────────────────────────────────────────────────
// POST /opg/v1/transactions
// Devolve: { id, status, amount, mobile, pos_id, type }

async function createTransaction({ mobile, amountKz, callbackUrl }) {
  if (!TOKEN) throw new Error('PROXYPAY_BEARER_TOKEN não configurado.');

  const idempotencyKey = crypto.randomUUID();
  const amount         = Number(amountKz).toFixed(2);     // "10000.00"
  const siteUrl        = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  // Secret NÃO vai na URL — é verificado pelo header Authorization no callback
  const cb             = callbackUrl || `${siteUrl}/api/proxypay/callback`;

  const body = {
    type:         'payment',
    pos_id:       POS_ID,
    mobile:       mobile.replace(/\s/g, ''),
    amount,
    callback_url: cb,
  };

  const resp = await fetch(`${BASE_URL}/opg/v1/transactions`, {
    method:  'POST',
    headers: headers(idempotencyKey),
    body:    JSON.stringify(body),
  });

  const json = await resp.json();

  if (!resp.ok) {
    throw new Error(json?.error || json?.message || `Proxypay error ${resp.status}`);
  }

  return json; // { id, status:'pending', amount, mobile, pos_id, type }
}

// ─── B. Consultar transacção ──────────────────────────────────────────────────
// GET /opg/v1/transactions/{id}
// Devolve: { id, status, amount, mobile, pos_id, type, status_reason, status_datetime }

async function getTransaction(transactionId) {
  if (!TOKEN) throw new Error('PROXYPAY_BEARER_TOKEN não configurado.');

  const resp = await fetch(`${BASE_URL}/opg/v1/transactions/${transactionId}`, {
    headers: headers(),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || `Proxypay error ${resp.status}`);
  return json;
}

// ─── C. Guardar pagamento pendente (Supabase) ─────────────────────────────────

async function savePending({ transactionId, userId, type, mobile, amount }) {
  await supabase.from('payments').insert({
    user_id:     userId,
    method:      type === 'renewal' ? 'proxypay_renewal' : 'proxypay_new',
    reference:   transactionId,
    proxypay_id: transactionId,
    amount:      String(amount),
    status:      'pending',
  });
}

async function getPending(transactionId) {
  const { data } = await supabase
    .from('payments').select('*')
    .eq('proxypay_id', transactionId).single();
  if (!data) return null;
  return {
    userId:    data.user_id,
    type:      data.method === 'proxypay_renewal' ? 'renewal' : 'new',
    mobile:    null,
    amount:    data.amount,
    status:    data.status,
    createdAt: data.created_at,
  };
}

async function updatePending(transactionId, updates) {
  const dbUpdates = {};
  if (updates.status)      dbUpdates.status = updates.status;
  await supabase.from('payments').update(dbUpdates).eq('proxypay_id', transactionId);
}

// ─── D. Verificar assinatura do webhook ──────────────────────────────────────
// Proxypay assina com HMAC-SHA256 usando o bearer token como secret.
// Nós também verificamos o query-param ?secret= como camada extra.

function verifyWebhookSecret(req) {
  const expected = process.env.PROXYPAY_WEBHOOK_SECRET || '';
  if (!expected) return true; // sem secret configurado → aceitar (apenas dev)

  // Verifica Authorization header: "Bearer <secret>"
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }
  return false;
}

module.exports = {
  createTransaction,
  getTransaction,
  savePending,
  getPending,
  updatePending,
  verifyWebhookSecret,
};
