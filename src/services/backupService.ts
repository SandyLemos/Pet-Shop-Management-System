// ✅ Backup manual dos dados (o plano gratuito do Firebase não tem backup automático).
// Lê as coleções e devolve tudo num único objeto, pronto para salvar em arquivo JSON.
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { colLoja, lojaId } from '../lib/loja';
import { idDoDia } from '../utils/dias';
import { diasAnteriores } from './petService';

/** Quantos dias de fila/entregas entram no backup (além de hoje). */
export const DIAS_NO_BACKUP = 90;

const COLECOES_FIXAS = ['profissionais', 'racas', 'petsCadastro', 'contadores', 'slotsUsados'] as const;

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

// Só os funcionários desta loja (as regras não deixam ler os das outras)
async function lerUsuariosDaLoja(): Promise<Docs> {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('lojaId', '==', lojaId())));
  const out: Docs = {};
  snap.forEach((d: any) => { const u = d.data(); if (u.lojaId === lojaId()) out[d.id] = limpar(u); });
  return out;
}

// caminho dentro da loja atual (ex.: "dias/2026-10-02/pets")
async function lerColecao(caminho: string): Promise<Docs> {
  const snap = await getDocs(colLoja(...caminho.split('/')));
  const out: Docs = {};
  snap.forEach((d: any) => { out[d.id] = limpar(d.data()); });
  return out;
}

export async function gerarBackup(hoje: string = idDoDia()) {
  const backup: Docs = {
    sistema: 'Pata & Gestão',
    loja: lojaId(),
    geradoEm: new Date().toISOString(),
    diasIncluidos: DIAS_NO_BACKUP + 1,
    colecoes: {} as Docs,
    dias: {} as Docs,
  };

  for (const c of COLECOES_FIXAS) backup.colecoes[c] = await lerColecao(c);
  backup.colecoes.usuarios = await lerUsuariosDaLoja();

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

/** Nome do arquivo: backup-elite-pet-shop-2026-10-02.json (id da loja + dia) */
export function nomeArquivoBackup(hoje: string = idDoDia()) {
  return `backup-${lojaId()}-${hoje}.json`;
}
