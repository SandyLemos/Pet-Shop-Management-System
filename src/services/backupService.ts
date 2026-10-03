// ✅ Backup manual dos dados (o plano gratuito do Firebase não tem backup automático).
// Lê as coleções e devolve tudo num único objeto, pronto para salvar em arquivo JSON.
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { idDoDia } from '../utils/dias';
import { diasAnteriores } from './petService';

/** Quantos dias de fila/entregas entram no backup (além de hoje). */
export const DIAS_NO_BACKUP = 90;

const COLECOES_FIXAS = ['usuarios', 'profissionais', 'racas', 'petsCadastro', 'contadores', 'slotsUsados'] as const;

type Docs = Record<string, any>;

// Datas do Firestore (Timestamp) viram texto ISO, que qualquer programa entende.
function limpar(valor: any): any {
  if (valor && typeof valor.toDate === 'function') return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(limpar);
  if (valor && typeof valor === 'object') {
    const out: Docs = {};
    for (const [k, v] of Object.entries(valor)) out[k] = limpar(v);
    return out;
  }
  return valor;
}

async function lerColecao(caminho: string): Promise<Docs> {
  const snap = await getDocs(collection(db, caminho));
  const out: Docs = {};
  snap.forEach((d: any) => { out[d.id] = limpar(d.data()); });
  return out;
}

export async function gerarBackup(hoje: string = idDoDia()) {
  const backup: Docs = {
    sistema: 'Elite Pet Shop',
    geradoEm: new Date().toISOString(),
    diasIncluidos: DIAS_NO_BACKUP + 1,
    colecoes: {} as Docs,
    dias: {} as Docs,
  };

  for (const c of COLECOES_FIXAS) backup.colecoes[c] = await lerColecao(c);

  const dias = [...diasAnteriores(hoje, DIAS_NO_BACKUP), hoje];
  // de 10 em 10 dias, para não sobrecarregar a conexão do tablet
  for (let i = 0; i < dias.length; i += 10) {
    await Promise.all(
      dias.slice(i, i + 10).map(async (dia) => {
        const [pets, logs] = await Promise.all([lerColecao(`dias/${dia}/pets`), lerColecao(`dias/${dia}/logs`)]);
        if (Object.keys(pets).length || Object.keys(logs).length) backup.dias[dia] = { pets, logs };
      }),
    );
  }
  return backup;
}

/** Nome do arquivo: backup-elite-pet-shop-2026-10-02.json */
export function nomeArquivoBackup(hoje: string = idDoDia()) {
  return `backup-elite-pet-shop-${hoje}.json`;
}
