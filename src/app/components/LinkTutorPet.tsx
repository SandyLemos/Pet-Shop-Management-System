// ✅ Portal do tutor: o link de acompanhamento na janela do pet.
// A equipe envia só se o cliente quiser: copiar ou abrir o WhatsApp com a mensagem pronta.
import { useState } from 'react';
import { Link2, Copy, Check, MessageCircle, Loader2 } from 'lucide-react';
import type { Pet } from '../types/pet';
import { criarLinkTutor, marcarLinkEnviado } from '../../services/acompanhamentoService';
import { linkWhatsAppDoLink, mensagemLinkTutor, urlDoLink } from '../../utils/acompanhamento';
import { nomeLoja } from '../../lib/lojaAtual';

const hora = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};

export function LinkTutorPet({ pet }: { pet: Pet }) {
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  const gerar = async () => {
    setGerando(true);
    setErro(false);
    try { await criarLinkTutor(pet); } // o pet volta da fila já com o link
    catch (err) { console.error('[link do tutor]', err); setErro(true); }
    finally { setGerando(false); }
  };

  if (!pet.linkTutor) {
    return (
      <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 space-y-2">
        <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Link de acompanhamento
        </p>
        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="w-full h-9 rounded-md border border-sky-200 bg-white text-sky-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-sky-50 disabled:opacity-60"
        >
          {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Gerar link para o tutor
        </button>
        {erro && <p className="text-[11px] text-red-600">Não foi possível gerar o link. Confira a internet e tente de novo.</p>}
      </div>
    );
  }

  const url = urlDoLink(pet.linkTutor, window.location.origin);
  const whats = linkWhatsAppDoLink(pet.telefone, mensagemLinkTutor(pet.nomeTutor, pet.nomePet, pet.servico, nomeLoja(), url));
  const enviadoAs = hora(pet.linkTutorEnviadoEm);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      window.prompt('Copie o link:', url);
    }
  };

  const enviar = () => {
    if (!whats) return;
    window.open(whats, '_blank', 'noopener'); // abre no próprio toque (senão o navegador bloqueia)
    marcarLinkEnviado(pet).catch((err) => console.error('[link do tutor]', err));
  };

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 space-y-2">
      <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1">
        <Link2 className="w-3 h-3" /> Link de acompanhamento
        {enviadoAs && <span className="ml-auto normal-case tracking-normal font-semibold text-green-700 flex items-center gap-0.5"><Check className="w-3 h-3" />Enviado às {enviadoAs}</span>}
      </p>
      <p className="font-mono text-[11px] text-slate-700 bg-white border border-sky-100 rounded-md px-2 py-1.5 break-all select-all">{url}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copiar}
          className="min-h-10 px-3 py-2 rounded-md border border-sky-200 bg-white text-sky-800 text-xs font-semibold leading-tight text-center flex items-center justify-center gap-2 hover:bg-sky-50"
        >
          {copiado ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
          {copiado ? 'Copiado' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={!whats}
          className="min-h-10 px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white text-xs font-semibold leading-tight text-center flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>{enviadoAs ? 'Reenviar no WhatsApp' : 'Enviar no WhatsApp'}</span>
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        {whats
          ? `O tutor vê as etapas de ${pet.nomePet} ao vivo, sem app e sem senha. O link vale só hoje.`
          : 'Sem telefone válido no cadastro: copie o link e envie de outra forma.'}
      </p>
    </div>
  );
}
