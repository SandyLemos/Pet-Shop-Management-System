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

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        const role = userDoc.exists()
          ? (userDoc.data().role as 'admin' | 'user')
          : 'user';

        setAuthState({ user, role, loading: false, error: null });
      } else {
        setAuthState({ user: null, role: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

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

  const logout = async () => {
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
