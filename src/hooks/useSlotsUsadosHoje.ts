import { useCallback, useSyncExternalStore } from 'react';
import {
  ouvirSlotsUsados,
  marcarSlotUsado,
  liberarSlotUsado,
} from '../services/slotUsageService';
import { idDoDia } from '../utils/dias';

/* Store global único: um só listener no Firestore para toda a app,
   compartilhado por SlotGrid, KanbanBoard e PetRegistration. */

let dia = idDoDia();
let cache: Set<number> = new Set();
let unsub: (() => void) | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => l());

function conectar() {
  unsub?.();
  unsub = ouvirSlotsUsados(dia, slots => {
    cache = new Set(slots);
    emit();
  });
}

/** Vira o dia: novo doc, cache zerado. */
function sincronizarDia() {
  const hoje = idDoDia();
  if (hoje === dia) return;
  dia = hoje;
  cache = new Set();
  emit();
  conectar();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) {
    if (!unsub) conectar();
    sincronizarDia();
  }
  return () => { listeners.delete(l); };
};

const getSnapshot = () => cache;
const getServerSnapshot = () => cache;

// checa virada de dia + volta de sleep do tablet
if (typeof window !== 'undefined') {
  setInterval(sincronizarDia, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizarDia();
  });
}

/** Aceita slot 0 e rejeita null/undefined/NaN/decimal. */
const slotValido = (s: unknown): s is number =>
  typeof s === 'number' && Number.isInteger(s) && s >= 0;

export function useSlotsUsadosHoje() {
  const usados = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const estaUsado = useCallback(
    (slot?: number | null) => (slotValido(slot) ? usados.has(slot) : false),
    [usados],
  );

  const marcarUsado = useCallback(async (slot?: number | null) => {
    if (!slotValido(slot)) {
      console.warn('[slots] entrega sem slot vinculado:', slot);
      return;
    }
    sincronizarDia();
    if (cache.has(slot)) return;

    // pintura otimista — o onSnapshot confirma em seguida
    cache = new Set(cache).add(slot);
    emit();

    try {
      await marcarSlotUsado(dia, slot);
    } catch (e) {
      console.error('[useSlotsUsadosHoje] falha ao marcar', e);
      const next = new Set(cache);
      next.delete(slot);
      cache = next;
      emit();
    }
  }, []);

  /** Uso administrativo: desfazer entrega / corrigir engano. */
  const liberarSlot = useCallback(async (slot?: number | null) => {
    if (!slotValido(slot)) return;
    if (!cache.has(slot)) return;

    const anterior = cache;
    const next = new Set(cache);
    next.delete(slot);
    cache = next;
    emit();

    try {
      await liberarSlotUsado(dia, slot);
    } catch (e) {
      console.error('[useSlotsUsadosHoje] falha ao liberar', e);
      cache = anterior; // rollback simétrico
      emit();
    }
  }, []);

  return { usados, dia, estaUsado, marcarUsado, liberarSlot };
}
