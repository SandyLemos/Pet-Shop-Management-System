import { useEffect, useMemo, useState } from 'react';
import { lojaId, temModulo } from '../lib/lojaAtual';
import { liberarCancelado, ouvirDiasOnline, ouvirPedidosDaLoja, type DiaOnline, type Pedido } from '../services/agendamentoService';

export interface AgendaOnline {
  /** vagas da grade de hoje reservadas para o agendamento online */
  vagasHoje: Set<number>;
  /** pedido em aberto de cada vaga de hoje (a confirmar ou aguardando chegada) */
  pedidoNaVaga: Map<number, Pedido>;
  /** pedidos de qualquer dia esperando a loja confirmar */
  aConfirmar: Pedido[];
  /** o que a página do tutor mostra hoje como ocupado (null = ainda não leu) */
  publicadoHoje: { ocupadas: number[]; petsNaLoja: number } | null;
}

const VAZIA: AgendaOnline = { vagasHoje: new Set(), pedidoNaVaga: new Map(), aConfirmar: [], publicadoHoje: null };

/**
 * ✅ Agendamento online na loja: vagas online de hoje e pedidos em aberto, ao vivo.
 * Só liga quando a loja tem o módulo. Pedido cancelado pelo tutor tem a vaga solta aqui.
 */
export function useAgendaOnline(ativo: boolean, dia: string): AgendaOnline {
  const [diaPublico, setDiaPublico] = useState<DiaOnline | null | undefined>(undefined); // undefined = lendo
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const ligado = ativo && temModulo('agendamento');

  useEffect(() => {
    setDiaPublico(undefined); setPedidos([]);
    if (!ligado) return;
    const loja = lojaId();
    const a = ouvirDiasOnline(loja, dia, (dias) => setDiaPublico(dias.find((d) => d.dia === dia) ?? null));
    const b = ouvirPedidosDaLoja(setPedidos);
    return () => { a(); b(); };
  }, [ligado, dia]);

  // o tutor cancelou: solta a vaga para outro tutor poder marcar
  useEffect(() => {
    pedidos.filter((p) => p.status === 'cancelado').forEach((p) => {
      liberarCancelado(p).catch((e) => console.error('[agendamento] liberar cancelado', e));
    });
  }, [pedidos]);

  return useMemo(() => {
    if (!ligado) return VAZIA;
    const pedidoNaVaga = new Map<number, Pedido>();
    pedidos.forEach((p) => {
      if (p.dia === dia && (p.status === 'pendente' || p.status === 'confirmado')) pedidoNaVaga.set(p.vaga, p);
    });
    return {
      vagasHoje: new Set(diaPublico?.vagas ?? []),
      pedidoNaVaga,
      aConfirmar: pedidos.filter((p) => p.status === 'pendente'),
      publicadoHoje: diaPublico === undefined ? null
        : { ocupadas: diaPublico?.ocupadas ?? [], petsNaLoja: diaPublico?.petsNaLoja ?? 0 },
    };
  }, [ligado, diaPublico, pedidos, dia]);
}
