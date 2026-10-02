import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase'; // ⚠️ ajuste para o mesmo caminho usado no racaService
import { idDoDia, idDoDiaDe } from '../utils/dias';

export { idDoDia, idDoDiaDe }; // mantém compatibilidade com imports existentes

const COL = 'slotsUsados';

const refDia = (dia: string) => doc(db, COL, dia);

/** Escuta em tempo real os slots queimados de um dia. */
export function ouvirSlotsUsados(
  dia: string,
  cb: (slots: number[]) => void,
  onErro?: (e: unknown) => void,
) {
  return onSnapshot(
    refDia(dia),
    snap => {
      const data = snap.data() as { slots?: number[] } | undefined;
      cb(Array.isArray(data?.slots) ? data!.slots! : []);
    },
    e => {
      console.error('[slotUsage] onSnapshot', e);
      onErro?.(e);
    },
  );
}

export async function marcarSlotUsado(dia: string, slot: number) {
  // ✅ Uma única gravação que só ADICIONA o slot à lista (e cria o documento
  // do dia se ainda não existir). Antes, se a 1ª tentativa falhasse por
  // qualquer motivo, a 2ª regravava a lista só com este slot, apagando os outros.
  await setDoc(
    refDia(dia),
    { slots: arrayUnion(slot), dia, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}

export async function liberarSlotUsado(dia: string, slot: number) {
  await updateDoc(refDia(dia), { slots: arrayRemove(slot), atualizadoEm: serverTimestamp() });
}
