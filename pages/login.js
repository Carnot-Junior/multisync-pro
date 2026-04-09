import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message); return; }
      router.push('/dashboard');
    } catch {
      setLoginError('Erro de rede. Tenta novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regConfirm) {
      setRegError('As passwords não coincidem.');
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.message); return; }
      router.push('/pricing');
    } catch {
      setRegError('Erro de rede. Tenta novamente.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError('');
    setRegError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (tab === 'login') setLoginError(data.message);
        else setRegError(data.message);
        return;
      }
      router.push('/dashboard');
    } catch {
      const msg = 'Erro de rede. Tenta novamente.';
      if (tab === 'login') setLoginError(msg);
      else setRegError(msg);
    }
  };

  const handleGoogleError = () => {
    const msg = 'Não foi possível entrar com Google.';
    if (tab === 'login') setLoginError(msg);
    else setRegError(msg);
  };

  const inputClass =
    'w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5b5fff] transition-colors';

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
      <Head>
        <title>{tab === 'login' ? 'Entrar' : 'Criar conta'} — MultiSync Pro</title>
      </Head>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-xl tracking-tight">
            MultiSync<span className="text-[#5b5fff]">Pro</span>
          </Link>
          <Link href="/pricing" className="text-white/60 hover:text-white text-sm transition-colors">
            Preços
          </Link>
        </div>
      </nav>

      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 pt-16">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black">
              MultiSync<span className="text-[#5b5fff]">Pro</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-white/10">
              <button
                onClick={() => { setTab('login'); setLoginError(''); }}
                className={`py-4 text-sm font-semibold transition-colors ${
                  tab === 'login'
                    ? 'text-white border-b-2 border-[#5b5fff]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => { setTab('register'); setRegError(''); }}
                className={`py-4 text-sm font-semibold transition-colors ${
                  tab === 'register'
                    ? 'text-white border-b-2 border-[#5b5fff]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Criar conta
              </button>
            </div>

            <div className="p-8">

              {/* Botão Google (comum aos dois tabs) */}
              {GOOGLE_CLIENT_ID && (
                <div className="mb-6">
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="filled_black"
                      shape="rectangular"
                      size="large"
                      text={tab === 'login' ? 'signin_with' : 'signup_with'}
                      width="368"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-5 mb-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs">ou continua com email</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                </div>
              )}

              {/* ── LOGIN ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="tu@exemplo.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-[#5b5fff] hover:bg-[#4a4eee] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm mt-2"
                  >
                    {loginLoading ? 'A entrar...' : 'Entrar'}
                  </button>

                  <p className="text-center text-white/40 text-xs pt-2">
                    Não tens conta?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('register')}
                      className="text-[#5b5fff] hover:underline"
                    >
                      Cria uma agora
                    </button>
                  </p>
                </form>
              )}

              {/* ── REGISTER ── */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Nome completo</label>
                    <input
                      type="text"
                      placeholder="O teu nome"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="tu@exemplo.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Telefone</label>
                    <input
                      type="tel"
                      placeholder="9XX XXX XXX"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className={inputClass}
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Confirmar password</label>
                    <input
                      type="password"
                      placeholder="Repete a password"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  {regError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                      {regError}
                    </div>
                  )}

                  <div className="bg-[#5b5fff]/10 border border-[#5b5fff]/20 rounded-lg px-4 py-3">
                    <p className="text-[#5b5fff] text-xs font-semibold">14 dias de teste gratuito</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      Ao registares-te tens acesso imediato. O pagamento é só após o trial.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-[#5b5fff] hover:bg-[#4a4eee] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                  >
                    {regLoading ? 'A criar conta...' : 'Criar conta grátis'}
                  </button>

                  <p className="text-center text-white/30 text-xs">
                    Ao criar conta aceitas os{' '}
                    <a href="#" className="text-white/50 hover:text-white underline">Termos de Serviço</a>
                  </p>

                  <p className="text-center text-white/40 text-xs">
                    Já tens conta?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="text-[#5b5fff] hover:underline"
                    >
                      Entra aqui
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Suporte */}
          <p className="text-center text-white/30 text-xs mt-6">
            Precisas de ajuda?{' '}
            <a
              href="https://wa.me/244927575533"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white transition-colors"
            >
              WhatsApp +244 927 575 533
            </a>
          </p>
        </div>
      </main>
    </GoogleOAuthProvider>
  );
}
