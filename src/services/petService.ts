// src/services/petService.ts
import {
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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import { colLoja, docLoja } from '../lib/loja';
import type { Pet, PetCadastro, Profissional } from '../app/types/pet';
import { idDoDia, idDoDiaDe } from '../utils/dias';
import { TUTOR_REMOVIDO } from '../utils/lgpd';
import { normalizarAlertas, normalizarAlertaObs } from '../utils/alertas';

/** Reexporta para quem já importava daqui */
export { idDoDia, idDoDiaDe };

/**
 * ✅ Chave do dia no fuso America/Sao_Paulo: "2026-09-23"
 * NUNCA usar toISOString() aqui — retornaria a data em UTC e
 * viraria o dia às 21h no horário de Brasília.
 */
export function getTodayKey(): string {
  return idDoDia();
}

/** Referência da coleção global de profissionais */
const profissionaisCollection = () =>
  colLoja('profissionais');

/** Referência da coleção global de cadastros permanentes de pets */
const petsCadastroCollection = () =>
  colLoja('petsCadastro');

// ─── Helper: inverte uma string de dígitos ────────────────────────────────
function inverterString(str: string): string {
  return str.split('').reverse().join('');
}

// ─── Conversor Firestore → Pet ─────────────────────────────────────────────

function fromFirestore(id: string, data: any, dia: string): Pet {
  return {
    ...data,
    id,
    dia, // ✅ de qual fila (dia) este pet veio
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
  /** ✅ dia da fila a escutar; o App troca este valor na virada do dia */
  dia: string = getTodayKey(),
): () => void {
  const q = query(colLoja('dias', dia, 'pets'), orderBy('checkInTime', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const pets = snapshot.docs.map((d) => fromFirestore(d.id, d.data(), dia));
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
// CADASTRO PERMANENTE DE PETS + petNumber sequencial
// ═══════════════════════════════════════════════════════════════════════════

/** Ficha permanente do pet: o tipo fica em types/pet (reexportado aqui) */
export type { PetCadastro };

/**
 * Gera um petNumber sequencial e ATÔMICO via transaction.
 * Formato: "PET-000123"
 */
export async function gerarPetNumber(): Promise<string> {
  const contadorRef = docLoja('contadores', 'petNumber');

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
 * Busca pets no cadastro permanente por petNumber (prefixo),
 * telefone (final) ou nomePet (prefixo).
 */
export async function buscarPetsCadastro(termo: string): Promise<PetCadastro[]> {
  const t = termo.trim();
  if (!t) return [];

  const col = petsCadastroCollection();
  const resultados = new Map<string, PetCadastro>();

  // 1️⃣ Por petNumber — busca por PREFIXO
  const soDigitosNumero = t.replace(/\D/g, '');
  if (soDigitosNumero.length > 0) {
    const semZeros = String(parseInt(soDigitosNumero, 10));

    // a) match exato com padding (PET-000001)
    const numeroLimpo = `PET-${soDigitosNumero.padStart(6, '0')}`;
    const porNumero = await getDoc(doc(col, numeroLimpo));
    if (porNumero.exists()) {
      resultados.set(numeroLimpo, porNumero.data() as PetCadastro);
    }

    // b) busca por PREFIXO usando petNumberSeq
    const qNum = query(
      col,
      where('petNumberSeq', '>=', semZeros),
      where('petNumberSeq', '<=', semZeros + '\uf8ff'),
      limit(10),
    );
    const snapNum = await getDocs(qNum);
    snapNum.forEach((d) => resultados.set(d.id, d.data() as PetCadastro));
  }

  // 2️⃣ Por telefone — busca por FINAL (últimos 4+ dígitos)
  const soDigitos = t.replace(/\D/g, '');
  if (soDigitos.length >= 4) {
    const termoReverso = inverterString(soDigitos);
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

/** Lista TODOS os pets do cadastro permanente, ordenados por nome. */
export async function getAllPetsCadastro(): Promise<PetCadastro[]> {
  const q = query(petsCadastroCollection(), orderBy('nomePetLower', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PetCadastro);
}

/**
 * Exclui a ficha permanente de um pet pelo petNumber.
 * ⚠️ NÃO afeta os pets da fila do dia nem os logs históricos.
 */
export async function deletePetCadastro(petNumber: string): Promise<void> {
  const ref = doc(petsCadastroCollection(), petNumber);
  await deleteDoc(ref);
}

export { TUTOR_REMOVIDO };
export const PET_NA_FILA = 'PET_NA_FILA'; // pet ainda está na fila de algum dia
const INICIO_DO_SISTEMA = '2026-01-01';

/**
 * ✅ LGPD: apaga os dados do tutor a pedido dele.
 * Troca o nome do tutor por "Removido (LGPD)" nos registros de todos os dias
 * (os atendimentos continuam contando nas Análises) e depois exclui a ficha.
 * Se o pet ainda estiver na fila, não faz nada e lança Error(PET_NA_FILA).
 * Devolve quantos registros do histórico foram anonimizados.
 */
export async function apagarDadosTutor(petNumber: string): Promise<number> {
  // Dias com documento + todos os dias desde o início do sistema (dias antigos
  // podem ter só as subcoleções, sem o documento do dia)
  const comDocumento = (await getDocs(colLoja('dias'))).docs.map((d) => d.id);
  const dias = [...new Set([...comDocumento, ...listarDias(INICIO_DO_SISTEMA, idDoDia())])];
  const doPet = (snap: any) => snap.docs.filter((d: any) => d.data().petNumber === petNumber);
  const buscar = async (sub: 'pets' | 'logs') => {
    const achados: any[] = [];
    // de 10 em 10 dias, para não sobrecarregar a conexão do tablet
    for (let i = 0; i < dias.length; i += 10) {
      const snaps = await Promise.all(dias.slice(i, i + 10).map((dia) =>
        getDocs(query(colLoja('dias', dia, sub), where('petNumber', '==', petNumber))).then((s) =>
          doPet(s).map((d: any) => ({ dia, id: d.id, data: d.data() })),
        ),
      ));
      achados.push(...snaps.flat());
    }
    return achados;
  };

  // 1️⃣ Pet na fila (de hoje ou esquecido): primeiro precisa ser entregue/removido
  if ((await buscar('pets')).length > 0) throw new Error(PET_NA_FILA);

  // 2️⃣ Histórico: troca só o nome do tutor (a regra do Firestore só deixa mudar esse campo)
  const logs = (await buscar('logs')).filter((l) => l.data.nomeTutor !== TUTOR_REMOVIDO);
  await Promise.all(logs.map((l) =>
    updateDoc(docLoja('dias', l.dia, 'logs', l.id), { nomeTutor: TUTOR_REMOVIDO }),
  ));

  // 3️⃣ Por último a ficha: se algo falhar antes, dá para tentar de novo
  await deletePetCadastro(petNumber);
  return logs.length;
}

/**
 * Atualiza a ficha permanente do pet (reusa salvarCadastroPet).
 * ✅ Se os alertas vierem junto, a cópia do pet que está na fila de hoje
 * também é atualizada (os cards leem a cópia, não a ficha).
 */
export async function updatePetCadastro(
  petNumber: string,
  dados: Omit<PetCadastro, 'petNumber' | 'petNumberSeq' | 'telefoneReverso' | 'criadoEm' | 'atualizadoEm'>,
  dia: string = getTodayKey(),
): Promise<void> {
  await salvarCadastroPet(dados, petNumber);
  if (dados.alertas !== undefined || dados.alertaObs !== undefined) {
    await atualizarAlertasNaFila(petNumber, dados.alertas, dados.alertaObs, dia);
  }
}

/**
 * ✅ Copia os alertas da ficha para o pet que está na fila do dia (se estiver).
 * Uma consulta só (pelo petNumber); não mexe em mais nada do atendimento.
 * Devolve quantos pets da fila foram atualizados.
 */
export async function atualizarAlertasNaFila(
  petNumber: string,
  alertas: string[] | undefined,
  alertaObs: string | undefined,
  dia: string = getTodayKey(),
): Promise<number> {
  const dados: Record<string, any> = {};
  if (alertas !== undefined) dados.alertas = normalizarAlertas(alertas);
  if (alertaObs !== undefined) dados.alertaObs = normalizarAlertaObs(alertaObs);
  if (Object.keys(dados).length === 0) return 0;

  const snap = await getDocs(query(colLoja('dias', dia, 'pets'), where('petNumber', '==', petNumber)));
  await Promise.all(snap.docs.map((d) => updateDoc(docLoja('dias', dia, 'pets', d.id), dados)));
  return snap.docs.length;
}

/**
 * Cria ou atualiza a ficha permanente do pet.
 * Se não houver petNumber, gera um novo (1ª visita).
 */
export async function salvarCadastroPet(
  dados: Omit<PetCadastro, 'petNumber' | 'petNumberSeq' | 'telefoneReverso' | 'criadoEm' | 'atualizadoEm'>,
  petNumberExistente?: string,
): Promise<string> {
  const petNumber = petNumberExistente ?? (await gerarPetNumber());
  const ref = doc(petsCadastroCollection(), petNumber);

  await setDoc(ref, montarFicha(dados, petNumber, !!petNumberExistente), { merge: true });

  return petNumber;
}

type DadosFicha = Omit<PetCadastro, 'petNumber' | 'petNumberSeq' | 'telefoneReverso' | 'criadoEm' | 'atualizadoEm' | 'consentimentoEm' | 'consentimentoPorId' | 'consentimentoPorNome'>;

/** Monta o documento da ficha permanente (usado no cadastro avulso e na transação do addPet). */
function montarFicha(dados: DadosFicha, petNumber: string, existente: boolean) {
  const telefoneDigits = (dados.telefone ?? '').replace(/\D/g, '');
  // ✅ campos vazios (undefined) ficam de fora: o Firestore recusa undefined
  const dadosDefinidos = Object.fromEntries(
    Object.entries(dados).filter(([, v]) => v !== undefined),
  );
  // ✅ alertas sempre limpos (sem repetidos, dentro dos limites da regra)
  if (dados.alertas !== undefined) dadosDefinidos.alertas = normalizarAlertas(dados.alertas);
  if (dados.alertaObs !== undefined) dadosDefinidos.alertaObs = normalizarAlertaObs(dados.alertaObs);
  return {
    ...dadosDefinidos,
    petNumber,
    petNumberSeq: String(parseInt(petNumber.replace(/\D/g, ''), 10)),
    nomePetLower: dados.nomePet.toLowerCase(),
    telefone: telefoneDigits,
    telefoneReverso: inverterString(telefoneDigits),
    ...(existente
      ? { atualizadoEm: serverTimestamp() }
      : { criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() }),
  };
}

/** Campos da fila que também existem na ficha permanente */
export const CAMPOS_FICHA = ['nomePet', 'nomeTutor', 'telefone', 'especie', 'raca', 'porte', 'foto', 'alertas', 'alertaObs'] as const;

/**
 * ✅ Leva para a ficha permanente as correções feitas no pet da fila
 * (só os campos informados). Se a ficha não existir mais (excluída pelo
 * admin), não faz nada — não recria ficha pela metade.
 * Devolve true se atualizou a ficha.
 */
export async function atualizarFichaComEdicao(
  petNumber: string,
  campos: Partial<Record<(typeof CAMPOS_FICHA)[number], string | string[]>>,
): Promise<boolean> {
  const dados: Record<string, any> = {};
  for (const k of CAMPOS_FICHA) {
    const v = campos[k];
    if (v !== undefined) dados[k] = v;
  }
  if (Object.keys(dados).length === 0) return false;

  if (dados.alertas !== undefined) dados.alertas = normalizarAlertas(dados.alertas);
  if (dados.alertaObs !== undefined) dados.alertaObs = normalizarAlertaObs(dados.alertaObs);

  if (dados.nomePet !== undefined) dados.nomePetLower = String(dados.nomePet).toLowerCase();
  if (dados.telefone !== undefined) {
    const digitos = String(dados.telefone).replace(/\D/g, '');
    dados.telefone = digitos;
    dados.telefoneReverso = inverterString(digitos);
  }
  dados.atualizadoEm = serverTimestamp();

  const ref = doc(petsCadastroCollection(), petNumber);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await updateDoc(ref, dados);
  return true;
}

// ─── Cadastro — Pet ───────────────────────────────────────────────────────

export interface AddPetResult {
  id: string;          // id do documento na fila do dia
  petNumber: string;   // código da ficha, ex: "PET-000123"
  isNovo: boolean;     // true = 1ª visita
}

/** ✅ Erros de vaga, para a tela mostrar a mensagem certa */
export const SLOT_OCUPADO = 'SLOT_OCUPADO'; // outro pet já está nesta vaga hoje
export const SLOT_USADO   = 'SLOT_USADO';   // vaga já foi usada (entregue) hoje
export const JA_ENCERRADO = 'JA_ENCERRADO'; // pet já foi entregue/removido (outro tablet ou toque duplo)
export const CAMPOS_OBRIGATORIOS = 'CAMPOS_OBRIGATORIOS'; // faltou espécie, porte ou raça

/**
 * Cadastra o pet na fila do dia.
 *
 * ✅ Tudo numa única TRANSAÇÃO: confere a vaga, reserva a vaga, gera o
 * código (1ª visita), grava a ficha e coloca o pet na fila. Se dois tablets
 * tentarem a mesma vaga ao mesmo tempo, só um consegue; o outro recebe
 * Error(SLOT_OCUPADO) e NADA é gravado (nem ficha, nem código gasto).
 *
 * As vagas ocupadas ficam no campo `slotsOcupados` do documento do dia
 * (`dias/{dia}`), que a regra do Firestore já permite a funcionários.
 */
export async function addPet(
  petData: Omit<Pet, 'id' | 'checkInTime'>,
  dia: string = getTodayKey(),
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

  // ✅ Segunda barreira (a primeira é o formulário): espécie, porte e raça
  // são obrigatórios. Nada é gravado se faltar algum.
  if (!petData.especie || !petData.porte || !petData.raca) {
    throw new Error(CAMPOS_OBRIGATORIOS);
  }

  const petNumberExistente = (petData as any).petNumber as string | undefined;
  const isNovo = !petNumberExistente;
  const slot = petData.slotNumber;

  // ✅ LGPD: a autorização do tutor vai só para a ficha, não para a fila
  const consentiu = (petData as any).consentimentoLgpd === true;

  const petDataLimpo: Record<string, any> = Object.fromEntries(
    Object.entries(petData).filter(([k, v]) => v !== undefined && k !== 'dia' && k !== 'consentimentoLgpd'),
  );

  // ✅ Alertas da ficha: o formulário manda a lista (pode ser vazia = tirar todos).
  // Se não mandar (undefined), a ficha fica como está e a fila copia o que a ficha já tem.
  const alertasInformados = petData.alertas !== undefined || petData.alertaObs !== undefined;
  if (petData.alertas !== undefined) petDataLimpo.alertas = normalizarAlertas(petData.alertas);
  if (petData.alertaObs !== undefined) petDataLimpo.alertaObs = normalizarAlertaObs(petData.alertaObs);

  const dadosFicha: DadosFicha = {
    nomePet:   petData.nomePet,
    nomeTutor: petData.nomeTutor,
    telefone:  (petData as any).telefone ?? '',
    especie:   petData.especie,
    raca:      petData.raca,
    porte:     petData.porte,
    foto:      petData.foto,
    alertas:   petData.alertas,
    alertaObs: petData.alertaObs,
  };

  const diaRef      = docLoja('dias', dia);
  const usadosRef   = docLoja('slotsUsados', dia);
  const contadorRef = docLoja('contadores', 'petNumber');
  const petRef      = doc(colLoja('dias', dia, 'pets')); // id gerado aqui

  const petNumber = await runTransaction(db, async (tx) => {
    // 1️⃣ Leituras (a transação exige todas antes de qualquer escrita)
    const diaSnap    = await tx.get(diaRef);
    const usadosSnap = await tx.get(usadosRef);
    const contSnap   = isNovo ? await tx.get(contadorRef) : null;
    const fichaSnap  = !isNovo ? await tx.get(doc(petsCadastroCollection(), petNumberExistente!)) : null;

    const ocupados: number[] = diaSnap.exists() ? (diaSnap.data().slotsOcupados ?? []) : [];
    const usados: number[]   = usadosSnap.exists() ? (usadosSnap.data().slots ?? []) : [];

    // 2️⃣ A vaga ainda está livre?
    if (ocupados.includes(slot)) throw new Error(SLOT_OCUPADO);
    if (usados.includes(slot))   throw new Error(SLOT_USADO);

    // 3️⃣ Código do pet (só na 1ª visita)
    let numero = petNumberExistente;
    if (!numero) {
      const atual = contSnap?.exists() ? (contSnap.data().valor ?? 0) : 0;
      const proximo = atual + 1;
      tx.set(contadorRef, { valor: proximo }, { merge: true });
      numero = `PET-${String(proximo).padStart(6, '0')}`;
    }

    // 4️⃣ Ficha, reserva da vaga e pet na fila — tudo junto
    // ✅ LGPD: grava a autorização só uma vez (a 1ª data não é sobrescrita)
    const jaTinhaConsentimento = !!fichaSnap?.exists() && !!fichaSnap.data().consentimentoEm;
    const consentimento = consentiu && !jaTinhaConsentimento
      ? { consentimentoEm: serverTimestamp(), consentimentoPorId: cadastradoPorId, consentimentoPorNome: cadastradoPorNome }
      : {};
    tx.set(
      doc(petsCadastroCollection(), numero),
      { ...montarFicha(dadosFicha, numero, !isNovo), ...consentimento },
      { merge: true },
    );
    tx.set(diaRef, { slotsOcupados: arrayUnion(slot) }, { merge: true });
    // ✅ cópia dos alertas na fila: o que veio do formulário ou, se nada veio, o da ficha
    const copiaAlertas: Record<string, any> = {};
    if (!alertasInformados && fichaSnap?.exists()) {
      const f = fichaSnap.data();
      if (Array.isArray(f.alertas) && f.alertas.length > 0) copiaAlertas.alertas = normalizarAlertas(f.alertas);
      if (typeof f.alertaObs === 'string' && f.alertaObs) copiaAlertas.alertaObs = normalizarAlertaObs(f.alertaObs);
    }
    tx.set(petRef, {
      ...petDataLimpo,
      ...copiaAlertas,
      petNumber:          numero,
      checkInTime:        serverTimestamp(),
      historicoReversoes: [],
      cadastradoPorId,
      cadastradoPorNome,
    });

    return numero;
  });

  return { id: petRef.id, petNumber, isNovo };
}

/**
 * ✅ Reserva a vaga de pets que JÁ estavam na fila antes desta versão
 * (eles não passaram pela reserva do addPet). Assim o deploy pode ser feito
 * com a loja funcionando: em segundos as vagas deles ficam protegidas.
 *
 * Seguro contra corrida: cada reserva é uma transação que confere se o pet
 * AINDA está na fila. Se outro aparelho acabou de entregar/remover o pet,
 * nada é reservado (a vaga nunca fica "presa" sem pet).
 * Devolve quantas vagas foram reservadas agora.
 */
export async function garantirReservasDeVaga(dia: string, pets: Pet[]): Promise<number> {
  if (pets.length === 0) return 0;

  const diaRef = docLoja('dias', dia);
  const diaSnap = await getDoc(diaRef);
  const ocupados: number[] = diaSnap.exists() ? (diaSnap.data().slotsOcupados ?? []) : [];
  const semReserva = pets.filter((p) => !ocupados.includes(p.slotNumber));

  let reservadas = 0;
  for (const p of semReserva) {
    const petRef = docLoja('dias', dia, 'pets', p.id);
    const reservou = await runTransaction(db, async (tx) => {
      const petSnap = await tx.get(petRef);
      const diaAtual = await tx.get(diaRef);
      if (!petSnap.exists()) return false; // já saiu da fila: não reserva
      const slot = petSnap.data().slotNumber;
      if (!Number.isInteger(slot)) return false;
      const atuais: number[] = diaAtual.exists() ? (diaAtual.data().slotsOcupados ?? []) : [];
      if (atuais.includes(slot)) return false;
      tx.set(diaRef, { slotsOcupados: arrayUnion(slot) }, { merge: true });
      return true;
    });
    if (reservou) reservadas++;
  }
  return reservadas;
}

// ─── Cadastro — Profissional ──────────────────────────────────────────────

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

// ─── Edição — Pet ─────────────────────────────────────────────────────────

export async function updatePet(
  petId: string,
  updatedData: Partial<Pet>,
  /** ✅ dia da fila do pet (pet.dia). Sem ele, usa hoje (comportamento antigo). */
  dia: string = getTodayKey(),
): Promise<void> {
  const petRef = docLoja('dias', dia, 'pets', petId);

  // Remove campos undefined — o Firestore rejeita undefined no updateDoc
  // ✅ e os campos que são só do app (id, dia), que não vão para o banco
  const dadosLimpos = Object.fromEntries(
    Object.entries(updatedData).filter(
      ([k, v]) => v !== undefined && k !== 'dia' && k !== 'id',
    ),
  );

  await updateDoc(petRef, dadosLimpos);
}

// ─── Edição — Profissional ────────────────────────────────────────────────

export async function updateProfissional(
  id: string,
  data: Partial<Omit<Profissional, 'id'>>,
): Promise<void> {
  const ref = docLoja('profissionais', id);
  await updateDoc(ref, { ...data });
}

// ─── Exclusão — Profissional ──────────────────────────────────────────────

export async function deleteProfissional(id: string): Promise<void> {
  const ref = docLoja('profissionais', id);
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

  // ✅ Usa o dia da FILA do pet (não "hoje"): um pet esquecido de ontem é
  // encerrado e registrado no dia em que foi atendido. Congelado aqui para
  // log e delete usarem o MESMO dia, mesmo se a meia-noite passar no meio.
  const diaKey = pet.dia ?? getTodayKey();

  const checkOut = new Date();
  const checkIn  = new Date(pet.checkInTime);
  const duracaoMinutos = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / 60_000,
  );

  const checkInTimestamp = pet.checkInTime
    ? Timestamp.fromDate(new Date(pet.checkInTime))
    : serverTimestamp();

  // 1️⃣ Monta o log
  const log = {
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
    checkInTime:         checkInTimestamp,
    checkOutTime:        serverTimestamp(),
    duracaoMinutos,
    // ✅ dia local em que o encerramento foi registrado (auditoria)
    diaLocal:            diaKey,
    // Quem cadastrou o pet
    cadastradoPorId:     pet.cadastradoPorId     ?? null,
    cadastradoPorNome:   pet.cadastradoPorNome   ?? null,
    // Quem avisou o tutor
    avisadoPorId:        pet.avisadoPorId        ?? null,
    avisadoPorNome:      pet.avisadoPorNome      ?? null,
    // Quem encerrou
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
    // problemas de saúde detectados em cada etapa
    problemasSaudeBanho:   pet.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: pet.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    pet.problemasSaudeTosa    ?? [],
    // alertas da ficha no momento do atendimento (aparecem em Entregues)
    alertas:               normalizarAlertas(pet.alertas),
    alertaObs:             normalizarAlertaObs(pet.alertaObs),
  };

  // 2️⃣ ✅ TRANSAÇÃO: confere que o pet ainda está na fila, grava o log,
  // tira o pet da fila e libera a vaga — tudo junto ou nada. Um toque duplo
  // (ou dois tablets) não gera log repetido: o segundo recebe JA_ENCERRADO.
  const petRef = docLoja('dias', diaKey, 'pets', pet.id);
  const logRef = doc(colLoja('dias', diaKey, 'logs'));
  const diaRef = docLoja('dias', diaKey);

  await runTransaction(db, async (tx) => {
    const petSnap = await tx.get(petRef);
    if (!petSnap.exists()) throw new Error(JA_ENCERRADO);

    tx.set(logRef, log);
    tx.delete(petRef);
    tx.set(diaRef, { slotsOcupados: arrayRemove(pet.slotNumber) }, { merge: true });
  });
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

  const diaKey = pet.dia ?? getTodayKey(); // ✅ dia da fila do pet

  const checkInTimestamp = pet.checkInTime
    ? Timestamp.fromDate(new Date(pet.checkInTime))
    : serverTimestamp();

  // 1️⃣ Grava log do aviso
  await addDoc(colLoja('dias', diaKey, 'logs'), {
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
    checkInTime:         checkInTimestamp,
    avisadoEm:           serverTimestamp(),
    diaLocal:            diaKey,
    // Quem cadastrou
    cadastradoPorId:     pet.cadastradoPorId     ?? null,
    cadastradoPorNome:   pet.cadastradoPorNome   ?? null,
    // Quem avisou
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
    problemasSaudeBanho:   pet.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: pet.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    pet.problemasSaudeTosa    ?? [],
    alertas:               normalizarAlertas(pet.alertas),
    alertaObs:             normalizarAlertaObs(pet.alertaObs),
  });

  // 2️⃣ Atualiza o pet — salva quem avisou direto no documento
  const petRef = docLoja('dias', diaKey, 'pets', pet.id);
  await updateDoc(petRef, {
    avisado:       true,
    avisadoEm:     new Date().toISOString(),
    avisadoPorId,
    avisadoPorNome,
  });
}

// ─── Tipos para Relatório ─────────────────────────────────────────────────

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
  diaLocal?: string | null;
  cadastradoPorNome?: string | null;
  avisadoPorNome?:    string | null;
  encerradoPorNome?:  string | null;
  // legados
  removidoPorNome?:   string | null;
  registradoPorNome?: string | null;
  profissionalBanho: string | null;
  profissionalTosa: string | null;
  profissionalEscovar: string | null;
  observacoes: string | null;
  historicoReversoes: any[];
  avisado?: boolean;
  problemasSaudeBanho?:   string[];
  problemasSaudeEscovar?: string[];
  problemasSaudeTosa?:    string[];
  alertas?:               string[];
  alertaObs?:             string;
}

// ─── Conversor Firestore → LogEntry ───────────────────────────────────────

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
    diaLocal:            data.diaLocal            ?? null,
    cadastradoPorNome:   data.cadastradoPorNome   ?? null,
    avisadoPorNome:      data.avisadoPorNome      ?? null,
    encerradoPorNome:    data.encerradoPorNome    ?? null,
    removidoPorNome:     data.removidoPorNome     ?? null,
    registradoPorNome:   data.registradoPorNome   ?? null,
    profissionalBanho:   data.profissionalBanho   ?? null,
    profissionalTosa:    data.profissionalTosa    ?? null,
    profissionalEscovar: data.profissionalEscovar ?? null,
    observacoes:         data.observacoes         ?? null,
    historicoReversoes:  data.historicoReversoes  ?? [],
    avisado:             data.avisado             ?? false,
    problemasSaudeBanho:   data.problemasSaudeBanho   ?? [],
    problemasSaudeEscovar: data.problemasSaudeEscovar ?? [],
    problemasSaudeTosa:    data.problemasSaudeTosa    ?? [],
    alertas:               Array.isArray(data.alertas) ? data.alertas : [],
    alertaObs:             data.alertaObs             ?? '',
  };
}

// ─── Buscar logs de um dia específico ─────────────────────────────────────

export async function getLogsByDate(dateKey: string): Promise<LogEntry[]> {
  const col  = colLoja('dias', dateKey, 'logs');
  const q    = query(col, orderBy('checkInTime', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => logFromFirestore(d.id, d.data()));
}

// ─── Relatório de contagem de serviços (apenas ENTREGUES) ─────────────────

export interface RelatorioServicos {
  porServico: Record<string, number>;
  total: number;
}

function contarEntregues(logs: LogEntry[]): RelatorioServicos {
  const porServico: Record<string, number> = {};
  let total = 0;
  for (const log of logs) {
    if (log.tipo !== 'entregue') continue;
    const s = log.servico || 'outro';
    porServico[s] = (porServico[s] ?? 0) + 1;
    total++;
  }
  return { porServico, total };
}

export async function getRelatorioDia(dateKey: string): Promise<RelatorioServicos> {
  return contarEntregues(await getLogsByDate(dateKey));
}

/**
 * ✅ Gera a lista de dias no fuso local.
 * Usa 12:00 como âncora para nunca cair na borda de fuso / horário de verão.
 */
export function listarDias(dataInicio: string, dataFim: string): string[] {
  const datas: string[] = [];
  const cur = new Date(`${dataInicio}T12:00:00`);
  const fin = new Date(`${dataFim}T12:00:00`);
  while (cur <= fin) {
    datas.push(idDoDiaDe(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return datas;
}

export async function getRelatorioPeriodo(
  dataInicio: string,
  dataFim: string,
): Promise<RelatorioServicos> {
  const datas = listarDias(dataInicio, dataFim);
  const resultados = await Promise.all(datas.map((d) => getLogsByDate(d)));
  return contarEntregues(resultados.flat());
}

// ─── Pets esquecidos em dias anteriores ───────────────────────────────────

/** Chaves dos N dias anteriores a `hoje`, do mais antigo para o mais recente. */
export function diasAnteriores(hoje: string, quantidade: number): string[] {
  const base = new Date(`${hoje}T12:00:00-03:00`); // meio-dia em São Paulo
  const dias: string[] = [];
  for (let i = quantidade; i >= 1; i--) {
    dias.push(idDoDiaDe(new Date(base.getTime() - i * 86_400_000)));
  }
  return dias;
}

/**
 * ✅ Pets que ficaram na fila de dias anteriores sem serem entregues/removidos.
 * Olha os últimos `quantidade` dias (padrão 7: cobre feriados e fins de semana).
 * Cada pet volta com `dia` preenchido, para ser encerrado na fila certa.
 */
export async function getPetsPendentes(
  hoje: string = getTodayKey(),
  quantidade = 7,
): Promise<Pet[]> {
  const dias = diasAnteriores(hoje, quantidade);
  const porDia = await Promise.all(
    dias.map(async (d) => {
      const snap = await getDocs(colLoja('dias', d, 'pets'));
      return snap.docs.map((doc) => fromFirestore(doc.id, doc.data(), d));
    }),
  );
  return porDia.flat(); // já em ordem: dia mais antigo primeiro
}
