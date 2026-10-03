// Firestore falso, em memória, com transações OTIMISTAS como o real:
// se um documento lido mudou antes do commit, a transação é refeita.
type Data = Record<string, any>;

export function criarFirestoreFalso() {
  const store = new Map<string, { data: Data; v: number }>();
  let auto = 0;
  let commits = 0;

  const resolver = (base: Data | undefined, novo: Data, merge: boolean): Data => {
    const out: Data = merge && base ? { ...base } : {};
    for (const [k, val] of Object.entries(novo)) {
      if (val && val.__op === 'union') {
        const arr = Array.isArray(out[k]) ? [...out[k]] : [];
        for (const x of val.v) if (!arr.includes(x)) arr.push(x);
        out[k] = arr;
      } else if (val && val.__op === 'remove') {
        out[k] = (Array.isArray(out[k]) ? out[k] : []).filter((x: any) => !val.v.includes(x));
      } else if (val === undefined) {
        throw new Error(`Unsupported field value: undefined (campo ${k})`);
      } else {
        out[k] = val;
      }
    }
    return out;
  };
  const gravar = (path: string, data: Data, merge = false) => {
    const atual = store.get(path);
    store.set(path, { data: resolver(atual?.data, data, merge), v: (atual?.v ?? 0) + 1 });
  };
  const snap = (path: string) => {
    const e = store.get(path);
    return { id: path.split('/').at(-1)!, exists: () => !!e, data: () => (e ? { ...e.data } : undefined) };
  };

  const mod = {
    collection: (_db: any, ...p: string[]) => ({ path: p.join('/'), kind: 'col' }),
    doc: (a: any, ...p: string[]) => {
      const path = a?.kind === 'col' ? `${a.path}/${p[0] ?? `auto${++auto}`}` : p.join('/');
      return { path, id: path.split('/').at(-1) }; // igual ao real: referência tem .id
    },
    query: (c: any) => c, orderBy: () => ({}), where: () => ({}), limit: () => ({}),
    onSnapshot: () => () => {},
    serverTimestamp: () => 'TS',
    Timestamp: { fromDate: (d: Date) => d.toISOString() },
    arrayUnion: (...v: any[]) => ({ __op: 'union', v }),
    arrayRemove: (...v: any[]) => ({ __op: 'remove', v }),
    getDoc: async (r: any) => snap(r.path),
    getDocs: async (c: any) => {
      const docs = [...store.keys()]
        .filter((k) => k.startsWith(c.path + '/') && !k.slice(c.path.length + 1).includes('/'))
        .map((k) => snap(k));
      return { docs, forEach: (f: any) => docs.forEach(f), empty: docs.length === 0 };
    },
    setDoc: async (r: any, d: Data, o?: any) => gravar(r.path, d, !!o?.merge),
    updateDoc: async (r: any, d: Data) => {
      if (!store.has(r.path)) throw new Error('not-found');
      gravar(r.path, d, true);
    },
    deleteDoc: async (r: any) => { store.delete(r.path); },
    addDoc: async (c: any, d: Data) => { const r = mod.doc(c); gravar(r.path, d); return { id: r.path.split('/').at(-1) }; },
    runTransaction: async (_db: any, fn: (tx: any) => Promise<any>) => {
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        const lidos = new Map<string, number>();
        const escritas: (() => void)[] = [];
        const tx = {
          get: async (r: any) => {
            await Promise.resolve(); // deixa o "outro aparelho" rodar no meio
            lidos.set(r.path, store.get(r.path)?.v ?? 0);
            return snap(r.path);
          },
          set: (r: any, d: Data, o?: any) => { escritas.push(() => gravar(r.path, d, !!o?.merge)); return tx; },
          update: (r: any, d: Data) => { escritas.push(() => gravar(r.path, d, true)); return tx; },
          delete: (r: any) => { escritas.push(() => store.delete(r.path)); return tx; },
        };
        const resultado = await fn(tx); // se lançar erro, nada é gravado
        const mudou = [...lidos].some(([p, v]) => (store.get(p)?.v ?? 0) !== v);
        if (mudou) continue; // conflito: refaz com dados novos (igual ao Firestore)
        escritas.forEach((w) => w());
        commits++;
        return resultado;
      }
      throw new Error('transação abortada após 5 tentativas');
    },
  };

  return {
    mod,
    store,
    get: (path: string) => store.get(path)?.data,
    set: (path: string, data: Data) => gravar(path, data),
    lista: (prefixo: string) => [...store.keys()].filter((k) => k.startsWith(prefixo + '/') && !k.slice(prefixo.length + 1).includes('/')),
    commits: () => commits,
    limpar: () => { store.clear(); auto = 0; commits = 0; },
  };
}
