// ✅ Agendamento online pelo tutor (módulo "agendamento"). Caminhos em utils/agendamento.ts.
// O tutor não tem login: ele só lê a agenda pública e cria/cancela o próprio pedido.
// Todo o resto (liberar vagas, confirmar, recusar, chegada) é feito pela equipe da loja.
import {
  collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { lojaId } from '../lib/loja';
import { lojaAtual } from '../lib/lojaAtual';
import {
  STATUS_ABERTOS, expiraEmDoPedido, gerarCodigo, limparPedido,
  type DadosPedido, type StatusPedido,
} from '../utils/agendamento';

export interface AgendaPublica {
  ativo: boolean;
  nomeLoja: string;
  logoUrl?: string | null;
  cores?: { principal: string; destaque: string } | null;
}

export interface DiaOnline {
  dia: string;
  vagas: number[];
}

export interface Pedido extends DadosPedido {
  codigo: string;
  lojaId: string;
  nomeLoja: string;
  logoUrl?: string | null;
  cores?: { principal: string; destaque: string } | null;
  dia: string;
  vaga: number;
  status: StatusPedido;
  criadoEm: number;
  atualizadoEm: number;
  expiraEm: number;
  motivo?: string;
  petId?: string;
}

export const VAGA_TOMADA = 'VAGA_TOMADA';

const refAgenda = (loja: string) => doc(db, 'agendaPublica', loja);
const colDias = (loja: string) => collection(db, 'agendaPublica', loja, 'dias');
const refDia = (loja: string, dia: string) => doc(db, 'agendaPublica', loja, 'dias', dia);
const colMarcadas = (loja: string, dia: string) => collection(db, 'agendaPublica', loja, 'dias', dia, 'marcadas');
const refMarcada = (loja: string, dia: string, vaga: number) => doc(db, 'agendaPublica', loja, 'dias', dia, 'marcadas', String(vaga));
const refPedido = (codigo: string) => doc(db, 'agendamentos', codigo);

// ─── Agenda pública (tutor e loja) ───────────────────────────────────────────

export function ouvirAgenda(loja: string, cb: (a: AgendaPublica | null) => void): () => void {
  return onSnapshot(refAgenda(loja), (s: any) => cb(s.exists() ? (s.data() as AgendaPublica) : null), () => cb(null));
}

/** Dias com vagas online de hoje em diante */
export function ouvirDiasOnline(loja: string, hoje: string, cb: (dias: DiaOnline[]) => void): () => void {
  return onSnapshot(
    query(colDias(loja), where('dia', '>=', hoje)),
    (s: any) => cb(s.docs.map((d: any) => ({ dia: d.id, vagas: (d.data().vagas ?? []) as number[] }))
      .sort((a: DiaOnline, b: DiaOnline) => a.dia.localeCompare(b.dia))),
    () => cb([]),
  );
}

/** Vagas online já marcadas num dia (só os números, sem dados do tutor) */
export function ouvirMarcadas(loja: string, dia: string, cb: (vagas: number[]) => void): () => void {
  return onSnapshot(colMarcadas(loja, dia), (s: any) => cb(s.docs.map((d: any) => Number(d.id))), () => cb([]));
}

// ─── Tutor ───────────────────────────────────────────────────────────────────

/** Marca a vaga e cria o pedido juntos. Se outra pessoa marcou antes, lança VAGA_TOMADA. */
export async function criarPedido(loja: string, agenda: AgendaPublica, dia: string, vaga: number, dados: DadosPedido): Promise<string> {
  const codigo = gerarCodigo(24);
  const agora = Date.now();
  const pedido: Omit<Pedido, 'codigo'> = {
    ...limparPedido(dados),
    lojaId: loja,
    nomeLoja: agenda.nomeLoja ?? '',
    logoUrl: agenda.logoUrl ?? null,
    cores: agenda.cores ?? null,
    dia,
    vaga,
    status: 'pendente',
    criadoEm: agora,
    atualizadoEm: agora,
    expiraEm: expiraEmDoPedido(dia),
  };
  try {
    await runTransaction(db, async (tx: any) => {
      const trava = await tx.get(refMarcada(loja, dia, vaga));
      if (trava.exists()) throw new Error(VAGA_TOMADA);
      tx.set(refMarcada(loja, dia, vaga), { criadoEm: serverTimestamp() });
      tx.set(refPedido(codigo), pedido);
    });
  } catch (err) {
    // a regra recusa a gravação quando a vaga já foi marcada (corrida entre dois tutores)
    if (err instanceof Error && (err.message === VAGA_TOMADA || /permission/i.test(err.message))) throw new Error(VAGA_TOMADA);
    throw err;
  }
  return codigo;
}

export function ouvirPedido(codigo: string, cb: (p: Pedido | null) => void): () => void {
  return onSnapshot(
    refPedido(codigo),
    (s: any) => cb(s.exists() ? ({ ...(s.data() as Pedido), codigo }) : null),
    () => cb(null),
  );
}

/** O tutor cancela; a loja libera a vaga quando vê o cancelamento */
export async function cancelarPedido(codigo: string): Promise<void> {
  await updateDoc(refPedido(codigo), { status: 'cancelado', atualizadoEm: Date.now() });
}

// ─── Loja ────────────────────────────────────────────────────────────────────

/** Liga/desliga a página pública e copia nome, logo e cores da loja */
export async function publicarAgenda(loja: string, dados: AgendaPublica): Promise<void> {
  await setDoc(refAgenda(loja), {
    ativo: dados.ativo,
    nomeLoja: dados.nomeLoja ?? '',
    logoUrl: dados.logoUrl ?? null,
    cores: dados.cores ?? null,
    atualizadoEm: Date.now(),
  });
}

/** Página pública da loja atual (o admin atualiza ao liberar vagas) */
export async function publicarAgendaDaLojaAtual(): Promise<void> {
  const l = lojaAtual();
  await publicarAgenda(lojaId(), { ativo: true, nomeLoja: l?.nome ?? '', logoUrl: l?.logoUrl ?? null, cores: l?.cores ?? null });
}

export async function salvarVagasDoDia(dia: string, vagas: number[]): Promise<void> {
  await setDoc(refDia(lojaId(), dia), { dia, vagas, atualizadoEm: Date.now() });
}

/** Pedidos em aberto da loja atual, ao vivo */
export function ouvirPedidosDaLoja(cb: (p: Pedido[]) => void, onErro?: (e: unknown) => void): () => void {
  return onSnapshot(
    query(collection(db, 'agendamentos'), where('lojaId', '==', lojaId()), where('status', 'in', STATUS_ABERTOS)),
    (s: any) => cb(s.docs.map((d: any) => ({ ...(d.data() as Pedido), codigo: d.id }))
      .sort((a: Pedido, b: Pedido) => a.criadoEm - b.criadoEm)),
    (e) => { console.error('[agendamento] pedidos', e); onErro?.(e); },
  );
}

const mudarStatus = (codigo: string, status: StatusPedido, extra: Record<string, unknown> = {}) =>
  updateDoc(refPedido(codigo), { status, atualizadoEm: Date.now(), ...extra });

const soltarVaga = (p: Pedido) => deleteDoc(refMarcada(p.lojaId, p.dia, p.vaga));

export async function confirmarPedido(p: Pedido): Promise<void> {
  await mudarStatus(p.codigo, 'confirmado');
}

export async function recusarPedido(p: Pedido, motivo: string): Promise<void> {
  await mudarStatus(p.codigo, 'recusado', { motivo: motivo.trim().slice(0, 200) });
  await soltarVaga(p);
}

export async function marcarFaltou(p: Pedido): Promise<void> {
  await mudarStatus(p.codigo, 'faltou');
  await soltarVaga(p);
}

/** Tutor cancelou: a loja solta a vaga para outro tutor poder marcar */
export async function liberarCancelado(p: Pedido): Promise<void> {
  await soltarVaga(p);
  await mudarStatus(p.codigo, 'cancelado_ok');
}

/** O pet chegou e entrou na fila: a vaga continua presa (agora com o pet dentro) */
export async function marcarChegou(p: Pedido, petId?: string): Promise<void> {
  await mudarStatus(p.codigo, 'chegou', petId ? { petId } : {});
}
