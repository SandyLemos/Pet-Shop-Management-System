// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ---------- Firebase falso ----------
const fb = vi.hoisted(() => ({
  contas: [] as { email: string; senha: string }[],
  gravados: [] as { caminho: string; dados: any }[],
  resetEnviado: [] as string[],
}));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {}, firebaseConfig: {} }));
vi.mock('../src/lib/loja', () => ({ lojaId: () => 'loja-a' }));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}), deleteApp: async () => {} }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  createUserWithEmailAndPassword: async (_a: any, email: string, senha: string) => {
    if (fb.contas.some((c) => c.email === email)) throw Object.assign(new Error('x'), { code: 'auth/email-already-in-use' });
    fb.contas.push({ email, senha });
    return { user: { uid: `uid-${email}` } };
  },
  sendPasswordResetEmail: async (_a: any, email: string) => { fb.resetEnviado.push(email); },
  updatePassword: async () => {},
}));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  getDocs: async () => ({ docs: [] }),
  doc: (_db: any, ...partes: string[]) => partes.join('/'),
  setDoc: async (caminho: string, dados: any) => { fb.gravados.push({ caminho, dados }); },
  updateDoc: async () => {},
  deleteDoc: async () => {},
  Timestamp: { now: () => '__agora__' },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { SecaoUsuarios } from '../src/app/components/AdminUsuarios';

const escrever = vi.fn(async (_t: string) => {});
beforeEach(() => {
  fb.contas = []; fb.gravados = []; fb.resetEnviado = [];
  vi.mocked(toast.success).mockClear(); vi.mocked(toast.error).mockClear();
  escrever.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
});
afterEach(cleanup);

async function abrirFormulario() {
  render(<SecaoUsuarios />);
  fireEvent.click(await screen.findByTitle('Criar novo usuário'));
}

function preencher(email = 'ana@pet.com') {
  fireEvent.change(screen.getByPlaceholderText('João'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByPlaceholderText('Silva'), { target: { value: 'Souza' } });
  fireEvent.change(screen.getByPlaceholderText('Ex: Tosador, Banhista...'), { target: { value: 'Banhista' } });
  fireEvent.change(screen.getByPlaceholderText('usuario@email.com'), { target: { value: email } });
}

async function criar(email?: string) {
  await abrirFormulario();
  preencher(email);
  fireEvent.click(screen.getByText('Criar Usuário'));
  return screen.findByTestId('senha-provisoria');
}

describe('Admin cria funcionário com senha provisória', () => {
  it('o formulário não pede senha', async () => {
    await abrirFormulario();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText('Senha')).toBeNull();
  });

  it('cria a conta com a senha provisória, grava trocarSenha e NÃO envia e-mail', async () => {
    const campo = await criar(' ana@pet.com ');
    const senha = campo.textContent!;
    expect(senha).toMatch(/^[A-Z][a-z2-9]{3}-[A-Z][a-z2-9]{3}$/);
    expect(fb.contas).toEqual([{ email: 'ana@pet.com', senha }]);
    expect(fb.gravados).toEqual([{
      caminho: 'usuarios/uid-ana@pet.com',
      dados: expect.objectContaining({
        id: 'uid-ana@pet.com', nome: 'Ana', sobrenome: 'Souza', funcao: 'Banhista',
        role: 'user', email: 'ana@pet.com', lojaId: 'loja-a', trocarSenha: true,
      }),
    }]);
    // a senha provisória não é gravada no cadastro
    expect(JSON.stringify(fb.gravados)).not.toContain(senha);
    expect(fb.resetEnviado).toEqual([]);
  });

  it('tela de sucesso: login, senha, copiar, WhatsApp e Pronto', async () => {
    const senha = (await criar()).textContent!;
    expect(screen.getByText('Usuário Ana Souza criado')).toBeTruthy();
    expect(screen.getByText(/Ela entra com a senha provisória e o sistema pede para ela criar a senha dela na hora/)).toBeTruthy();
    expect(screen.getByText('ana@pet.com')).toBeTruthy();
    expect(screen.getByText(/aparece só agora e só serve para o primeiro login/)).toBeTruthy();

    fireEvent.click(screen.getByText('Copiar'));
    await waitFor(() => expect(escrever).toHaveBeenCalledWith(`Login: ana@pet.com\nSenha provisória: ${senha}`));

    const zap = screen.getByText('Enviar no WhatsApp').closest('a')!;
    const texto = decodeURIComponent(zap.getAttribute('href')!.replace('https://wa.me/?text=', ''));
    expect(texto).toContain(window.location.origin);
    expect(texto).toContain('ana@pet.com');
    expect(texto).toContain(senha);

    fireEvent.click(screen.getByText('Pronto'));
    expect(screen.queryByTestId('senha-provisoria')).toBeNull();
  });

  it('cada funcionário ganha uma senha provisória diferente', async () => {
    const a = (await criar('a@pet.com')).textContent;
    cleanup();
    const b = (await criar('b@pet.com')).textContent;
    expect(a).not.toBe(b);
  });

  it('e-mail já em uso: avisa e não grava nada', async () => {
    fb.contas.push({ email: 'ana@pet.com', senha: 'x' });
    await abrirFormulario();
    preencher();
    fireEvent.click(screen.getByText('Criar Usuário'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Este e-mail já está em uso.'));
    expect(fb.gravados).toEqual([]);
    expect(screen.queryByTestId('senha-provisoria')).toBeNull();
  });

  it('campos vazios: não cria nada', async () => {
    await abrirFormulario();
    fireEvent.click(screen.getByText('Criar Usuário'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Preencha todos os campos.'));
    expect(fb.contas).toEqual([]);
  });
});
