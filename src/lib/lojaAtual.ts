// ✅ Loja de quem entrou no sistema (definida no login).
// Arquivo sem Firebase, para poder ser usado em qualquer lugar (inclusive testes puros).
import { CORES_PADRAO, coresValidas, type CoresLoja } from '../utils/cores';
import { modulosDaLoja, type ModuloId, type Modulos } from '../utils/modulos';

export interface LojaInfo {
  id: string;
  nome: string;
  logoUrl?: string;
  plano?: string;
  status?: string;
  cores?: CoresLoja; // personalização do topo (sem ela fica o padrão)
  modulos?: Partial<Modulos>; // liberados pelo proprietário (sem o campo: só Banho e tosa)
}

/** Dados da loja atual (para avisos do sistema) */
export function lojaAtual(): LojaInfo | null {
  return atual;
}

let atual: LojaInfo | null = null;
const aoTrocar = new Set<() => void>();
const aoMudar = new Set<() => void>();

/** Avisa qualquer mudança na loja atual, inclusive logo e cores salvas na Personalização */
export function aoMudarLoja(fn: () => void): () => void {
  aoMudar.add(fn);
  return () => { aoMudar.delete(fn); };
}

/** Avisa quando a loja muda (login, logout, troca de conta) para os caches recomeçarem */
export function aoTrocarDeLoja(fn: () => void): () => void {
  aoTrocar.add(fn);
  return () => { aoTrocar.delete(fn); };
}

export const SEM_LOJA = 'SEM_LOJA';

export function definirLoja(loja: LojaInfo | null) {
  const mudou = (atual?.id ?? null) !== (loja?.id ?? null);
  atual = loja;
  if (mudou) aoTrocar.forEach((fn) => fn());
  aoMudar.forEach((fn) => fn());
}

/** Troca logo e cores da loja atual na tela, sem precisar entrar de novo */
export function atualizarVisualLoja(visual: { logoUrl?: string; cores?: CoresLoja }) {
  if (!atual) return;
  atual = { ...atual, logoUrl: visual.logoUrl, cores: visual.cores };
  aoMudar.forEach((fn) => fn());
}

/** Id da loja atual; lança SEM_LOJA se ninguém entrou ainda */
export function lojaId(): string {
  if (!atual) throw new Error(SEM_LOJA);
  return atual.id;
}

/** Nome da loja para telas, mensagens e relatórios */
export function nomeLoja(): string {
  return atual?.nome ?? '';
}

/** Logo da loja (ou a do Pata & Gestão, se a loja não tiver) */
export function logoLoja(): string {
  return atual?.logoUrl || '/logo-pata-gestao.png';
}

/** A loja escolheu cores próprias? */
export function lojaTemCores(): boolean {
  return coresValidas(atual?.cores) !== null;
}

/** Cores do topo da loja (ou as do padrão) */
export function coresLoja(): CoresLoja {
  return coresValidas(atual?.cores) ?? CORES_PADRAO;
}

/** A loja atual tem este módulo liberado? */
export function temModulo(id: ModuloId): boolean {
  return modulosDaLoja(atual)[id];
}
