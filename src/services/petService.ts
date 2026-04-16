import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,        // ← adicionar
  setDoc,           // ← adicionar
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

/** Referência da coleção de registros deletados */
const deletedCollection = () =>
  collection(db, 'dias', getTodayKey(), 'deletados');

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

// ─── Deleção ───────────────────────────────────────────────────────────────

/**
 * Deleta o pet da fila ativa E salva um registro
 * na subcoleção "deletados" para relatórios futuros.
 */
export async function deletePet(pet: Pet): Promise<void> {
  // 1. Salva o registro na coleção de deletados (para relatórios)
  await addDoc(deletedCollection(), {
    petId:          pet.id,
    nomePet:        pet.nomePet,
    nomeTutor:      pet.nomeTutor,
    especie:        pet.especie,
    raca:           pet.raca ?? null,
    porte:          pet.porte ?? null,
    servico:        pet.servico,
    slotNumber:     pet.slotNumber,
    statusNoMomento: pet.status,           // status quando foi deletado
    atendimentoIniciado: pet.atendimentoIniciado ?? false,
    profissionalBanho:   pet.profissionalBanho ?? null,
    profissionalTosa:    pet.profissionalTosa ?? null,
    profissionalEscovar: pet.profissionalEscovar ?? null,
    checkInTime:    pet.checkInTime,
    deletadoEm:     serverTimestamp(),     // momento exato da exclusão
    motivoDelecao:  pet.status === 'espera' ? 'removido_fila' : 'forcado_pelo_admin',
  });

  // 2. Remove o pet da fila ativa
  const petRef = doc(db, 'dias', getTodayKey(), 'pets', pet.id);
  await deleteDoc(petRef);
}
