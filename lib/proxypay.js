/**
 * MultiSync Pro — Proxypay OPG v1 client
 * Documentação: https://developer.proxypay.co.ao/opg/v1
 *
 * Todas as chamadas usam a URL do sandbox enquanto
 * PROXYPAY_ENV=sandbox. Em produção muda para:
 *   PROXYPAY_BASE_URL=https://api.proxypay.co.ao
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const BASE_URL = process.env.PROXYPAY_BASE_URL || 'https://api.sandbox.proxypay.co.ao';
const TOKEN    = process.env.PROXYPAY_BEARER_TOKEN;
const POS_ID   = parseInt(process.env.PROXYPAY_POS_ID || '123', 10);

// ─── Helpers de ficheiro (pending payments) ───────────────────────────────────

const IS_PROD    = process.env.NODE_ENV === 'production';
const DATA_DIR   = IS_PROD ? '/tmp/msp-data' : path.join(process.cwd(), 'data');
const PENDING_FILE = path.join(DATA_DIR, 'pending-payments.json');

function readPending() {
  try {
    if (!fs.existsSync(PENDING_FILE)) return {};
    return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  } catch (_) { return {}; }
}

function writePending(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
  } catch (_) {}
}

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
  const secret         = process.env.PROXYPAY_WEBHOOK_SECRET || '';
  const cb             = callbackUrl || `${siteUrl}/api/proxypay/callback?secret=${secret}`;

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

// ─── C. Guardar pagamento pendente ────────────────────────────────────────────

function savePending({ transactionId, userId, type, mobile, amount }) {
  const pending = readPending();
  pending[transactionId] = {
    userId,
    type,    // 'new' | 'renewal'
    mobile,
    amount,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };
  writePending(pending);
}

function getPending(transactionId) {
  const pending = readPending();
  return pending[transactionId] || null;
}

function updatePending(transactionId, updates) {
  const pending = readPending();
  if (pending[transactionId]) {
    pending[transactionId] = { ...pending[transactionId], ...updates };
    writePending(pending);
  }
}

// ─── D. Verificar assinatura do webhook ──────────────────────────────────────
// Proxypay assina com HMAC-SHA256 usando o bearer token como secret.
// Nós também verificamos o query-param ?secret= como camada extra.

function verifyWebhookSecret(querySecret) {
  const expected = process.env.PROXYPAY_WEBHOOK_SECRET || '';
  if (!expected) return true; // sem secret configurado → aceitar
  return querySecret === expected;
}

module.exports = {
  createTransaction,
  getTransaction,
  savePending,
  getPending,
  updatePending,
  verifyWebhookSecret,
};
