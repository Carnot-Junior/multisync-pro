/**
 * MultiSync Pro — Email helper
 *
 * Configurar em .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=noreply@multisyncpro.com
 *   SMTP_PASS=senha-aqui
 *   SMTP_FROM=MultiSync Pro <noreply@multisyncpro.com>
 *
 * Em desenvolvimento (sem SMTP_HOST), os emails são apenas
 * impressos no terminal.
 */

const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev mode — apenas log
    console.log('\n[EMAIL DEV] ──────────────────────');
    console.log('  Para:     ', to);
    console.log('  Assunto:  ', subject);
    console.log('  Conteúdo:', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200));
    console.log('────────────────────────────────────\n');
    return { ok: true, dev: true };
  }

  try {
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || 'MultiSync Pro <noreply@multisyncpro.com>',
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function _base(content) {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:24px;background:#0a0a0a;font-family:sans-serif">
      <div style="max-width:480px;margin:auto;background:#131317;border:1px solid #2e2e3e;border-radius:12px;padding:32px">
        <div style="font-size:20px;font-weight:900;background:linear-gradient(90deg,#5b5fff,#ff4da6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px">
          MultiSync Pro
        </div>
        <div style="font-size:12px;color:#606078;margin-bottom:28px">Plugin para Adobe Premiere Pro</div>
        ${content}
        <div style="border-top:1px solid #2e2e3e;margin-top:28px;padding-top:16px;font-size:11px;color:#606078;line-height:1.8">
          Suporte: <a href="https://wa.me/244927575533" style="color:#5b5fff">+244 927 575 533</a> (WhatsApp)<br/>
          <a href="https://multisyncpro.com" style="color:#5b5fff">multisyncpro.com</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

function emailExpiryWarning(user, daysLeft) {
  const expiryDate = new Date(user.expiresAt).toLocaleDateString('pt-PT');
  return {
    to:      user.email,
    subject: `MultiSync Pro — A tua licença expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
    html: _base(`
      <h2 style="color:#f5c842;font-size:16px;margin:0 0 12px">
        ⚠️ Licença expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}
      </h2>
      <p style="font-size:14px;line-height:1.7;color:#a0a0b8;margin:0 0 16px">
        Olá <strong style="color:#f0f0f5">${user.name}</strong>,<br/><br/>
        A tua licença MultiSync Pro expira em <strong style="color:#f5c842">${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}</strong>
        (${expiryDate}).<br/><br/>
        Renova agora para manter acesso ininterrupto a todas as funcionalidades:
        Sincronização Multicam, Momentos Virais, Cortes e Export.
      </p>
      <a href="https://multisyncpro.com/renew" style="display:inline-block;background:#5b5fff;color:#fff;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:13px">
        Renovar Agora — 10.000 Kz/mês
      </a>
      <p style="font-size:11px;color:#606078;margin-top:16px">
        Chave de licença: <code style="background:#1a1a21;padding:2px 6px;border-radius:4px;color:#a0a0b8">${user.licenseKey}</code>
      </p>
    `),
  };
}

function emailExpired(user) {
  return {
    to:      user.email,
    subject: 'MultiSync Pro — A tua licença expirou hoje',
    html: _base(`
      <h2 style="color:#ff4455;font-size:16px;margin:0 0 12px">
        ❌ Licença expirada
      </h2>
      <p style="font-size:14px;line-height:1.7;color:#a0a0b8;margin:0 0 16px">
        Olá <strong style="color:#f0f0f5">${user.name}</strong>,<br/><br/>
        A tua licença MultiSync Pro <strong style="color:#ff4455">expirou hoje</strong>.
        O plugin foi bloqueado até à renovação.<br/><br/>
        Renova agora para recuperar o acesso imediatamente.
      </p>
      <a href="https://multisyncpro.com/renew" style="display:inline-block;background:#ff4455;color:#fff;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:13px">
        Renovar Agora
      </a>
      <p style="font-size:11px;color:#606078;margin-top:16px">
        Chave de licença: <code style="background:#1a1a21;padding:2px 6px;border-radius:4px;color:#a0a0b8">${user.licenseKey}</code>
      </p>
    `),
  };
}

function emailWelcome(user) {
  return {
    to:      user.email,
    subject: 'MultiSync Pro — Licença activada!',
    html: _base(`
      <h2 style="color:#22d46a;font-size:16px;margin:0 0 12px">
        ✓ Pagamento confirmado — Bem-vindo!
      </h2>
      <p style="font-size:14px;line-height:1.7;color:#a0a0b8;margin:0 0 16px">
        Olá <strong style="color:#f0f0f5">${user.name}</strong>,<br/><br/>
        O teu pagamento foi confirmado e a licença está activa.
        A tua chave de licença é:
      </p>
      <div style="background:#0d0d2a;border:1px solid #2d2880;border-radius:8px;padding:14px;text-align:center;margin-bottom:16px">
        <code style="font-size:14px;color:#5b5fff;letter-spacing:1px">${user.licenseKey}</code>
      </div>
      <p style="font-size:13px;color:#a0a0b8;margin:0 0 16px">
        Insere esta chave no plugin MultiSync Pro dentro do Adobe Premiere Pro
        para activar o teu acesso.<br/><br/>
        Válido até: <strong style="color:#f0f0f5">${new Date(user.expiresAt).toLocaleDateString('pt-PT')}</strong>
      </p>
      <a href="https://multisyncpro.com/download" style="display:inline-block;background:#5b5fff;color:#fff;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:13px">
        Descarregar o Plugin
      </a>
    `),
  };
}

module.exports = { sendEmail, emailExpiryWarning, emailExpired, emailWelcome };
