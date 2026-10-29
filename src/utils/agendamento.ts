// ✅ Agendamento online pelo tutor. Funções puras (sem Firebase), para os testes.
//
// Como fica no banco (tudo fora de lojas/, porque o tutor não tem login):
//   agendaPublica/{lojaId}                         → { ativo, nomeLoja, logoUrl, cores }
//   agendaPublica/{lojaId}/dias/{dia}              → { dia, vagas: [números liberados pelo admin] }
//   agendaPublica/{lojaId}/dias/{dia}/marcadas/{n} → trava da vaga n (sem dados do tutor)
//   agendamentos/{codigo}                          → o pedido (só quem tem o código lê)
import { telefoneWhatsApp } from './whatsapp';
import { NOME_SERVICO, expiraEmDoDia } from './acompanhamento';

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

/** Vagas online que o tutor ainda pode escolher */
export function vagasLivres(vagas: number[], marcadas: Iterable<number>): number[] {
  const m = new Set(marcadas);
  return vagas.filter((n) => !m.has(n)).sort((a, b) => a - b);
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
    case 'chegou':     return { titulo: 'Chegou na loja', texto: `${nomePet} já chegou e está na fila do atendimento.`, cor: '#0B5A70' };
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
