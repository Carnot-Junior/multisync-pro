import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DOWNLOADS = [
  {
    platform: 'Plugin Universal (.ccx)',
    version: '1.0.0',
    requirement: 'Windows & macOS · Adobe Premiere Pro 2025+',
    filename: 'MultiSyncPro_v1.0.0.ccx',
    size: '~58 KB',
    url: '/files/MultiSyncPro_v1.0.0.ccx',
    available: true,
    badge: 'Recomendado',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#22d46a">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    platform: 'Windows',
    version: '1.0.0',
    requirement: 'Windows 10 / 11 · Adobe Premiere Pro 2025+',
    filename: 'MultiSyncPro_Setup_v1.0.0.exe',
    size: '~76 MB',
    url: 'https://github.com/Carnot-Junior/multisync-pro/releases/download/v1.0.0/MultiSyncPro_Setup_v1.0.0.exe',
    available: true,
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#29ABE2">
        <path d="M3 5.557L10.526 4.5V11.5H3V5.557zM11.474 4.36L21 3v8.5h-9.526V4.36zM3 12.5h7.526V19.5L3 18.437V12.5zM11.474 12.5H21V21l-9.526-1.36V12.5z"/>
      </svg>
    ),
  },
  {
    platform: 'macOS',
    version: '1.0.0',
    requirement: 'macOS 12 (Monterey)+ · Adobe Premiere Pro 2025+',
    filename: 'MultiSyncPro-Install.command',
    size: '~12 KB',
    url: '/files/MultiSyncPro-Install.command',
    available: true,
    badge: 'Terminal',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#29ABE2">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
];

const STEPS_CCX = [
  { n: 1, title: 'Descarrega o ficheiro .ccx', desc: 'Clica no botão "Plugin Universal" acima e guarda o ficheiro .ccx.' },
  { n: 2, title: 'Dá duplo-clique no ficheiro', desc: 'O Creative Cloud abre automaticamente e pergunta se queres instalar.' },
  { n: 3, title: 'Clica em Instalar', desc: 'O Creative Cloud instala o plugin para todos os teus produtos Adobe.' },
  { n: 4, title: 'Abre o Premiere Pro 2025', desc: 'Vai a Janela → Extensões → MultiSync Pro.' },
  { n: 5, title: 'Activa a tua licença', desc: 'Insere a chave de licença que recebeste após o pagamento.' },
];

const STEPS_WIN = [
  { n: 1, title: 'Descarrega o instalador', desc: 'Clica no botão Windows acima e guarda o ficheiro .exe.' },
  { n: 2, title: 'Aviso do SmartScreen (normal)', desc: 'Se o Windows mostrar "O Windows protegeu o seu PC", clica em "Mais informações" → "Executar assim mesmo". O ficheiro é seguro.' },
  { n: 3, title: 'Executa como Administrador', desc: 'Clica com o botão direito no .exe e selecciona "Executar como administrador".' },
  { n: 4, title: 'Segue o assistente', desc: 'O instalador verifica e instala FFmpeg e Python automaticamente.' },
  { n: 5, title: 'Abre o Premiere Pro 2025', desc: 'Vai a Janela → Extensões → MultiSync Pro.' },
  { n: 6, title: 'Insere a chave de licença', desc: 'Copia a chave do teu dashboard e cola no ecrã de activação do plugin.' },
];

const STEPS_MAC = [
  { n: 1, title: 'Descarrega o instalador', desc: 'Clica no botão macOS acima e guarda o ficheiro .command.' },
  { n: 2, title: 'Dá permissão de execução', desc: 'No Terminal, corre: chmod +x ~/Downloads/MultiSyncPro-Install.command' },
  { n: 3, title: 'Dá duplo-clique no ficheiro', desc: 'O Terminal abre e guia-te por todo o processo de instalação.' },
  { n: 4, title: 'Introduz a password de admin', desc: 'Necessária para copiar o plugin para /Library. Homebrew, FFmpeg e Python são instalados automaticamente.' },
  { n: 5, title: 'Abre o Premiere Pro 2025', desc: 'Vai a Janela → Extensões → MultiSync Pro.' },
  { n: 6, title: 'Insere a chave de licença', desc: 'Copia a chave do teu dashboard e cola no ecrã de activação do plugin.' },
];

export default function Download() {
  const [activeOS, setActiveOS] = useState('windows');
  const steps = activeOS === 'mac' ? STEPS_MAC : STEPS_WIN;

  return (
    <>
      <Head>
        <title>Download — MultiSync Pro</title>
        <meta name="description" content="Descarrega o instalador MultiSync Pro para Windows. Inclui FFmpeg e Python automaticamente." />
      </Head>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-tight">
            MultiSync<span className="text-[#5b5fff]">Pro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="bg-[#5b5fff] hover:bg-[#4a4eee] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      <main className="min-h-screen bg-black text-white pt-24 pb-20">

        {/* Header */}
        <section className="text-center px-6 mb-14">
          <div className="inline-block bg-[#5b5fff]/10 border border-[#5b5fff]/30 text-[#5b5fff] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            Versão 1.0.0
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Descarregar MultiSync Pro
          </h1>
          <p className="text-white/60 text-lg max-w-lg mx-auto">
            Requer Adobe Premiere Pro 2025 ou superior.
            O instalador configura tudo automaticamente.
          </p>
        </section>

        {/* Download cards */}
        <section className="max-w-2xl mx-auto px-6 mb-14">
          <div className="space-y-4">
            {DOWNLOADS.map((d) => {
              const isMac = d.platform === 'macOS';
              return (
                <div
                  key={d.platform}
                  onClick={() => setActiveOS(isMac ? 'mac' : 'windows')}
                  className={`bg-white/5 border rounded-2xl p-6 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                    d.available ? 'border-white/10 hover:border-[#5b5fff]/40' : 'border-white/5 opacity-60'
                  } ${activeOS === (isMac ? 'mac' : 'windows') ? 'border-[#5b5fff]/50 ring-1 ring-[#5b5fff]/20' : ''}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      {d.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base">{d.platform}</p>
                        {d.badge && (
                          <span className="bg-[#5b5fff]/20 text-[#a0a0ff] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {d.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-xs mt-0.5">{d.requirement}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {d.filename} · {d.size}
                      </p>
                    </div>
                  </div>

                  {d.available ? (
                    <a
                      href={d.url}
                      download={d.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 bg-[#5b5fff] hover:bg-[#4a4eee] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Descarregar
                    </a>
                  ) : (
                    <span className="flex-shrink-0 bg-white/5 border border-white/10 text-white/30 text-xs font-semibold px-4 py-2 rounded-xl">
                      Em breve
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* macOS note */}
          {activeOS === 'mac' && (
            <div className="mt-4 bg-[#29ABE2]/10 border border-[#29ABE2]/20 rounded-xl p-4">
              <p className="text-[#29ABE2] text-xs font-semibold mb-1">Nota macOS</p>
              <p className="text-white/50 text-xs leading-relaxed">
                O ficheiro <code className="bg-white/10 px-1 rounded">.command</code> é um script Terminal que instala tudo automaticamente —
                Homebrew, FFmpeg, Python e o plugin. O instalador visual (.pkg) estará disponível em breve.
              </p>
            </div>
          )}

          {/* Nota requisitos */}
          <div className="mt-4 bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-xl p-4">
            <p className="text-[#ff6b35] text-xs font-semibold mb-1">Requisitos do sistema</p>
            <p className="text-white/50 text-xs leading-relaxed">
              {activeOS === 'mac'
                ? 'macOS 12 (Monterey)+ · Apple Silicon ou Intel · Adobe Premiere Pro 2025 (v25.0+) · 8 GB RAM · Ligação à internet'
                : 'Windows 10/11 64-bit · Adobe Premiere Pro 2025 (v25.0+) · 8 GB RAM · 4 GB espaço livre · Ligação à internet'}
            </p>
          </div>
        </section>

        {/* Instruções */}
        <section className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Como instalar</h2>
            <div className="flex bg-white/5 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveOS('windows')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeOS === 'windows' ? 'bg-[#5b5fff] text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => setActiveOS('mac')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  activeOS === 'mac' ? 'bg-[#5b5fff] text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                macOS
              </button>
            </div>
          </div>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#5b5fff] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {s.n}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-white/10 my-1" />
                  )}
                </div>
                <div className="pb-6">
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suporte */}
        <section className="text-center mt-16 px-6">
          <p className="text-white/40 text-sm mb-3">Precisas de ajuda com a instalação?</p>
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
