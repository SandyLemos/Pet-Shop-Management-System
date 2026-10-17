import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle2, Circle, KeyRound } from 'lucide-react';
import { regrasSenha, senhaValida, trocarSenhaPrimeiroAcesso, mensagemErroSenha } from '../../services/senhaService';

// ✅ Mesmas cores da tela de login (marca Pata & Gestão)
const FUNDO = 'linear-gradient(135deg, #0B5A70 0%, #1A90D0 100%)';
const BOTAO = 'linear-gradient(135deg, #0B5A70 0%, #1A90D0 100%)';
const FAIXA = 'linear-gradient(90deg, #0B5A70 0%, #1A90D0 60%, #F7931E 100%)';

const REGRAS: { chave: keyof ReturnType<typeof regrasSenha>; texto: string }[] = [
  { chave: 'tamanho', texto: 'Pelo menos 8 caracteres' },
  { chave: 'letra',   texto: 'Pelo menos uma letra' },
  { chave: 'numero',  texto: 'Pelo menos um número' },
  { chave: 'iguais',  texto: 'As duas senhas iguais' },
];

/**
 * ✅ Primeiro acesso: quem entrou com a senha provisória cria a própria senha aqui.
 * Não dá para pular: enquanto a senha não for trocada, o sistema não abre.
 */
export function TelaPrimeiroAcesso({ nome, onSalvo, onSair }: { nome: string; onSalvo: () => void; onSair: () => void }) {
  const [nova, setNova]         = useState('');
  const [repetida, setRepetida] = useState('');
  const [mostrar, setMostrar]   = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [pronto, setPronto]     = useState(false);

  const regras = regrasSenha(nova, repetida);
  const ok = senhaValida(nova, repetida);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await trocarSenhaPrimeiroAcesso(nova);
      setPronto(true);
      setTimeout(onSalvo, 1200); // mostra "Senha criada!" e entra no sistema
    } catch (err: any) {
      console.error('[primeiro acesso]', err);
      setErro(mensagemErroSenha(err?.code));
      setSalvando(false);
    }
  };

  const campo = 'w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: FUNDO }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5" style={{ background: FAIXA }} />
        {pronto ? (
          <div className="px-8 py-12 flex flex-col items-center text-center gap-3">
            <div className="bg-green-100 p-4 rounded-full"><CheckCircle2 className="w-10 h-10 text-green-600" /></div>
            <h2 className="text-xl font-bold text-gray-800">Senha criada!</h2>
            <p className="text-sm text-gray-500">Use a sua senha nova nos próximos acessos. Abrindo o sistema…</p>
          </div>
        ) : (
          <form onSubmit={salvar} className="px-8 pt-8 pb-8 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase flex items-center gap-1.5" style={{ color: '#F7931E' }}>
                <KeyRound size={14} /> Primeiro acesso
              </p>
              <h2 className="text-xl font-bold text-gray-800">Olá{nome ? `, ${nome}` : ''}! Crie a sua senha</h2>
              <p className="text-sm text-gray-500">A senha provisória serviu só para entrar. Agora escolha uma senha que só você vai saber.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="nova-senha" className="text-sm font-semibold text-gray-600">Nova senha</label>
              <div className="relative">
                <input id="nova-senha" type={mostrar ? 'text' : 'password'} value={nova} onChange={(e) => setNova(e.target.value)}
                  autoComplete="new-password" className={campo} />
                <button type="button" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="repetir-senha" className="text-sm font-semibold text-gray-600">Repita a nova senha</label>
              <input id="repetir-senha" type={mostrar ? 'text' : 'password'} value={repetida} onChange={(e) => setRepetida(e.target.value)}
                autoComplete="new-password" className={campo} />
            </div>

            <ul className="space-y-1.5">
              {REGRAS.map((r) => (
                <li key={r.chave} data-ok={regras[r.chave]}
                  className={`flex items-center gap-2 text-sm ${regras[r.chave] ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                  {regras[r.chave] ? <CheckCircle2 size={16} /> : <Circle size={16} />} {r.texto}
                </li>
              ))}
            </ul>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} className="flex-shrink-0" /> {erro}
              </div>
            )}

            <button type="submit" disabled={!ok || salvando}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: BOTAO }}>
              {salvando ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Salvar e entrar'}
            </button>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">Enquanto a senha não for trocada, o sistema não abre.</p>
              <button type="button" onClick={onSair} className="text-sm font-semibold text-gray-500 hover:text-gray-700 underline shrink-0">Sair</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
