// ✅ Ações da equipe sobre um pedido online, com os avisos na tela e o atalho do WhatsApp.
import { toast } from 'sonner';
import { nomeLoja } from '../../../lib/lojaAtual';
import { confirmarPedido, marcarFaltou, recusarPedido, saiuParaBuscar, type Pedido } from '../../../services/agendamentoService';
import { linkWhatsAppPedido, mensagemPedido, urlPedido } from '../../../utils/agendamento';

export function whatsDoPedido(p: Pedido, status: 'confirmado' | 'recusado' | 'buscando', motivo = ''): string | null {
  return linkWhatsAppPedido(p.telefone, mensagemPedido(status, p, nomeLoja(), urlPedido(p.codigo, window.location.origin), motivo));
}

const avisarNoWhats = (url: string | null) =>
  url ? { action: { label: 'Avisar no WhatsApp', onClick: () => window.open(url, '_blank', 'noopener') } } : {};

export async function confirmar(p: Pedido): Promise<boolean> {
  try {
    await confirmarPedido(p);
    toast.success(`${p.nomePet} confirmado. Status: aguardando chegada.`, { duration: 10000, ...avisarNoWhats(whatsDoPedido(p, 'confirmado')) });
    return true;
  } catch (e) {
    console.error('[agendamento] confirmar', e);
    toast.error('Não foi possível confirmar. Tente de novo.');
    return false;
  }
}

export async function recusar(p: Pedido, motivo: string): Promise<boolean> {
  try {
    await recusarPedido(p, motivo);
    toast.success(`Pedido do ${p.nomePet} recusado. O lugar online ficou livre de novo.`, { duration: 10000, ...avisarNoWhats(whatsDoPedido(p, 'recusado', motivo.trim())) });
    return true;
  } catch (e) {
    console.error('[agendamento] recusar', e);
    toast.error('Não foi possível recusar. Tente de novo.');
    return false;
  }
}

export async function saiuBuscar(p: Pedido): Promise<boolean> {
  try {
    await saiuParaBuscar(p);
    toast.success(`Saiu para buscar o ${p.nomePet}. Quando voltar, confirme a chegada.`, { duration: 10000, ...avisarNoWhats(whatsDoPedido(p, 'buscando')) });
    return true;
  } catch (e) {
    console.error('[agendamento] saiu para buscar', e);
    toast.error('Não foi possível salvar. Tente de novo.');
    return false;
  }
}

export async function naoVeio(p: Pedido): Promise<boolean> {
  try {
    await marcarFaltou(p);
    toast.success(`${p.nomePet} marcado como "não veio".`);
    return true;
  } catch (e) {
    console.error('[agendamento] faltou', e);
    toast.error('Não foi possível salvar. Tente de novo.');
    return false;
  }
}
