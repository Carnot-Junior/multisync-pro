import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-AO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function StatusBadge({ status, daysLeft, expired }) {
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>
        Expirada
      </span>
    );
  }
  if (status === 'activo') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#22d46a]/10 border border-[#22d46a]/30 text-[#22d46a] text-xs font-bold px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22d46a] inline-block animate-pulse"></span>
        Activa
      </span>
    );
  }
  if (status === 'trial') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#5b5fff]/10 border border-[#5b5fff]/30 text-[#5b5fff] text-xs font-bold px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#5b5fff] inline-block"></span>
        Trial · {daysLeft ?? 0} dias restantes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#f5c842]/10 border border-[#f5c842]/30 text-[#f5c842] text-xs font-bold px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c842] inline-block"></span>
      Pendente
    </span>
  );
}

function PayMethodLabel({ method }) {
  if (method === 'express') return <span className="text-[#ff6b35]">Express Pay Angola</span>;
  if (method === 'bank')    return <span className="text-[#5b5fff]">Referência Bancária</span>;
  return <span className="text-white/40">—</span>;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/user/me')
      .then(r => {
        if (!r.ok) throw new Error('unauth');
        return r.json();
      })
      .then(data => { setUser(data.user); setLoading(false); })
      .catch(() => router.replace('/login'));
  }, []);

  const copyKey = () => {
    if (!user?.licenseKey) return;
    navigator.clipboard.writeText(user.licenseKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#5b5fff] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  const daysLeft   = daysUntil(user.expiresAt);
  const isExpiring = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpired  = user.trialExpired || (daysLeft !== null && daysLeft < 0);
  const payments   = user.payments || [];

  return (
    <>
      <Head>
        <title>Dashboard — MultiSync Pro</title>
      </Head>

      <div className="min-h-screen bg-black text-white">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-black text-xl">
              MultiSync<span className="text-[#5b5fff]">Pro</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-white/40 text-sm hidden sm:block">{user.email}</span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-white/50 hover:text-white text-sm border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors"
              >
                {loggingOut ? 'A sair...' : 'Sair'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

          {/* ── Saudação ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Olá, {user.name.split(' ')[0]}</h1>
              <p className="text-white/40 text-sm mt-0.5">Bem-vindo ao teu painel MultiSync Pro</p>
            </div>
            <StatusBadge status={user.status} daysLeft={user.trialDaysLeft} expired={isExpired} />
          </div>

          {/* ── Banner de renovação ──────────────────────────────────────────── */}
          {(isExpiring || isExpired) && (
            <div className={`rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isExpired
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-[#ff6b35]/10 border-[#ff6b35]/20'
            }`}>
              <div>
                <p className={`font-bold text-sm ${isExpired ? 'text-red-400' : 'text-[#ff6b35]'}`}>
                  {isExpired ? 'A tua assinatura expirou' : `A tua assinatura expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {isExpired
                    ? 'Renova para continuares a usar o plugin.'
                    : 'Renova agora para não perder acesso.'}
                </p>
              </div>
              <Link
                href="/pricing"
                className={`shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors ${
                  isExpired
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-[#ff6b35] hover:bg-[#e55a27] text-white'
                }`}
              >
                Renovar assinatura
              </Link>
            </div>
          )}

          {/* ── Grid principal ───────────────────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Subscrição */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-white/40 mb-4">Subscrição</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Plano</span>
                  <span className="text-sm font-semibold">10.000 Kz / mês</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Estado</span>
                  <StatusBadge status={user.status} daysLeft={user.trialDaysLeft} expired={isExpired} />
                </div>
                {user.activatedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Activada em</span>
                    <span className="text-sm">{formatDate(user.activatedAt)}</span>
                  </div>
                )}
                {user.expiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Expira em</span>
                    <span className={`text-sm font-semibold ${isExpired ? 'text-red-400' : isExpiring ? 'text-[#ff6b35]' : 'text-white'}`}>
                      {formatDate(user.expiresAt)}
                    </span>
                  </div>
                )}
                {user.status === 'trial' && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Fim do trial</span>
                    <span className="text-sm font-semibold text-[#5b5fff]">
                      {user.trialDaysLeft ?? 0} dias restantes
                    </span>
                  </div>
                )}
              </div>

              {user.status !== 'activo' && (
                <Link
                  href="/pricing"
                  className="mt-5 block w-full text-center bg-[#5b5fff] hover:bg-[#4a4eee] text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  Activar assinatura
                </Link>
              )}
            </div>

            {/* Chave de licença */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-white/40 mb-4">Chave de licença</h2>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
                <p className="font-mono text-sm font-bold text-[#5b5fff] break-all leading-relaxed">
                  {user.licenseKey || 'MSP-XXXX-XXXX-XXXX-XXXX'}
                </p>
              </div>
              <button
                onClick={copyKey}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  keyCopied
                    ? 'bg-[#22d46a]/10 border-[#22d46a] text-[#22d46a]'
                    : 'bg-white/5 border-white/20 text-white/70 hover:text-white hover:border-white/40'
                }`}
              >
                {keyCopied ? 'Copiada!' : 'Copiar chave'}
              </button>
              <p className="text-white/30 text-xs mt-3 text-center">
                Usa esta chave para activar o plugin no Premiere Pro
              </p>
            </div>

            {/* Download */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-white/40 mb-4">Instalador</h2>
              <p className="text-white/60 text-sm mb-5 leading-relaxed">
                Descarrega o instalador para o teu sistema operativo. Inclui o plugin, FFmpeg e Python automaticamente.
              </p>
              <div className="space-y-3">
                <a
                  href="https://github.com/Carnot-Junior/multisync-pro/releases/download/v1.0.0/MultiSyncPro_Setup_v1.0.0.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full bg-[#5b5fff] hover:bg-[#4a4eee] text-white text-sm font-bold px-4 py-3 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Windows — MultiSyncPro_Setup_v1.0.0.exe
                </a>
                {/* SmartScreen notice */}
                <div className="bg-[#f5c842]/5 border border-[#f5c842]/20 rounded-xl p-3">
                  <p className="text-[#f5c842] text-xs font-semibold mb-1">⚠ Aviso do Windows SmartScreen</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Se o Windows mostrar um aviso de segurança, clica em <strong className="text-white/70">"Mais informações"</strong> e depois em <strong className="text-white/70">"Executar assim mesmo"</strong>. O instalador é seguro.
                  </p>
                </div>
                <Link
                  href="/download"
                  className="block text-center text-white/40 hover:text-white text-xs transition-colors"
                >
                  Ver todas as versões e instruções
                </Link>
              </div>
            </div>

            {/* Conta */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-white/40 mb-4">Conta</h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Nome</span>
                  <span className="text-sm">{user.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Email</span>
                  <span className="text-sm text-white/80">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Telefone</span>
                  <span className="text-sm">{user.phone || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Membro desde</span>
                  <span className="text-sm">{formatDate(user.createdAt)}</span>
                </div>
              </div>
              <a
                href="https://wa.me/244927575533"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Suporte via WhatsApp
              </a>
            </div>
          </div>

          {/* ── Histórico de pagamentos ──────────────────────────────────────── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xs uppercase tracking-wider text-white/40 mb-5">Histórico de pagamentos</h2>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">
                {user.status === 'trial' || user.status === 'pendente'
                  ? 'Ainda não efectuaste nenhum pagamento.'
                  : 'Sem registos de pagamento.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/40 text-xs uppercase tracking-wider pb-3 font-medium">Data</th>
                      <th className="text-left text-white/40 text-xs uppercase tracking-wider pb-3 font-medium">Método</th>
                      <th className="text-left text-white/40 text-xs uppercase tracking-wider pb-3 font-medium">Referência</th>
                      <th className="text-right text-white/40 text-xs uppercase tracking-wider pb-3 font-medium">Valor</th>
                      <th className="text-right text-white/40 text-xs uppercase tracking-wider pb-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td className="py-3 text-white/70">{formatDate(p.date)}</td>
                        <td className="py-3"><PayMethodLabel method={p.method} /></td>
                        <td className="py-3 font-mono text-white/50 text-xs">{p.ref}</td>
                        <td className="py-3 text-right font-semibold">{p.amount}</td>
                        <td className="py-3 text-right">
                          <span className="bg-[#22d46a]/10 border border-[#22d46a]/20 text-[#22d46a] text-xs px-2 py-0.5 rounded-full">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
