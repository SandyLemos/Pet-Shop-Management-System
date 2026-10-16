import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { definirLoja } from '../lib/lojaAtual';
import { idDoDia } from '../utils/dias';

export type Papel = 'admin' | 'user' | 'dono';

interface AuthState {
  user: User | null;
  role: Papel | null;
  loading: boolean;
  error: string | null;
}

// ✅ Mensagens exibidas na tela de login
export const MSG_ACESSO_NEGADO =
  'Sua conta não está liberada para usar este sistema. Fale com o administrador.';
const MSG_SEM_CONEXAO =
  'Não foi possível verificar seu acesso. Confira a internet e tente novamente.';

export const MSG_SEM_LOJA =
  'Sua conta ainda não está ligada a uma loja. Fale com o administrador.';
export const MSG_LOJA_BLOQUEADA =
  'O acesso desta loja está suspenso. Fale com o suporte do Pata & Gestão.';
export const MSG_TESTE_ACABOU =
  'O período de teste desta loja terminou. Fale com o suporte do Pata & Gestão para continuar.';

const SEM_REGISTRO = 'SEM_REGISTRO';

/** Recusas que desconectam a conta e mostram o motivo no login */
const RECUSAS: Record<string, string> = {
  [SEM_REGISTRO]: MSG_ACESSO_NEGADO,
  SEM_LOJA: MSG_SEM_LOJA,
  LOJA_BLOQUEADA: MSG_LOJA_BLOQUEADA,
  TESTE_ACABOU: MSG_TESTE_ACABOU,
};

/**
 * ✅ Quem pode entrar:
 * - o dono do sistema (marcado em /donos, só pelo console do Firebase) → Painel do Dono;
 * - funcionário com registro em /usuarios ligado a uma loja ativa (ou em teste no prazo).
 * Qualquer outro caso lança um dos motivos de RECUSAS.
 */
async function verificarAcesso(user: User): Promise<Papel> {
  definirLoja(null);
  const dono = await getDoc(doc(db, 'donos', user.uid));
  if (dono.exists()) return 'dono';

  const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
  if (!userDoc.exists()) throw new Error(SEM_REGISTRO);
  const perfil = userDoc.data();
  if (!perfil.lojaId) throw new Error('SEM_LOJA');

  const lojaDoc = await getDoc(doc(db, 'lojas', perfil.lojaId));
  if (!lojaDoc.exists()) throw new Error('SEM_LOJA');
  const loja = lojaDoc.data();
  if (loja.status === 'bloqueada') throw new Error('LOJA_BLOQUEADA');
  if (loja.status === 'teste' && loja.fimTeste && loja.fimTeste < idDoDia()) throw new Error('TESTE_ACABOU');

  definirLoja({ id: perfil.lojaId, nome: loja.nome ?? '', logoUrl: loja.logoUrl, plano: loja.plano, status: loja.status, cores: loja.cores });
  return perfil.role === 'admin' ? 'admin' : 'user';
}

/**
 * Mensagem a mostrar depois que o próprio app desconecta a conta
 * (o signOut dispara o listener com user = null, que lê daqui).
 */
let erroPendente: string | null = null;

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        definirLoja(null);
        setAuthState((prev) => ({
          user: null,
          role: null,
          loading: false,
          error: erroPendente ?? prev.error,
        }));
        erroPendente = null;
        return;
      }

      try {
        const role = await verificarAcesso(user);
        setAuthState({ user, role, loading: false, error: null });
      } catch (err: any) {
        if (RECUSAS[err?.message]) {
          // conta recusada: desconecta e mostra o motivo no login
          erroPendente = RECUSAS[err.message];
          await signOut(auth);
        } else {
          // falha de rede: NÃO desconecta (recarregar a página tenta de novo),
          // só mostra a tela de login com o aviso em vez de travar no splash
          setAuthState({ user: null, role: null, loading: false, error: MSG_SEM_CONEXAO });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // ✅ não liga o "loading" global: a tela de login continua montada
    //    (mantém o e-mail digitado) e usa o próprio spinner do botão
    setAuthState((prev) => ({ ...prev, error: null }));
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const role = await verificarAcesso(cred.user);
      setAuthState({ user: cred.user, role, loading: false, error: null });
      return true;
    } catch (err: any) {
      if (RECUSAS[err?.message]) {
        erroPendente = RECUSAS[err.message];
        await signOut(auth);
        setAuthState({ user: null, role: null, loading: false, error: RECUSAS[err.message] });
        return false;
      }
      const code: string = err?.code ?? '';
      const message = code.startsWith('auth/')
        ? getFirebaseErrorMessage(code)
        : MSG_SEM_CONEXAO;
      setAuthState((prev) => ({ ...prev, loading: false, error: message }));
      return false;
    }
  };

  const logout = async () => {
    erroPendente = null;
    definirLoja(null);
    await signOut(auth);
    setAuthState({ user: null, role: null, loading: false, error: null });
  };

  return {
    user: authState.user,
    role: authState.role,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    isAdmin: authState.role === 'admin',
    isDono: authState.role === 'dono',
    login,
    logout,
  };
}

function getFirebaseErrorMessage(code: string): string {
  const errors: Record<string, string> = {
    'auth/invalid-email':          'E-mail inválido.',
    'auth/user-disabled':          'Usuário desativado. Contate o administrador.',
    'auth/user-not-found':         'Nenhum usuário encontrado com este e-mail.',
    'auth/wrong-password':         'Senha incorreta. Tente novamente.',
    'auth/invalid-credential':     'E-mail ou senha inválidos. Tente novamente.',
    'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  };
  return errors[code] ?? 'Erro inesperado. Tente novamente.';
}
