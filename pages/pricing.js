import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ENTITY  = '99999';
const REF     = '742 851 963';
const PRICE   = '10.000 Kz';

const BENEFITS = [
  'Sincronização multicam com IA (TC + XCORR)',
  'Detecção de momentos virais com Claude AI',
  'Corte automático de silêncios',
  'Export para Instagram, TikTok e YouTube',
  'Legendas automáticas em Português',
  'Smart Crop para vertical e quadrado',
  'Suporte prioritário via WhatsApp',
  'Actualizações gratuitas incluídas',
];

const FAQ = [
  {
    q: 'Quanto tempo demora a activação?',
    a: 'Com Express Pay é imediato. Com Referência Bancária, o acesso é activado assim que inserires o comprovativo.',
  },
  {
    q: 'O que acontece ao fim dos 14 dias de teste?',
    a: 'Pedes para continuar e efectuas o pagamento. Não há cobranças automáticas — tudo é manual e transparente.',
  },
  {
    q: 'Posso usar em mais do que um computador?',
    a: 'O plano inclui activação num único computador. Para múltiplos dispositivos, contacta o suporte.',
  },
  {
    q: 'Preciso do Adobe Premiere Pro?',
    a: 'Sim. O MultiSync Pro é um plugin UXP para Adobe Premiere Pro 2025 (v25.0) ou superior.',
  },
];

// ─── Ícone de check ────────────────────────────────────────────────────────────
function CheckIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Ecrã de sucesso (partilhado Express + Banco) ─────────────────────────────
function SuccessScreen({ licenseKey, expiresAt, router }) {
  const [keyCopied, setKeyCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const expireDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="text-center py-4">
      {/* Checkmark */}
      <div className="w-16 h-16 bg-[#22d46a]/20 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckIcon className="w-8 h-8 text-[#22d46a]" />
      </div>

      <p className="font-black text-xl mb-1">Acesso activado!</p>
      {expireDate && (
        <p className="text-white/40 text-xs mb-6">Licenca valida ate {expireDate}</p>
      )}

      {/* Chave de licença */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-3 text-left">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Chave de licença</p>
        <p className="font-mono text-sm font-bold text-[#5b5fff] break-all">{licenseKey}</p>
      </div>

      <button
        onClick={copyKey}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all mb-6 ${
          keyCopied
            ? 'bg-[#22d46a]/10 border-[#22d46a] text-[#22d46a]'
            : 'bg-white/5 border-white/20 text-white/70 hover:text-white hover:border-white/40'
        }`}
      >
        {keyCopied ? 'Chave copiada!' : 'Copiar chave'}
      </button>

      <div className="bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-xl p-3 mb-6 text-left">
        <p className="text-[#ff6b35] text-xs font-semibold mb-1">Guarda esta chave</p>
        <p className="text-white/40 text-xs">Precisas dela para activar o plugin no Adobe Premiere Pro.</p>
      </div>

      <button
        onClick={() => router.push('/download')}
        className="w-full bg-[#5b5fff] hover:bg-[#4a4eee] text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
      >
        Ir para Download
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Pricing() {
  const router = useRouter();

  // Auth
  const [authUser, setAuthUser]   = useState(undefined); // undefined = a carregar, null = não autenticado

  // Método de pagamento
  const [payMethod, setPayMethod] = useState('express');

  // Estados do Express Pay (Proxypay)
  const [phone, setPhone]               = useState('');
  const [expressStep, setExpressStep]   = useState('form'); // 'form' | 'waiting' | 'polling'
  const [transactionId, setTransactionId] = useState('');
  const pollRef = useRef(null);

  // Estados da Referência Bancária
  const [receipt, setReceipt]   = useState('');
  const [refCopied, setRefCopied] = useState(false);

  // Estados globais de pagamento
  const [payStep, setPayStep]     = useState('idle');   // 'idle' | 'confirming' | 'success' | 'error'
  const [licenseKey, setLicenseKey] = useState('');
  const [expiresAt, setExpiresAt]   = useState('');
  const [payError, setPayError]     = useState('');

  // Limpar polling ao sair
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Verificar sessão no arranque ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          // Se já está activo, vai directo ao dashboard
          if (data.user.status === 'activo') {
            router.replace('/dashboard');
          } else {
            setAuthUser(data.user);
          }
        } else {
          setAuthUser(null);
        }
      })
      .catch(() => setAuthUser(null));
  }, []);

  // ── Activar via Proxypay (após polling detectar 'accepted') ─────────────
  const activateProxypay = async (txId) => {
    setExpressStep('form'); // sair do estado polling para não mostrar dois spinners
    setPayStep('confirming');
    try {
      const res  = await fetch('/api/proxypay/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || 'Erro ao activar licença.');
        setPayStep('error');
        setExpressStep('form');
        return;
      }
      setLicenseKey(data.licenseKey);
      setExpiresAt(data.expiresAt);
      setPayStep('success');
    } catch {
      setPayError('Erro de rede ao activar. Tenta novamente.');
      setPayStep('error');
      setExpressStep('form');
    }
  };

  // ── Express Pay — Proxypay OPG v1 ────────────────────────────────────────
  const handleExpressPay = async (e) => {
    e.preventDefault();
    const mobile = phone.replace(/\s/g, '');
    if (mobile.length < 9) return;

    setExpressStep('waiting');
    setPayError('');

    try {
      // 1. Criar transacção na Proxypay
      const res  = await fetch('/api/proxypay/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mobile, type: 'new' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayError(data.message || 'Erro ao iniciar pagamento.');
        setPayStep('error');
        setExpressStep('form');
        return;
      }

      const txId = data.transactionId;
      setTransactionId(txId);
      setExpressStep('polling');

      // 2. Polling a cada 3s (máx. 5 min = 100 iterações)
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 100) {
          clearInterval(pollRef.current);
          setPayError('Tempo limite excedido. Confirma o pagamento no telemóvel e tenta novamente.');
          setPayStep('error');
          setExpressStep('form');
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
            setPayError(`Pagamento rejeitado (${stat.statusReason || 'sem motivo'}). Tenta novamente.`);
            setPayStep('error');
            setExpressStep('form');
          }
          // 'pending' → continuar polling
        } catch (_) { /* ignorar falhas de rede temporárias */ }
      }, 3000);

    } catch {
      setPayError('Erro de ligação. Verifica a tua internet.');
      setPayStep('error');
      setExpressStep('form');
    }
  };

  // ── Referência Bancária (manual — não usa Proxypay) ───────────────────────
  const handleBankActivate = async (e) => {
    e.preventDefault();
    if (!receipt.trim()) return;
    setPayStep('confirming');
    setPayError('');
    try {
      const res  = await fetch('/api/payment/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'bank', receipt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || 'Erro ao activar. Tenta novamente.');
        setPayStep('error');
        return;
      }
      setLicenseKey(data.licenseKey);
      setExpiresAt(data.expiresAt);
      setPayStep('success');
    } catch {
      setPayError('Erro de rede. Tenta novamente.');
      setPayStep('error');
    }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(`Entidade: ${ENTITY} | Referencia: ${REF.replace(/\s/g, '')}`);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  // ── Input class ───────────────────────────────────────────────────────────
  const inputClass = 'w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5b5fff] transition-colors';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Activar acesso — MultiSync Pro</title>
        <meta name="description" content="Adquire o MultiSync Pro por 10.000 Kz/mes. Express Pay Angola ou Referencia Bancaria." />
      </Head>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-tight">
            MultiSync<span className="text-[#5b5fff]">Pro</span>
          </Link>
          <div className="flex items-center gap-4">
            {authUser ? (
              <Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-white/60 hover:text-white text-sm transition-colors">
                Entrar
              </Link>
            )}
            <a
              href="https://wa.me/244927575533"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5b5fff] hover:bg-[#4a4eee] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Suporte
            </a>
          </div>
        </div>
      </nav>

      <main className="min-h-screen bg-black text-white pt-24 pb-20">

        {/* Header */}
        <section className="text-center px-6 mb-14">
          <div className="inline-block bg-[#5b5fff]/10 border border-[#5b5fff]/30 text-[#5b5fff] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            Plano Unico
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Tudo incluido,{' '}
            <span className="bg-gradient-to-r from-[#5b5fff] to-[#ff4da6] bg-clip-text text-transparent">
              sem surpresas
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Acesso completo a todos os motores de IA do MultiSync Pro.
          </p>
        </section>

        {/* Pricing card */}
        <section className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* Coluna esquerda — benefícios */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-black">10.000 Kz</span>
                <span className="text-white/40 mb-2">/mes</span>
              </div>
              <p className="text-white/40 text-sm mb-8">Acesso imediato apos pagamento confirmado</p>

              <ul className="space-y-3 mb-8">
                {BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckIcon className="w-5 h-5 text-[#22d46a] flex-shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="bg-[#5b5fff]/10 border border-[#5b5fff]/20 rounded-xl p-4">
                <p className="text-[#5b5fff] text-sm font-semibold mb-1">14 dias de teste gratuito</p>
                <p className="text-white/50 text-xs">Experimenta sem compromisso. Cancela quando quiseres.</p>
              </div>
            </div>

            {/* Coluna direita — pagamento */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">

              {/* ── SUCESSO ── */}
              {payStep === 'success' && (
                <SuccessScreen licenseKey={licenseKey} expiresAt={expiresAt} router={router} />
              )}

              {/* ── FORMULÁRIO DE PAGAMENTO ── */}
              {payStep !== 'success' && (
                <>
                  {/* Utilizador não autenticado */}
                  {authUser === null && (
                    <div className="text-center py-6 mb-6 bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-xl">
                      <p className="text-white text-sm font-semibold mb-2">Cria uma conta primeiro</p>
                      <p className="text-white/50 text-xs mb-4">
                        Para activar o acesso precisas de estar registado.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Link
                          href="/login?tab=register"
                          className="bg-[#5b5fff] hover:bg-[#4a4eee] text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          Criar conta
                        </Link>
                        <Link
                          href="/login"
                          className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          Entrar
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* A carregar sessão */}
                  {authUser === undefined && (
                    <div className="text-center py-4 mb-4">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                    </div>
                  )}

                  <h2 className="text-lg font-bold mb-6">Metodo de pagamento</h2>

                  {/* Tabs de método */}
                  <div className="flex gap-2 mb-7">
                    <button
                      onClick={() => { setPayMethod('express'); setPayError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        payMethod === 'express'
                          ? 'bg-[#ff6b35] text-white'
                          : 'bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      Express Pay
                    </button>
                    <button
                      onClick={() => { setPayMethod('bank'); setPayError(''); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        payMethod === 'bank'
                          ? 'bg-[#5b5fff] text-white'
                          : 'bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      Ref. Bancaria
                    </button>
                  </div>

                  {/* Erro global */}
                  {payStep === 'error' && payError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-5">
                      {payError}
                    </div>
                  )}

                  {/* ── EXPRESS PAY ── */}
                  {payMethod === 'express' && (
                    <>
                      {expressStep === 'form' && (
                        <form onSubmit={handleExpressPay} className="space-y-4">
                          <div>
                            <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">
                              Numero de telefone
                            </label>
                            <input
                              type="tel"
                              placeholder="9XX XXX XXX"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              className={inputClass.replace('focus:border-[#5b5fff]', 'focus:border-[#ff6b35]')}
                              required
                              disabled={!authUser}
                            />
                            <p className="text-white/30 text-xs mt-1.5">
                              Receberas uma notificacao de pagamento no teu telemovel
                            </p>
                          </div>

                          <div className="bg-white/5 rounded-lg p-3 flex justify-between text-sm">
                            <span className="text-white/50">Total a pagar</span>
                            <span className="font-bold text-[#ff6b35]">{PRICE}</span>
                          </div>

                          <button
                            type="submit"
                            disabled={!authUser || expressStep !== 'form'}
                            className="w-full bg-[#ff6b35] hover:bg-[#e55a27] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                          >
                            Pagar agora
                          </button>
                        </form>
                      )}

                      {(expressStep === 'waiting' || expressStep === 'polling') && (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 border-4 border-[#ff6b35]/30 border-t-[#ff6b35] rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="font-semibold mb-2">
                            {expressStep === 'waiting' ? 'A criar pagamento...' : 'Aguardar confirmação...'}
                          </p>
                          <p className="text-white/50 text-sm">
                            Confirma o pagamento de{' '}
                            <strong className="text-white">{PRICE}</strong>{' '}
                            nas notificações do teu telemóvel.
                          </p>
                          {expressStep === 'polling' && (
                            <p className="text-white/30 text-xs mt-3">
                              A verificar estado do pagamento...
                            </p>
                          )}
                        </div>
                      )}

                      {payStep === 'confirming' && (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 border-4 border-[#5b5fff]/30 border-t-[#5b5fff] rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-white/60 text-sm">A activar acesso...</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── REFERÊNCIA BANCÁRIA ── */}
                  {payMethod === 'bank' && payStep !== 'confirming' && (
                    <div className="space-y-4">
                      {/* Dados de pagamento */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white/50 text-xs uppercase tracking-wider">Entidade</span>
                          <span className="font-mono font-bold text-lg">{ENTITY}</span>
                        </div>
                        <div className="border-t border-white/10" />
                        <div className="flex justify-between items-center">
                          <span className="text-white/50 text-xs uppercase tracking-wider">Referencia</span>
                          <span className="font-mono font-bold text-lg tracking-widest">{REF}</span>
                        </div>
                        <div className="border-t border-white/10" />
                        <div className="flex justify-between items-center">
                          <span className="text-white/50 text-xs uppercase tracking-wider">Montante</span>
                          <span className="font-bold text-[#5b5fff] text-lg">{PRICE}</span>
                        </div>
                      </div>

                      <button
                        onClick={copyRef}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all border ${
                          refCopied
                            ? 'bg-[#22d46a]/10 border-[#22d46a] text-[#22d46a]'
                            : 'bg-white/5 border-white/20 text-white/70 hover:text-white hover:border-white/40'
                        }`}
                      >
                        {refCopied ? 'Copiado!' : 'Copiar referencia'}
                      </button>

                      <p className="text-white/40 text-xs text-center">
                        Paga via Multicaixa, app do banco ou balcao ATM
                      </p>

                      {/* Comprovativo */}
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-white/60 text-sm mb-3 font-medium">Apos o pagamento</p>
                        <form onSubmit={handleBankActivate} className="space-y-3">
                          <input
                            type="text"
                            placeholder="Numero do comprovativo (ex: TXN-12345)"
                            value={receipt}
                            onChange={e => setReceipt(e.target.value)}
                            className={inputClass}
                            required
                            disabled={!authUser}
                          />
                          <button
                            type="submit"
                            disabled={!authUser || payStep === 'confirming'}
                            className="w-full bg-[#5b5fff] hover:bg-[#4a4eee] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                          >
                            Activar Acesso
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Spinner de confirmação (banco) */}
                  {payMethod === 'bank' && payStep === 'confirming' && (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 border-4 border-[#5b5fff]/30 border-t-[#5b5fff] rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white/60 text-sm">A verificar comprovativo...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 mt-20">
          <h2 className="text-2xl font-bold text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="font-semibold text-sm mb-2">{item.q}</p>
                <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Suporte */}
        <section className="text-center mt-20 px-6">
          <p className="text-white/40 text-sm mb-3">Precisas de ajuda?</p>
          <a
            href="https://wa.me/244927575533"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            <svg className="w-5 h-5 text-[#22d46a]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            +244 927 575 533
          </a>
        </section>
      </main>
    </>
  );
}
