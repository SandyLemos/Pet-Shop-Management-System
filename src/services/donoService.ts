// ✅ Painel do Dono: leitura e gravação das lojas, mensalidades e comunicados.
// Só funciona para a conta marcada em /donos (as regras do Firestore garantem).
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, limit, getCountFromServer, serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, firebaseConfig } from '../lib/firebase';
import { diasAnteriores, listarDias } from './petService';
import {
  idCobranca, idParaLoja, primeiroMesCobrado, somarDias,
  type Atividade, type Cobranca, type Comunicado, type DadosDono, type Loja, type AlvoComunicado, type PlanoId,
} from '../utils/dono';

export const EMAIL_EM_USO = 'EMAIL_EM_USO';

const DIAS_DE_ATIVIDADE = 30;

async function atividadeDaLoja(lojaId: string, hoje: string): Promise<Atividade> {
  const dias = [...diasAnteriores(hoje, DIAS_DE_ATIVIDADE - 1), hoje];
  const porDia: Record<string, number> = {};
  // contagem no servidor: custa 1 leitura por dia, não 1 por atendimento
  await Promise.all(dias.map(async (dia) => {
    const q = query(collection(db, 'lojas', lojaId, 'dias', dia, 'logs'), where('tipo', '==', 'entregue'));
    const n = (await getCountFromServer(q)).data().count;
    if (n > 0) porDia[dia] = n;
  }));
  const usuarios = (await getCountFromServer(query(collection(db, 'usuarios'), where('lojaId', '==', lojaId)))).data().count;
  return { porDia, usuarios };
}

export async function carregarDadosDono(hoje: string): Promise<DadosDono> {
  const [lojasSnap, cobSnap, comSnap, antigos] = await Promise.all([
    getDocs(collection(db, 'lojas')),
    getDocs(collection(db, 'cobrancas')),
    getDocs(collection(db, 'comunicados')),
    getDocs(query(collection(db, 'petsCadastro'), limit(1))),
  ]);
  const lojas = lojasSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Loja)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const atividade: Record<string, Atividade> = {};
  await Promise.all(lojas.map(async (l) => { atividade[l.id] = await atividadeDaLoja(l.id, hoje); }));
  return {
    hoje,
    lojas,
    cobrancas: cobSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Cobranca),
    comunicados: comSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Comunicado)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    atividade,
    migracaoPendente: !antigos.empty && !lojas.some((l) => l.migradaEm),
  };
}

export interface NovaLoja {
  nome: string;
  cidade: string;
  telefone: string;
  responsavel: string;
  emailAdmin: string;
  plano: PlanoId;
  mensalidade: number;
  vencimentoDia: number;
  diasDeTeste: number;
}

/**
 * Cria a loja e o admin dela. O admin recebe por e-mail o link para criar a senha.
 * A conta é criada primeiro: se o e-mail já existir, nada é gravado.
 */
export async function criarLoja(n: NovaLoja, hoje: string, existentes: string[]): Promise<Loja> {
  const id = idParaLoja(n.nome, existentes);
  const emTeste = n.diasDeTeste > 0;
  const fimTeste = emTeste ? somarDias(hoje, n.diasDeTeste - 1) : undefined;
  const loja: Loja = {
    id,
    nome: n.nome.trim(),
    cidade: n.cidade.trim(),
    telefone: n.telefone.trim(),
    responsavel: n.responsavel.trim(),
    emailAdmin: n.emailAdmin.trim().toLowerCase(),
    plano: n.plano,
    mensalidade: n.mensalidade,
    vencimentoDia: n.vencimentoDia,
    status: emTeste ? 'teste' : 'ativa',
    criadaEm: hoje,
    cobrarDesde: primeiroMesCobrado(n, emTeste ? somarDias(fimTeste!, 1) : hoje),
    ...(fimTeste ? { fimTeste } : {}),
  };

  // app secundário: criar a conta sem desconectar o dono
  const app2 = initializeApp(firebaseConfig, `novaLoja-${Date.now()}`);
  const auth2 = getAuth(app2);
  try {
    let uid: string;
    try {
      const senhaProvisoria = `${crypto.randomUUID()}Aa1!`;
      uid = (await createUserWithEmailAndPassword(auth2, loja.emailAdmin!, senhaProvisoria)).user.uid;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') throw new Error(EMAIL_EM_USO);
      throw err;
    }
    const { id: _id, ...dados } = loja;
    await setDoc(doc(db, 'lojas', id), { ...dados, criadoEmTs: serverTimestamp() });
    const [nome, ...resto] = loja.responsavel!.split(/\s+/);
    await setDoc(doc(db, 'usuarios', uid), {
      id: uid, nome, sobrenome: resto.join(' '), funcao: 'Administrador', role: 'admin',
      email: loja.emailAdmin, lojaId: id, criadoEm: serverTimestamp(),
    });
    await sendPasswordResetEmail(auth2, loja.emailAdmin!);
  } finally {
    await deleteApp(app2);
  }
  return loja;
}

export type CamposLoja = Partial<Pick<Loja, 'nome' | 'cidade' | 'telefone' | 'responsavel' | 'plano' | 'mensalidade' | 'vencimentoDia' | 'status' | 'fimTeste' | 'cobrarDesde'>>;

export async function atualizarLoja(id: string, campos: CamposLoja) {
  await updateDoc(doc(db, 'lojas', id), campos as any);
}

export async function registrarPagamento(loja: Loja, mes: string, valor: number, hoje: string) {
  await setDoc(doc(db, 'cobrancas', idCobranca(loja.id, mes)), { lojaId: loja.id, mes, valor, pagaEm: hoje });
}

export async function desfazerPagamento(loja: Loja, mes: string) {
  await deleteDoc(doc(db, 'cobrancas', idCobranca(loja.id, mes)));
}

export async function publicarComunicado(titulo: string, texto: string, alvo: AlvoComunicado, hoje: string) {
  await addDoc(collection(db, 'comunicados'), { titulo: titulo.trim(), texto: texto.trim(), alvo, ativo: true, criadoEm: hoje });
}

export async function encerrarComunicado(id: string) {
  await updateDoc(doc(db, 'comunicados', id), { ativo: false });
}

/** Comunicados ativos (lido pelas lojas para mostrar o aviso no topo) */
export async function comunicadosAtivos(): Promise<Comunicado[]> {
  const snap = await getDocs(query(collection(db, 'comunicados'), where('ativo', '==', true)));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Comunicado).filter((c) => c.ativo);
}

// ─── Acessos ao painel (outros proprietários: sócio, desenvolvedor) ───────────

export interface Proprietario {
  uid: string;
  nome: string;
  email: string;
  criadoEm?: string;
}

export const NAO_PODE_REMOVER_A_SI = 'NAO_PODE_REMOVER_A_SI';

export async function listarProprietarios(): Promise<Proprietario[]> {
  const snap = await getDocs(collection(db, 'donos'));
  return snap.docs.map((d: any) => ({ uid: d.id, nome: d.data().nome ?? '', email: d.data().email ?? '', criadoEm: d.data().criadoEm }))
    .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, 'pt-BR'));
}

/**
 * Dá acesso ao painel para outra pessoa. A conta é criada e ela recebe por e-mail o link
 * para criar a senha. Se o e-mail já tiver conta, nada é gravado.
 */
export async function cadastrarProprietario(nome: string, email: string, hoje: string): Promise<Proprietario> {
  const emailLimpo = email.trim().toLowerCase();
  const app2 = initializeApp(firebaseConfig, `novoProprietario-${Date.now()}`);
  const auth2 = getAuth(app2);
  try {
    let uid: string;
    try {
      const senhaProvisoria = `${crypto.randomUUID()}Aa1!`;
      uid = (await createUserWithEmailAndPassword(auth2, emailLimpo, senhaProvisoria)).user.uid;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') throw new Error(EMAIL_EM_USO);
      throw err;
    }
    const dados = { nome: nome.trim(), email: emailLimpo, criadoEm: hoje };
    await setDoc(doc(db, 'donos', uid), dados);
    await sendPasswordResetEmail(auth2, emailLimpo);
    return { uid, ...dados };
  } finally {
    await deleteApp(app2);
  }
}

/** Tira o acesso ao painel (a pessoa não entra mais). Ninguém tira o próprio acesso. */
export async function removerProprietario(uid: string, meuUid: string) {
  if (uid === meuUid) throw new Error(NAO_PODE_REMOVER_A_SI);
  await deleteDoc(doc(db, 'donos', uid));
}

// ─── Excluir loja ─────────────────────────────────────────────────────────────

/** O nome digitado precisa ser exatamente o do cadastro (só os espaços das pontas não contam) */
export const nomeConfere = (digitado: string, nome: string) => digitado.trim() === nome.trim();

const SUBCOLECOES_DA_LOJA = ['petsCadastro', 'profissionais', 'racas', 'contadores', 'slotsUsados'] as const;
const INICIO_DO_SISTEMA = '2026-01-01';

/** Apaga em blocos para não travar a conexão do aparelho */
async function apagarTudo(refs: any[], aoAvancar?: (feitos: number, total: number) => void) {
  for (let i = 0; i < refs.length; i += 25) {
    await Promise.all(refs.slice(i, i + 25).map((r) => deleteDoc(r)));
    aoAvancar?.(Math.min(i + 25, refs.length), refs.length);
  }
}

/**
 * Exclui a loja e TUDO dela: fila e histórico, fichas dos pets, profissionais, raças,
 * contadores, funcionários (o cadastro no sistema) e mensalidades. Não tem volta.
 * As contas de login dos funcionários ficam sem acesso (sem cadastro, ninguém entra).
 */
export async function excluirLoja(loja: Loja, hoje: string, aoAvancar?: (texto: string) => void) {
  const raiz = ['lojas', loja.id];
  aoAvancar?.('Procurando os dados da loja...');
  const refs: any[] = [];
  for (const sub of SUBCOLECOES_DA_LOJA) {
    refs.push(...(await getDocs((collection as any)(db, ...raiz, sub))).docs.map((d: any) => d.ref));
  }
  // dias: os que têm documento + todos desde que a loja existe (pets e histórico podem estar sem o documento do dia)
  const diasDoc = (await getDocs((collection as any)(db, ...raiz, 'dias'))).docs;
  const desde = loja.criadaEm && loja.criadaEm > INICIO_DO_SISTEMA ? loja.criadaEm : INICIO_DO_SISTEMA;
  const nomesDias = [...new Set([...diasDoc.map((d: any) => d.id), ...listarDias(desde, hoje)])];
  for (let i = 0; i < nomesDias.length; i += 10) {
    const lote = await Promise.all(nomesDias.slice(i, i + 10).map(async (dia) => {
      const [pets, logs] = await Promise.all([
        getDocs((collection as any)(db, ...raiz, 'dias', dia, 'pets')),
        getDocs((collection as any)(db, ...raiz, 'dias', dia, 'logs')),
      ]);
      return [...pets.docs, ...logs.docs].map((d: any) => d.ref);
    }));
    lote.forEach((r) => refs.push(...r));
  }
  refs.push(...diasDoc.map((d: any) => d.ref));
  refs.push(...(await getDocs(query(collection(db, 'usuarios'), where('lojaId', '==', loja.id)))).docs.map((d: any) => d.ref));
  refs.push(...(await getDocs(query(collection(db, 'cobrancas'), where('lojaId', '==', loja.id)))).docs.map((d: any) => d.ref));

  await apagarTudo(refs, (feitos, total) => aoAvancar?.(`Apagando... ${feitos} de ${total}`));
  await deleteDoc(doc(db, 'lojas', loja.id)); // por último: se parar no meio, a loja continua na lista para tentar de novo
}

export async function lojaExiste(id: string) {
  return (await getDoc(doc(db, 'lojas', id))).exists();
}
