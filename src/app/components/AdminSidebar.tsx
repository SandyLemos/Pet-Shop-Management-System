import React, { useState, useEffect } from 'react';
import {
  X, Users, Plus, Pencil, Trash2, AlertTriangle,
  UserCircle2, ShieldCheck, User, Briefcase, PawPrint,
} from 'lucide-react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig, db, auth } from '../../lib/firebase';
import { toast } from 'sonner';
import { setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  subscribeToProfissionais,
  addProfissional,
  updateProfissional,
  deleteProfissional,
} from '../../services/petService';
import type { Profissional } from '../types/pet';
import { FileText, Download, Calendar, PackageCheck, PhoneCall, BarChart3 } from 'lucide-react';
import { getLogsByDate, getRelatorioDia, getRelatorioPeriodo } from '../../services/petService';
import type { LogEntry, RelatorioServicos } from '../../services/petService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SecaoPetsCadastro } from './PetsRegistrationSection';
import { idDoDiaDe } from '../../utils/dias';


// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UsuarioFirestore {
  id: string;
  nome: string;
  sobrenome: string;
  funcao: string;
  role: 'admin' | 'user';
  email: string;
  criadoEm?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayKeyLocal(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDateBR(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimestamp(value: any): string {
  if (!value) return '—';
  if (value?.toDate) return value.toDate().toLocaleString('pt-BR');
  if (typeof value === 'string') return new Date(value).toLocaleString('pt-BR');
  return '—';
}

function labelServico(s: string) {
  const map: Record<string, string> = {
    banho: 'Banho',
    tosa: 'Tosa',
    banho_tosa: 'Banho + Tosa',
    hidratacao: 'Hidratação',
    higienica: 'Higiênica',
    ozonio: 'Ozônio',
    escovacao: 'Escovação',
  };
  return map[s] ?? s;
}

function labelPorte(p: string) {
  const map: Record<string, string> = {
    pequeno: 'Pequeno',
    medio: 'Médio',
    grande: 'Grande',
    gigante: 'Gigante',
  };
  return map[p] ?? p;
}

function labelEspecie(e: string) {
  const map: Record<string, string> = {
    cao: 'Cão',
    gato: 'Gato',
  };
  return map[e] ?? e;
}

function labelTipo(t: string) {
  const map: Record<string, string> = {
    entregue: 'Entregue',
    avisado: 'Avisado',
    removido: 'Removido',
    cancelado: 'Cancelado',
  };
  return map[t] ?? t;
}

// ─── Mesclagem de logs (1 linha por pet) ──────────────────────────────────────
interface LogMesclado {
  slotNumber: number;
  nomePet: string;
  raca: string | null;
  especie: string | null;
  porte: string | null;
  nomeTutor: string;
  servico: string;
  statusFinal: string;
  tipo: string; // tipo do encerramento (entregue/removido/cancelado)
  profissionalBanho: string | null;
  profissionalTosa: string | null;
  profissionalEscovar: string | null;
  checkInTime: string;
  avisadoEm?: string;
  checkOutTime?: string;
  cadastradoPorNome?: string | null;
  avisadoPorNome?: string | null;
  entregueporNome?: string | null;
  observacoes: string | null;
}

function mesclarLogs(logs: LogEntry[]): LogMesclado[] {
  // Agrupa por petId
  const grupos = new Map<string, LogEntry[]>();

  for (const log of logs) {
    const chave = log.petId || `${log.nomePet}-${log.slotNumber}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(log);
  }

  const resultado: LogMesclado[] = [];

  grupos.forEach((entries) => {
    const encerrado = entries.find(e =>
      ['entregue', 'removido', 'cancelado'].includes(e.tipo),
    );
    const avisado = entries.find(e => e.tipo === 'avisado');

    // Base: usa o log de encerramento se existir, senão o de aviso
    const base = encerrado ?? avisado ?? entries[0];

    resultado.push({
      slotNumber:       base.slotNumber,
      nomePet:          base.nomePet,
      raca:             base.raca,
      especie:          base.especie,
      porte:            base.porte,
      nomeTutor:        base.nomeTutor,
      servico:          base.servico,
      statusFinal:      base.statusFinal,
      tipo:             encerrado?.tipo ?? avisado?.tipo ?? base.tipo,
      profissionalBanho:   base.profissionalBanho,
      profissionalTosa:    base.profissionalTosa,
      profissionalEscovar: base.profissionalEscovar,
      checkInTime:      base.checkInTime,
      // avisadoEm vem do log de aviso
      avisadoEm:        avisado?.avisadoEm ?? encerrado?.avisadoEm,
      checkOutTime:     encerrado?.checkOutTime,
      // cadastradoPorNome: qualquer um dos logs tem
      cadastradoPorNome:
        base.cadastradoPorNome ?? avisado?.cadastradoPorNome ?? encerrado?.cadastradoPorNome ?? null,
      // avisadoPorNome: vem do log de aviso
      avisadoPorNome:
        avisado?.avisadoPorNome  ??
        avisado?.registradoPorNome ??
        encerrado?.avisadoPorNome  ??
        null,
      // entregue/removido/cancelado por: vem do log de encerramento
      entregueporNome:
        encerrado?.encerradoPorNome ?? encerrado?.removidoPorNome ?? null,
      observacoes: base.observacoes,
    });
  });

  // Ordena por checkInTime
  resultado.sort((a, b) =>
    new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime(),
  );

  return resultado;
}

// ─── Gerador de PDF ───────────────────────────────────────────────────────────
function gerarPDF(logs: LogEntry[], labelPeriodo: string) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();

  // Mescla os logs em 1 linha por pet
  const linhas = mesclarLogs(logs);

  // Contadores baseados nas linhas mescladas
  const totalAtendidos = linhas.filter(l =>
    ['entregue', 'removido', 'cancelado'].includes(l.tipo),
  ).length;
  const totalAvisados = linhas.filter(l => l.tipo === 'avisado').length;

  // Cabeçalho
  pdf.setFillColor(88, 28, 135);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ELITE PET SHOP', pageW / 2, 12, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Relatório de Atendimentos', pageW / 2, 19, { align: 'center' });
  pdf.text(`Período: ${labelPeriodo}`, pageW / 2, 24, { align: 'center' });

  // Resumo
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 35);
  pdf.text(
    `Total de registros: ${linhas.length}   |   Atendidos: ${totalAtendidos}   |   Avisos pendentes: ${totalAvisados}`,
    14, 41,
  );

  // Tabela
  autoTable(pdf, {
    startY: 47,
    head: [[
      'Slot', 'Pet', 'Raça', 'Esp.', 'Porte',
      'Tutor', 'Serviço', 'Status', 'Tipo',
      'Prof. Banho', 'Prof. Tosa', 'Prof. Escova',
      'Check-in', 'Aviso em', 'Check-out',
      'Cadastrado por', 'Avisado por', 'Entregue por',
      'Obs.',
    ]],
    body: linhas.map(l => [
      l.slotNumber ?? '—',
      l.nomePet    ?? '—',
      l.raca       ?? '—',
      labelEspecie(l.especie ?? ''),
      labelPorte(l.porte     ?? ''),
      l.nomeTutor  ?? '—',
      labelServico(l.servico ?? ''),
      l.statusFinal ?? '—',
      labelTipo(l.tipo),
      l.profissionalBanho   ?? '—',
      l.profissionalTosa    ?? '—',
      l.profissionalEscovar ?? '—',
      formatTimestamp(l.checkInTime),
      formatTimestamp(l.avisadoEm),
      formatTimestamp(l.checkOutTime),
      l.cadastradoPorNome ?? '—',
      l.avisadoPorNome    ?? '—',
      l.entregueporNome   ?? '—',
      l.observacoes || '—',
    ]),
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [88, 28, 135],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 6,
    },
    alternateRowStyles: {
      fillColor: [245, 243, 255],
    },
    columnStyles: {
      0:  { cellWidth: 8  },
      1:  { cellWidth: 14 },
      2:  { cellWidth: 16 },
      3:  { cellWidth: 8  },
      4:  { cellWidth: 12 },
      5:  { cellWidth: 16 },
      6:  { cellWidth: 14 },
      7:  { cellWidth: 14 },
      8:  { cellWidth: 14 },
      9:  { cellWidth: 16 },
      10: { cellWidth: 16 },
      11: { cellWidth: 16 },
      12: { cellWidth: 22 },
      13: { cellWidth: 22 },
      14: { cellWidth: 22 },
      15: { cellWidth: 18 },
      16: { cellWidth: 18 },
      17: { cellWidth: 18 },
      18: { cellWidth: 'auto' },
    },
    margin: { left: 5, right: 5 },
    tableWidth: 'wrap',
  });

  // Rodapé
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(
      `Elite Pet Shop — Página ${i} de ${pageCount}`,
      pageW / 2,
      pdf.internal.pageSize.getHeight() - 5,
      { align: 'center' },
    );
  }

  pdf.save(`relatorio-elite-pet-shop-${labelPeriodo.replace(/\//g, '-')}.pdf`);
}

// ─── Modal de Relatórios ──────────────────────────────────────────────────────
function ModalRelatorios({ onClose }: { onClose: () => void }) {
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
    const cur = new Date(dataInicio + 'T00:00:00');
    const fin = new Date(dataFim + 'T00:00:00');
    while (cur <= fin) {
      datas.push(cur.toISOString().split('T')[0]);
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

// ─── Modal Confirmar Exclusão (Usuário) ───────────────────────────────────────
function ModalConfirmDelete({
  usuario, onConfirm, onCancel,
}: { usuario: UsuarioFirestore; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir usuário?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir{' '}
            <span className="font-semibold text-gray-800">{usuario.nome} {usuario.sobrenome}</span>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Esta ação é permanente e irá apagar todos os dados deste usuário. Não poderá ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2">
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Confirmar Exclusão (Profissional) ──────────────────────────────────
function ModalConfirmDeleteProfissional({
  profissional, onConfirm, onCancel,
}: { profissional: Profissional; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-100 p-4 rounded-2xl"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Excluir profissional?</h2>
          <p className="text-sm text-gray-500">
            Você está prestes a excluir{' '}
            <span className="font-semibold text-gray-800">{profissional.nome} {profissional.sobrenome}</span>.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-1">
            <p className="text-xs text-red-600 font-medium">⚠️ Esta ação é permanente. Não poderá ser desfeita.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2">
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Criar Usuário ───────────────────────────────────────────────────────
function CardCriarUsuario({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome]           = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [funcao, setFuncao]       = useState('');
  const [role, setRole]           = useState<'user' | 'admin'>('user');
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao || !email || !senha) { toast.error('Preencha todos os campos.'); return; }
    if (senha.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres.'); return; }
    setLoading(true);
    const appSecundario = initializeApp(firebaseConfig, 'appSecundario');
    const authSecundario = getAuth(appSecundario);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundario, email, senha);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        id: cred.user.uid, nome, sobrenome, funcao, role, email, criadoEm: Timestamp.now(),
      });
      toast.success(`Usuário ${nome} criado com sucesso! 🎉`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') toast.error('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') toast.error('A senha deve ter no mínimo 6 caracteres.');
      else toast.error('Erro ao criar usuário. Tente novamente.');
    } finally {
      await deleteApp(appSecundario);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg"><Plus className="w-5 h-5 text-green-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Novo Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="João" autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} placeholder="Silva" autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Tosador, Banhista..." autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@email.com" autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            {senha.length > 0 && (
              <p className={`text-xs font-medium mt-1 ${senha.length < 6 ? 'text-red-500' : 'text-green-500'}`}>
                {senha.length < 6 ? `⚠️ Senha muito curta (${senha.length}/6 caracteres)` : '✅ Senha válida'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <User size={16} /> Usuário
              </button>
              <button type="button" onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <ShieldCheck size={16} /> Admin
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Criar Usuário</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Editar Usuário ──────────────────────────────────────────────────────
function CardEditarUsuario({ usuario, onClose, onSuccess }: { usuario: UsuarioFirestore; onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome]           = useState(usuario.nome);
  const [sobrenome, setSobrenome] = useState(usuario.sobrenome);
  const [funcao, setFuncao]       = useState(usuario.funcao);
  const [role, setRole]           = useState<'user' | 'admin'>(usuario.role);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { nome, sobrenome, funcao, role });
      toast.success(`Usuário ${nome} atualizado com sucesso!`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao atualizar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Pencil className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Editar Usuário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} autoComplete="given-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} autoComplete="family-name"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} autoComplete="organization-title"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">E-mail</label>
            <input type="email" value={usuario.email} disabled
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400">O e-mail não pode ser alterado aqui.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nível de Acesso</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('user')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <User size={16} /> Usuário
              </button>
              <button type="button" onClick={() => setRole('admin')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${role === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-gray-500 hover:border-slate-300'}`}>
                <ShieldCheck size={16} /> Admin
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Pencil size={15} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Criar Profissional ──────────────────────────────────────────────────
function CardCriarProfissional({ onClose }: { onClose: () => void }) {
  const [nome, setNome]           = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [funcao, setFuncao]       = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await addProfissional({ nome, sobrenome, funcao, ativo: true });
      toast.success(`Profissional ${nome} cadastrado com sucesso! 🎉`);
      onClose();
    } catch {
      toast.error('Erro ao cadastrar profissional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg"><Plus className="w-5 h-5 text-orange-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Novo Profissional</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="João"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} placeholder="Silva"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Tosador, Banhista..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={15} /> Cadastrar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card Editar Profissional ─────────────────────────────────────────────────
function CardEditarProfissional({ profissional, onClose }: { profissional: Profissional; onClose: () => void }) {
  const [nome, setNome]           = useState(profissional.nome);
  const [sobrenome, setSobrenome] = useState(profissional.sobrenome);
  const [funcao, setFuncao]       = useState(profissional.funcao);
  const [ativo, setAtivo]         = useState(profissional.ativo);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !sobrenome || !funcao) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await updateProfissional(profissional.id, { nome, sobrenome, funcao, ativo });
      toast.success(`Profissional ${nome} atualizado com sucesso!`);
      onClose();
    } catch {
      toast.error('Erro ao atualizar profissional.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg"><Pencil className="w-5 h-5 text-blue-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Editar Profissional</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sobrenome</label>
              <input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Função</label>
            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <p className="text-xs text-gray-400">Profissional aparece nas seleções</p>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(prev => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${ativo ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${ativo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-gray-700 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Pencil size={15} /> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Seção Usuários ───────────────────────────────────────────────────────────
function SecaoUsuarios() {
  const [usuarios, setUsuarios]   = useState<UsuarioFirestore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [editando, setEditando]   = useState<UsuarioFirestore | null>(null);
  const [deletando, setDeletando] = useState<UsuarioFirestore | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'usuarios'));
      setUsuarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as UsuarioFirestore[]);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarUsuarios(); }, []);

  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deleteDoc(doc(db, 'usuarios', deletando.id));
      toast.success(`Usuário ${deletando.nome} excluído com sucesso.`);
      setDeletando(null);
      carregarUsuarios();
    } catch {
      toast.error('Erro ao excluir usuário.');
    }
  };

  return (
    <>
      {showCriar && <CardCriarUsuario onClose={() => setShowCriar(false)} onSuccess={carregarUsuarios} />}
      {editando  && <CardEditarUsuario usuario={editando} onClose={() => setEditando(null)} onSuccess={carregarUsuarios} />}
      {deletando && <ModalConfirmDelete usuario={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            <span className="font-semibold text-gray-800">Usuários do Sistema</span>
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">{usuarios.length}</span>
          </div>
          <button onClick={() => setShowCriar(true)} className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition shadow-sm hover:shadow-md" title="Criar novo usuário">
            <Plus size={18} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full"><UserCircle2 className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm font-semibold text-gray-500">Nenhum usuário criado</p>
              <p className="text-xs text-gray-400">Clique no <span className="text-green-500 font-bold">+</span> para adicionar.</p>
            </div>
          ) : usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {u.role === 'admin' ? <ShieldCheck size={16} className="text-purple-500" /> : <User size={16} className="text-blue-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.nome} {u.sobrenome}</p>
                  <p className="text-xs text-gray-400">{u.funcao} · {u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditando(u)} className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"><Pencil size={15} /></button>
                <button onClick={() => setDeletando(u)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Seção Profissionais ──────────────────────────────────────────────────────
function SecaoProfissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showCriar, setShowCriar]         = useState(false);
  const [editando, setEditando]           = useState<Profissional | null>(null);
  const [deletando, setDeletando]         = useState<Profissional | null>(null);

  useEffect(() => {
    const unsub = subscribeToProfissionais(
      lista => { setProfissionais(lista); setLoading(false); },
      ()    => { toast.error('Erro ao carregar profissionais.'); setLoading(false); },
    );
    return () => unsub();
  }, []);

  const handleDelete = async () => {
    if (!deletando) return;
    try {
      await deleteProfissional(deletando.id);
      toast.success(`Profissional ${deletando.nome} excluído com sucesso.`);
      setDeletando(null);
    } catch {
      toast.error('Erro ao excluir profissional.');
    }
  };

  return (
    <>
      {showCriar && <CardCriarProfissional onClose={() => setShowCriar(false)} />}
      {editando  && <CardEditarProfissional profissional={editando} onClose={() => setEditando(null)} />}
      {deletando && <ModalConfirmDeleteProfissional profissional={deletando} onConfirm={handleDelete} onCancel={() => setDeletando(null)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-orange-500" />
            <span className="font-semibold text-gray-800">Profissionais</span>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{profissionais.length}</span>
          </div>
          <button onClick={() => setShowCriar(true)} className="bg-orange-500 hover:bg-orange-600 text-white p-1.5 rounded-lg transition shadow-sm hover:shadow-md" title="Novo profissional">
            <Plus size={18} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profissionais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <div className="bg-slate-100 p-4 rounded-full"><Briefcase className="w-8 h-8 text-slate-400" /></div>
              <p className="text-sm font-semibold text-gray-500">Nenhum profissional cadastrado</p>
              <p className="text-xs text-gray-400">Clique no <span className="text-orange-500 font-bold">+</span> para adicionar.</p>
            </div>
          ) : profissionais.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${p.ativo ? 'bg-orange-100' : 'bg-slate-100'}`}>
                  <Briefcase size={16} className={p.ativo ? 'text-orange-500' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.nome} {p.sobrenome}</p>
                  <p className="text-xs text-gray-400">
                    {p.funcao}
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditando(p)} className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition"><Pencil size={15} /></button>
                <button onClick={() => setDeletando(p)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── AdminSidebar — Componente Principal (export default) ─────────────────────
export default function AdminSidebar({
  onClose,
  currentUserRole,
}: {
  onClose: () => void;
  currentUserRole?: 'admin' | 'user';
}) {
  const [abaAtiva, setAbaAtiva]             = useState<'usuarios' | 'profissionais' | 'pets' | 'relatorios'>('usuarios');
  const [showRelatorios, setShowRelatorios] = useState(false);

  return (
    <>
      {showRelatorios && <ModalRelatorios onClose={() => setShowRelatorios(false)} />}

      <div className="fixed inset-0 z-50 flex">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Painel lateral direito */}
        <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Painel Admin</h2>
                <p className="text-purple-200 text-xs">Elite Pet Shop</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Abas */}
          <div className="flex border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setAbaAtiva('usuarios')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                abaAtiva === 'usuarios'
                  ? 'border-purple-500 text-purple-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={14} /> <span className="hidden sm:inline">Usuários</span>
            </button>
            <button
              onClick={() => setAbaAtiva('profissionais')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                abaAtiva === 'profissionais'
                  ? 'border-orange-500 text-orange-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={14} /> <span className="hidden sm:inline">Profissionais</span>
            </button>
            <button
              onClick={() => setAbaAtiva('pets')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                abaAtiva === 'pets'
                  ? 'border-pink-500 text-pink-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <PawPrint size={14} /> <span className="hidden sm:inline">Pets</span>
            </button>
            <button
              onClick={() => setAbaAtiva('relatorios')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                abaAtiva === 'relatorios'
                  ? 'border-indigo-500 text-indigo-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={14} /> <span className="hidden sm:inline">Relatórios</span>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {abaAtiva === 'usuarios'      && <SecaoUsuarios />}
            {abaAtiva === 'profissionais' && <SecaoProfissionais />}
            {abaAtiva === 'pets'          && <SecaoPetsCadastro />}
            {abaAtiva === 'relatorios'    && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                  <div className="bg-indigo-100 p-4 rounded-2xl">
                    <FileText className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Relatório de Atendimentos</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Gere relatórios em PDF por dia ou por período. Cada pet aparece em uma única linha com todas as informações consolidadas.
                    </p>
                  </div>
                  <div className="w-full grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <PackageCheck className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">Entregues</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <PhoneCall className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">Avisados</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-indigo-100">
                      <Download className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500 font-medium">PDF</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRelatorios(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={16} /> Gerar Relatório
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
