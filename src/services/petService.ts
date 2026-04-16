import {
  collection,
  addDoc,
  onSnapshot,        // ← adicionar
  query,             // ← adicionar
  orderBy,           // ← adicionar
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Pet } from '../app/types/pet';

/** Gera a chave do dia: "2026-04-15" */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** Referência da coleção de pets do dia atual */
const petsCollection = () =>
  collection(db, 'dias', getTodayKey(), 'pets');

// ─── Conversor Firestore → Pet ─────────────────────────────────────────────

function fromFirestore(id: string, data: any): Pet {
  return {
    ...data,
    id,
    checkInTime: data?.checkInTime?.toDate?.()?.toISOString()
      ?? new Date().toISOString(),
    historicoReversoes: (data?.historicoReversoes ?? []).map((r: any) => ({
      ...r,
      data: r?.data?.toDate?.()?.toISOString() ?? r?.data ?? new Date().toISOString(),
    })),
  } as Pet;
}

// ─── Escuta em tempo real ──────────────────────────────────────────────────

/**
 * Assina os pets do dia em tempo real.
 * Retorna a função de cancelamento (unsubscribe).
 */
export function subscribeToPets(
  callback: (pets: Pet[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(petsCollection(), orderBy('checkInTime', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const pets = snapshot.docs.map((d) => fromFirestore(d.id, d.data()));
      callback(pets);
    },
    (err) => {
      console.error('[Firestore] subscribeToPets:', err);
      onError?.(err);
    },
  );
}

// ─── Cadastro ──────────────────────────────────────────────────────────────

export async function addPet(
  petData: Omit<Pet, 'id' | 'checkInTime'>,
): Promise<string> {
  const ref = await addDoc(petsCollection(), {
    ...petData,
    checkInTime: serverTimestamp(),
    historicoReversoes: [],
  });
  return ref.id;
}
