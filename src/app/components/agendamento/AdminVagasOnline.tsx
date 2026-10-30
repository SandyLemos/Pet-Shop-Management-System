// ✅ Painel Admin → "Liberar vagas para agendamento online": quantas vagas de cada dia o tutor pode marcar.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck, Copy, Minus, Plus, Share2, X, Loader2 } from 'lucide-react';
import { lojaId, nomeLoja } from '../../../lib/lojaAtual';
import {
  ouvirDiasOnline, ouvirMarcadas, publicarAgendaDaLojaAtual, salvarVagasDoDia, type DiaOnline,
} from '../../../services/agendamentoService';
import { MAX_VAGAS_ONLINE, diaCurto, escolherVagasOnline, proximosDias, urlAgendar } from '../../../utils/agendamento';
import { idDoDia } from '../../../utils/dias';

export function AdminVagasOnline({ onClose }: { onClose: () => void }) {
  const hoje = idDoDia();
  const dias = useMemo(() => proximosDias(hoje), [hoje]);
  const [online, setOnline] = useState<DiaOnline[]>([]);
  const [dia, setDia] = useState(hoje);
  const [marcadas, setMarcadas] = useState<number[]>([]);
  const [qtd, setQtd] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const loja = lojaId();
  const link = urlAgendar(loja, window.location.origin);

  useEffect(() => ouvirDiasOnline(loja, hoje, setOnline), [loja, hoje]);
  useEffect(() => { setMarcadas([]); return ouvirMarcadas(loja, dia, setMarcadas); }, [loja, dia]);

  const atuais = online.find((d) => d.dia === dia)?.vagas ?? [];
  // ao trocar de dia (ou quando o banco responde), o número começa no que está salvo
  useEffect(() => { setQtd(atuais.length); }, [dia, atuais.length]);

  // as "vagas" online são só lugares do dia (sem número na grade): o pet recebe o número na chegada
  const previa = escolherVagasOnline(qtd, atuais, marcadas);
  const minimo = marcadas.length;
  const mudou = previa.join(',') !== [...atuais].sort((a, b) => a - b).join(',');

  const salvar = async () => {
    setSalvando(true);
    try {
      await publicarAgendaDaLojaAtual();
      await salvarVagasDoDia(dia, previa);
      toast.success(previa.length
        ? `${previa.length} ${previa.length === 1 ? 'vaga liberada' : 'vagas liberadas'} para ${diaCurto(dia)}.`
        : `Agendamento online fechado para ${diaCurto(dia)}.`);
    } catch (e) {
      console.error('[vagas online]', e);
      toast.error('Não foi possível salvar. Confira a internet e tente de novo.');
    } finally { setSalvando(false); }
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copiado.'); }
    catch { toast.info(link); }
  };
  const textoWhats = `🐾 Agende o banho do seu pet no ${nomeLoja() || 'nosso petshop'}: ${link}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="topo-admin bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2 rounded-lg shrink-0"><CalendarCheck className="w-5 h-5 text-white" /></div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base">Vagas para agendamento online</h2>
              <p className="text-purple-200 text-xs">Quantas vagas de cada dia o tutor pode marcar</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1 text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-900">Link da página de agendamento (mande para os clientes)</p>
            <p className="text-xs text-indigo-700 break-all">{link}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copiar} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100">
                <Copy size={14} /> Copiar link
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(textoWhats)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
                <Share2 size={14} /> Enviar no WhatsApp
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Dia</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {dias.map((d) => {
                const n = online.find((x) => x.dia === d)?.vagas.length ?? 0;
                const sel = d === dia;
                return (
                  <button key={d} onClick={() => setDia(d)}
                    className={`shrink-0 min-w-[78px] rounded-xl border-2 px-2 py-2 text-center transition ${sel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                    <span className="block text-xs font-bold text-slate-700">{d === hoje ? 'Hoje' : diaCurto(d).split(',')[0]}</span>
                    <span className="block text-xs text-slate-500">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                    <span className={`block text-[11px] font-semibold mt-0.5 ${n ? 'text-indigo-700' : 'text-slate-400'}`}>{n ? `${n} online` : 'fechado'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Vagas online em {dia === hoje ? 'hoje' : diaCurto(dia)}</p>
            <div className="flex items-center justify-center gap-4">
              <button aria-label="Menos uma vaga" onClick={() => setQtd((q) => Math.max(minimo, q - 1))} disabled={qtd <= minimo}
                className="w-11 h-11 rounded-full border-2 border-slate-200 grid place-items-center text-slate-600 disabled:opacity-30"><Minus size={18} /></button>
              <span className="text-4xl font-extrabold text-indigo-700 tabular-nums w-16 text-center" aria-live="polite">{previa.length}</span>
              <button aria-label="Mais uma vaga" onClick={() => setQtd((q) => Math.min(MAX_VAGAS_ONLINE, Math.max(q, previa.length) + 1))} disabled={previa.length >= MAX_VAGAS_ONLINE}
                className="w-11 h-11 rounded-full border-2 border-slate-200 grid place-items-center text-slate-600 disabled:opacity-30"><Plus size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-indigo-50 py-2">
                <p className="text-lg font-bold text-indigo-800">{marcadas.length}</p>
                <p className="text-[11px] text-indigo-700">marcadas por clientes</p>
              </div>
              <div className="rounded-lg bg-emerald-50 py-2">
                <p className="text-lg font-bold text-emerald-800">{Math.max(0, previa.length - marcadas.length)}</p>
                <p className="text-[11px] text-emerald-700">ainda livres online</p>
              </div>
            </div>
            {previa.length === 0 && <p className="text-xs text-slate-500 text-center">Nenhuma vaga online neste dia. O cliente não consegue marcar.</p>}
            {minimo > 0 && <p className="text-[11px] text-slate-500 text-center">Não dá para liberar menos que as {minimo} já marcadas.</p>}
            <p className="text-[11px] text-slate-500">As vagas online não reservam número na grade. Quando o pet chega, a loja confirma a chegada e ele recebe a próxima vaga livre depois da última ocupada, na ordem de chegada.</p>
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600">Fechar</button>
          <button onClick={salvar} disabled={salvando || !mudou}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold disabled:opacity-50">
            {salvando && <Loader2 size={15} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
