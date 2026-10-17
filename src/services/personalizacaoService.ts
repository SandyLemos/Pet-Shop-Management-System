// ✅ Personalização da loja: logo e cores do topo, gravadas em lojas/{lojaId}.
// O admin da loja só pode mexer nestes campos (ver firestore.rules).
import { doc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { lojaId, lojaAtual, atualizarVisualLoja } from '../lib/lojaAtual';
import { coresValidas, type CoresLoja } from '../utils/cores';

export interface Personalizacao {
  logoUrl: string | null; // null = logo do Pata & Gestão
  cores: CoresLoja | null; // null = cores do padrão
}

export const MSG_LOGO_INVALIDA = 'Envie a logo de novo antes de salvar.';

export async function salvarPersonalizacao({ logoUrl, cores }: Personalizacao): Promise<void> {
  // logo nova só vale se veio do envio; a que já estava na loja (ex.: colocada pelo dono) segue igual
  const logoNova = logoUrl !== null && logoUrl !== (lojaAtual()?.logoUrl ?? null);
  if (logoNova && !logoUrl.startsWith('https://res.cloudinary.com/')) throw new Error(MSG_LOGO_INVALIDA);
  const coresOk = cores ? coresValidas(cores) : null;
  await updateDoc(doc(db, 'lojas', lojaId()), {
    logoUrl: logoUrl ?? deleteField(),
    cores: coresOk ?? deleteField(),
    personalizadoEm: serverTimestamp(),
  });
  atualizarVisualLoja({ logoUrl: logoUrl ?? undefined, cores: coresOk ?? undefined });
}
