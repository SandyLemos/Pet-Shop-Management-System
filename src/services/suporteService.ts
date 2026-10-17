// ✅ Suporte ao vivo: o proprietário acompanha o que cada aparelho da loja está fazendo.
// - lojas/{loja}/suporte/sessao: o proprietário marca que está olhando (renova a cada minuto).
// - lojas/{loja}/telas/{aparelho}: cada aparelho conta a aba e a janela aberta, SÓ enquanto
//   a sessão de suporte está valendo. Fora disso não grava nada.
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { docLoja } from '../lib/loja';
import type { TelaDoAparelho } from '../lib/espelho';

/** Por quanto tempo uma marcação do proprietário vale (ele renova a cada minuto) */
export const VALIDADE_SUPORTE_MS = 2 * 60_000;
export const RENOVAR_SUPORTE_MS = 60_000;

export interface TelaRemota extends TelaDoAparelho {
  id: string;
  nome: string;
  atualizadoEm: number;
}

// ─── lado da loja ─────────────────────────────────────────────────────────────

/** Avisa até quando o suporte está acompanhando (0 = ninguém) */
export function ouvirSuporte(cb: (ativoAte: number) => void): () => void {
  return onSnapshot(
    docLoja('suporte', 'sessao'),
    (s: any) => cb(s.exists() ? Number(s.data()?.ativoAte) || 0 : 0),
    () => cb(0),
  );
}

export async function publicarTela(aparelho: string, nome: string, tela: TelaDoAparelho) {
  await setDoc(docLoja('telas', aparelho), { nome, aba: tela.aba, janela: tela.janela, atualizadoEm: Date.now() });
}

export async function apagarTela(aparelho: string) {
  await deleteDoc(docLoja('telas', aparelho));
}

/** Identificação deste aparelho (fica guardada no navegador) */
export function idDoAparelho(): string {
  const chave = 'pg-aparelho';
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    localStorage.setItem(chave, novo);
    return novo;
  } catch {
    return (idSessao ??= crypto.randomUUID());
  }
}
let idSessao: string | undefined;

// ─── lado do proprietário ─────────────────────────────────────────────────────

export async function marcarSuporte(lojaId: string, uid: string) {
  await setDoc(doc(db, 'lojas', lojaId, 'suporte', 'sessao'), { ativoAte: Date.now() + VALIDADE_SUPORTE_MS, por: uid });
}

export async function encerrarSuporte(lojaId: string) {
  await deleteDoc(doc(db, 'lojas', lojaId, 'suporte', 'sessao'));
}

/** Aparelhos que deram sinal nos últimos minutos */
export function ouvirTelas(lojaId: string, cb: (telas: TelaRemota[]) => void): () => void {
  return onSnapshot(
    collection(db, 'lojas', lojaId, 'telas'),
    (s: any) => {
      const agora = Date.now();
      cb(s.docs.map((d: any) => ({ id: d.id, ...d.data() }) as TelaRemota)
        .filter((t: TelaRemota) => agora - (t.atualizadoEm || 0) < VALIDADE_SUPORTE_MS + 60_000)
        .sort((a: TelaRemota, b: TelaRemota) => a.nome.localeCompare(b.nome, 'pt-BR')));
    },
    () => cb([]),
  );
}

