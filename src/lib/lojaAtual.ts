// ✅ Loja de quem entrou no sistema (definida no login).
// Arquivo sem Firebase, para poder ser usado em qualquer lugar (inclusive testes puros).

export interface LojaInfo {
  id: string;
  nome: string;
  logoUrl?: string;
  plano?: string;
  status?: string;
}

/** Dados da loja atual (para avisos do sistema) */
export function lojaAtual(): LojaInfo | null {
  return atual;
}

let atual: LojaInfo | null = null;
const aoTrocar = new Set<() => void>();

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
