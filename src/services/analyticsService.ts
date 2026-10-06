// ✅ Carrega os dados do painel de Análises (atendimentos dos últimos 90 dias + fichas).
import { getLogsByDate, getAllPetsCadastro } from './petService';
import { diasEntre, somarDias, type LogDoDia, type FichaResumo } from '../utils/analytics';

export const DIAS_ANALISE = 90;

function dataISO(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return null;
}

/** Busca de 10 em 10 dias para não sobrecarregar a conexão do tablet. */
export async function carregarDadosAnalise(hoje: string): Promise<{ logs: LogDoDia[]; fichas: FichaResumo[] }> {
  // 90 dias cobrem o maior período (90 dias) e também a comparação dos
  // períodos menores (30 dias + 30 anteriores; mês atual + mês anterior).
  const dias = diasEntre(somarDias(hoje, -(DIAS_ANALISE - 1)), hoje);
  const logs: LogDoDia[] = [];
  for (let i = 0; i < dias.length; i += 10) {
    const lote = await Promise.all(dias.slice(i, i + 10).map(async (dia) => (await getLogsByDate(dia)).map((l) => ({ ...l, dia }))));
    lote.forEach((l) => logs.push(...l));
  }
  const fichas = (await getAllPetsCadastro()).map((f: any) => ({
    petNumber: f.petNumber, nomePet: f.nomePet, nomeTutor: f.nomeTutor, telefone: f.telefone, criadoEm: dataISO(f.criadoEm),
  }));
  return { logs, fichas };
}
