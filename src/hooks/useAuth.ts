import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthState {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  error: string | null;
}

// ✅ Mensagens exibidas na tela de login
export const MSG_ACESSO_NEGADO =
  'Sua conta não está liberada para usar este sistema. Fale com o administrador.';
const MSG_SEM_CONEXAO =
  'Não foi possível verificar seu acesso. Confira a internet e tente novamente.';

const SEM_REGISTRO = 'SEM_REGISTRO';

/**
 * ✅ Só entra no sistema quem tem registro em /usuarios (criado pelo admin).
 * Conta que existe só no Firebase Auth (sem registro) é recusada.
 * Lança Error(SEM_REGISTRO) quando o registro não existe.
 */
async function verificarAcesso(user: User): Promise<'admin' | 'user'> {
  const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
  if (!userDoc.exists()) throw new Error(SEM_REGISTRO);
  return userDoc.data().role === 'admin' ? 'admin' : 'user';
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
        if (err?.message === SEM_REGISTRO) {
          // conta sem registro: desconecta e mostra o aviso no login
          erroPendente = MSG_ACESSO_NEGADO;
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
      if (err?.message === SEM_REGISTRO) {
        erroPendente = MSG_ACESSO_NEGADO;
        await signOut(auth);
        setAuthState({ user: null, role: null, loading: false, error: MSG_ACESSO_NEGADO });
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
