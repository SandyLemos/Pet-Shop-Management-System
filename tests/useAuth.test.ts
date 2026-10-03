// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---------- Firebase falso ----------
const fb = vi.hoisted(() => ({
  listener: null as null | ((u: any) => void),
  docs: {} as Record<string, any>,          // uid -> dados de /usuarios
  getDocError: null as any,                  // simula falta de internet
  signInResult: null as any,                 // user ou erro
  signOut: null as any,
}));

vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_a: any, cb: any) => { fb.listener = cb; return () => {}; },
  signInWithEmailAndPassword: async () => {
    if (fb.signInResult instanceof Error || fb.signInResult?.code) throw fb.signInResult;
    const user = fb.signInResult;
    setTimeout(() => fb.listener?.(user), 0); // Firebase também avisa o listener
    return { user };
  },
  signOut: (...a: any[]) => fb.signOut(...a),
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db: any, _col: string, uid: string) => uid,
  getDoc: async (uid: string) => {
    if (fb.getDocError) throw fb.getDocError;
    const d = fb.docs[uid];
    return { exists: () => !!d, data: () => d };
  },
}));

import { useAuth, MSG_ACESSO_NEGADO } from '../src/hooks/useAuth';

const funcionario = { uid: 'func1', email: 'func@loja.com' };
const admin = { uid: 'adm1', email: 'adm@loja.com' };
const estranho = { uid: 'xxx', email: 'teste.semacesso@x.com' };

beforeEach(() => {
  fb.listener = null;
  fb.docs = { func1: { role: 'user' }, adm1: { role: 'admin' } };
  fb.getDocError = null;
  fb.signInResult = null;
  fb.signOut = vi.fn(async () => { setTimeout(() => fb.listener?.(null), 0); });
});

describe('useAuth', () => {
  it('sem sessão: termina o carregamento e mostra o login', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    await act(async () => { fb.listener!(null); });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('funcionário entra normalmente (papel user)', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(null); });
    fb.signInResult = funcionario;
    let ok = false;
    await act(async () => { ok = await result.current.login('func@loja.com', '123456'); });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fb.signOut).not.toHaveBeenCalled();
  });

  it('admin entra como admin', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(null); });
    fb.signInResult = admin;
    await act(async () => { await result.current.login('adm@loja.com', '123456'); });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });

  it('conta SEM registro é recusada no login, desconectada e vê a mensagem', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(null); });
    fb.signInResult = estranho;
    let ok = true;
    await act(async () => { ok = await result.current.login('teste.semacesso@x.com', '123456'); });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(ok).toBe(false);
    expect(fb.signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe(MSG_ACESSO_NEGADO);
  });

  it('sessão salva de conta SEM registro (ex-funcionário) é derrubada ao abrir o app', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(estranho); });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(fb.signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(MSG_ACESSO_NEGADO);
  });

  it('senha errada mostra a mensagem certa e não desconecta nada', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(null); });
    fb.signInResult = Object.assign(new Error('x'), { code: 'auth/invalid-credential' });
    let ok = true;
    await act(async () => { ok = await result.current.login('a@a.com', 'errada'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('E-mail ou senha inválidos. Tente novamente.');
    expect(fb.signOut).not.toHaveBeenCalled();
  });

  it('sem internet ao abrir: não fica preso no splash e NÃO desconecta o tablet', async () => {
    fb.getDocError = Object.assign(new Error('offline'), { code: 'unavailable' });
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(funcionario); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toMatch(/internet/);
    expect(fb.signOut).not.toHaveBeenCalled();
  });

  it('sair limpa tudo e não deixa mensagem de erro', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(funcionario); });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => { await result.current.logout(); });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('depois de uma recusa, um funcionário entra sem a mensagem antiga', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { fb.listener!(null); });
    fb.signInResult = estranho;
    await act(async () => { await result.current.login('x', 'y'); });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(result.current.error).toBe(MSG_ACESSO_NEGADO);
    fb.signInResult = funcionario;
    await act(async () => { await result.current.login('func@loja.com', '123456'); });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
