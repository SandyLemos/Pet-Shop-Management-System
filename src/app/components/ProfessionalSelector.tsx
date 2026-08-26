// src/app/components/ProfessionalSelector.tsx

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Briefcase, Loader2 } from 'lucide-react';
import { subscribeToProfissionais } from '../../services/petService';
import type { Profissional, Pet } from '../types/pet';
import { Button } from './ui/button';
import { HealthIssuesSelector } from './HealthIssuesSelector';
import { NO_ISSUES_ID } from '../constants/healthIssues';


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
  fillHeight?: undefined;
}

/** Modo modal: usado dentro de Dialog no KanbanBoard */
interface ProfissionalSelectorModalProps {
  pet: Pet & { proximaEtapa: string };
  // ── ALTERADO: agora também devolve os problemas de saúde ──
  onSubmit: (profissionalNome: string, problemasSaude: string[]) => void;
  onCancel: () => void;
  onAssignProfessional: (
    petId: string,
    profissionalBanho?: string,
    profissionalTosa?: string,
    profissionalEscovar?: string,
  ) => void;
  /**
   * 🆕 Quando true, o componente ocupa 100% da altura disponível do Dialog:
   * o corpo (dropdown + problemas de saúde) rola, enquanto o aviso de
   * validação e os botões Cancelar/Confirmar ficam FIXOS no rodapé.
   *
   * Requer que o DialogContent pai tenha:
   *   p-0 gap-0 h-[88vh] flex flex-col overflow-hidden
   */
  fillHeight?: boolean;
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

// ── Lógica de herança de problemas (pura e testável) ──────────────────────────

interface ProblemasPorEtapa {
  banho: string[];
  escovar: string[];
  tosa: string[];
}

/**
 * Retorna os problemas de saúde de uma etapa (Opção B: acumula com herança).
 *
 * - banho   → apenas os do banho
 * - escovar → banho ∪ escovar (sem duplicados)
 * - tosa    → banho ∪ escovar ∪ tosa (sem duplicados)
 *
 * Ordem de acúmulo: banho → escovar → tosa
 */
export function getProblemasHerdados(
  etapa: string,
  { banho, escovar, tosa }: ProblemasPorEtapa,
): string[] {
  // Helper: une arrays removendo duplicados, preservando ordem de inserção
  const merge = (...arrays: string[][]): string[] =>
    Array.from(new Set(arrays.flat()));

  switch (etapa) {
    case 'banho':
      return merge(banho);

    case 'escovar':
      // acumula: banho + escovar
      return merge(banho, escovar);

    case 'tosa':
      // acumula: banho + escovar + tosa
      return merge(banho, escovar, tosa);

    default:
      // etapas sem herança (higienica, ozonio, hidratacao)
      return [];
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ProfessionalSelector(props: ProfissionalSelectorProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading]             = useState(true);
  const [open, setOpen]                   = useState(false);
  const [selecionadoNome, setSelecionadoNome] = useState<string>('');
  const [selecionadoId, setSelecionadoId]     = useState<string>('');
  const [problemasSaude, setProblemasSaude]   = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // ── NOVO: flag de "usuário já interagiu manualmente com os problemas" ──
  // Evita que o useEffect (re)hidrate e sobrescreva o que o usuário marcou,
  // especialmente quando os dados do Firestore chegam atrasados.
  const userTouchedRef = useRef(false);

  // ── Detecta modo de uso (antes dos effects, resolve ts2448/ts2454) ──
  const isModalMode = props.pet !== undefined;

  // ── 🆕 Layout com rodapé fixo (só faz sentido no modo modal) ──
  const fillHeight = isModalMode ? (props.fillHeight ?? false) : false;

  // ── petKey: chave estável que muda apenas quando o conteúdo relevante muda ──
  const petKey = isModalMode
    ? JSON.stringify({
        etapa:   props.pet.proximaEtapa || props.pet.status,
        banho:   props.pet.problemasSaudeBanho   ?? [],
        escovar: props.pet.problemasSaudeEscovar ?? [],
        tosa:    props.pet.problemasSaudeTosa    ?? [],
      })
    : '';

  // ── NOVO: reseta a flag de "tocado" apenas quando troca de PET ──
  // (trocar de etapa do mesmo pet NÃO reseta — a rehidratação por petKey cuida disso)
  const petId = isModalMode ? props.pet.id : undefined;
  useEffect(() => {
    userTouchedRef.current = false;
  }, [petId]);

  // ── Pré-carrega problemas: acumula etapa atual + anteriores (Opção B) ──
  useEffect(() => {
    if (!isModalMode) return;

    // Se o usuário já mexeu manualmente, NÃO sobrescreve a seleção dele
    if (userTouchedRef.current) return;

    const etapa = props.pet.proximaEtapa || props.pet.status;

    const existentes = getProblemasHerdados(etapa, {
      banho:   props.pet.problemasSaudeBanho   ?? [],
      escovar: props.pet.problemasSaudeEscovar ?? [],
      tosa:    props.pet.problemasSaudeTosa    ?? [],
    });

    setProblemasSaude(existentes);
    // ✅ depende só de petKey — estável e sem ruído de referência
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petKey]);

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

  // ── NOVO: handler que marca o "toque" do usuário antes de atualizar ──
  const handleProblemasChange = (novos: string[]) => {
    userTouchedRef.current = true;
    setProblemasSaude(novos);
  };

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

  // ── Obrigatório marcar ao menos 1 item (pode ser "Nenhuma") ──
  const problemasSaudeValido = problemasSaude.length > 0;
  const podeConfirmar = !!selecionadoNome && problemasSaudeValido;

  // ── Render ─────────────────────────────────────────────────────────────────

  // 🆕 Bloco do dropdown de profissional — reaproveitado nos 3 layouts
  const blocoProfissional = (
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
            <ul className="max-h-52 overflow-y-auto overscroll-contain divide-y divide-slate-50">
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
  );

  // ── MODO SIMPLES: apenas o dropdown inline ──────────────────────────────────
  if (!isModalMode) {
    return <div className="space-y-4">{blocoProfissional}</div>;
  }

  // 🆕 Rodapé: aviso de validação + botões (usado no layout fillHeight)
  const rodape = (
    <div
      className="shrink-0 border-t border-slate-100 bg-white
                 px-5 py-3 space-y-2
                 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {!problemasSaudeValido && (
        <p className="text-xs text-red-500 leading-snug">
          Selecione ao menos um item (marque "Nenhuma" se não houver problemas).
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={props.onCancel}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          disabled={!podeConfirmar}
          onClick={() => {
            if (podeConfirmar) {
              props.onSubmit(selecionadoNome, problemasSaude);
            }
          }}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );

  // ── MODO MODAL com rodapé FIXO ──────────────────────────────────────────────
  // Requer DialogContent pai com: p-0 gap-0 h-[88vh] flex flex-col overflow-hidden
  if (fillHeight) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4
                      transition-[padding] duration-150
                      ${open ? 'pb-56' : 'pb-4'}`}
        >
          {blocoProfissional}

          <div className="pt-2 border-t border-slate-100">
            <HealthIssuesSelector
              selectedIds={problemasSaude}
              onChange={handleProblemasChange}
            />
          </div>
        </div>

        {rodape}
      </div>
    );
  }

  // ── MODO MODAL legado (rodapé rola junto) — compatibilidade ─────────────────
  return (
    <div className="space-y-4">
      {blocoProfissional}

      {/* ── Problemas de saúde (obrigatório) ── */}
      <div className="pt-2 border-t border-slate-100">
        <HealthIssuesSelector
          selectedIds={problemasSaude}
          onChange={handleProblemasChange}
        />
        {!problemasSaudeValido && (
          <p className="text-xs text-red-500 mt-2">
            Selecione ao menos um item (marque "Nenhuma" se não houver problemas).
          </p>
        )}
      </div>

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
          disabled={!podeConfirmar}
          onClick={() => {
            if (podeConfirmar) {
              props.onSubmit(selecionadoNome, problemasSaude);
            }
          }}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}
