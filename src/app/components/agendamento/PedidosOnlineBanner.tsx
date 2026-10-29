// ✅ Aviso no topo da fila: pedidos do agendamento online esperando a loja confirmar.
import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Check, X } from 'lucide-react';
import type { Pedido } from '../../../services/agendamentoService';
import { diaCurto } from '../../../utils/agendamento';
import { NOME_SERVICO } from '../../../utils/acompanhamento';
import { tocarAviso } from '../../../utils/som';
import { idDoDia } from '../../../utils/dias';
import { confirmar } from './acoesPedido';
import { RecusarPedido } from './PedidoOnlineModal';

export function PedidosOnlineBanner({ pedidos }: { pedidos: Pedido[] }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<Pedido | null>(null);

  // bipe a cada pedido novo
  const vistos = useRef(new Set<string>());
  useEffect(() => {
    const novos = pedidos.filter((p) => !vistos.current.has(p.codigo));
    novos.forEach((p) => vistos.current.add(p.codigo));
    if (novos.length > 0) tocarAviso();
  }, [pedidos]);

  if (pedidos.length === 0) return null;
  const hoje = idDoDia();

  return (
    <div className="mb-6 rounded-xl border-2 border-orange-300 bg-orange-50 shadow-sm overflow-hidden" role="region" aria-label="Agendamentos online a confirmar">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 text-orange-900">
        <CalendarCheck size={18} className="shrink-0" />
        <p className="font-bold text-sm">
          {pedidos.length === 1 ? '1 agendamento online para confirmar' : `${pedidos.length} agendamentos online para confirmar`}
        </p>
      </div>
      <ul className="divide-y divide-orange-200">
        {pedidos.map((p) => (
          <li key={p.codigo} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">
                <span aria-hidden>🐾 </span><strong>{p.nomePet}</strong> foi marcado na <strong>vaga {p.vaga}</strong>
                {' '}({p.dia === hoje ? 'hoje' : diaCurto(p.dia)}). <span className="font-semibold text-orange-700">Necessário confirmar.</span>
              </p>
              <p className="text-xs text-slate-500 truncate">
                {NOME_SERVICO[p.servico] ?? p.servico} · {p.especie === 'gato' ? 'Gato' : 'Cão'}{p.raca ? ` ${p.raca}` : ''} · Tutor: {p.nomeTutor} · {p.telefone}
                {p.obs ? ` · Obs.: ${p.obs}` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                disabled={!!ocupado}
                onClick={() => setRecusando(p)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
              >
                <X size={15} /> Recusar
              </button>
              <button
                disabled={!!ocupado}
                onClick={async () => { setOcupado(p.codigo); await confirmar(p); setOcupado(null); }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check size={15} /> {ocupado === p.codigo ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {recusando && <RecusarPedido pedido={recusando} fechar={() => setRecusando(null)} />}
    </div>
  );
}
