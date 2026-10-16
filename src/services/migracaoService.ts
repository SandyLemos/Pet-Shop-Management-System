// ✅ Migração única: copia os dados do formato antigo (raiz do banco) para o
// espaço de uma loja (lojas/{id}/...). Só COPIA: o original fica intacto até
// o dono conferir e mandar apagar (etapa separada).
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { listarDias } from './petService';
import type { Loja } from '../utils/dono';

/** Primeiro dia com dados no sistema antigo */
const INICIO_DO_SISTEMA = '2026-01-01';
const COLECOES = ['petsCadastro', 'profissionais', 'racas', 'contadores', 'slotsUsados'] as const;

export const JA_MIGRADO = 'JA_MIGRADO';

export interface Contagem {
  fichas: number;
  profissionais: number;
  racas: number;
  contadores: number;
  slotsUsados: number;
  dias: number;
  naFila: number;
  atendimentos: number;
  usuarios: number;
}

export interface ResultadoMigracao {
  origem: Contagem;
  destino: Contagem;
  confere: boolean;
}

type Docs = { id: string; data: any }[];

const ler = async (...caminho: string[]): Promise<Docs> =>
  (await getDocs((collection as any)(db, ...caminho))).docs.map((d: any) => ({ id: d.id, data: d.data() }));

/** Grava em blocos para não travar a conexão do aparelho */
async function gravarTudo(escritas: (() => Promise<unknown>)[], aoAvancar?: (feitos: number, total: number) => void) {
  for (let i = 0; i < escritas.length; i += 25) {
    await Promise.all(escritas.slice(i, i + 25).map((w) => w()));
    aoAvancar?.(Math.min(i + 25, escritas.length), escritas.length);
  }
}

/** Lê tudo de uma "raiz" (o banco antigo = [], uma loja = ['lojas', id]) */
async function lerBase(raiz: string[], hoje: string) {
  const colecoes: Record<string, Docs> = {};
  for (const c of COLECOES) colecoes[c] = await ler(...raiz, c);
  const diasComDoc = await ler(...raiz, 'dias');
  const nomesDias = [...new Set([...diasComDoc.map((d) => d.id), ...listarDias(INICIO_DO_SISTEMA, hoje)])].sort();
  const dias: { dia: string; doc?: any; pets: Docs; logs: Docs }[] = [];
  for (let i = 0; i < nomesDias.length; i += 10) {
    const lote = await Promise.all(nomesDias.slice(i, i + 10).map(async (dia) => ({
      dia,
      doc: diasComDoc.find((d) => d.id === dia)?.data,
      pets: await ler(...raiz, 'dias', dia, 'pets'),
      logs: await ler(...raiz, 'dias', dia, 'logs'),
    })));
    dias.push(...lote.filter((d) => d.doc || d.pets.length || d.logs.length));
  }
  return { colecoes, dias };
}

function contar(base: Awaited<ReturnType<typeof lerBase>>, usuarios: number): Contagem {
  return {
    fichas: base.colecoes.petsCadastro.length,
    profissionais: base.colecoes.profissionais.length,
    racas: base.colecoes.racas.length,
    contadores: base.colecoes.contadores.length,
    slotsUsados: base.colecoes.slotsUsados.length,
    dias: base.dias.length,
    naFila: base.dias.reduce((s, d) => s + d.pets.length, 0),
    atendimentos: base.dias.reduce((s, d) => s + d.logs.length, 0),
    usuarios,
  };
}

/**
 * Copia o banco antigo para a loja `loja.id`, cria a loja e liga os funcionários a ela.
 * Recusa (JA_MIGRADO) se a loja já foi migrada: rodar de novo apagaria o que a loja fez depois.
 */
export async function migrarDadosAntigos(
  loja: Pick<Loja, 'id' | 'nome'> & Partial<Loja>,
  hoje: string,
  aoAvancar?: (texto: string) => void,
): Promise<ResultadoMigracao> {
  const lojaRef = doc(db, 'lojas', loja.id);
  const existente = await getDoc(lojaRef);
  if (existente.exists() && existente.data()?.migradaEm) throw new Error(JA_MIGRADO);

  aoAvancar?.('Lendo os dados antigos...');
  const origem = await lerBase([], hoje);
  const usuarios = (await ler('usuarios')).filter((u) => !u.data.lojaId);

  const destino = ['lojas', loja.id];
  const escritas: (() => Promise<unknown>)[] = [];
  for (const c of COLECOES) {
    for (const d of origem.colecoes[c]) escritas.push(() => setDoc((doc as any)(db, ...destino, c, d.id), d.data));
  }
  for (const d of origem.dias) {
    if (d.doc) escritas.push(() => setDoc((doc as any)(db, ...destino, 'dias', d.dia), d.doc));
    for (const p of d.pets) escritas.push(() => setDoc((doc as any)(db, ...destino, 'dias', d.dia, 'pets', p.id), p.data));
    for (const l of d.logs) escritas.push(() => setDoc((doc as any)(db, ...destino, 'dias', d.dia, 'logs', l.id), l.data));
  }

  // a loja nasce antes da cópia, para as regras já reconhecerem o espaço dela
  const { id: _id, ...dadosLoja } = loja;
  await setDoc(lojaRef, {
    plano: 'profissional', mensalidade: 0, vencimentoDia: 10, status: 'ativa', criadaEm: hoje,
    ...dadosLoja,
  }, { merge: true });

  await gravarTudo(escritas, (f, t) => aoAvancar?.(`Copiando... ${f} de ${t}`));

  aoAvancar?.('Ligando os funcionários à loja...');
  await gravarTudo(usuarios.map((u) => () => updateDoc(doc(db, 'usuarios', u.id), { lojaId: loja.id })));

  aoAvancar?.('Conferindo...');
  const copiado = await lerBase(destino, hoje);
  const ligados = (await ler('usuarios')).filter((u) => u.data.lojaId === loja.id).length;
  const resultado: ResultadoMigracao = {
    origem: contar(origem, usuarios.length),
    destino: contar(copiado, ligados),
    confere: false,
  };
  const o = resultado.origem, dd = resultado.destino;
  resultado.confere = (Object.keys(o) as (keyof Contagem)[])
    .every((k) => (k === 'usuarios' ? dd[k] >= o[k] : dd[k] === o[k]));

  // só marca como migrada se bateu: senão dá para rodar de novo
  if (resultado.confere) await updateDoc(lojaRef, { migradaEm: hoje });
  return resultado;
}
