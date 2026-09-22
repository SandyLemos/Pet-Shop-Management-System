import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateDoc } from 'firebase/firestore';

export type Especie = 'cao' | 'gato';

export interface Raca {
  id: string;
  nome: string;
  especie: Especie;
}

const COL = 'racas';

/** Lista todas as raças customizadas salvas no Firestore. */
export async function getRacas(): Promise<Raca[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy('nome')));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      nome: String(data.nome ?? ''),
      especie: data.especie as Especie,
    };
  });
}

/** Cria uma raça. Lança Error('DUPLICADA') se já existir na mesma espécie. */
export async function addRaca(nome: string, especie: Especie): Promise<Raca> {
  const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
  if (!nomeLimpo) throw new Error('NOME_VAZIO');

  const snap = await getDocs(
    query(collection(db, COL), where('especie', '==', especie))
  );
  const existe = snap.docs.some(
    d => String(d.data().nome ?? '').toLowerCase() === nomeLimpo.toLowerCase()
  );
  if (existe) throw new Error('DUPLICADA');

  const ref = await addDoc(collection(db, COL), {
    nome: nomeLimpo,
    especie,
    criadoEm: serverTimestamp(),
  });

  return { id: ref.id, nome: nomeLimpo, especie };
}

/** Remove uma raça (só admin, conforme as regras do Firestore). */
export async function deleteRaca(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Renomeia uma raça. Lança Error('DUPLICADA') se o nome já existir na espécie. */
export async function updateRaca(
  id: string,
  nome: string,
  especie: Especie
): Promise<void> {
  const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
  if (!nomeLimpo) throw new Error('NOME_VAZIO');

  const snap = await getDocs(
    query(collection(db, COL), where('especie', '==', especie))
  );
  const existe = snap.docs.some(
    d =>
      d.id !== id &&
      String(d.data().nome ?? '').toLowerCase() === nomeLimpo.toLowerCase()
  );
  if (existe) throw new Error('DUPLICADA');

  await updateDoc(doc(db, COL, id), {
    nome: nomeLimpo,
    atualizadoEm: serverTimestamp(),
  });
}