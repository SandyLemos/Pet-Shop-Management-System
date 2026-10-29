// ✅ Painel do Dono: tipos e contas (sem Firebase, para poder testar).
import type { Modulos } from './modulos';

export type PlanoId = 'basico' | 'profissional' | 'rede';
export type StatusLoja = 'ativa' | 'teste' | 'bloqueada';
/** Situação mostrada no painel: "atrasada" sai das mensalidades, não é gravada na loja */
export type Situacao = StatusLoja | 'atrasada';

export interface Loja {
  id: string;
  nome: string;
  cidade?: string;
  responsavel?: string;
  telefone?: string;
  emailAdmin?: string;
  plano: PlanoId;
  mensalidade: number;
  vencimentoDia: number;
  status: StatusLoja;
  /** último dia do teste grátis (AAAA-MM-DD) */
  fimTeste?: string;
  logoUrl?: string;
  /** cores do topo escolhidas na Personalização da loja */
  cores?: { principal: string; destaque: string };
  /** AAAA-MM-DD */
  criadaEm?: string;
  /** primeiro mês com mensalidade (AAAA-MM); antes disso não cobra */
  cobrarDesde?: string;
  migradaEm?: string;
  /** módulos liberados pelo proprietário (sem o campo: só Banho e tosa) */
  modulos?: Partial<Modulos>;
}

export interface Cobranca {
  id: string;
  lojaId: string;
  /** AAAA-MM */
  mes: string;
  valor: number;
  /** AAAA-MM-DD */
  pagaEm: string;
}

export interface Atividade {
  /** atendimentos entregues por dia (AAAA-MM-DD), últimos 30 dias */
  porDia: Record<string, number>;
  usuarios: number;
  /** a loja já começou a usar (tem atendimento ou ficha de pet). Sem o dado, conta como já usou. */
  jaUsou?: boolean;
}

export type AlvoComunicado = 'todas' | 'teste' | PlanoId;

export interface Comunicado {
  id: string;
  titulo: string;
  texto: string;
  alvo: AlvoComunicado;
  ativo: boolean;
  /** AAAA-MM-DD */
  criadoEm: string;
}

export interface DadosDono {
  hoje: string;
  lojas: Loja[];
  cobrancas: Cobranca[];
  atividade: Record<string, Atividade>;
  comunicados: Comunicado[];
  /** ainda existem dados no formato antigo (antes das várias lojas) */
  migracaoPendente: boolean;
}

export interface Plano {
  id: PlanoId;
  nome: string;
  preco: number;
  descricao: string;
  recursos: string[];
}

// ⚠️ Valores de EXEMPLO: os planos de verdade (por módulos) ainda serão definidos.
export const PLANOS: Plano[] = [
  { id: 'basico', nome: 'Básico', preco: 89, descricao: 'Para o petshop pequeno começar a se organizar.',
    recursos: ['1 loja', 'Até 3 usuários', 'Fila, grade e fichas', 'Aviso pelo WhatsApp', 'Backup manual'] },
  { id: 'profissional', nome: 'Profissional', preco: 149, descricao: 'Para quem quer números e controle da equipe.',
    recursos: ['1 loja', 'Usuários ilimitados', 'Tudo do Básico', 'Análises e dicas', 'Relatórios em PDF'] },
  { id: 'rede', nome: 'Rede', preco: 119, descricao: 'Por unidade, para redes e clínicas com várias lojas.',
    recursos: ['A partir de 2 lojas', 'Tudo do Profissional', 'Visão de todas as unidades', 'Suporte prioritário'] },
];

export const nomePlano = (id: string) => PLANOS.find((p) => p.id === id)?.nome ?? id;

/** Dias de atraso a partir dos quais o painel sugere bloquear a loja */
export const DIAS_PARA_BLOQUEIO = 15;

// ─── Datas (AAAA-MM-DD, sem fuso) ─────────────────────────────────────────────
const utc = (dia: string) => Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10));
const paraDia = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const diasEntre = (de: string, ate: string) => Math.round((utc(ate) - utc(de)) / 86_400_000);
export const somarDias = (dia: string, n: number) => paraDia(utc(dia) + n * 86_400_000);
export const mesDe = (dia: string) => dia.slice(0, 7);

/** Mês anterior/seguinte: somarMeses('2026-01', -1) = '2025-12' */
export function somarMeses(mes: string, n: number): string {
  const d = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Vencimento da loja no mês (dia 31 vira o último dia de meses curtos) */
export function vencimentoNoMes(loja: Pick<Loja, 'vencimentoDia'>, mes: string): string {
  const ultimo = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  const dia = Math.min(Math.max(1, Math.round(loja.vencimentoDia || 1)), ultimo);
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

export const idCobranca = (lojaId: string, mes: string) => `${lojaId}_${mes}`;

// ─── Mensalidades ─────────────────────────────────────────────────────────────
export interface LinhaFinanceiro {
  loja: Loja;
  mes: string;
  valor: number;
  vencimento: string;
  status: 'paga' | 'a_vencer' | 'atrasada';
  pagaEm?: string;
  diasAtraso: number;
}

/** Primeiro mês cobrado para quem começa a pagar em `inicio` (o 1º vencimento a partir dessa data) */
export function primeiroMesCobrado(loja: Pick<Loja, 'vencimentoDia'>, inicio: string): string {
  const mes = mesDe(inicio);
  return vencimentoNoMes(loja, mes) >= inicio ? mes : somarMeses(mes, 1);
}

/** Lojas que pagam no mês: ativas e bloqueadas (a dívida continua).
 *  Fora: loja em teste, loja com mensalidade zero (cortesia) e meses antes de `cobrarDesde`. */
export function linhasFinanceiro(lojas: Loja[], cobrancas: Cobranca[], mes: string, hoje: string): LinhaFinanceiro[] {
  const pagas = new Map(cobrancas.map((c) => [c.id, c]));
  return lojas
    // loja bloqueada sai da cobrança (só fica o que ela já pagou)
    .filter((l) => l.status !== 'teste' && l.mensalidade > 0 && (!l.cobrarDesde || l.cobrarDesde <= mes)
      && (l.status !== 'bloqueada' || pagas.has(idCobranca(l.id, mes))))
    .map((l) => {
      const c = pagas.get(idCobranca(l.id, mes));
      const vencimento = vencimentoNoMes(l, mes);
      const atraso = c ? 0 : Math.max(0, diasEntre(vencimento, hoje));
      return {
        loja: l, mes, vencimento,
        valor: c?.valor ?? l.mensalidade,
        status: c ? 'paga' : atraso > 0 ? 'atrasada' : 'a_vencer',
        pagaEm: c?.pagaEm,
        diasAtraso: atraso,
      } as LinhaFinanceiro;
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.loja.nome.localeCompare(b.loja.nome, 'pt-BR'));
}

/** Situação da loja no painel e há quantos dias está atrasada (olha este mês e o anterior) */
export function situacaoDaLoja(loja: Loja, cobrancas: Cobranca[], hoje: string): { situacao: Situacao; diasAtraso: number } {
  if (loja.status === 'bloqueada' || loja.status === 'teste') {
    const atraso = loja.status === 'bloqueada' ? maiorAtraso(loja, cobrancas, hoje) : 0;
    return { situacao: loja.status, diasAtraso: atraso };
  }
  const atraso = maiorAtraso(loja, cobrancas, hoje);
  return { situacao: atraso > 0 ? 'atrasada' : 'ativa', diasAtraso: atraso };
}

function maiorAtraso(loja: Loja, cobrancas: Cobranca[], hoje: string): number {
  const mes = mesDe(hoje);
  return Math.max(0, ...[somarMeses(mes, -1), mes].flatMap((m) =>
    linhasFinanceiro([{ ...loja, status: 'ativa' }], cobrancas, m, hoje).map((x) => (x.status === 'atrasada' ? x.diasAtraso : 0)),
  ));
}

/** Receita recebida por mês (mensalidades pagas), dos últimos `meses` meses até o atual */
export function receitaPorMes(cobrancas: Cobranca[], hoje: string, meses = 6) {
  const atual = mesDe(hoje);
  return Array.from({ length: meses }, (_, i) => {
    const mes = somarMeses(atual, i - (meses - 1));
    return { mes, receita: cobrancas.filter((c) => c.mes === mes).reduce((s, c) => s + c.valor, 0) };
  });
}

// ─── Uso do sistema ───────────────────────────────────────────────────────────
export interface ResumoUso {
  hoje: number;
  ultimos30: number;
  /** dias desde o último atendimento (null = nenhum nos últimos 30 dias) */
  diasSemUso: number | null;
  usuarios: number;
  /** a loja ainda não fez o primeiro atendimento (não conta como "sem uso") */
  naoComecou: boolean;
}

export function resumoUso(a: Atividade | undefined, hoje: string): ResumoUso {
  const porDia = a?.porDia ?? {};
  const comMovimento = Object.keys(porDia).filter((d) => porDia[d] > 0).sort();
  const ultimo = comMovimento.at(-1);
  return {
    hoje: porDia[hoje] ?? 0,
    ultimos30: Object.values(porDia).reduce((s, n) => s + n, 0),
    diasSemUso: ultimo ? diasEntre(ultimo, hoje) : null,
    usuarios: a?.usuarios ?? 0,
    naoComecou: !ultimo && a?.jaUsou === false,
  };
}

export function textoUltimoUso(r: ResumoUso): string {
  if (r.naoComecou) return 'ainda sem atendimentos';
  if (r.diasSemUso === null) return 'sem uso em 30 dias';
  if (r.diasSemUso === 0) return 'hoje';
  if (r.diasSemUso === 1) return 'ontem';
  return `há ${r.diasSemUso} dias`;
}

// ─── Alertas ──────────────────────────────────────────────────────────────────
export interface Alerta {
  loja: Loja;
  tipo: 'atraso' | 'teste' | 'sem_uso';
  texto: string;
  acao: string;
}

export function alertasDoDono(d: DadosDono): Alerta[] {
  const out: Alerta[] = [];
  for (const loja of d.lojas) {
    const { situacao, diasAtraso } = situacaoDaLoja(loja, d.cobrancas, d.hoje);
    if (situacao === 'atrasada') {
      out.push({ loja, tipo: 'atraso', acao: diasAtraso >= DIAS_PARA_BLOQUEIO ? 'Bloquear' : 'Cobrar',
        texto: `Mensalidade atrasada há ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}${diasAtraso >= DIAS_PARA_BLOQUEIO ? ' (já pode bloquear)' : ''}` });
    }
    if (loja.status === 'teste' && loja.fimTeste) {
      const faltam = diasEntre(d.hoje, loja.fimTeste);
      if (faltam < 0) out.push({ loja, tipo: 'teste', acao: 'Ativar', texto: 'Teste acabou: a loja não consegue entrar' });
      else if (faltam <= 7) out.push({ loja, tipo: 'teste', acao: 'Falar com a loja', texto: `Teste grátis acaba em ${fmtDia(loja.fimTeste)}` });
    }
    if (loja.status !== 'bloqueada' && !(loja.status === 'teste' && loja.fimTeste && loja.fimTeste < d.hoje)) {
      const uso = resumoUso(d.atividade[loja.id], d.hoje);
      // loja que ainda não começou a usar não entra no alerta: conta a partir do primeiro atendimento
      if (!uso.naoComecou && (uso.diasSemUso === null || uso.diasSemUso >= 7)) {
        out.push({ loja, tipo: 'sem_uso', acao: 'Ver loja',
          texto: uso.diasSemUso === null ? 'Nenhum atendimento nos últimos 30 dias' : `Nenhum atendimento há ${uso.diasSemUso} dias (risco de cancelar)` });
      }
    }
  }
  const ordem = { atraso: 0, teste: 1, sem_uso: 2 };
  return out.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
}

// ─── Comunicados ──────────────────────────────────────────────────────────────
/** O comunicado vale para esta loja? */
export function comunicadoParaLoja(c: Pick<Comunicado, 'alvo' | 'ativo'>, loja: Pick<Loja, 'plano' | 'status'>): boolean {
  if (!c.ativo) return false;
  if (c.alvo === 'todas') return true;
  if (c.alvo === 'teste') return loja.status === 'teste';
  return loja.plano === c.alvo;
}

// ─── Nova loja ────────────────────────────────────────────────────────────────
/** Id da loja a partir do nome: "Banho & Cheiroso" → "banho-cheiroso" (sem repetir) */
export function idParaLoja(nome: string, existentes: string[]): string {
  const base = nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'loja';
  let id = base;
  for (let n = 2; existentes.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export const fmtDia = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
