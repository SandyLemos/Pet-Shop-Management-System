import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true, // começa true para verificar sessão existente
    error: null,
  });

  // ── Observador de estado do Firebase ──────────────────────────────────────
  // O próprio Firebase já persiste a sessão automaticamente.
  // onAuthStateChanged dispara ao abrir o app e restaura o usuário logado.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    // Limpa o observador ao desmontar
    return () => unsubscribe();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err: any) {
      const message = getFirebaseErrorMessage(err.code);
      setAuthState((prev) => ({ ...prev, loading: false, error: message }));
      return false;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setAuthState({ user: null, loading: false, error: null });
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    login,
    logout,
  };
}

// ─── Tradução dos erros do Firebase ──────────────────────────────────────────
function getFirebaseErrorMessage(code: string): string {
  const errors: Record<string, string> = {
    'auth/invalid-email':        'E-mail inválido.',
    'auth/user-disabled':        'Usuário desativado. Contate o administrador.',
    'auth/user-not-found':       'Nenhum usuário encontrado com este e-mail.',
    'auth/wrong-password':       'Senha incorreta. Tente novamente.',
    'auth/invalid-credential':   'E-mail ou senha inválidos. Tente novamente.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  };
  return errors[code] ?? 'Erro inesperado. Tente novamente.';
}
