// ✅ Avisos que o dono do sistema publica (Painel do Dono → Comunicados).
// Cada aparelho pode fechar o aviso; fechado, não volta a aparecer.
import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { lojaAtual } from '../../lib/lojaAtual';
import { comunicadoParaLoja, type Comunicado } from '../../utils/dono';

const CHAVE = 'avisosFechados';

function lerFechados(): string[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
}

export function AvisoSistema() {
  const [avisos, setAvisos] = useState<Comunicado[]>([]);

  useEffect(() => {
    const loja = lojaAtual();
    if (!loja) return;
    let vivo = true;
    import('../../services/donoService')
      .then((m) => m.comunicadosAtivos())
      .then((lista) => {
        const fechados = lerFechados();
        if (vivo) setAvisos(lista.filter((c) => !fechados.includes(c.id) && comunicadoParaLoja(c, { plano: loja.plano as any, status: loja.status as any })));
      })
      .catch((e) => console.warn('[avisos] não foi possível ler os comunicados', e));
    return () => { vivo = false; };
  }, []);

  const fechar = (id: string) => {
    setAvisos((a) => a.filter((c) => c.id !== id));
    try { localStorage.setItem(CHAVE, JSON.stringify([...lerFechados(), id].slice(-50))); } catch { /* aparelho sem armazenamento */ }
  };

  if (avisos.length === 0) return null;
  return (
    <div className="mb-6 space-y-3">
      {avisos.map((c) => (
        <div key={c.id} className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-sky-200">
          <span className="p-2 rounded-lg bg-sky-50 text-sky-700 shrink-0"><Megaphone size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">{c.titulo}</p>
            {c.texto && <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{c.texto}</p>}
            <p className="text-xs text-slate-400 mt-1">Aviso da equipe Pata &amp; Gestão</p>
          </div>
          <button onClick={() => fechar(c.id)} className="text-slate-400 hover:text-slate-600" aria-label="Fechar aviso"><X size={18} /></button>
        </div>
      ))}
    </div>
  );
}
