// src/app/components/AlertasPet.tsx
// ✅ Alertas da ficha: selos em destaque (cards, vaga, detalhes) e o seletor do cadastro.
import { AlertTriangle } from 'lucide-react';
import {
  ALERTAS_PRONTOS,
  MAX_ALERTA_OBS,
  MAX_ALERTA_OUTRO,
  normalizarAlertas,
  resumirAlertas,
} from '../../utils/alertas';

// ─── Selos ────────────────────────────────────────────────────────────────

interface AlertaSelosProps {
  alertas?: string[] | null;
  alertaObs?: string | null;
  /** card pequeno: mostra só os 2 primeiros + "+N" */
  compacto?: boolean;
  max?: number;
  className?: string;
}

export function AlertaSelos({ alertas, alertaObs, compacto = false, max = 2, className = '' }: AlertaSelosProps) {
  const lista = normalizarAlertas(alertas);
  const obs = (alertaObs ?? '').trim();
  if (lista.length === 0 && (compacto || !obs)) return null;

  if (compacto) {
    const { visiveis, restantes } = resumirAlertas(lista, max);
    return (
      <div
        className={`flex flex-wrap items-center gap-1 ${className}`}
        data-testid="alerta-selos"
        title={`Atenção: ${lista.join(', ')}`}
      >
        {visiveis.map((a) => (
          <span
            key={a}
            className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
          >
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {a}
          </span>
        ))}
        {restantes > 0 && (
          <span className="inline-flex items-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
            +{restantes}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 border-red-200 bg-red-50 p-2.5 space-y-1.5 ${className}`}
      data-testid="alerta-selos"
    >
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        Atenção com este pet
      </p>
      {lista.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lista.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {a}
            </span>
          ))}
        </div>
      )}
      {obs && (
        <p className="text-sm font-medium text-red-800 break-words whitespace-pre-wrap">{obs}</p>
      )}
    </div>
  );
}

/** Selo mínimo para a vaga da Grade (espaço pequeno): ícone + total */
export function AlertaSeloVaga({ alertas }: { alertas?: string[] | null }) {
  const lista = normalizarAlertas(alertas);
  if (lista.length === 0) return null;
  return (
    <span
      className="absolute -top-1.5 -left-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1 py-0.5 text-[9px] font-bold leading-none text-white shadow ring-2 ring-white"
      title={`Atenção: ${lista.join(', ')}`}
      aria-label={`Atenção: ${lista.join(', ')}`}
      data-testid="alerta-selo-vaga"
    >
      <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
      {lista.length > 1 ? lista.length : ''}
    </span>
  );
}

// ─── Seletor (cadastro e edição da ficha) ─────────────────────────────────

interface AlertasSelectorProps {
  prontos: string[];
  outro: string;
  obs: string;
  onChange: (v: { prontos: string[]; outro: string; obs: string }) => void;
}

export function AlertasSelector({ prontos, outro, obs, onChange }: AlertasSelectorProps) {
  const alternar = (a: string) => {
    const novo = prontos.includes(a) ? prontos.filter((x) => x !== a) : [...prontos, a];
    onChange({ prontos: novo, outro, obs });
  };

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 space-y-3" data-testid="alertas-selector">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold text-red-700">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Alertas da ficha
        </p>
        <p className="text-xs text-slate-500">
          Ficam salvos no pet e aparecem em todas as visitas. Toque para marcar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALERTAS_PRONTOS.map((a) => {
          const marcado = prontos.includes(a);
          return (
            <button
              key={a}
              type="button"
              aria-pressed={marcado}
              onClick={() => alternar(a)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                marcado
                  ? 'border-red-600 bg-red-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'
              }`}
            >
              {marcado && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
              {a}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <label htmlFor="alertaOutro" className="text-xs font-semibold text-slate-600">
          Outro alerta (opcional)
        </label>
        <input
          id="alertaOutro"
          type="text"
          maxLength={MAX_ALERTA_OUTRO}
          value={outro}
          onChange={(e) => onChange({ prontos, outro: e.target.value, obs })}
          placeholder="Ex.: Epilético"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="alertaObs" className="text-xs font-semibold text-slate-600">
          Detalhe do alerta (opcional)
        </label>
        <input
          id="alertaObs"
          type="text"
          maxLength={MAX_ALERTA_OBS}
          value={obs}
          onChange={(e) => onChange({ prontos, outro, obs: e.target.value })}
          placeholder="Ex.: alérgico a shampoo X"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <p className="text-right text-[10px] text-slate-400">{obs.length}/{MAX_ALERTA_OBS}</p>
      </div>
    </div>
  );
}
