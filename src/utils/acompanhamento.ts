// ✅ Portal do tutor: link em que o tutor acompanha o pet ao vivo.
// Funções puras (sem Firebase), para poderem ser testadas sem navegador.
import { telefoneWhatsApp } from './whatsapp';

/** Situação mostrada ao tutor: as etapas do Fluxo + entregue */
export type SituacaoTutor = 'espera' | 'banho' | 'escovar' | 'tosa' | 'finalizado' | 'saiu_entrega' | 'entregue' | 'removido';

/** Campo do horário de cada etapa no documento do link */
export const CAMPO_HORA: Record<Exclude<SituacaoTutor, 'removido'>, string> = {
  espera: 'chegouEm',
  banho: 'banhoEm',
  escovar: 'escovarEm',
  tosa: 'tosaEm',
  finalizado: 'prontoEm',
  saiu_entrega: 'saiuEntregaEm',
  entregue: 'entregueEm',
};

const SERVICOS_COM_TOSA = ['tosa', 'banho_tosa', 'higienica'];

/** Etapas que o tutor vê, na ordem, conforme o serviço (sem tosa, a etapa Tosa não aparece) */
export function etapasDoServico(servico: string): Exclude<SituacaoTutor, 'removido' | 'entregue' | 'saiu_entrega'>[] {
  return SERVICOS_COM_TOSA.includes(servico)
    ? ['espera', 'banho', 'escovar', 'tosa', 'finalizado']
    : ['espera', 'banho', 'escovar', 'finalizado'];
}

export const NOME_ETAPA: Record<string, string> = {
  espera: 'Chegou na loja',
  banho: 'Banho',
  escovar: 'Secar e escovar',
  tosa: 'Tosa',
  finalizado: 'Pronto para buscar',
};

export const NOME_SERVICO: Record<string, string> = {
  banho: 'Banho',
  tosa: 'Tosa',
  banho_tosa: 'Banho e tosa',
  higienica: 'Tosa higiênica',
  ozonio: 'Ozônio',
  hidratacao: 'Hidratação',
};

/** Frase grande da página do tutor para cada situação */
export function fraseDaSituacao(situacao: SituacaoTutor, nomePet: string): { titulo: string; texto: string } {
  switch (situacao) {
    case 'espera':     return { titulo: 'Aguardando a vez', texto: `${nomePet} chegou e já está na fila. Logo começa o atendimento.` };
    case 'banho':      return { titulo: 'No banho', texto: `${nomePet} está no banho agora. 🛁` };
    case 'escovar':    return { titulo: 'Secando e escovando', texto: `Banho feito! Agora é a vez de secar e escovar ${nomePet}.` };
    case 'tosa':       return { titulo: 'Na tosa', texto: `Últimos retoques: ${nomePet} está na tosa. ✂️` };
    case 'finalizado': return { titulo: 'Pronto para buscar', texto: `${nomePet} está prontinho(a) e esperando por você!` };
    case 'saiu_entrega': return { titulo: 'Saiu para entrega', texto: `${nomePet} está pronto(a) e a caminho da sua casa! 🚚` };
    case 'entregue':   return { titulo: 'Entregue', texto: `${nomePet} já foi entregue. Obrigado pela visita!` };
    default:           return { titulo: 'Atendimento encerrado', texto: 'Este atendimento foi encerrado pela loja.' };
  }
}

const LETRAS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código aleatório do link (20 letras e números: impossível de adivinhar) */
export function gerarCodigo(tamanho = 20): string {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => LETRAS[b % LETRAS.length]).join('');
}

export const CODIGO_VALIDO = /^[a-zA-Z0-9]{20,40}$/;

/** O link vale até as 6h do dia seguinte ao atendimento (horário de Brasília) */
export function expiraEmDoDia(dia: string): number {
  return Date.parse(`${dia}T23:59:59-03:00`) + 6 * 60 * 60 * 1000 + 1000;
}

/** Endereço público do link */
export function urlDoLink(codigo: string, origem: string): string {
  return `${origem.replace(/\/$/, '')}/a/${codigo}`;
}

export function mensagemLinkTutor(nomeTutor: string, nomePet: string, servico: string, nomeLoja: string, url: string): string {
  const tutor = (nomeTutor || '').trim().split(/\s+/)[0];
  const serv = (NOME_SERVICO[servico] ?? 'atendimento').toLowerCase();
  return `Olá${tutor ? `, ${tutor}` : ''}! 🐾 O(a) ${nomePet} já está com a gente aqui no ${nomeLoja || 'nosso petshop'}. Acompanhe o ${serv} por este link: ${url}`;
}

/** URL wa.me com a mensagem do link, ou null se o telefone não for válido */
export function linkWhatsAppDoLink(telefone: string | null | undefined, mensagem: string): string | null {
  const numero = telefoneWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}
