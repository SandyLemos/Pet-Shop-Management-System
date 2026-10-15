import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertTriangle, PawPrint } from 'lucide-react';

// ✅ Cores da marca Pata & Gestão (tiradas da logo). O login é do sistema, não da loja.
const FUNDO_MARCA = 'linear-gradient(135deg, #04394A 0%, #0B5A70 45%, #1A90D0 100%)';
const BOTAO_MARCA = 'linear-gradient(135deg, #0B5A70 0%, #1A90D0 100%)';
const FAIXA_MARCA = 'linear-gradient(90deg, #0B5A70 0%, #1A90D0 60%, #F7931E 100%)';
const FOCO_MARCA  = '0 0 0 3px #1A90D055';

// Patinhas de fundo (só decoração)
function PatinhasFundo() {
  const patas = [
    { top: '6%',  left: '8%',  size: 90,  rot: -20 },
    { top: '18%', left: '78%', size: 130, rot: 25 },
    { top: '62%', left: '4%',  size: 150, rot: 15 },
    { top: '78%', left: '70%', size: 100, rot: -30 },
    { top: '42%', left: '88%', size: 70,  rot: 10 },
    { top: '88%', left: '30%', size: 60,  rot: 35 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-20" style={{ background: '#4FC3F7' }} />
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30" style={{ background: '#03303E' }} />
      {patas.map((p, i) => (
        <PawPrint
          key={i}
          size={p.size}
          strokeWidth={1.5}
          className="absolute text-white opacity-[0.07]"
          style={{ top: p.top, left: p.left, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
    </div>
  );
}

// ─── Tela de Login ────────────────────────────────────────────────────────────
export function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (email: string, password: string) => Promise<boolean>;
  /** ✅ motivo real vindo do useAuth (senha errada, conta não liberada, sem internet...) */
  error: string | null;
}) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: FUNDO_MARCA }}
    >
      <PatinhasFundo />

      <div className="relative w-full max-w-md z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5" style={{ background: FAIXA_MARCA }} />

          <div className="flex flex-col items-center px-8 pt-9 pb-2">
            <img
              src="/logo-pata-gestao.png"
              alt="Pata & Gestão"
              width={252}
              height={96}
              className="h-24 w-auto object-contain"
            />
            <p className="text-xs font-semibold tracking-widest uppercase mt-3" style={{ color: '#0B5A70' }}>
              Gestão para banho e tosa
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8 space-y-5">
            <div className="text-center mb-1">
              <h2 className="text-lg font-bold text-gray-800">Acesse sua conta</h2>
              <p className="text-sm text-gray-400">Informe suas credenciais para continuar</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition"
                onFocus={(e) => (e.target.style.boxShadow = FOCO_MARCA)}
                onBlur={(e)  => (e.target.style.boxShadow = '')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  onFocus={(e) => (e.target.style.boxShadow = FOCO_MARCA)}
                  onBlur={(e)  => (e.target.style.boxShadow = '')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: loading ? '#aaa' : BOTAO_MARCA }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/60 mt-5">
          © {new Date().getFullYear()} Pata &amp; Gestão · Desenvolvido por Studio3D Criativo
        </p>
      </div>
    </div>
  );
}

// ─── Tela de Loading inicial ──────────────────────────────────────────────────
export function SplashScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: FUNDO_MARCA }}
    >
      <PatinhasFundo />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="bg-white rounded-3xl px-8 py-5 shadow-2xl">
          <img
            src="/logo-pata-gestao.png"
            alt="Pata & Gestão"
            width={210}
            height={80}
            className="h-20 w-auto object-contain"
          />
        </div>
        <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-white/70 tracking-widest uppercase">Verificando sessão...</p>
      </div>
    </div>
  );
}
