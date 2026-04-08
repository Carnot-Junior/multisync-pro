import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

// ─── Ecrã de sucesso ─────────────────────────────────────────────────────────

function SuccessScreen({ licenseKey, expiresAt }) {
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard?.writeText(licenseKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-full border-2 border-[#22d46a] flex items-center justify-center mb-6 animate-[ring-pop_0.5s_ease]">
        <span className="text-4xl">✓</span>
      </div>
      <h2 className="text-2xl font-black mb-2">Renovação Confirmada!</h2>
      <p className="text-white/50 text-sm mb-2">A tua licença foi renovada com sucesso.</p>
      <p className="text-white/40 text-xs mb-6">
        Válida até <span className="text-white/70">{new Date(expiresAt).toLocaleDateString('pt-PT')}</span>
      </p>

      <div className="bg-[#0d0d2a] border border-[#2d2880] rounded-xl px-6 py-3 mb-3 w-full max-w-xs">
        <p className="text-[10px] text-white/40 mb-1">Chave de licença</p>
        <p className="font-mono text-[#5b5fff] text-sm tracking-wider">{licenseKey}</p>
      </div>

      <button
        onClick={copyKey}
        className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors mb-8 ${
          copied ? 'bg-[#22d46a]/20 text-[#22d46a]' : 'bg-white/10 hover:bg-white/15 text-white/60'
        }`}
      >
        {copied ? '✓ Copiada!' : '📋 Copiar chave'}
      </button>

      <Link
        href="/dashboard"
        className="bg-[#5b5fff] hover:bg-[#4a4eee] text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
      >
        Ver Dashboard →
      </Link>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Renew() {
  const router = useRouter();

  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [step,      setStep]      = useState('payment'); // 'payment' | 'success'
  const [result,    setResult]    = useState(null);

  // Express Pay (Proxypay)
  const [phone,         setPhone]         = useState('');
  const [exprState,     setExprState]     = useState('idle'); // 'idle'|'creating'|'polling'|'confirming'
  const [transactionId, setTransactionId] = useState('');
  const pollRef = useRef(null);

  // Bank ref state
  const [receipt,   setReceipt]   = useState('');
  const [bankBusy,  setBankBusy]  = useState(false);

  const [error,     setError]     = useState('');

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) { router.push('/login'); return; }
        setUser(d.user);
        setLoading(false);
      })
      .catch(() => { router.push('/login'); });
  }, []);

  // ── Activar licença via Proxypay ───────────────────────────────────────────
  async function activateProxypay(txId) {
    setExprState('confirming');
    try {
      const res  = await fetch('/api/proxypay/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erro ao activar licença.');
        setExprState('idle');
        return;
      }
      setResult(data);
      setStep('success');
    } catch {
      setError('Erro de rede ao activar. Tenta novamente.');
      setExprState('idle');
    }
  }

  // ── Express Pay — Proxypay OPG v1 ──────────────────────────────────────────
  async function payExpress() {
    const mobile = phone.replace(/\s/g, '');
    if (mobile.length < 9) {
      setError('Insere um número de telefone válido.');
      return;
    }
    setError('');
    setExprState('creating');

    try {
      // 1. Criar transacção
      const res  = await fetch('/api/proxypay/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mobile, type: 'renewal' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erro ao iniciar pagamento.');
        setExprState('idle');
        return;
      }

      const txId = data.transactionId;
      setTransactionId(txId);
      setExprState('polling');

      // 2. Polling a cada 3s (máx. 5 min)
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          clearInterval(pollRef.current);
          setError('Tempo limite excedido. Confirma o pagamento no telemóvel e tenta novamente.');
          setExprState('idle');
          return;
        }
        try {
          const sr   = await fetch(`/api/proxypay/status/${txId}`);
          const stat = await sr.json();
          if (stat.status === 'accepted') {
            clearInterval(pollRef.current);
            await activateProxypay(txId);
          } else if (stat.status === 'rejected') {
            clearInterval(pollRef.current);
            setError(`Pagamento rejeitado (${stat.statusReason || 'sem motivo'}). Tenta novamente.`);
            setExprState('idle');
          }
        } catch (_) {}
      }, 3000);

    } catch {
      setError('Erro de ligação. Verifica a tua internet.');
      setExprState('idle');
    }
  }

  // ── Bank reference ──────────────────────────────────────────────────────────
  async function activateBank() {
    if (receipt.trim().length < 6) {
      setError('Insere o número do comprovativo.');
      return;
    }
    setError('');
    setBankBusy(true);

    // Simula validação (1.5 s)
    await new Promise(r => setTimeout(r, 1500));

    try {
      const res  = await fetch('/api/payment/renew', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'bank', receipt: receipt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erro ao confirmar pagamento.');
      } else if (data.licenseKey) {
        setResult(data);
        setStep('success');
      } else {
        setError(data.message || 'Erro ao confirmar pagamento.');
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.');
    } finally {
      setBankBusy(false);
    }
  }

  function formatPhone(val) {
    let v = val.replace(/\D/g, '');
    if (v.length > 9) v = v.slice(0, 9);
    if (v.length > 6) v = v.slice(0, 3) + ' ' + v.slice(3, 6) + ' ' + v.slice(6);
    else if (v.length > 3) v = v.slice(0, 3) + ' ' + v.slice(3);
    setPhone(v);
  }

  function copyRef() {
    navigator.clipboard?.writeText('Entidade: 99999 | Referência: 742 851 963 | Valor: 10.000 Kz').catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5b5fff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expiresAt   = user.expiresAt ? new Date(user.expiresAt) : null;
  const daysLeft    = expiresAt ? Math.ceil((expiresAt - Date.now()) / 86400000) : null;
  const isExpired   = expiresAt && expiresAt < new Date();
  const isWarning   = !isExpired && daysLeft !== null && daysLeft <= 7;

  return (
    <>
      <Head>
        <title>Renovar Licença — MultiSync Pro</title>
      </Head>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-tight">
            MultiSync<span className="text-[#5b5fff]">Pro</span>
          </Link>
          <Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="min-h-screen bg-black text-white pt-24 pb-20">
        <div className="max-w-lg mx-auto px-6">

          {step === 'success' && result ? (
            <SuccessScreen licenseKey={result.licenseKey} expiresAt={result.expiresAt} />
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-block bg-[#5b5fff]/10 border border-[#5b5fff]/30 text-[#5b5fff] text-xs font-semibold px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest">
                  Renovação
                </div>
                <h1 className="text-3xl font-black mb-3">Renovar Licença</h1>
                <p className="text-white/50 text-sm">
                  Olá <span className="text-white">{user.name}</span>
                </p>
              </div>

              {/* Status actual */}
              {expiresAt && (
                <div className={`rounded-xl p-4 mb-6 border ${
                  isExpired
                    ? 'bg-[#ff4455]/10 border-[#ff4455]/30'
                    : isWarning
                    ? 'bg-[#f5c842]/10 border-[#f5c842]/30'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <p className={`text-xs font-semibold mb-1 ${isExpired ? 'text-[#ff4455]' : isWarning ? 'text-[#f5c842]' : 'text-white/60'}`}>
                    {isExpired ? '❌ Licença Expirada' : isWarning ? `⚠️ Expira em ${daysLeft} dias` : '✓ Licença Activa'}
                  </p>
                  <p className="text-white/40 text-xs">
                    {isExpired
                      ? `Expirou em ${expiresAt.toLocaleDateString('pt-PT')}. Renova para recuperar o acesso.`
                      : `Válida até ${expiresAt.toLocaleDateString('pt-PT')}. A renovação adiciona 30 dias.`}
                  </p>
                </div>
              )}

              {/* Preço */}
              <div className="bg-gradient-to-br from-[#0d0f2a] to-[#1a0d2e] border border-[#3a3880] rounded-2xl p-5 text-center mb-6">
                <p className="text-white/40 text-xs mb-2">Renovação — 30 dias</p>
                <p className="text-4xl font-black">
                  <sup className="text-lg text-[#f5c842] align-super">Kz</sup>10.000
                </p>
                <p className="text-white/40 text-xs mt-1">todas as funcionalidades incluídas</p>
                <p className="text-[#22d46a] text-xs mt-3 bg-[#0d2a1a] border border-[#1a4a2a] rounded-lg px-3 py-1.5 inline-block">
                  ✓ Acesso imediato após confirmação
                </p>
              </div>

              {/* Erro global */}
              {error && (
                <div className="bg-[#ff4455]/10 border border-[#ff4455]/30 rounded-xl p-3 mb-4 text-[#ff4455] text-xs">
                  {error}
                </div>
              )}

              {/* ── MÉTODO 1 — Express Pay ── */}
              <div className="bg-white/5 border border-[#ff6b35]/30 rounded-2xl p-5 mb-4">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#ff6b35] text-black text-[8px] font-black rounded-full flex items-center justify-center flex-shrink-0">1</span>
                  Express Pay Angola
                </p>

                {(exprState === 'creating' || exprState === 'polling' || exprState === 'confirming') ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-[#22d46a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[#22d46a] text-xs">
                      {exprState === 'creating'   && '⏳ A criar pagamento...'}
                      {exprState === 'polling'    && '⏳ Aguardar confirmação no telemóvel...'}
                      {exprState === 'confirming' && '⏳ A activar licença...'}
                    </p>
                    {exprState === 'polling' && (
                      <p className="text-white/30 text-[10px] mt-1">A verificar estado do pagamento...</p>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="text-[9px] text-white/40 block mb-1.5">Número de telemóvel</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => formatPhone(e.target.value)}
                      placeholder="9XX XXX XXX"
                      maxLength={11}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#ff6b35]/60 transition-colors mb-3"
                    />
                    <button
                      onClick={payExpress}
                      className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff9a35] text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                    >
                      📱 Pagar com Express Pay
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 my-2 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* ── MÉTODO 2 — Referência Bancária ── */}
              <div className="bg-white/5 border border-[#5b5fff]/30 rounded-2xl p-5 mb-6">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#5b5fff] text-white text-[8px] font-black rounded-full flex items-center justify-center flex-shrink-0">2</span>
                  Referência Bancária
                </p>

                <div className="bg-white/5 rounded-xl p-3 mb-3 space-y-1.5">
                  {[['Entidade', '99999'], ['Referência', '742 851 963'], ['Valor', '10.000 Kz']].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="text-white/40 text-xs">{k}</span>
                      <span className={`font-bold text-xs ${k === 'Valor' ? 'text-[#f5c842]' : 'text-white'}`}>{v}</span>
                    </div>
                  ))}
                  <button
                    onClick={copyRef}
                    className="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    📋 Copiar referência
                  </button>
                </div>

                <label className="text-[9px] text-white/40 block mb-1.5">Número do comprovativo</label>
                <input
                  type="text"
                  value={receipt}
                  onChange={e => setReceipt(e.target.value)}
                  placeholder="Ex: TRF-2025-XXXXXXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#5b5fff]/60 transition-colors mb-3"
                />
                <button
                  onClick={activateBank}
                  disabled={bankBusy}
                  className="w-full bg-gradient-to-r from-[#5b5fff] to-[#8b5fff] text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {bankBusy
                    ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> A verificar...</>
                    : '🔑 Confirmar Renovação'}
                </button>
              </div>

              <p className="text-center text-white/30 text-xs">
                Precisas de ajuda?{' '}
                <a href="https://wa.me/244927575533" target="_blank" rel="noopener noreferrer" className="text-[#22d46a] hover:underline">
                  WhatsApp +244 927 575 533
                </a>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
