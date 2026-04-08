import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

/* ─── Dados estáticos ───────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: '⚡',
    title: 'Sincronização Multicam',
    desc: 'Alinha automaticamente câmeras por áudio (XCORR) ou Timecode. Sem arrastar, sem adivinhar.',
    badge: 'AUTO',
    badgeColor: 'badge-gold',
  },
  {
    icon: '🔥',
    title: 'Detector Viral com IA',
    desc: 'O Claude analisa a tua transcrição e encontra os momentos com mais potencial para explodir nas redes.',
    badge: 'CLAUDE AI',
    badgeColor: 'badge-purple',
  },
  {
    icon: '✂️',
    title: 'Corte de Silêncios',
    desc: 'Remove pausas, hesitações e silêncios automaticamente. Poupa horas de edição manual por episódio.',
    badge: 'NOVO',
    badgeColor: 'badge-pink',
  },
  {
    icon: '🚀',
    title: 'Export para Reels',
    desc: 'Exporta para Instagram, TikTok e YouTube com legendas queimadas, enquadramento por IA e LUFS correcto.',
    badge: 'IA',
    badgeColor: 'badge-blue',
  },
];

const TESTIMONIALS = [
  {
    name: 'Armando Sebastião',
    role: 'Podcaster · Luanda',
    avatar: 'AS',
    color: '#5b5fff',
    text: 'O que demorava 4 horas agora fica pronto em 20 minutos. O corte de silêncios sozinho já pagou o plugin no primeiro mês.',
    stars: 5,
  },
  {
    name: 'Catarina Neto',
    role: 'Criadora de Conteúdo · Benguela',
    avatar: 'CN',
    color: '#ff4da6',
    text: 'O detector viral é incrível. Já tive dois clips de 30 segundos a passar de 0 para 80 mil visualizações no TikTok.',
    stars: 5,
  },
  {
    name: 'Francisco Tchilombo',
    role: 'Youtuber · Huambo',
    avatar: 'FT',
    color: '#f5c842',
    text: 'Finalmente um plugin feito para quem cria em português. Funciona perfeitamente com o meu setup de três câmeras.',
    stars: 5,
  },
];

const BENEFITS = [
  'Sincronização multicam por áudio e timecode',
  'Detecção de momentos virais com Claude AI',
  'Corte automático de silêncios e hesitações',
  'Export para Instagram, TikTok, YouTube e Twitter',
  'Legendas automáticas em Português',
  'Enquadramento inteligente por formato',
  'Normalização de áudio LUFS -14',
  'Suporte via WhatsApp em Português',
];

/* ─── Componente principal ──────────────────────────────────────────────── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Contador animado 0 → 500
  useEffect(() => {
    let frame;
    let start = null;
    const target = 500;
    const duration = 1800;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { frame = requestAnimationFrame(step); observer.disconnect(); }
    });
    const el = document.getElementById('counter-section');
    if (el) observer.observe(el);
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, []);

  return (
    <>
      <Head>
        <title>MultiSync Pro — O plugin que transforma o teu podcast em conteúdo viral</title>
        <meta name="description" content="Plugin para Adobe Premiere Pro com IA real: sincronização multicam, detector de momentos virais, corte de silêncios e export para Reels." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="MultiSync Pro" />
        <meta property="og:description" content="IA que edita. Tu crias." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0c] text-white overflow-x-hidden">

        {/* ══════════════════════════════════════════════════
            NAV
        ══════════════════════════════════════════════════ */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5' : ''
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-[#5b5fff] to-[#ff4da6] bg-clip-text text-transparent">
              MultiSync Pro
            </span>
            <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
              <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
              <a href="#depoimentos"    className="hover:text-white transition-colors">Depoimentos</a>
              <a href="#precos"         className="hover:text-white transition-colors">Preços</a>
              <Link href="/download"    className="hover:text-white transition-colors">Download</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login"
                className="text-sm text-white/60 hover:text-white transition-colors hidden md:block">
                Entrar
              </Link>
              <Link href="/download"
                className="text-sm font-semibold bg-[#5b5fff] hover:bg-[#4a4ee0] text-white px-4 py-2 rounded-lg transition-colors">
                Download
              </Link>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <section className="relative pt-36 pb-24 px-6 text-center overflow-hidden">
          {/* Glow de fundo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#5b5fff]/10 blur-[120px]" />
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-[#ff4da6]/8 blur-[100px]" />
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Badge topo */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/70 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d46a] animate-pulse" />
              Disponível para Adobe Premiere Pro 2025 / 2026
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-6">
              O plugin que transforma<br />
              <span className="bg-gradient-to-r from-[#5b5fff] via-[#ff4da6] to-[#f5c842] bg-clip-text text-transparent">
                o teu podcast em conteúdo viral
              </span>
            </h1>

            {/* Sub */}
            <p className="text-xl md:text-2xl text-white/50 font-light mb-3">
              IA que edita.{' '}
              <span className="text-white font-semibold">Tu crias.</span>
            </p>
            <p className="text-white/40 text-sm mb-10">
              Sincronização multicam · Detector viral · Corte automático · Export para Reels
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/download"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#5b5fff] to-[#8b5fff] hover:from-[#4a4ee0] hover:to-[#7a4eee] text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#5b5fff]/25 hover:shadow-[#5b5fff]/40 hover:scale-[1.02]">
                <span>⬇</span>
                Descarregar grátis — 14 dias de teste
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <a href="#funcionalidades"
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 hover:border-white/25 text-white/70 hover:text-white text-sm px-6 py-4 rounded-xl transition-all duration-200">
                Ver funcionalidades
              </a>
            </div>

            {/* Compatibilidade */}
            <div className="flex items-center justify-center gap-3 text-white/30 text-xs">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/>
                  <rect x="2" y="13" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/>
                </svg>
                Windows 10 / 11
              </span>
              <span className="w-px h-3 bg-white/20" />
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
                macOS 12+
              </span>
              <span className="w-px h-3 bg-white/20" />
              <span>Adobe Premiere Pro 2025 / 2026</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FUNCIONALIDADES
        ══════════════════════════════════════════════════ */}
        <section id="funcionalidades" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#5b5fff] text-xs font-bold uppercase tracking-widest mb-3">Funcionalidades</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                Tudo o que precisas para criar mais rápido
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title}
                  className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.15] rounded-2xl p-7 transition-all duration-300">
                  {/* Badge */}
                  <span className={`absolute top-5 right-5 text-[9px] font-black px-2.5 py-1 rounded-full tracking-widest ${
                    f.badgeColor === 'badge-gold'   ? 'bg-[#f5c842]/15 text-[#f5c842] border border-[#f5c842]/30' :
                    f.badgeColor === 'badge-purple' ? 'bg-[#5b5fff]/15 text-[#5b5fff] border border-[#5b5fff]/30' :
                    f.badgeColor === 'badge-pink'   ? 'bg-[#ff4da6]/15 text-[#ff4da6] border border-[#ff4da6]/30' :
                                                      'bg-[#22d46a]/15 text-[#22d46a] border border-[#22d46a]/30'
                  }`}>
                    {f.badge}
                  </span>

                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-bold mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            CONTADOR / PROVA SOCIAL
        ══════════════════════════════════════════════════ */}
        <section id="counter-section" className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-[#5b5fff]/10 via-[#ff4da6]/10 to-[#f5c842]/10 border border-white/[0.07] rounded-3xl p-10 text-center">
              <div className="text-6xl md:text-7xl font-black tracking-tight mb-2">
                +{count}
              </div>
              <p className="text-white/60 text-lg">
                criadores em Angola já usam o MultiSync Pro
              </p>
              <p className="text-white/30 text-sm mt-2">
                Luanda · Benguela · Huambo · Namibe · Cabinda
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            DEPOIMENTOS
        ══════════════════════════════════════════════════ */}
        <section id="depoimentos" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#ff4da6] text-xs font-bold uppercase tracking-widest mb-3">Depoimentos</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                O que dizem os criadores angolanos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t) => (
                <div key={t.name}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7 flex flex-col gap-5">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[...Array(t.stars)].map((_, i) => (
                      <span key={i} className="text-[#f5c842] text-sm">★</span>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-white/70 text-sm leading-relaxed flex-1">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: t.color }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-white/40">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            PREÇOS
        ══════════════════════════════════════════════════ */}
        <section id="precos" className="py-24 px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-12">
              <p className="text-[#f5c842] text-xs font-bold uppercase tracking-widest mb-3">Preços</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                Um plano. Tudo incluído.
              </h2>
              <p className="text-white/40 mt-3 text-sm">Sem surpresas. Cancela quando quiseres.</p>
            </div>

            {/* Card de preço */}
            <div className="relative bg-gradient-to-b from-[#0d0f2a] to-[#0a0a0c] border border-[#5b5fff]/40 rounded-3xl p-8 overflow-hidden">
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#5b5fff]/20 blur-3xl pointer-events-none" />

              {/* Badge popular */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-[#5b5fff] to-[#ff4da6] text-white text-[9px] font-black px-5 py-1 rounded-b-xl tracking-widest">
                  MAIS POPULAR
                </div>
              </div>

              <div className="relative pt-4">
                {/* Preço */}
                <div className="text-center mb-8">
                  <div className="text-white/40 text-sm mb-1">Acesso completo</div>
                  <div className="flex items-end justify-center gap-2">
                    <span className="text-white/50 text-lg font-light mb-1">Kz</span>
                    <span className="text-6xl font-black tracking-tighter">10.000</span>
                  </div>
                  <div className="text-white/40 text-sm mt-1">por mês</div>
                  <div className="mt-3 inline-block bg-[#22d46a]/10 border border-[#22d46a]/25 text-[#22d46a] text-xs px-3 py-1 rounded-full">
                    14 dias de teste grátis
                  </div>
                </div>

                {/* Benefícios */}
                <ul className="space-y-3 mb-8">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-white/70">
                      <span className="text-[#5b5fff] mt-0.5 flex-shrink-0">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/download"
                  className="block w-full text-center bg-gradient-to-r from-[#5b5fff] to-[#8b5fff] hover:from-[#4a4ee0] hover:to-[#7a4eee] text-white font-bold py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#5b5fff]/30 hover:scale-[1.01]">
                  Começar agora
                </Link>

                <p className="text-center text-white/25 text-xs mt-4">
                  Sem cartão de crédito · Pagamento via Express Pay ou Referência Bancária
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            RODAPÉ
        ══════════════════════════════════════════════════ */}
        <footer className="border-t border-white/[0.06] py-12 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Top */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
              {/* Logo + tagline */}
              <div>
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-[#5b5fff] to-[#ff4da6] bg-clip-text text-transparent">
                  MultiSync Pro
                </span>
                <p className="text-white/30 text-xs mt-1">Plugin UXP para Adobe Premiere Pro</p>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-6 text-sm text-white/40">
                <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
                <Link href="/pricing"  className="hover:text-white transition-colors">Preços</Link>
                <Link href="/download" className="hover:text-white transition-colors">Download</Link>
                <Link href="/login"    className="hover:text-white transition-colors">Entrar</Link>
                <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06] mb-8" />

            {/* Bottom */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-white/25 text-xs">
                © {new Date().getFullYear()} MultiSync Pro. Todos os direitos reservados.
              </p>

              {/* WhatsApp */}
              <a
                href="https://wa.me/244927575533"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#25D366] text-sm px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Suporte: +244 927 575 533
              </a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
