/**
 * POST /api/verify-license
 * Body: { licenseKey, deviceId }
 */

const { findUserByLicenseKey, updateUser } = require('../../lib/auth');
const { rateLimit, getIp }                 = require('../../lib/rateLimit');

const TRIAL_DAYS = 14;
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL || 'https://multisync-pro-xqei.vercel.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const rl = rateLimit(getIp(req), { max: 30, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ valid: false, error: 'Demasiados pedidos.' });
  }

  const { licenseKey, deviceId } = req.body || {};

  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length < 8) {
    return res.status(200).json({ valid: false, error: 'Chave de licença inválida.' });
  }

  const key  = licenseKey.trim().toUpperCase();
  const user = await findUserByLicenseKey(key);

  if (!user) {
    return res.status(200).json({ valid: false, error: 'Chave inválida ou não encontrada.' });
  }

  const now = new Date();

  // ─── Trial ────────────────────────────────────────────────────────────────
  if (user.status === 'trial') {
    const trialEnd = user.trialExpiresAt
      ? new Date(user.trialExpiresAt)
      : (() => {
          const d = new Date(user.createdAt || now);
          d.setDate(d.getDate() + TRIAL_DAYS);
          return d;
        })();

    if (trialEnd < now) {
      return res.status(200).json({
        valid: false, expired: true,
        error: 'Período de trial expirado.',
        userName: user.name,
        renewUrl: `${SITE_URL}/pricing`,
      });
    }

    return res.status(200).json({
      valid:     true,
      trial:     true,
      daysLeft:  Math.ceil((trialEnd - now) / 86400000),
      expiresAt: trialEnd.toISOString(),
      userName:  user.name,
      renewUrl:  `${SITE_URL}/pricing`,
    });
  }

  // ─── Activo ───────────────────────────────────────────────────────────────
  if (user.status === 'activo') {
    if (!user.expiresAt) {
      return res.status(200).json({ valid: false, error: 'Licença sem data de validade. Contacta o suporte.' });
    }

    const expiresAt = new Date(user.expiresAt);
    if (expiresAt < now) {
      return res.status(200).json({
        valid: false, expired: true,
        error: 'Licença expirada.',
        expiresAt: user.expiresAt,
        userName: user.name,
        renewUrl: `${SITE_URL}/renew`,
      });
    }

    // Registar deviceId (max 5 dispositivos)
    if (deviceId && typeof deviceId === 'string' && deviceId.length <= 128) {
      const devices = Array.isArray(user.devices) ? [...user.devices] : [];
      if (!devices.includes(deviceId)) {
        if (devices.length >= 5) devices.shift();
        devices.push(deviceId);
      }
      await updateUser(user.id, { devices, lastVerifiedAt: now.toISOString() }).catch(() => {});
    }

    return res.status(200).json({
      valid:     true,
      daysLeft:  Math.ceil((expiresAt - now) / 86400000),
      expiresAt: user.expiresAt,
      userName:  user.name,
      renewUrl:  `${SITE_URL}/renew`,
    });
  }

  return res.status(200).json({
    valid: false,
    error: 'Licença não activa.',
    renewUrl: `${SITE_URL}/pricing`,
  });
}
