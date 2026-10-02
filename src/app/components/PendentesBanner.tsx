// src/app/components/PendentesBanner.tsx
import { useState } from 'react';
import { AlertTriangle, PackageCheck, Trash2, Loader2 } from 'lucide-react';
import type { Pet } from '../types/pet';

/**
 * ✅ Aviso de pets que ficaram na fila de dias anteriores sem serem
 * entregues/removidos. Cada um pode ser encerrado aqui; o registro vai
 * para o dia em que o pet foi atendido (não para hoje).
 */

type Tipo = 'entregue' | 'removido';

interface PendentesBannerProps {
  pendentes: Pet[];
  onEncerrar: (pet: Pet, tipo: Tipo) => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
  espera:     'Aguardando',
  banho:      'Em banho',
  escovar:    'Escovando',
  tosa:       'Em tosa',
  finalizado: 'Pronto para retirada',
};

function formatDia(dia?: string): string {
  if (!dia) return '—';
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}

export function PendentesBanner({ pendentes, onEncerrar }: PendentesBannerProps) {
  // confirmação em 2 passos: 1º clique escolhe, 2º confirma
  const [confirmando, setConfirmando] = useState<{ id: string; tipo: Tipo } | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  if (pendentes.length === 0) return null;

  const plural = pendentes.length > 1;

  const confirmar = async (pet: Pet, tipo: Tipo) => {
    setOcupadoId(pet.id);
    try {
      await onEncerrar(pet, tipo);
    } finally {
      setOcupadoId(null);
      setConfirmando(null);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">
            {pendentes.length} pet{plural ? 's' : ''} de dias anteriores não {plural ? 'foram encerrados' : 'foi encerrado'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {plural ? 'Eles não aparecem' : 'Ele não aparece'} na fila de hoje. Marque como entregue ou remova
            para {plural ? 'que fiquem registrados' : 'que fique registrado'} no relatório do dia do atendimento.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {pendentes.map((pet) => {
          const emConfirmacao = confirmando?.id === pet.id ? confirmando.tipo : null;
          const ocupado = ocupadoId === pet.id;

          return (
            <li
              key={`${pet.dia}-${pet.id}`}
              className="bg-white border border-amber-200 rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {pet.nomePet}
                  <span className="font-normal text-gray-500"> · {pet.nomeTutor}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Dia {formatDia(pet.dia)} · Slot {pet.slotNumber} · {STATUS_LABEL[pet.status] ?? pet.status}
                </p>
              </div>

              {emConfirmacao ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {emConfirmacao === 'entregue' ? 'Confirmar entrega?' : 'Confirmar remoção?'}
                  </span>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => confirmar(pet, emConfirmacao)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-60 flex items-center gap-1.5 ${
                      emConfirmacao === 'entregue' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Sim
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => setConfirmando(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-gray-600 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmando({ id: pet.id, tipo: 'entregue' })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition flex items-center gap-1.5"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> Entregue
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando({ id: pet.id, tipo: 'removido' })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
