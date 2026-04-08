/**
 * POST /api/cron/expiry-emails
 *
 * Envia emails automáticos de aviso de expiração.
 * Chamar diariamente com Authorization header:
 *   curl -X POST -H "Authorization: Bearer SEU_SECRET" \
 *     https://multisync-pro-xqei.vercel.app/api/cron/expiry-emails
 *
 * Configurar em .env:
 *   CRON_SECRET=uma-string-secreta-longa
 *
 * Avisos enviados: 7 dias antes, 1 dia antes, e no dia da expiração.
 */

const crypto = require('crypto');
const { readUsers, updateUser } = require('../../../lib/auth');
const { sendEmail, emailExpiryWarning, emailExpired } = require('../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (cronSecret) {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));
      if (!valid) return res.status(401).json({ error: 'Unauthorized' });
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const users   = await readUsers();
  const now     = new Date();
  const results = [];

  for (const user of users) {
    if (user.status !== 'activo' || !user.expiresAt || !user.email) continue;

    const expiresAt  = new Date(user.expiresAt);
    const daysLeft   = Math.ceil((expiresAt - now) / 86400000);
    const emailsSent = Array.isArray(user.emailsSent) ? [...user.emailsSent] : [];
    let   dirty      = false;

    if (daysLeft <= 0) {
      const key = `expired_${expiresAt.toISOString().slice(0, 10)}`;
      if (!emailsSent.includes(key)) {
        const r = await sendEmail(emailExpired(user));
        results.push({ email: user.email, type: 'expired', ok: r.ok });
        emailsSent.push(key);
        dirty = true;
      }
    } else if (daysLeft === 7) {
      const key = `warning7_${expiresAt.toISOString().slice(0, 10)}`;
      if (!emailsSent.includes(key)) {
        const r = await sendEmail(emailExpiryWarning(user, 7));
        results.push({ email: user.email, type: 'warning7', ok: r.ok });
        emailsSent.push(key);
        dirty = true;
      }
    } else if (daysLeft === 1) {
      const key = `warning1_${expiresAt.toISOString().slice(0, 10)}`;
      if (!emailsSent.includes(key)) {
        const r = await sendEmail(emailExpiryWarning(user, 1));
        results.push({ email: user.email, type: 'warning1', ok: r.ok });
        emailsSent.push(key);
        dirty = true;
      }
    }

    if (dirty) {
      await updateUser(user.id, { emailsSent }).catch(() => {});
    }
  }

  return res.status(200).json({
    ok:      true,
    checked: users.filter(u => u.status === 'activo').length,
    sent:    results.length,
    results,
    runAt:   now.toISOString(),
  });
}
