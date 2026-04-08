/**
 * Rate limiter em memória simples.
 * Funciona por instância Lambda — suficiente para protecção básica.
 * Para produção de alta escala usar Upstash Redis.
 */

const store = new Map(); // IP → { count, resetAt }

/**
 * Verifica se o IP excedeu o limite.
 * @param {string} ip
 * @param {object} opts
 * @param {number} opts.max      — máximo de pedidos
 * @param {number} opts.windowMs — janela de tempo em ms
 * @returns {{ ok: boolean, remaining: number, retryAfter: number }}
 */
function rateLimit(ip, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: max - entry.count, retryAfter: 0 };
}

/**
 * Obtém o IP real do pedido (Vercel usa x-forwarded-for).
 */
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  );
}

module.exports = { rateLimit, getIp };
