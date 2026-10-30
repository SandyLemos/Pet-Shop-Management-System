// ✅ Agendamento online no topo da fila:
//   • pedidos esperando a loja confirmar (com bipe a cada pedido novo)
//   • confirmados de hoje esperando o pet chegar → "Confirmar chegada" dá a vaga na hora
import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Check, LogIn, MessageCircle, Truck, UserX, X } from 'lucide-react';
import type { Pedido } from '../../../services/agendamentoService';
import { NOME_TRANSPORTE, diaCurto, linkMapa, precisaEndereco, textoEndereco } from '../../../utils/agendamento';
import { NOME_SERVICO } from '../../../utils/acompanhamento';
import { tocarAviso } from '../../../utils/som';
import { idDoDia } from '../../../utils/dias';
import { confirmar, naoVeio, whatsDoPedido } from './acoesPedido';
import { RecusarPedido } from './RecusarPedido';

const detalhes = (p: Pedido) =>
  `${NOME_SERVICO[p.servico] ?? p.servico} · ${p.especie === 'gato' ? 'Gato' : 'Cão'}${p.raca ? ` ${p.raca}` : ''} · Tutor: ${p.nomeTutor} · ${p.telefone}${p.obs ? ` · Obs.: ${p.obs}` : ''}`;

/** Busca e entrega: tipo, endereço e mapa */
function LinhaTransporte({ p }: { p: Pedido }) {
  if (!precisaEndereco(p.transporte)) return null;
  const mapa = linkMapa(p.endereco, p.localizacao);
  return (
    <p className="text-xs text-sky-800 mt-0.5 flex items-start gap-1.5 min-w-0">
      <Truck size={13} className="shrink-0 mt-0.5" />
      <span className="min-w-0 break-words">
        <strong>{NOME_TRANSPORTE[p.transporte!]}</strong> · {textoEndereco(p.endereco)}
        {mapa && <> · <a href={mapa} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{p.localizacao ? 'localização' : 'mapa'}</a></>}
      </span>
    </p>
  );
}

export function PedidosOnlineBanner({ pedidos, aguardando = [], onChegou }:
  { pedidos: Pedido[]; aguardando?: Pedido[]; onChegou?: (p: Pedido) => void }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<Pedido | null>(null);

  // bipe a cada pedido novo
  const vistos = useRef(new Set<string>());
  useEffect(() => {
    const novos = pedidos.filter((p) => !vistos.current.has(p.codigo));
    novos.forEach((p) => vistos.current.add(p.codigo));
    if (novos.length > 0) tocarAviso();
  }, [pedidos]);

  if (pedidos.length === 0 && aguardando.length === 0) return null;
  const hoje = idDoDia();
  const quando = (p: Pedido) => (p.dia === hoje ? 'hoje' : diaCurto(p.dia));
  const fazer = async (p: Pedido, acao: () => Promise<boolean>) => { setOcupado(p.codigo); await acao(); setOcupado(null); };

  return (
    <div className="mb-6 space-y-3">
      {pedidos.length > 0 && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 shadow-sm overflow-hidden" role="region" aria-label="Agendamentos online a confirmar">
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
                    <span aria-hidden>🐾 </span><strong>{p.nomePet}</strong> foi agendado online para <strong>{quando(p)}</strong>.{' '}
                    <span className="font-semibold text-orange-700">Necessário confirmar.</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">{detalhes(p)}</p>
                  <LinhaTransporte p={p} />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button disabled={!!ocupado} onClick={() => setRecusando(p)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                    <X size={15} /> Recusar
                  </button>
                  <button disabled={!!ocupado} onClick={() => fazer(p, () => confirmar(p))}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    <Check size={15} /> {ocupado === p.codigo ? 'Confirmando...' : 'Confirmar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aguardando.length > 0 && (
        <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 shadow-sm overflow-hidden" role="region" aria-label="Agendados aguardando chegada">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 text-indigo-900">
            <LogIn size={18} className="shrink-0" />
            <p className="font-bold text-sm">
              {aguardando.length === 1 ? '1 agendado online aguardando chegada' : `${aguardando.length} agendados online aguardando chegada`}
            </p>
            <span className="hidden sm:inline text-xs text-indigo-700 ml-auto">Ao chegar, o pet vai para a próxima vaga livre da grade</span>
          </div>
          <ul className="divide-y divide-indigo-200">
            {aguardando.map((p) => {
              const whats = whatsDoPedido(p, 'confirmado');
              return (
                <li key={p.codigo} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span aria-hidden>🐾 </span><strong>{p.nomePet}</strong> · aguardando chegada{p.dia !== hoje ? ` (marcado para ${diaCurto(p.dia)})` : ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{detalhes(p)}</p>
                  <LinhaTransporte p={p} />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {whats && (
                      <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp do tutor do ${p.nomePet}`}
                        className="flex items-center justify-center px-3 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50">
                        <MessageCircle size={16} />
                      </a>
                    )}
                    <button disabled={!!ocupado} onClick={() => fazer(p, () => naoVeio(p))}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                      <UserX size={15} /> Não veio
                    </button>
                    <button disabled={!!ocupado} onClick={() => onChegou?.(p)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                      <LogIn size={15} /> Confirmar chegada
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {recusando && <RecusarPedido pedido={recusando} fechar={() => setRecusando(null)} />}
    </div>
  );
}
