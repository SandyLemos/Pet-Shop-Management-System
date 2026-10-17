// ✅ Espelho para o suporte: o que este aparelho está mostrando agora (aba e janela aberta).
// Arquivo sem Firebase. A Grade e o Fluxo avisam aqui; quem envia para o banco (só enquanto
// o proprietário está acompanhando) é o useSuporteAcompanhando.
import { createContext } from 'react';

export type AbaLoja = 'grid' | 'kanban' | 'entregues';
export type Janela =
  | { tipo: 'cadastro'; vaga: number }
  | { tipo: 'detalhe'; petId: string; vaga?: number };

export interface TelaDoAparelho {
  aba: AbaLoja;
  janela: Janela | null;
}

let tela: TelaDoAparelho = { aba: 'grid', janela: null };
const ouvintes = new Set<() => void>();

export const telaAtual = () => tela;

export function aoMudarTela(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

function mudar(nova: TelaDoAparelho) {
  if (JSON.stringify(nova) === JSON.stringify(tela)) return;
  tela = nova;
  ouvintes.forEach((fn) => fn());
}

export const informarAba = (aba: AbaLoja) => mudar({ aba, janela: null });
export const informarJanela = (janela: Janela | null) => mudar({ ...tela, janela });

/**
 * Na tela ao vivo do proprietário, a Grade e o Fluxo recebem a janela do aparelho
 * acompanhado por aqui e abrem a mesma janela (em vez de avisar a própria).
 * null = tela normal da loja.
 */
export const JanelaRemota = createContext<{ janela: Janela | null } | null>(null);
