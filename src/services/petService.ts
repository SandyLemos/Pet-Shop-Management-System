import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  Timestamp,
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

/** ✅ Referência da coleção global de cadastros permanentes de pets */
const petsCadastroCollection = () =>
  collection(db, 'petsCadastro');

// 🆕 ─── Helper: inverte uma string de dígitos ("8888" -> "8888", "12345" -> "54321")
function inverterString(str: string): string {
  return str.split('').reverse().join('');
}

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

// ═══════════════════════════════════════════════════════════════════════════
// ✅ CADASTRO PERMANENTE DE PETS + petNumber sequencial
// ═══════════════════════════════════════════════════════════════════════════

/** Ficha permanente do pet (coleção petsCadastro) */
export interface PetCadastro {
  petNumber: string;          // Ex: "PET-000123"
  petNumberSeq?: string;      // ✅ número puro sem zeros, ex: "123"
  nomePet: string;
  nomeTutor: string;
  telefone: string;
  telefoneReverso?: string;   // 🆕 telefone (só dígitos) invertido, p/ busca por final
  especie?: 'cao' | 'gato';
  raca?: string;
  porte?: 'pequeno' | 'medio' | 'grande';
  foto?: string;
  criadoEm?: any;
  atualizadoEm?: any;
}

/**
 * ✅ Gera um petNumber sequencial e ATÔMICO via transaction.
 * Garante que nunca repita, mesmo com cadastros simultâneos.
 * Formato: "PET-000123"
 */
export async function gerarPetNumber(): Promise<string> {
  const contadorRef = doc(db, 'contadores', 'petNumber');

  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(contadorRef);
    const atual = snap.exists() ? (snap.data().valor ?? 0) : 0;
    const proximo = atual + 1;
    tx.set(contadorRef, { valor: proximo }, { merge: true });
    return proximo;
  });

  return `PET-${String(numero).padStart(6, '0')}`;
}

/**
 * ✅ Busca pets no cadastro permanente por:
 *  - petNumber (por PREFIXO: "1" acha 1, 10, 12, 123... | "PET-1", "pet 001" também funcionam)
 *  - telefone (🆕 por FINAL: digitar os últimos 4+ dígitos acha o pet)
 *  - nomePet (prefixo, case-insensitive)
 * Retorna no máximo ~10 resultados sem duplicar.
 */
export async function buscarPetsCadastro(termo: string): Promise<PetCadastro[]> {
  const t = termo.trim();
  if (!t) return [];

  const col = petsCadastroCollection();
  const resultados = new Map<string, PetCadastro>();

  // 1️⃣ Por petNumber — busca por PREFIXO (digitar "1" acha 1, 10, 12, 123...)
  const soDigitosNumero = t.replace(/\D/g, ''); // remove tudo que não é número
  if (soDigitosNumero.length > 0) {
    // remove zeros à esquerda para casar com petNumberSeq ("0001" -> "1")
    const semZeros = String(parseInt(soDigitosNumero, 10));

    // a) match exato com padding (PET-000001) — pega o doc direto
    const numeroLimpo = `PET-${soDigitosNumero.padStart(6, '0')}`;
    const porNumero = await getDoc(doc(col, numeroLimpo));
    if (porNumero.exists()) {
      resultados.set(numeroLimpo, porNumero.data() as PetCadastro);
    }

    // b) busca por PREFIXO usando o campo petNumberSeq
    const qNum = query(
      col,
      where('petNumberSeq', '>=', semZeros),
      where('petNumberSeq', '<=', semZeros + '\uf8ff'),
      limit(10),
    );
    const snapNum = await getDocs(qNum);
    snapNum.forEach((d) => resultados.set(d.id, d.data() as PetCadastro));
  }

  // 2️⃣ 🆕 Por telefone — busca por FINAL (últimos 4+ dígitos)
  // Usa o campo telefoneReverso: o "final" do telefone vira "início" do invertido,
  // permitindo busca por prefixo (que o Firestore suporta nativamente).
  const soDigitos = t.replace(/\D/g, '');
  if (soDigitos.length >= 4) {
    const termoReverso = inverterString(soDigitos); // ex: "8888" -> "8888"
    const qTel = query(
      col,
      where('telefoneReverso', '>=', termoReverso),
      where('telefoneReverso', '<=', termoReverso + '\uf8ff'),
      limit(10),
    );
    const snapTel = await getDocs(qTel);
    snapTel.forEach((d) => resultados.set(d.id, d.data() as PetCadastro));
  }

  // 3️⃣ Por nomePet (prefixo, case-insensitive)
  const nomeLower = t.toLowerCase();
  const qNome = query(
    col,
    where('nomePetLower', '>=', nomeLower),
    where('nomePetLower', '<=', nomeLower + '\uf8ff'),
    limit(10),
  );
  const snapNome = await getDocs(qNome);
  snapNome.forEach((d) => resultados.set(d.id, d.data() as PetCadastro));

  return Array.from(resultados.values());
}

/**
 * ✅ Lista TODOS os pets do cadastro permanente (coleção petsCadastro).
 * Ordenados por nome (case-insensitive via nomePetLower).
 */
export async function getAllPetsCadastro(): Promise<PetCadastro[]> {
  const q = query(petsCadastroCollection(), orderBy('nomePetLower', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PetCadastro);
}

/**
 * ✅ Exclui a ficha permanente de um pet pelo petNumber.
 * ⚠️ NÃO afeta os pets da fila do dia nem os logs históricos.
 */
export async function deletePetCadastro(petNumber: string): Promise<void> {
  const ref = doc(petsCadastroCollection(), petNumber);
  await deleteDoc(ref);
}

/**
 * ✅ Atualiza a ficha permanente do pet (reusa salvarCadastroPet).
 * Mantém o mesmo petNumber e regenera campos derivados (lower, telefoneReverso).
 */
export async function updatePetCadastro(
  petNumber: string,
  dados: Omit<PetCadastro, 'petNumber' | 'petNumberSeq' | 'telefoneReverso' | 'criadoEm' | 'atualizadoEm'>,
): Promise<void> {
  await salvarCadastroPet(dados, petNumber);
}

/**
 * ✅ Cria ou atualiza a ficha permanente do pet.
 * Se não houver petNumber, gera um novo (1ª visita).
 * Retorna o petNumber (novo ou existente).
 */
export async function salvarCadastroPet(
  dados: Omit<PetCadastro, 'petNumber' | 'petNumberSeq' | 'telefoneReverso' | 'criadoEm' | 'atualizadoEm'>,
  petNumberExistente?: string,
): Promise<string> {
  const petNumber = petNumberExistente ?? (await gerarPetNumber());
  const ref = doc(petsCadastroCollection(), petNumber);

  // 🆕 normaliza o telefone (só dígitos) e gera a versão invertida
  const telefoneDigits = (dados.telefone ?? '').replace(/\D/g, '');

  await setDoc(
    ref,
    {
      ...dados,
      petNumber,
      // ✅ número puro sem zeros à esquerda ("000123" -> "123")
      petNumberSeq: String(parseInt(petNumber.replace(/\D/g, ''), 10)),
      nomePetLower: dados.nomePet.toLowerCase(),
      telefone: telefoneDigits,
      // 🆕 telefone invertido para permitir busca por FINAL
      telefoneReverso: inverterString(telefoneDigits),
      ...(petNumberExistente
        ? { atualizadoEm: serverTimestamp() }
        : { criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() }),
    },
    { merge: true },
  );

  return petNumber;
}

// ─── Cadastro — Pet (✅ retorna petNumber + isNovo) ────────────

/** ✅ Resultado do cadastro de pet */
export interface AddPetResult {
  id: string;          // id do documento na fila do dia
  petNumber: string;   // código da ficha, ex: "PET-000123"
  isNovo: boolean;     // true = 1ª visita (petNumber recém-gerado)
}

export async function addPet(
  petData: Omit<Pet, 'id' | 'checkInTime'>,
): Promise<AddPetResult> {
  const auth = getAuth();
  const user = auth.currentUser;

  let cadastradoPorId: string | null = null;
  let cadastradoPorNome: string | null = null;

  if (user) {
    cadastradoPorId = user.uid;
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      cadastradoPorNome = userDoc.data().nome ?? 'Desconhecido';
    }
  }

  // ✅ Detecta se é primeira visita: sem petNumber vindo da busca = pet novo
  const petNumberExistente = (petData as any).petNumber as string | undefined;
  const isNovo = !petNumberExistente;

  // ✅ Garante a ficha permanente + petNumber (cria novo ou reusa o existente)
  const petNumber = await salvarCadastroPet(
    {
      nomePet:   petData.nomePet,
      nomeTutor: petData.nomeTutor,
      telefone:  (petData as any).telefone ?? '',
      especie:   petData.especie,
      raca:      petData.raca,
      porte:     petData.porte,
      foto:      petData.foto,
    },
    petNumberExistente, // se veio da busca, mantém o mesmo número
  );

  const ref = await addDoc(petsCollection(), {
    ...petData,
    petNumber,                  // ✅ referência à ficha global
    checkInTime:        serverTimestamp(),
    historicoReversoes: [],
    cadastradoPorId,
    cadastradoPorNome,
  });

  // ✅ Retorna tudo que o App.tsx precisa para exibir o modal de código
  return { id: ref.id, petNumber, isNovo };
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

  // ✅ Remove campos undefined — o Firestore rejeita undefined no updateDoc
  const dadosLimpos = Object.fromEntries(
    Object.entries(updatedData).filter(([, v]) => v !== undefined),
  );

  await updateDoc(petRef, dadosLimpos);
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

export type TipoEncerramento = 'entregue' | 'avisado' | 'removido' | 'cancelado';

export async function encerrarPet(
  pet: Pet,
  tipo: Exclude<TipoEncerramento, 'avisado'>,
): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  let encerradoPorId: string | null = null;
  let encerradoPorNome: string | null = null;

  if (user) {
    encerradoPorId = user.uid;
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      encerradoPorNome = userDoc.data().nome ?? 'Desconhecido';
    }
  }

  const checkOut = new Date();
  const checkIn  = new Date(pet.checkInTime);
  const duracaoMinutos = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / 60_000,
  );

  // ✅ Converte checkInTime (string ISO) para Timestamp do Firestore
  const checkInTimestamp = pet.checkInTime
    ? Timestamp.fromDate(new Date(pet.checkInTime))
    : serverTimestamp();

  // 1️⃣ Grava log
  await addDoc(logsCollection(), {
    tipo,
    petId:               pet.id,
    petNumber:           (pet as any).petNumber       ?? null,
    nomePet:             pet.nomePet,
    nomeTutor:           pet.nomeTutor,
    especie:             pet.especie             ?? null,
    raca:                pet.raca                ?? null,
    porte:               pet.porte               ?? null,
    servico:             pet.servico,
    slotNumber:          pet.slotNumber,
    statusFinal:         pet.status,
    checkInTime:         checkInTimestamp,        // ✅ Timestamp
    checkOutTime:        serverTimestamp(),
    duracaoMinutos,
    // ✅ Quem cadastrou o pet
    cadastradoPorId:     pet.cadastradoPorId     ?? null,
    cadastradoPorNome:   pet.cadastradoPorNome   ?? null,
    // ✅ Quem avisou o tutor
    avisadoPorId:        pet.avisadoPorId        ?? null,
    avisadoPorNome:      pet.avisadoPorNome      ?? null,
    // ✅ Quem encerrou
    encerradoPorId,
    encerradoPorNome,
    // legado (compatibilidade com logs antigos)
    removidoPorId:       encerradoPorId,
    removidoPorNome:     encerradoPorNome,
    profissionalBanho:   pet.profissionalBanho   ?? null,
    profissionalTosa:    pet.profissionalTosa    ?? null,
    profissionalEscovar: pet.profissionalEscovar ?? null,
    atendimentoIniciado: pet.atendimentoIniciado ?? false,
    observacoes:         pet.observacoes         ?? null,
    historicoReversoes:  pet.historicoReversoes  ?? [],
    avisado:             pet.avisado             ?? false,
    avisadoEm:           pet.avisadoEm           ?? null,
    // ✅ problemas de saúde detectados em cada etapa
    problemasSaudeBanho:   pet.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: pet.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    pet.problemasSaudeTosa    ?? [],
  });

  // 2️⃣ Deleta o pet da fila ativa
  const petRef = doc(db, 'dias', getTodayKey(), 'pets', pet.id);
  await deleteDoc(petRef);
}

// ─── Marcar como Avisado (NÃO remove da fila) ─────────────────────────────

export async function marcarComoAvisado(pet: Pet): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  let avisadoPorId: string | null = null;
  let avisadoPorNome: string | null = null;

  if (user) {
    avisadoPorId = user.uid;
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      avisadoPorNome = userDoc.data().nome ?? 'Desconhecido';
    }
  }

  // ✅ Converte checkInTime (string ISO) para Timestamp do Firestore
  const checkInTimestamp = pet.checkInTime
    ? Timestamp.fromDate(new Date(pet.checkInTime))
    : serverTimestamp();

  // 1️⃣ Grava log do aviso
  await addDoc(logsCollection(), {
    tipo:                'avisado',
    petId:               pet.id,
    petNumber:           (pet as any).petNumber       ?? null,
    nomePet:             pet.nomePet,
    nomeTutor:           pet.nomeTutor,
    especie:             pet.especie             ?? null,
    raca:                pet.raca                ?? null,
    porte:               pet.porte               ?? null,
    servico:             pet.servico,
    slotNumber:          pet.slotNumber,
    statusFinal:         pet.status,
    checkInTime:         checkInTimestamp,        // ✅ Timestamp
    avisadoEm:           serverTimestamp(),
    // ✅ Quem cadastrou
    cadastradoPorId:     pet.cadastradoPorId     ?? null,
    cadastradoPorNome:   pet.cadastradoPorNome   ?? null,
    // ✅ Quem avisou
    avisadoPorId,
    avisadoPorNome,
    // legado
    registradoPorId:     avisadoPorId,
    registradoPorNome:   avisadoPorNome,
    profissionalBanho:   pet.profissionalBanho   ?? null,
    profissionalTosa:    pet.profissionalTosa    ?? null,
    profissionalEscovar: pet.profissionalEscovar ?? null,
    observacoes:         pet.observacoes         ?? null,
    historicoReversoes:  pet.historicoReversoes  ?? [],
    // ✅ problemas de saúde detectados em cada etapa
    problemasSaudeBanho:   pet.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: pet.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    pet.problemasSaudeTosa    ?? [],
  });

  // 2️⃣ Atualiza o pet — salva quem avisou direto no documento do pet
  const petRef = doc(db, 'dias', getTodayKey(), 'pets', pet.id);
  await updateDoc(petRef, {
    avisado:       true,
    avisadoEm:     new Date().toISOString(),
    avisadoPorId,
    avisadoPorNome,
  });
}

// ─── Tipos para Relatório ─────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  tipo: 'entregue' | 'avisado' | 'removido' | 'cancelado';
  petId: string;
  petNumber?: string | null;
  nomePet: string;
  nomeTutor: string;
  especie: string | null;
  raca: string | null;
  porte: string | null;
  servico: string;
  slotNumber: number;
  statusFinal: string;
  checkInTime: string;
  checkOutTime?: string;
  avisadoEm?: string;
  duracaoMinutos?: number;
  // ✅ Os 3 campos principais
  cadastradoPorNome?: string | null;
  avisadoPorNome?:    string | null;
  encerradoPorNome?:  string | null;
  // legados (compatibilidade com logs antigos)
  removidoPorNome?:   string | null;
  registradoPorNome?: string | null;
  profissionalBanho: string | null;
  profissionalTosa: string | null;
  profissionalEscovar: string | null;
  observacoes: string | null;
  historicoReversoes: any[];
  avisado?: boolean;
  // ✅ problemas de saúde
  problemasSaudeBanho?:   string[];
  problemasSaudeEscovar?: string[];
  problemasSaudeTosa?:    string[];
}

// ─── Conversor Firestore → LogEntry ──────────────────────────────────────────

function logFromFirestore(id: string, data: any): LogEntry {
  const toISO = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (val?.toDate) return val.toDate().toISOString();
    return undefined;
  };

  return {
    id,
    tipo:                data.tipo                ?? 'entregue',
    petId:               data.petId               ?? '',
    petNumber:           data.petNumber           ?? null,
    nomePet:             data.nomePet             ?? '',
    nomeTutor:           data.nomeTutor           ?? '',
    especie:             data.especie             ?? null,
    raca:                data.raca                ?? null,
    porte:               data.porte               ?? null,
    servico:             data.servico             ?? '',
    slotNumber:          data.slotNumber          ?? 0,
    statusFinal:         data.statusFinal         ?? '',
    checkInTime:         toISO(data.checkInTime)  ?? '',
    checkOutTime:        toISO(data.checkOutTime),
    avisadoEm:           toISO(data.avisadoEm),
    duracaoMinutos:      data.duracaoMinutos      ?? undefined,
    // ✅ novos
    cadastradoPorNome:   data.cadastradoPorNome   ?? null,
    avisadoPorNome:      data.avisadoPorNome      ?? null,
    encerradoPorNome:    data.encerradoPorNome    ?? null,
    // legados
    removidoPorNome:     data.removidoPorNome     ?? null,
    registradoPorNome:   data.registradoPorNome   ?? null,
    profissionalBanho:   data.profissionalBanho   ?? null,
    profissionalTosa:    data.profissionalTosa    ?? null,
    profissionalEscovar: data.profissionalEscovar ?? null,
    observacoes:         data.observacoes         ?? null,
    historicoReversoes:  data.historicoReversoes  ?? [],
    avisado:             data.avisado             ?? false,
    // ✅ problemas de saúde
    problemasSaudeBanho:   data.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: data.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    data.problemasSaudeTosa    ?? [],
  };
}

// ─── Buscar logs de um dia específico ────────────────────────────────────────

export async function getLogsByDate(dateKey: string): Promise<LogEntry[]> {
  const col  = collection(db, 'dias', dateKey, 'logs');
  const q    = query(col, orderBy('checkInTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => logFromFirestore(d.id, d.data()));
}

// ─── Buscar pets ativos de um dia específico ──────────────────────────────────

export async function getPetsByDate(dateKey: string): Promise<Pet[]> {
  const col  = collection(db, 'dias', dateKey, 'pets');
  const q    = query(col, orderBy('checkInTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromFirestore(d.id, d.data()));
}
