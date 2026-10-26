// ✅ Portal do tutor: documento público do link em acompanhamentos/{codigo}.
// Guarda só o necessário (pet, loja, serviço, etapas) e vale até o dia seguinte.
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { docLoja, lojaId } from '../lib/loja';
import { lojaAtual } from '../lib/lojaAtual';
import type { Pet } from '../app/types/pet';
import { CAMPO_HORA, expiraEmDoDia, gerarCodigo, type SituacaoTutor } from '../utils/acompanhamento';
import { getTodayKey } from './petService';

export interface Acompanhamento {
  lojaId: string;
  nomeLoja: string;
  logoUrl?: string | null;
  cores?: { principal: string; destaque: string } | null;
  nomePet: string;
  especie?: string | null;
  servico: string;
  status: SituacaoTutor;
  dia: string;
  expiraEm: number;
  atualizadoEm: number;
  chegouEm?: number;
  banhoEm?: number;
  escovarEm?: number;
  tosaEm?: number;
  prontoEm?: number;
  entregueEm?: number;
}

const refLink = (codigo: string) => doc(db, 'acompanhamentos', codigo);

/** Situação do link a partir do status do pet na fila */
const situacaoDoPet = (pet: Pet): SituacaoTutor =>
  (['espera', 'banho', 'escovar', 'tosa', 'finalizado'].includes(pet.status) ? pet.status : 'espera') as SituacaoTutor;

/**
 * Cria o link do pet e guarda o código no pet da fila (campo linkTutor).
 * Chamado logo depois do cadastro na fila e, para pets antigos, pelo botão "Gerar link".
 */
export async function criarLinkTutor(pet: Pet): Promise<string> {
  const dia = pet.dia ?? getTodayKey();
  const loja = lojaAtual();
  const agora = Date.now();
  const status = situacaoDoPet(pet);
  const codigo = gerarCodigo();
  const chegada = Date.parse(pet.checkInTime);
  const dados: Acompanhamento = {
    lojaId: lojaId(),
    nomeLoja: loja?.nome ?? '',
    logoUrl: loja?.logoUrl ?? null,
    cores: loja?.cores ?? null,
    nomePet: pet.nomePet,
    especie: pet.especie ?? null,
    servico: pet.servico,
    status,
    dia,
    expiraEm: expiraEmDoDia(dia),
    atualizadoEm: agora,
    chegouEm: Number.isFinite(chegada) ? chegada : agora,
    ...(status !== 'espera' ? { [CAMPO_HORA[status as Exclude<SituacaoTutor, 'removido'>]]: agora } : {}),
  };
  await setDoc(refLink(codigo), dados);
  await updateDoc(docLoja('dias', dia, 'pets', pet.id), { linkTutor: codigo });
  return codigo;
}

/** Avança (ou volta) a etapa mostrada ao tutor. Nunca derruba a operação da loja. */
export async function atualizarLinkTutor(codigo: string | null | undefined, status: SituacaoTutor): Promise<void> {
  if (!codigo) return;
  const agora = Date.now();
  const campo = status === 'removido' ? null : CAMPO_HORA[status];
  try {
    await updateDoc(refLink(codigo), { status, atualizadoEm: agora, ...(campo ? { [campo]: agora } : {}) });
  } catch (err) {
    console.error('[link do tutor] não atualizou', err);
  }
}

/** Marca no pet que o link foi enviado ao tutor (para a equipe não mandar duas vezes) */
export async function marcarLinkEnviado(pet: Pet): Promise<void> {
  await updateDoc(docLoja('dias', pet.dia ?? getTodayKey(), 'pets', pet.id), { linkTutorEnviadoEm: new Date().toISOString() });
}

/** Página do tutor: escuta o link ao vivo. Link inexistente ou vencido → null. */
export function ouvirLinkTutor(codigo: string, cb: (dados: Acompanhamento | null) => void): () => void {
  return onSnapshot(
    refLink(codigo),
    (s: any) => cb(s.exists() ? (s.data() as Acompanhamento) : null),
    () => cb(null),
  );
}

/** Leitura única (testes e conferência) */
export async function lerLinkTutor(codigo: string): Promise<Acompanhamento | null> {
  const s = await getDoc(refLink(codigo));
  return s.exists() ? (s.data() as Acompanhamento) : null;
}
