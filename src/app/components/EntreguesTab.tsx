// src/app/components/EntreguesTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Search, PawPrint } from 'lucide-react';
import { getLogsByDate, getTodayKey, type LogEntry } from '../../services/petService';

function formatHora(iso?: string): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuracao(min?: number): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function EntreguesTab() {
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca]     = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const todos = await getLogsByDate(getTodayKey());
      // ✅ só os entregues, mais recentes primeiro
      const entregues = todos
        .filter((l) => l.tipo === 'entregue')
        .sort((a, b) =>
          (b.checkOutTime ?? '').localeCompare(a.checkOutTime ?? ''),
        );
      setLogs(entregues);
    } catch (err) {
      console.error('[EntreguesTab] erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = logs.filter((l) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return (
      l.nomePet.toLowerCase().includes(t) ||
      l.nomeTutor.toLowerCase().includes(t) ||
      (l.petNumber ?? '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800">Entregues hoje</h2>
            <p className="text-xs text-gray-400">
              {logs.length} pet{logs.length !== 1 ? 's' : ''} entregue{logs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pet, tutor ou código..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 w-56"
            />
          </div>
          <button
            onClick={carregar}
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-gray-500 hover:bg-slate-100 transition"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Carregando entregas...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <PawPrint size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Nenhum pet entregue ainda hoje.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b border-slate-100">
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Pet</th>
                <th className="py-2 px-3">Tutor</th>
                <th className="py-2 px-3">Serviço</th>
                <th className="py-2 px-3">Entrada</th>
                <th className="py-2 px-3">Entrega</th>
                <th className="py-2 px-3">Permanência</th>
                <th className="py-2 px-3">Entregue por</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{l.petNumber ?? '—'}</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-800">{l.nomePet}</td>
                  <td className="py-2.5 px-3 text-gray-600">{l.nomeTutor}</td>
                  <td className="py-2.5 px-3 capitalize text-gray-600">{l.servico.replace('_', ' + ')}</td>
                  <td className="py-2.5 px-3 text-gray-500">{formatHora(l.checkInTime)}</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-medium">{formatHora(l.checkOutTime)}</td>
                  <td className="py-2.5 px-3 text-gray-500">{formatDuracao(l.duracaoMinutos)}</td>
                  <td className="py-2.5 px-3 text-gray-500">{l.encerradoPorNome ?? l.removidoPorNome ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
