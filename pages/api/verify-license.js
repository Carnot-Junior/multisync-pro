/**
 * POST /api/verify-license
 * Body: { licenseKey, deviceId }
 *
 * Público — não requer sessão.
 * Verifica se a licença existe, está activa e não expirou.
 * Regista o deviceId no perfil do utilizador.
 * Retorna: { valid, expiresAt, userName, daysLeft, renewUrl }
 */

const { readUsers, writeUsers } = require('../../../lib/auth');

const TRIAL_DAYS = 14;

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { licenseKey, deviceId } = req.body || {};

  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length < 8) {
    return res.status(200).json({ valid: false, error: 'Chave de licença inválida.' });
  }

  const key   = licenseKey.trim().toUpperCase();
  const users = readUsers();
  const user  = users.find(u => u.licenseKey && u.licenseKey.toUpperCase() === key);

  if (!user) {
    return res.status(200).json({ valid: false, error: 'Chave não encontrada. Verifica e tenta novamente.' });
  }

  const now = new Date();

  // ─── Trial ──────────────────────────────────────────────────────────────────
  if (user.status === 'trial') {
    const trialEnd = user.trialExpiresAt
      ? new Date(user.trialExpiresAt)
      : (() => {
          const d = new Date(user.createdAt || user.trialStartDate || now);
          d.setDate(d.getDate() + TRIAL_DAYS);
          return d;
        })();

    if (trialEnd < now) {
      return res.status(200).json({
        valid:    false,
        expired:  true,
        error:    'Período de trial expirado. Adquire uma licença completa.',
        userName: user.name,
      });
    }

    const daysLeft = Math.ceil((trialEnd - now) / 86400000);
    return res.status(200).json({
      valid:     true,
      trial:     true,
      daysLeft,
      expiresAt: trialEnd.toISOString(),
      userName:  user.name,
      renewUrl:  'https://multisyncpro.com/pricing',
    });
  }

  // ─── Activo ──────────────────────────────────────────────────────────────────
  if (user.status === 'activo') {
    if (!user.expiresAt) {
      return res.status(200).json({ valid: false, error: 'Licença sem data de validade. Contacta o suporte.' });
    }

    const expiresAt = new Date(user.expiresAt);
    const expired   = expiresAt < now;
    const daysLeft  = Math.ceil((expiresAt - now) / 86400000);

    if (expired) {
      return res.status(200).json({
        valid:     false,
        expired:   true,
        error:     `Licença expirada em ${expiresAt.toLocaleDateString('pt-PT')}.`,
        expiresAt: user.expiresAt,
        userName:  user.name,
        renewUrl:  'https://multisyncpro.com/renew',
      });
    }

    // Registar deviceId (max 5 dispositivos)
    if (deviceId && typeof deviceId === 'string') {
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        const devices = Array.isArray(users[idx].devices) ? users[idx].devices : [];
        if (!devices.includes(deviceId)) {
          if (devices.length >= 5) devices.shift(); // remove mais antigo
          devices.push(deviceId);
        }
        users[idx].devices        = devices;
        users[idx].lastVerifiedAt = now.toISOString();
        writeUsers(users);
      }
    }

    return res.status(200).json({
      valid:     true,
      daysLeft,
      expiresAt: user.expiresAt,
      userName:  user.name,
      renewUrl:  'https://multisyncpro.com/renew',
    });
  }

  // ─── Pendente ou outro estado ────────────────────────────────────────────────
  return res.status(200).json({
    valid: false,
    error: 'Licença não activa. Efectua o pagamento em multisyncpro.com/pricing.',
  });
}
