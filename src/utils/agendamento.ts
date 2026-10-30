// ✅ Agendamento online pelo tutor. Funções puras (sem Firebase), para os testes.
//
// Como fica no banco (tudo fora de lojas/, porque o tutor não tem login):
//   agendaPublica/{lojaId}                         → { ativo, nomeLoja, logoUrl, cores }
//   agendaPublica/{lojaId}/dias/{dia}              → { dia, vagas: [números liberados pelo admin] }
//   agendaPublica/{lojaId}/dias/{dia}/marcadas/{n} → trava da vaga n (sem dados do tutor)
//   agendamentos/{codigo}                          → o pedido (só quem tem o código lê)
import { telefoneWhatsApp } from './whatsapp';
import { NOME_SERVICO, NOME_ETAPA, etapasDoServico, expiraEmDoDia, fraseDaSituacao, type SituacaoTutor } from './acompanhamento';

export { gerarCodigo, CODIGO_VALIDO } from './acompanhamento';

/**
 * pendente → a loja ainda não confirmou
 * confirmado → "Aguardando chegada"
 * chegou → entrou na fila dos aguardando
 * recusado / faltou → a loja liberou a vaga
 * cancelado → o tutor cancelou (a loja ainda vai liberar a vaga) · cancelado_ok → vaga já liberada
 */
export type StatusPedido = 'pendente' | 'confirmado' | 'chegou' | 'recusado' | 'faltou' | 'cancelado' | 'cancelado_ok';

/** Pedidos que a loja acompanha na tela (os outros já terminaram) */
export const STATUS_ABERTOS: StatusPedido[] = ['pendente', 'confirmado', 'cancelado'];

export interface DadosPedido {
  nomeTutor: string;
  telefone: string;
  nomePet: string;
  especie: 'cao' | 'gato' | '';
  raca: string;
  porte: 'pequeno' | 'medio' | 'grande' | '';
  servico: string;
  obs: string;
}

export const SERVICOS_ONLINE = ['banho', 'banho_tosa', 'tosa', 'higienica', 'hidratacao', 'ozonio'] as const;

/** Quantos dias para a frente o admin pode liberar vagas (hoje incluso) */
export const DIAS_LIBERAVEIS = 14;
/** Máximo de vagas online num dia */
export const MAX_VAGAS_ONLINE = 30;
const TOTAL_VAGAS = 100;

/** Dia somado de n dias (AAAA-MM-DD), sem depender do fuso do aparelho */
export function somarDiasId(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function proximosDias(hoje: string, quantidade = DIAS_LIBERAVEIS): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarDiasId(hoje, i));
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** "qui, 30/10" */
export function diaCurto(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  return `${SEMANA[d.getUTCDay()]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** O pedido vale até as 6h do dia seguinte ao dia marcado */
export const expiraEmDoPedido = expiraEmDoDia;

/**
 * Números das vagas online de um dia, para a quantidade que o admin escolheu.
 * Mantém sempre as vagas já marcadas por tutores e as que já eram online;
 * completa com os menores números que não têm pet nem foram usados hoje.
 * Para baixo, tira primeiro as vagas online livres de número maior.
 */
export function escolherVagasOnline(
  quantidade: number,
  atuais: number[],
  marcadas: Iterable<number>,
  bloqueadas: Iterable<number> = [],
): number[] {
  const presas = new Set(marcadas);
  const bloq = new Set(bloqueadas);
  const qtd = Math.max(presas.size, Math.min(MAX_VAGAS_ONLINE, Math.floor(quantidade) || 0));
  const escolhidas = new Set<number>([...presas]);
  for (const n of [...atuais].sort((a, b) => a - b)) {
    if (escolhidas.size >= qtd) break;
    escolhidas.add(n);
  }
  for (let n = 1; n <= TOTAL_VAGAS && escolhidas.size < qtd; n++) {
    if (!bloq.has(n)) escolhidas.add(n);
  }
  return [...escolhidas].sort((a, b) => a - b);
}

/** Vagas online que o tutor ainda pode escolher (sem pedido e sem pet da loja) */
export function vagasLivres(vagas: number[], marcadas: Iterable<number>, ocupadas: Iterable<number> = []): number[] {
  const m = new Set([...marcadas, ...ocupadas]);
  return vagas.filter((n) => !m.has(n)).sort((a, b) => a - b);
}

/** Vagas de hoje com pet (na fila ou já entregue), em ordem e sem repetir */
export function ocupadasDoDia(slotsComPet: Iterable<number>, usados: Iterable<number>): number[] {
  return [...new Set([...slotsComPet, ...usados])].filter((n) => n >= 1 && n <= TOTAL_VAGAS).sort((a, b) => a - b);
}

export type SituacaoVaga = 'livre' | 'marcada' | 'ocupada' | 'balcao';

/**
 * Grade que o tutor vê num dia: da vaga 1 até a maior vaga online ou ocupada.
 * livre = online e disponível · marcada = outro tutor marcou · ocupada = pet na loja · balcao = só a loja usa
 */
export function gradeDoTutor(vagas: number[], marcadas: Iterable<number>, ocupadas: Iterable<number>): { numero: number; situacao: SituacaoVaga }[] {
  const online = new Set(vagas);
  const m = new Set(marcadas);
  const o = new Set(ocupadas);
  const maior = Math.max(0, ...vagas, ...o);
  return Array.from({ length: maior }, (_, i) => {
    const n = i + 1;
    const situacao: SituacaoVaga = o.has(n) ? 'ocupada' : m.has(n) && online.has(n) ? 'marcada' : online.has(n) ? 'livre' : 'balcao';
    return { numero: n, situacao };
  });
}

/** Só dígitos; aceita com ou sem o 55 */
export const soDigitos = (t: string) => String(t ?? '').replace(/\D/g, '');

/** Confere o formulário do tutor. Devolve o primeiro problema ou null. */
export function problemaNoPedido(p: DadosPedido): string | null {
  if (p.nomeTutor.trim().length < 3) return 'Informe o seu nome.';
  if (!telefoneWhatsApp(p.telefone)) return 'Informe um WhatsApp com DDD, por exemplo (24) 99999-1234.';
  if (!p.nomePet.trim()) return 'Informe o nome do pet.';
  if (!p.especie) return 'Escolha se é cão ou gato.';
  if (!p.porte) return 'Escolha o porte do pet.';
  if (!p.servico) return 'Escolha o serviço.';
  return null;
}

/** Corta e limpa os campos antes de gravar (as regras do banco conferem os mesmos limites) */
export function limparPedido(p: DadosPedido): DadosPedido {
  return {
    nomeTutor: p.nomeTutor.trim().slice(0, 100),
    telefone: soDigitos(p.telefone).slice(0, 13),
    nomePet: p.nomePet.trim().slice(0, 100),
    especie: p.especie,
    raca: p.raca.trim().slice(0, 60),
    porte: p.porte,
    servico: p.servico,
    obs: p.obs.trim().slice(0, 300),
  };
}

/** Frase grande da página do pedido */
export function fraseDoPedido(status: StatusPedido, nomePet: string): { titulo: string; texto: string; cor: string } {
  switch (status) {
    case 'pendente':   return { titulo: 'Aguardando a loja confirmar', texto: `Recebemos o pedido do(a) ${nomePet}. A loja vai confirmar em breve. Esta página se atualiza sozinha.`, cor: '#F7931E' };
    case 'confirmado': return { titulo: 'Confirmado!', texto: `A loja confirmou. É só levar o(a) ${nomePet} no dia marcado. Estamos te esperando!`, cor: '#1E7F4F' };
    case 'chegou':     return { titulo: 'Aguardando atendimento', texto: `${nomePet} já está na loja, na fila. Logo começa o atendimento.`, cor: '#F7931E' };
    case 'recusado':   return { titulo: 'Não foi possível confirmar', texto: 'A loja não conseguiu confirmar este horário. Fale com a loja ou escolha outra vaga.', cor: '#B91C1C' };
    case 'faltou':     return { titulo: 'Vaga encerrada', texto: 'O pet não chegou no dia marcado e a vaga foi liberada.', cor: '#64748B' };
    default:           return { titulo: 'Cancelado', texto: 'Você cancelou este agendamento.', cor: '#64748B' };
  }
}

export const urlAgendar = (lojaId: string, origem: string) => `${origem.replace(/\/$/, '')}/agendar/${lojaId}`;
export const urlPedido = (codigo: string, origem: string) => `${origem.replace(/\/$/, '')}/agendamento/${codigo}`;

const primeiroNome = (nome: string) => (nome || '').trim().split(/\s+/)[0];

/** Mensagem para a loja avisar o tutor pelo WhatsApp depois de confirmar ou recusar */
export function mensagemPedido(
  status: 'confirmado' | 'recusado',
  p: { nomeTutor: string; nomePet: string; servico: string; dia: string; vaga: number },
  nomeLoja: string,
  url: string,
  motivo = '',
): string {
  const tutor = primeiroNome(p.nomeTutor);
  const oi = `Olá${tutor ? `, ${tutor}` : ''}! 🐾`;
  const serv = (NOME_SERVICO[p.servico] ?? 'atendimento').toLowerCase();
  if (status === 'confirmado') {
    return `${oi} Confirmamos o ${serv} do(a) ${p.nomePet} no ${nomeLoja || 'nosso petshop'} para ${diaCurto(p.dia)} (vaga ${p.vaga}). Acompanhe por aqui: ${url}`;
  }
  return `${oi} Infelizmente não conseguimos confirmar o ${serv} do(a) ${p.nomePet} para ${diaCurto(p.dia)}.${motivo ? ` Motivo: ${motivo}.` : ''} Fale com a gente para marcar outro dia.`;
}

export function linkWhatsAppPedido(telefone: string, mensagem: string): string | null {
  const numero = telefoneWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}

// ─── Andamento mostrado ao tutor (pedido + etapas do pet na loja) ────────────

export type EstadoEtapa = 'feito' | 'agora' | 'futuro';
export interface EtapaPedido { id: string; nome: string; estado: EstadoEtapa; hora?: number }

const COR_ETAPA: Record<string, string> = {
  espera: '#F7931E', banho: '#0B5A70', escovar: '#0B5A70', tosa: '#0B5A70', finalizado: '#1E7F4F', entregue: '#1E7F4F', removido: '#64748B',
};

/**
 * Frase e etapas da página do pedido. Depois da chegada, segue a situação do pet
 * na fila (link de acompanhamento): aguardando → banho → … → pronto → entregue.
 */
export function andamentoDoPedido(
  p: { status: StatusPedido; nomePet: string; servico: string; criadoEm: number; atualizadoEm: number },
  ao?: { status: SituacaoTutor; [campo: string]: any } | null,
): { titulo: string; texto: string; cor: string; etapas: EtapaPedido[] } {
  const naLoja = p.status === 'chegou';
  const situacao: SituacaoTutor | null = naLoja ? (ao?.status ?? 'espera') : null;
  const frase = situacao && situacao !== 'espera'
    ? { ...fraseDaSituacao(situacao, p.nomePet), cor: COR_ETAPA[situacao] ?? '#0B5A70' }
    : fraseDoPedido(p.status, p.nomePet);

  const daLoja = etapasDoServico(p.servico); // espera, banho, escovar, (tosa), finalizado
  const ids = ['enviado', 'confirmado', ...daLoja, 'entregue'];
  const nomes: Record<string, string> = {
    ...NOME_ETAPA, enviado: 'Pedido enviado', confirmado: 'Confirmado pela loja', espera: naLoja ? 'Na loja, aguardando atendimento' : 'Chegada na loja', entregue: 'Entregue',
  };
  let atual: number;
  if (p.status === 'pendente') atual = 1;
  else if (p.status === 'confirmado') atual = 2;
  else if (naLoja) atual = situacao === 'entregue' ? ids.length : Math.max(2, ids.indexOf(situacao === 'removido' ? 'espera' : situacao!));
  else atual = 1;
  const horas: Record<string, number | undefined> = {
    enviado: p.criadoEm,
    espera: ao?.chegouEm, banho: ao?.banhoEm, escovar: ao?.escovarEm, tosa: ao?.tosaEm, finalizado: ao?.prontoEm, entregue: ao?.entregueEm,
  };
  const etapas = ids.map((id, i): EtapaPedido => ({
    id,
    nome: nomes[id] ?? id,
    estado: i < atual ? 'feito' : i === atual ? 'agora' : 'futuro',
    hora: i <= atual ? horas[id] : undefined,
  }));
  return { ...frase, etapas };
}
