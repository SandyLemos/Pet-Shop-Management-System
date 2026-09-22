import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getRacas, addRaca, updateRaca, deleteRaca, type Raca, type Especie } from '../services/racaService';

/* ------------------------------------------------------------------ *
 * Store compartilhado: todas as instâncias de useRacas() leem e
 * escrevem no mesmo array, então uma edição/remoção feita em
 * GerenciarRacas reflete na hora no <select> do PetRegistration.
 * ------------------------------------------------------------------ */
let cache: Raca[] = [];
let carregado = false;
let carregandoAgora: Promise<void> | null = null;
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = () => cache;

const ordenar = (l: Raca[]) => [...l].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

const setCache = (next: Raca[]) => {
  cache = next;
  listeners.forEach(l => l());
};

export function useRacas() {
  const racas = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [carregando, setCarregando] = useState(!carregado);
  const [erro, setErro] = useState<string | null>(null);

  /** Busca no servidor e substitui o cache global. */
  const recarregar = useCallback(async (force = true) => {
    if (!force && carregado) return;

    // evita requisições duplicadas quando vários componentes montam juntos
    if (carregandoAgora) {
      setCarregando(true);
      try { await carregandoAgora; } finally { setCarregando(false); }
      return;
    }

    setCarregando(true);
    carregandoAgora = (async () => {
      try {
        setCache(ordenar(await getRacas()));
        carregado = true;
        setErro(null);
      } catch (e) {
        console.error('[useRacas] falha ao carregar', e);
        setErro('Não foi possível carregar as raças.');
        if (!carregado) setCache([]); // degrada sem quebrar a tela
      }
    })();

    try {
      await carregandoAgora;
    } finally {
      carregandoAgora = null;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar(false); // só busca na primeira montagem da app
  }, [recarregar]);

  /** Cria e já insere na lista global (ordenada). Retorna a raça criada. */
  const criar = useCallback(async (nome: string, especie: Especie) => {
    const nova = await addRaca(nome, especie);
    setCache(ordenar([...cache, nova]));
    return nova;
  }, []);

  /** Renomeia e atualiza a lista global (reordenada). */
  const editar = useCallback(async (id: string, nome: string, especie: Especie) => {
    await updateRaca(id, nome, especie);
    const nomeLimpo = nome.trim().replace(/\s+/g, ' ');
    setCache(ordenar(cache.map(r => (r.id === id ? { ...r, nome: nomeLimpo, especie } : r))));
  }, []);

  /** Remove e tira da lista global. */
  const remover = useCallback(async (id: string) => {
    await deleteRaca(id);
    setCache(cache.filter(r => r.id !== id));
  }, []);

  /** Raças customizadas de uma espécie, só os nomes. */
  const nomesPorEspecie = useCallback(
    (especie: Especie) => racas.filter(r => r.especie === especie).map(r => r.nome),
    [racas]
  );

  return { racas, carregando, erro, criar, editar, remover, recarregar, nomesPorEspecie };
}
