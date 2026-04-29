// src/app/components/ProfessionalSelector.tsx

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Briefcase, Loader2 } from 'lucide-react';
import { subscribeToProfissionais } from '../../services/petService';
import type { Profissional, Pet } from '../types/pet';
import { Button } from './ui/button';

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Modo simples: apenas dropdown inline */
interface ProfissionalSelectorSimpleProps {
  etapa: 'banho' | 'tosa' | 'escovar' | 'higienica' | 'ozonio' | 'hidratacao';
  value?: string;
  onChange: (profissionalId: string, profissionalNome: string) => void;
  disabled?: boolean;
  // props do modo modal NÃO presentes
  pet?: undefined;
  onSubmit?: undefined;
  onCancel?: undefined;
  onAssignProfessional?: undefined;
}

/** Modo modal: usado dentro de Dialog no KanbanBoard */
interface ProfissionalSelectorModalProps {
  pet: Pet & { proximaEtapa: string };
  onSubmit: (profissionalNome: string) => void;
  onCancel: () => void;
  onAssignProfessional: (
    petId: string,
    profissionalBanho?: string,
    profissionalTosa?: string,
    profissionalEscovar?: string,
  ) => void;
  // props do modo simples NÃO presentes
  etapa?: undefined;
  value?: undefined;
  onChange?: undefined;
  disabled?: undefined;
}

type ProfissionalSelectorProps =
  | ProfissionalSelectorSimpleProps
  | ProfissionalSelectorModalProps;

// ── Labels ───────────────────────────────────────────────────────────────────

const ETAPA_LABEL: Record<string, string> = {
  banho:      'Responsável pelo Banho',
  tosa:       'Responsável pela Tosa',
  escovar:    'Responsável por Escovar',
  higienica:  'Responsável pela Higiênica',
  ozonio:     'Responsável pelo Ozônio',
  hidratacao: 'Responsável pela Hidratação',
};

// ── Componente ────────────────────────────────────────────────────────────────

export function ProfessionalSelector(props: ProfissionalSelectorProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading]             = useState(true);
  const [open, setOpen]                   = useState(false);
  const [selecionadoNome, setSelecionadoNome] = useState<string>('');
  const [selecionadoId, setSelecionadoId]     = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  // ── Carrega profissionais ativos do Firestore em tempo real ────────────────
  useEffect(() => {
    const unsub = subscribeToProfissionais(
      (lista: Profissional[]) => {
        setProfissionais(lista.filter((p: Profissional) => p.ativo));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  // ── Fecha dropdown ao clicar fora ──────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Detecta modo de uso ────────────────────────────────────────────────────
  const isModalMode = props.pet !== undefined;

  // Modo simples: valor controlado externamente
  const valueSimple   = !isModalMode ? props.value   : undefined;
  const etapaSimple   = !isModalMode ? props.etapa   : undefined;
  const disabled      = !isModalMode ? (props.disabled ?? false) : false;

  // Etapa a mostrar no label (modal usa proximaEtapa do pet)
  const etapaAtual = isModalMode
    ? (props.pet.proximaEtapa || props.pet.status)
    : etapaSimple!;

  // Profissional selecionado no modo simples
  const selecionadoSimples = !isModalMode
    ? profissionais.find((p) => p.id === valueSimple)
    : null;

  // Nome exibido no trigger
  const nomeExibido = isModalMode
    ? (selecionadoNome || 'Selecionar profissional')
    : (selecionadoSimples
        ? `${selecionadoSimples.nome} ${selecionadoSimples.sobrenome}`
        : 'Selecionar profissional');

  // ── Handler de seleção ─────────────────────────────────────────────────────
  const handleSelect = (p: Profissional) => {
    const nomeCompleto = `${p.nome} ${p.sobrenome}`;

    if (isModalMode) {
      setSelecionadoId(p.id);
      setSelecionadoNome(nomeCompleto);
    } else {
      props.onChange(p.id, nomeCompleto);
    }
    setOpen(false);
  };

  // ── Valor atual para highlight ─────────────────────────────────────────────
  const currentId = isModalMode ? selecionadoId : (valueSimple ?? '');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div ref={ref} className="relative w-full">
        {/* Label */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {ETAPA_LABEL[etapaAtual] ?? `Responsável por ${etapaAtual}`}
        </p>

        {/* Trigger */}
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen((prev) => !prev)}
          className={`
            w-full flex items-center justify-between gap-2
            px-4 py-2.5 rounded-xl border text-sm font-medium
            transition-all duration-150 focus:outline-none
            ${disabled
              ? 'bg-slate-100 border-slate-200 text-gray-400 cursor-not-allowed'
              : open
                ? 'bg-white border-orange-400 ring-2 ring-orange-100 text-gray-800'
                : 'bg-white border-slate-200 hover:border-orange-300 text-gray-700'
            }
          `}
        >
          <div className="flex items-center gap-2 truncate">
            {loading ? (
              <Loader2 size={15} className="animate-spin text-orange-400 shrink-0" />
            ) : (
              <Briefcase size={15} className="text-orange-400 shrink-0" />
            )}
            <span className="truncate">
              {loading ? 'Carregando...' : nomeExibido}
            </span>
          </div>
          <ChevronDown
            size={15}
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {open && !loading && (
          <div className="
            absolute z-50 mt-1.5 w-full
            bg-white border border-slate-200 rounded-xl shadow-xl
            overflow-hidden
          ">
            {profissionais.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-center px-4">
                <Briefcase size={20} className="text-slate-300" />
                <p className="text-xs text-gray-400 font-medium">
                  Nenhum profissional ativo encontrado.
                </p>
              </div>
            ) : (
              <ul className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                {profissionais.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3
                        text-left text-sm transition hover:bg-orange-50
                        ${currentId === p.id ? 'bg-orange-50' : ''}
                      `}
                    >
                      {/* Avatar inicial */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        text-xs font-bold shrink-0
                        ${currentId === p.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-100 text-orange-600'}
                      `}>
                        {p.nome.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={`font-semibold truncate ${currentId === p.id ? 'text-orange-700' : 'text-gray-800'}`}>
                          {p.nome} {p.sobrenome}
                        </span>
                        <span className="text-xs text-gray-400 truncate">{p.funcao}</span>
                      </div>

                      {currentId === p.id && (
                        <span className="ml-auto text-orange-500 text-xs font-bold shrink-0">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Botões de ação — apenas no modo modal */}
      {isModalMode && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={props.onCancel}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!selecionadoNome}
            onClick={() => {
              if (selecionadoNome) {
                props.onSubmit(selecionadoNome);
              }
            }}
          >
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}
