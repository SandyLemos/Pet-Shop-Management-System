import { useState } from 'react';
import { toast } from 'sonner';
import { X, FileText, Download, Calendar, BarChart3 } from 'lucide-react';
import { getLogsByDate, getRelatorioDia, getRelatorioPeriodo } from '../../services/petService';
import type { RelatorioServicos } from '../../services/petService';
import { idDoDiaDe } from '../../utils/dias';

import { getTodayKeyLocal, formatDateBR, labelServico, gerarPDF } from '../../utils/relatorioPdf';

// ─── Modal de Relatórios ──────────────────────────────────────────────────────
export function ModalRelatorios({ onClose }: { onClose: () => void }) {
  const today = getTodayKeyLocal();

  const [aba, setAba]                 = useState<'pdf' | 'contagem'>('pdf');
  const [modo, setModo]               = useState<'dia' | 'periodo'>('dia');
  const [dataDia, setDataDia]         = useState(today);
  const [dataInicio, setDataInicio]   = useState(today);
  const [dataFim, setDataFim]         = useState(today);
  const [downloading, setDownloading] = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  // ── estado da contagem ──
  const [contando, setContando]       = useState(false);
  const [relatorio, setRelatorio]     = useState<RelatorioServicos | null>(null);

  const validarPeriodo = (): string[] | null => {
    if (modo === 'periodo' && dataInicio > dataFim) {
      setErro('A data de início não pode ser maior que a data fim.');
      return null;
    }
    const datas: string[] = [];
    if (modo === 'dia') return [dataDia];
    // ✅ meio-dia como âncora + data em São Paulo (sem desvio de fuso/UTC)
    const cur = new Date(dataInicio + 'T12:00:00');
    const fin = new Date(dataFim + 'T12:00:00');
    while (cur <= fin) {
      datas.push(idDoDiaDe(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (datas.length > 31) {
      setErro('Período máximo: 31 dias.');
      return null;
    }
    return datas;
  };

  const handleDownload = async () => {
    setErro(null);
    const datas = validarPeriodo();
    if (!datas) return;
    setDownloading(true);
    try {
      const resultados = await Promise.all(datas.map(d => getLogsByDate(d)));
      const logs = resultados.flat();
      const labelPeriodo =
        modo === 'dia' || dataInicio === dataFim
          ? formatDateBR(datas[0])
          : `${formatDateBR(dataInicio)} até ${formatDateBR(dataFim)}`;

      if (logs.length === 0) {
        setErro('Nenhum registro encontrado para o período selecionado.');
        setDownloading(false);
        return;
      }
      gerarPDF(logs, labelPeriodo);
      toast.success('PDF gerado com sucesso! 📄');
    } catch {
      toast.error('Erro ao gerar PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleContar = async () => {
    setErro(null);
    setRelatorio(null);
    if (!validarPeriodo()) return;
    setContando(true);
    try {
      const r = modo === 'dia'
        ? await getRelatorioDia(dataDia)
        : await getRelatorioPeriodo(dataInicio, dataFim);
      setRelatorio(r);
    } catch {
      toast.error('Erro ao gerar contagem.');
    } finally {
      setContando(false);
    }
  };

  const inputData = (
    modo === 'dia' ? (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Data</label>
        <input type="date" value={dataDia} max={today}
          onChange={e => { setDataDia(e.target.value); setErro(null); setRelatorio(null); }}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">De</label>
          <input type="date" value={dataInicio} max={today}
            onChange={e => { setDataInicio(e.target.value); setErro(null); setRelatorio(null); }}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Até</label>
          <input type="date" value={dataFim} max={today} min={dataInicio}
            onChange={e => { setDataFim(e.target.value); setErro(null); setRelatorio(null); }}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
        </div>
      </div>
    )
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><FileText className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-white font-bold text-base">Relatórios</h2>
              <p className="text-indigo-200 text-xs">Elite Pet Shop</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">

          {/* Sub-aba PDF / Contagem */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => { setAba('pdf'); setErro(null); }}
              className={`py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${aba === 'pdf' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>
              <Download size={14} /> PDF
            </button>
            <button onClick={() => { setAba('contagem'); setErro(null); }}
              className={`py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${aba === 'contagem' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}>
              <BarChart3 size={14} /> Contagem
            </button>
          </div>

          {/* Toggle Dia / Período */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setModo('dia'); setErro(null); setRelatorio(null); }}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${modo === 'dia' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
              <Calendar size={14} /> Dia
            </button>
            <button onClick={() => { setModo('periodo'); setErro(null); setRelatorio(null); }}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${modo === 'periodo' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
              <FileText size={14} /> Período
            </button>
          </div>

          {inputData}

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-xs font-medium">⚠️ {erro}</div>
          )}

          {/* ── Ação da aba ── */}
          {aba === 'pdf' ? (
            <button onClick={handleDownload} disabled={downloading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {downloading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando PDF...</>
                : <><Download size={16} /> Baixar PDF</>}
            </button>
          ) : (
            <>
              <button onClick={handleContar} disabled={contando}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                {contando
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Contando...</>
                  : <><BarChart3 size={16} /> Gerar Contagem</>}
              </button>

              {/* Resultado */}
              {relatorio && (
                <div className="space-y-2 pt-1">
                  {Object.keys(relatorio.porServico).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">Nenhum serviço entregue neste período.</p>
                  ) : (
                    <>
                      {Object.entries(relatorio.porServico)
                        .sort((a, b) => b[1] - a[1])
                        .map(([servico, qtd]) => (
                          <div key={servico} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                            <span className="text-sm font-medium text-slate-700">{labelServico(servico)}</span>
                            <span className="text-base font-bold text-indigo-600">{qtd}</span>
                          </div>
                        ))}
                      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg px-4 py-3 mt-1">
                        <span className="text-sm font-bold text-white">TOTAL GERAL</span>
                        <span className="text-lg font-extrabold text-white">{relatorio.total}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
