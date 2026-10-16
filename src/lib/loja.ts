// ✅ Várias lojas: cada loja tem seu espaço no banco em lojas/{lojaId}/...
// Todos os serviços montam os caminhos a partir da loja de quem entrou.
import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { lojaId } from './lojaAtual';

export { definirLoja, lojaId, nomeLoja, logoLoja, SEM_LOJA, type LojaInfo } from './lojaAtual';

/** Coleção dentro da loja atual: colLoja('dias', dia, 'pets') → lojas/{loja}/dias/{dia}/pets */
export const colLoja = (...partes: string[]): CollectionReference =>
  (collection as any)(db, 'lojas', lojaId(), ...partes);

/** Documento dentro da loja atual: docLoja('contadores', 'petNumber') */
export const docLoja = (...partes: string[]): DocumentReference =>
  (doc as any)(db, 'lojas', lojaId(), ...partes);
