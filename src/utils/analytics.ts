// ✅ Cálculos do painel de Análises (funções puras, testáveis).
import type { LogEntry } from '../services/petService';
import { idDoDiaDe } from './dias';

export type LogDoDia = LogEntry & { dia: string };
export interface FichaResumo { petNumber: string; nomePet: string; nomeTutor: string; telefone?: string; criadoEm?: string | null }

export const SERVICO_LABEL: Record<string, string> = {
  banho: 'Banho', tosa: 'Tosa', banho_tosa: 'Banho + Tosa', hidratacao: 'Hidratação',
  higienica: 'Higiênica', ozonio: 'Ozônio', escovacao: 'Escovação',
};
export const PORTE_LABEL: Record<string, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
export const ESPECIE_LABEL: Record<string, string> = { cao: 'Cães', gato: 'Gatos' };

const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' });
const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Lista de dias (AAAA-MM-DD) de `inicio` até `fim`, inclusive. */
export function diasEntre(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${inicio}T12:00:00-03:00`);
  const end = new Date(`${fim}T12:00:00-03:00`);
  while (cur <= end) { out.push(idDoDiaDe(cur)); cur.setTime(cur.getTime() + 86_400_000); }
  return out;
}
export function somarDias(dia: string, n: number): string {
  return idDoDiaDe(new Date(new Date(`${dia}T12:00:00-03:00`).getTime() + n * 86_400_000));
}

export type Periodo = '7d' | '30d' | 'mes' | '90d';
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: 'mes', label: 'Este mês' }, { id: '90d', label: '90 dias' },
];

/** Intervalo do período e do período anterior (para comparar). 90 dias não compara. */
export function intervalos(periodo: Periodo, hoje: string) {
  let inicio: string;
  if (periodo === '7d') inicio = somarDias(hoje, -6);
  else if (periodo === '30d') inicio = somarDias(hoje, -29);
  else if (periodo === '90d') inicio = somarDias(hoje, -89);
  else inicio = `${hoje.slice(0, 8)}01`;
  const n = diasEntre(inicio, hoje).length;
  const anterior = periodo === '90d' ? null : { inicio: somarDias(inicio, -n), fim: somarDias(inicio, -1) };
  return { inicio, fim: hoje, anterior };
}

const noIntervalo = (dia: string, i: string, f: string) => dia >= i && dia <= f;
const entregues = (logs: LogDoDia[]) => logs.filter((l) => l.tipo === 'entregue');

export function variacao(atual: number, anterior: number | null): number | null {
  if (anterior === null || anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export function resumo(logs: LogDoDia[], fichas: FichaResumo[], inicio: string, fim: string) {
  const doPeriodo = logs.filter((l) => noIntervalo(l.dia, inicio, fim));
  const ent = entregues(doPeriodo);
  const duracoes = ent.map((l) => l.duracaoMinutos ?? 0).filter((m) => m > 0 && m < 24 * 60);
  const novos = fichas.filter((f) => f.criadoEm && noIntervalo(idDoDiaDe(new Date(f.criadoEm)), inicio, fim)).length;
  const petsAtendidos = new Set(ent.map((l) => l.petNumber || `${l.nomePet}|${l.nomeTutor}`)).size;
  return {
    atendimentos: ent.length,
    tempoMedioMin: duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : 0,
    clientesNovos: novos,
    clientesRetorno: Math.max(0, petsAtendidos - novos),
    removidos: doPeriodo.filter((l) => l.tipo === 'removido' || l.tipo === 'cancelado').length,
  };
}

export function porDia(logs: LogDoDia[], inicio: string, fim: string) {
  const cont = new Map<string, number>();
  for (const l of entregues(logs)) cont.set(l.dia, (cont.get(l.dia) ?? 0) + 1);
  return diasEntre(inicio, fim).map((d) => {
    const dt = new Date(`${d}T12:00:00-03:00`);
    return { dia: d, label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, semana: DIA_SEMANA[dt.getUTCDay()], atendimentos: cont.get(d) ?? 0 };
  });
}

export function porHora(logs: LogDoDia[], inicio: string, fim: string) {
  const cont = new Map<number, number>();
  for (const l of logs) {
    if (!noIntervalo(l.dia, inicio, fim) || l.tipo === 'avisado' || !l.checkInTime) continue;
    const h = Number(HORA.format(new Date(l.checkInTime)));
    if (!Number.isNaN(h)) cont.set(h, (cont.get(h) ?? 0) + 1);
  }
  if (cont.size === 0) return [];
  const horas = [...cont.keys()];
  const min = Math.min(7, ...horas), max = Math.max(18, ...horas);
  const out = [];
  for (let h = min; h <= max; h++) out.push({ hora: `${h}h`, chegadas: cont.get(h) ?? 0 });
  return out;
}

export function porServico(logs: LogDoDia[], inicio: string, fim: string) {
  const cont = new Map<string, number>();
  for (const l of entregues(logs)) if (noIntervalo(l.dia, inicio, fim)) cont.set(l.servico, (cont.get(l.servico) ?? 0) + 1);
  return [...cont.entries()].map(([s, n]) => ({ servico: SERVICO_LABEL[s] ?? s, total: n })).sort((a, b) => b.total - a.total);
}

export function porProfissional(logs: LogDoDia[], inicio: string, fim: string) {
  const m = new Map<string, { nome: string; banho: number; escovar: number; tosa: number; total: number }>();
  const add = (nome: string | null | undefined, etapa: 'banho' | 'escovar' | 'tosa') => {
    const n = (nome ?? '').trim();
    if (!n) return;
    const r = m.get(n) ?? { nome: n, banho: 0, escovar: 0, tosa: 0, total: 0 };
    r[etapa]++; r.total++; m.set(n, r);
  };
  for (const l of entregues(logs)) {
    if (!noIntervalo(l.dia, inicio, fim)) continue;
    add(l.profissionalBanho, 'banho'); add(l.profissionalEscovar, 'escovar'); add(l.profissionalTosa, 'tosa');
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function perfil(logs: LogDoDia[], inicio: string, fim: string) {
  const ent = entregues(logs).filter((l) => noIntervalo(l.dia, inicio, fim));
  const contar = (f: (l: LogDoDia) => string | null | undefined) => {
    const c = new Map<string, number>();
    for (const l of ent) { const k = f(l); if (k) c.set(k, (c.get(k) ?? 0) + 1); }
    return c;
  };
  const especie = [...contar((l) => l.especie).entries()].map(([k, v]) => ({ nome: ESPECIE_LABEL[k] ?? k, total: v }));
  const porteC = contar((l) => l.porte);
  const porte = ['pequeno', 'medio', 'grande'].map((k) => ({ nome: PORTE_LABEL[k], total: porteC.get(k) ?? 0 }));
  const racas = [...contar((l) => l.raca).entries()].map(([k, v]) => ({ nome: k, total: v }))
    .sort((a, b) => b.total - a.total).slice(0, 8);
  return { especie, porte, racas };
}

/** Clientes fiéis (mais visitas) e sumidos (última visita entre 30 e 90 dias atrás). */
export function clientes(logs: LogDoDia[], fichas: FichaResumo[], hoje: string) {
  const fichaPor = new Map(fichas.map((f) => [f.petNumber, f]));
  const m = new Map<string, { chave: string; petNumber?: string | null; nomePet: string; nomeTutor: string; visitas: number; ultima: string }>();
  for (const l of entregues(logs)) {
    const chave = l.petNumber || `${l.nomePet}|${l.nomeTutor}`;
    const r = m.get(chave) ?? { chave, petNumber: l.petNumber, nomePet: l.nomePet, nomeTutor: l.nomeTutor, visitas: 0, ultima: l.dia };
    r.visitas++; if (l.dia > r.ultima) r.ultima = l.dia; m.set(chave, r);
  }
  const lista = [...m.values()].map((r) => {
    const dias = diasEntre(r.ultima, hoje).length - 1;
    return { ...r, diasSemVir: dias, telefone: r.petNumber ? fichaPor.get(r.petNumber)?.telefone : undefined };
  });
  const fieis = lista.filter((r) => r.visitas >= 2).sort((a, b) => b.visitas - a.visitas || b.ultima.localeCompare(a.ultima)).slice(0, 8);
  const todosSumidos = lista.filter((r) => r.diasSemVir >= 30);
  const sumidos = [...todosSumidos].sort((a, b) => b.visitas - a.visitas || a.ultima.localeCompare(b.ultima)).slice(0, 8);
  return { fieis, sumidos, totalSumidos: todosSumidos.length };
}

export function formatarMinutos(min: number): string {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Tempo médio (min) por serviço e porte, só com amostras suficientes. */
export function tempoPorServicoPorte(logs: LogDoDia[], inicio: string, fim: string, minimo = 5) {
  const grupos = new Map<string, number[]>();
  const porServ = new Map<string, number[]>();
  for (const l of entregues(logs)) {
    if (!noIntervalo(l.dia, inicio, fim) || !l.duracaoMinutos || l.duracaoMinutos <= 0 || l.duracaoMinutos > 24 * 60) continue;
    const k = `${l.servico}|${l.porte ?? ''}`;
    grupos.set(k, [...(grupos.get(k) ?? []), l.duracaoMinutos]);
    porServ.set(l.servico, [...(porServ.get(l.servico) ?? []), l.duracaoMinutos]);
  }
  const media = (v: number[]) => Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  return [...grupos.entries()].filter(([, v]) => v.length >= minimo).map(([k, v]) => {
    const [servico, porte] = k.split('|');
    return { servico, porte, media: media(v), mediaServico: media(porServ.get(servico)!), amostras: v.length };
  });
}

// ─── Dicas automáticas (regras de especialista, sem IA) ────────────────────
export type TipoDica = 'alerta' | 'oportunidade' | 'acao' | 'parabens';
export interface Dica { id: string; tipo: TipoDica; titulo: string; texto: string; prioridade: number }

export function gerarDicas(logs: LogDoDia[], fichas: FichaResumo[], inicio: string, fim: string, hoje: string, anterior: { inicio: string; fim: string } | null): Dica[] {
  const dicas: Dica[] = [];
  const atual = resumo(logs, fichas, inicio, fim);
  if (atual.atendimentos < 10) {
    return [{ id: 'poucos', tipo: 'acao', prioridade: 1, titulo: 'Poucos dados neste período',
      texto: 'Com mais atendimentos registrados, as dicas ficam mais precisas. Experimente um período maior, como 30 ou 90 dias.' }];
  }
  const ant = anterior ? resumo(logs, fichas, anterior.inicio, anterior.fim) : null;

  // 1. Tendência
  const dAt = variacao(atual.atendimentos, ant?.atendimentos ?? null);
  if (dAt !== null && dAt <= -10) dicas.push({ id: 'queda', tipo: 'alerta', prioridade: 95, titulo: `Movimento caiu ${Math.abs(dAt)}%`,
    texto: `Foram ${atual.atendimentos} atendimentos contra ${ant!.atendimentos} no período anterior. Vale reforçar a divulgação e chamar de volta os clientes sumidos.` });
  if (dAt !== null && dAt >= 10) dicas.push({ id: 'alta', tipo: 'parabens', prioridade: 40, titulo: `Movimento cresceu ${dAt}%`,
    texto: `Foram ${atual.atendimentos} atendimentos contra ${ant!.atendimentos} no período anterior. Confira se a equipe está dando conta nos horários de pico.` });

  // 2. Horário de pico e horário vazio
  const horas = porHora(logs, inicio, fim).filter((h) => h.chegadas > 0);
  if (horas.length >= 3) {
    const pico = horas.reduce((m, h) => (h.chegadas > m.chegadas ? h : m));
    const vazio = horas.reduce((m, h) => (h.chegadas < m.chegadas ? h : m));
    const media = horas.reduce((a, h) => a + h.chegadas, 0) / horas.length;
    if (pico.chegadas >= media * 1.5) dicas.push({ id: 'pico', tipo: 'acao', prioridade: 80, titulo: `Reforce a equipe às ${pico.hora}`,
      texto: `É o horário com mais chegadas (${pico.chegadas} no período, ${(pico.chegadas / media).toFixed(1).replace('.', ',')}× a média por hora). Mais gente no banho nesse horário evita fila e atraso nas entregas.` });
    if (vazio.chegadas <= pico.chegadas / 3) dicas.push({ id: 'vazio', tipo: 'oportunidade', prioridade: 55, titulo: `Horário ocioso: ${vazio.hora}`,
      texto: `Só ${vazio.chegadas} chegadas nesse horário. Ofereça desconto ou horário marcado para atrair clientes e aproveitar melhor a equipe.` });
  }

  // 3. Dia da semana
  const nomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const noDia = (w: number) => `${w === 0 || w === 6 ? 'no' : 'na'} ${nomes[w]}`;
  const soma = new Map<number, { total: number; dias: number }>();
  for (const d of porDia(logs, inicio, fim)) {
    const w = new Date(`${d.dia}T12:00:00-03:00`).getUTCDay();
    const r = soma.get(w) ?? { total: 0, dias: 0 }; r.total += d.atendimentos; r.dias++; soma.set(w, r);
  }
  const medias = [...soma.entries()].filter(([, r]) => r.total > 0).map(([w, r]) => ({ w, media: r.total / r.dias }));
  if (medias.length >= 3) {
    const forte = medias.reduce((m, x) => (x.media > m.media ? x : m));
    const fraco = medias.reduce((m, x) => (x.media < m.media ? x : m));
    if (forte.media >= fraco.media * 1.6) dicas.push({ id: 'semana', tipo: 'oportunidade', prioridade: 60, titulo: `${nomes[fraco.w][0].toUpperCase() + nomes[fraco.w].slice(1)} é o dia mais fraco`,
      texto: `Em média ${fraco.media.toFixed(1).replace('.', ',')} atendimentos, contra ${forte.media.toFixed(1).replace('.', ',')} ${noDia(forte.w)}. Uma promoção ${noDia(fraco.w)} ajuda a equilibrar a semana.` });
  }

  // 4. Clientes sumidos e retorno
  const cli = clientes(logs, fichas, hoje);
  if (cli.totalSumidos > 0) dicas.push({ id: 'sumidos', tipo: 'acao', prioridade: 85, titulo: `${cli.totalSumidos} ${cli.totalSumidos === 1 ? 'cliente sumido' : 'clientes sumidos'}`,
    texto: 'Não aparecem há 30 dias ou mais. Na aba Clientes, toque em WhatsApp para mandar a mensagem de saudade pronta.' });
  const base = atual.clientesNovos + atual.clientesRetorno;
  if (base >= 10 && atual.clientesRetorno / base < 0.5) dicas.push({ id: 'retorno', tipo: 'alerta', prioridade: 75, titulo: `Só ${Math.round((atual.clientesRetorno / base) * 100)}% dos clientes voltaram`,
    texto: 'Fidelizar custa menos que conquistar. Um cartão fidelidade (ex.: o 10º banho grátis) ou um lembrete 30 dias depois do banho aumentam o retorno.' });

  // 5. Tempo de atendimento
  const lento = tempoPorServicoPorte(logs, inicio, fim)
    .filter((t) => t.media >= t.mediaServico * 1.25)
    .sort((a, b) => b.media / b.mediaServico - a.media / a.mediaServico)[0];
  if (lento) dicas.push({ id: 'lento', tipo: 'oportunidade', prioridade: 70,
    titulo: `${SERVICO_LABEL[lento.servico] ?? lento.servico} em pets de porte ${(PORTE_LABEL[lento.porte] ?? lento.porte).toLowerCase()} demora mais`,
    texto: `Leva em média ${formatarMinutos(lento.media)}, ${Math.round((lento.media / lento.mediaServico - 1) * 100)}% acima da média desse serviço (${formatarMinutos(lento.mediaServico)}). Melhorar esse processo libera a equipe para mais atendimentos por dia.` });
  else if (atual.tempoMedioMin >= 150) dicas.push({ id: 'tempo', tipo: 'oportunidade', prioridade: 65, titulo: `Pets ficam ${formatarMinutos(atual.tempoMedioMin)} na loja em média`,
    texto: 'Avisar o tutor assim que o pet fica pronto (botão Avisar) e reduzir esperas entre etapas libera vagas para mais atendimentos.' });

  // 6. Serviços pouco vendidos
  const serv = porServico(logs, inicio, fim);
  const fracoServ = serv.filter((s) => s.total / atual.atendimentos < 0.1).sort((a, b) => a.total - b.total)[0];
  if (fracoServ) dicas.push({ id: 'servico', tipo: 'oportunidade', prioridade: 50, titulo: `${fracoServ.servico} é pouco procurado`,
    texto: `Só ${Math.round((fracoServ.total / atual.atendimentos) * 100)}% dos atendimentos. Ofereça como adicional na hora do cadastro ou monte um pacote com o banho.` });

  // 7. Pets removidos sem atendimento
  const taxaRem = atual.removidos / (atual.atendimentos + atual.removidos);
  if (atual.removidos >= 3 && taxaRem >= 0.05) dicas.push({ id: 'removidos', tipo: 'alerta', prioridade: 68, titulo: `${Math.round(taxaRem * 100)}% dos pets saíram sem atendimento`,
    texto: `${atual.removidos} pets foram removidos da fila. Vale entender o motivo: espera longa, desistência ou cadastro errado.` });

  // 8. Equipe desequilibrada (mesma etapa)
  const prof = porProfissional(logs, inicio, fim).filter((p) => p.banho > 0);
  if (prof.length >= 2) {
    const mais = prof.reduce((m, p) => (p.banho > m.banho ? p : m));
    const menos = prof.reduce((m, p) => (p.banho < m.banho ? p : m));
    if (mais.banho >= menos.banho * 2) dicas.push({ id: 'equipe', tipo: 'acao', prioridade: 45, titulo: 'Divisão dos banhos desequilibrada',
      texto: `${mais.nome} fez ${mais.banho} banhos e ${menos.nome}, ${menos.banho}. Distribuir melhor evita cansaço e acelera a fila.` });
  }

  if (dicas.length === 0) dicas.push({ id: 'ok', tipo: 'parabens', prioridade: 1, titulo: 'Tudo em equilíbrio',
    texto: 'Nenhum ponto de atenção neste período. Continue acompanhando os números por aqui.' });
  return dicas.sort((a, b) => b.prioridade - a.prioridade);
}
