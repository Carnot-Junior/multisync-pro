/**
 * GET /api/cron/expiry-emails?secret=<CRON_SECRET>
 *
 * Envia emails automáticos de aviso de expiração.
 * Chamar diariamente com um cron job:
 *   curl "https://multisyncpro.com/api/cron/expiry-emails?secret=SEU_SECRET"
 *
 * Configurar em .env:
 *   CRON_SECRET=uma-string-secreta-longa
 *
 * Em produção usar Vercel Cron, GitHub Actions ou crontab.
 * Avisos enviados: 7 dias antes, 1 dia antes, e no dia da expiração.
 */

const { readUsers, writeUsers } = require('../../../../lib/auth');
const { sendEmail, emailExpiryWarning, emailExpired } = require('../../../../lib/email');

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  // Protecção por secret
  const secret = req.query.secret || req.body?.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users  = readUsers();
  const now    = new Date();
  const results = [];
  let   dirty  = false;

  for (let idx = 0; idx < users.length; idx++) {
    const user = users[idx];

    // Só processar utilizadores activos com email e data de expiração
    if (user.status !== 'activo' || !user.expiresAt || !user.email) continue;

    const expiresAt = new Date(user.expiresAt);
    const daysLeft  = Math.ceil((expiresAt - now) / 86400000);

    // Inicializar array de emails enviados
    if (!Array.isArray(users[idx].emailsSent)) users[idx].emailsSent = [];

    // ── Expirado hoje (daysLeft ≤ 0) ──────────────────────────────────────────
    if (daysLeft <= 0) {
      const key = `expired_${expiresAt.toISOString().slice(0, 10)}`;
      if (!users[idx].emailsSent.includes(key)) {
        const r = await sendEmail(emailExpired(user));
        results.push({ email: user.email, type: 'expired', ok: r.ok });
        users[idx].emailsSent.push(key);
        dirty = true;
      }
      continue;
    }

    // ── 7 dias antes ──────────────────────────────────────────────────────────
    if (daysLeft === 7) {
      const key = `warning7_${expiresAt.toISOString().slice(0, 10)}`;
      if (!users[idx].emailsSent.includes(key)) {
        const r = await sendEmail(emailExpiryWarning(user, 7));
        results.push({ email: user.email, type: 'warning7', ok: r.ok });
        users[idx].emailsSent.push(key);
        dirty = true;
      }
    }

    // ── 1 dia antes ───────────────────────────────────────────────────────────
    if (daysLeft === 1) {
      const key = `warning1_${expiresAt.toISOString().slice(0, 10)}`;
      if (!users[idx].emailsSent.includes(key)) {
        const r = await sendEmail(emailExpiryWarning(user, 1));
        results.push({ email: user.email, type: 'warning1', ok: r.ok });
        users[idx].emailsSent.push(key);
        dirty = true;
      }
    }
  }

  if (dirty) writeUsers(users);

  return res.status(200).json({
    ok:       true,
    checked:  users.filter(u => u.status === 'activo').length,
    sent:     results.length,
    results,
    runAt:    now.toISOString(),
  });
}
