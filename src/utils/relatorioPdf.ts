// Relatórios do Painel Admin: rótulos, mesclagem de logs e geração do PDF
import type { LogEntry } from '../services/petService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { idDoDia } from './dias';
import { lojaId, nomeLoja, coresLoja } from '../lib/lojaAtual';
import { rgb } from './cores';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// ✅ Data de hoje no fuso de São Paulo (antes usava UTC: após 21h virava "amanhã")
export function getTodayKeyLocal(): string {
  return idDoDia();
}

export function formatDateBR(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimestamp(value: any): string {
  if (!value) return '—';
  if (value?.toDate) return value.toDate().toLocaleString('pt-BR');
  if (typeof value === 'string') return new Date(value).toLocaleString('pt-BR');
  return '—';
}

export function labelServico(s: string) {
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
export function gerarPDF(logs: LogEntry[], labelPeriodo: string) {
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
  // cor principal da Personalização (ou o petróleo da Pata & Gestão)
  const [cr, cg, cb] = rgb(coresLoja().principal);
  pdf.setFillColor(cr, cg, cb);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(nomeLoja().toUpperCase(), pageW / 2, 12, { align: 'center' });
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
      `${nomeLoja()} — Página ${i} de ${pageCount}`,
      pageW / 2,
      pdf.internal.pageSize.getHeight() - 5,
      { align: 'center' },
    );
  }

  pdf.save(`relatorio-${lojaId()}-${labelPeriodo.replace(/\//g, '-')}.pdf`);
}
