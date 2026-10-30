import { useEffect, useMemo, useState } from 'react';
import { lojaId, temModulo } from '../lib/lojaAtual';
import { liberarCancelado, ouvirDiasOnline, ouvirPedidosDaLoja, type DiaOnline, type Pedido } from '../services/agendamentoService';

export interface AgendaOnline {
  /** hoje tem agendamento online aberto */
  abertoHoje: boolean;
  /** pedidos de qualquer dia esperando a loja confirmar */
  aConfirmar: Pedido[];
  /** confirmados para hoje, esperando o pet chegar na loja (ou a loja buscar) */
  aguardandoChegada: Pedido[];
  /** quantos pets a página do tutor mostra na loja agora (null = ainda não leu) */
  petsNaLojaPublicado: number | null;
}

const VAZIA: AgendaOnline = { abertoHoje: false, aConfirmar: [], aguardandoChegada: [], petsNaLojaPublicado: null };

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
    return {
      abertoHoje: (diaPublico?.vagas.length ?? 0) > 0,
      aConfirmar: pedidos.filter((p) => p.status === 'pendente'),
      // confirmados de hoje (e de dias anteriores que ninguém encerrou), na ordem em que foram marcados
      aguardandoChegada: pedidos.filter((p) => (p.status === 'confirmado' || p.status === 'buscando') && p.dia <= dia),
      petsNaLojaPublicado: diaPublico === undefined ? null : diaPublico?.petsNaLoja ?? 0,
    };
  }, [ligado, diaPublico, pedidos, dia]);
}
