import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import type { Pet, Profissional } from '../app/types/pet';

/** Gera a chave do dia: "2026-04-28" */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/** Referência da coleção de pets ativos do dia */
const petsCollection = () =>
  collection(db, 'dias', getTodayKey(), 'pets');

/** Referência da coleção de logs do dia */
const logsCollection = () =>
  collection(db, 'dias', getTodayKey(), 'logs');

/** Referência da coleção global de profissionais */
const profissionaisCollection = () =>
  collection(db, 'profissionais');

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

// ─── Conversor Firestore → Profissional ───────────────────────────────────

function profissionalFromFirestore(id: string, data: any): Profissional {
  return {
    id,
    nome:      data.nome      ?? '',
    sobrenome: data.sobrenome ?? '',
    funcao:    data.funcao    ?? '',
    ativo:     data.ativo     ?? true,
  };
}

// ─── Escuta em tempo real — Pets ──────────────────────────────────────────

export function subscribeToPets(
  callback: (pets: Pet[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(petsCollection(), orderBy('checkInTime', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const pets = snapshot.docs.map((d) => fromFirestore(d.id, d.data()));
      callback(pets ?? []);
    },
    (err) => {
      console.error('[Firestore] subscribeToPets:', err);
      onError?.(err);
    },
  );
}

// ─── Escuta em tempo real — Profissionais ─────────────────────────────────

export function subscribeToProfissionais(
  callback: (profissionais: Profissional[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(profissionaisCollection(), orderBy('nome', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((d) =>
        profissionalFromFirestore(d.id, d.data()),
      );
      callback(lista);
    },
    (err) => {
      console.error('[Firestore] subscribeToProfissionais:', err);
      onError?.(err);
    },
  );
}

// ─── Cadastro — Pet ────────────────────────────────────────────────────────

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

// ─── Cadastro — Profissional ───────────────────────────────────────────────

export async function addProfissional(
  data: Omit<Profissional, 'id'>,
): Promise<string> {
  const ref = await addDoc(profissionaisCollection(), {
    nome:      data.nome,
    sobrenome: data.sobrenome,
    funcao:    data.funcao,
    ativo:     data.ativo ?? true,
    criadoEm:  serverTimestamp(),
  });
  return ref.id;
}

// ─── Edição — Pet ──────────────────────────────────────────────────────────

export async function updatePet(
  petId: string,
  updatedData: Partial<Pet>,
): Promise<void> {
  const petRef = doc(db, 'dias', getTodayKey(), 'pets', petId);
  await updateDoc(petRef, { ...updatedData });
}

// ─── Edição — Profissional ────────────────────────────────────────────────

export async function updateProfissional(
  id: string,
  data: Partial<Omit<Profissional, 'id'>>,
): Promise<void> {
  const ref = doc(db, 'profissionais', id);
  await updateDoc(ref, { ...data });
}

// ─── Exclusão — Profissional ──────────────────────────────────────────────

export async function deleteProfissional(id: string): Promise<void> {
  const ref = doc(db, 'profissionais', id);
  await deleteDoc(ref);
}

// ─── Encerramento (entregue / removido / cancelado) ───────────────────────

export type TipoEncerramento = 'entregue' | 'removido' | 'cancelado';

export async function encerrarPet(
  pet: Pet,
  tipo: TipoEncerramento,
): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  let removidoPorId: string | null = null;
  let removidoPorNome: string | null = null;

  if (user) {
    removidoPorId = user.uid;
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      removidoPorNome = userDoc.data().nome ?? 'Desconhecido';
    }
  }

  const checkOut = new Date();
  const checkIn  = new Date(pet.checkInTime);
  const duracaoMinutos = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / 60_000,
  );

  await addDoc(logsCollection(), {
    tipo,
    petId:               pet.id,
    nomePet:             pet.nomePet,
    nomeTutor:           pet.nomeTutor,
    especie:             pet.especie             ?? null,
    raca:                pet.raca                ?? null,
    porte:               pet.porte               ?? null,
    servico:             pet.servico,
    slotNumber:          pet.slotNumber,
    statusFinal:         pet.status,
    checkInTime:         pet.checkInTime,
    checkOutTime:        serverTimestamp(),
    duracaoMinutos,
    removidoPorId,
    removidoPorNome,
    profissionalBanho:   pet.profissionalBanho   ?? null,
    profissionalTosa:    pet.profissionalTosa     ?? null,
    profissionalEscovar: pet.profissionalEscovar ?? null,
    atendimentoIniciado: pet.atendimentoIniciado ?? false,
    observacoes:         pet.observacoes         ?? null,
    historicoReversoes:  pet.historicoReversoes  ?? [],
  });

  const petRef = doc(db, 'dias', getTodayKey(), 'pets', pet.id);
  await deleteDoc(petRef);
}
