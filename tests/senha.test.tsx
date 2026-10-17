// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

// ---------- Firebase falso ----------
const fb = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'u1' } as any },
  senhas: [] as string[],
  updates: [] as { caminho: string; dados: any }[],
  resets: [] as string[],
  erroSenha: null as any,
  erroReset: null as any,
}));
vi.mock('../src/lib/firebase', () => ({ auth: fb.auth, db: {} }));
vi.mock('firebase/auth', () => ({
  updatePassword: async (_u: any, nova: string) => { if (fb.erroSenha) throw fb.erroSenha; fb.senhas.push(nova); },
  sendPasswordResetEmail: async (_a: any, email: string) => { if (fb.erroReset) throw fb.erroReset; fb.resets.push(email); },
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...partes: string[]) => partes.join('/'),
  updateDoc: async (caminho: string, dados: any) => { fb.updates.push({ caminho, dados }); },
}));

import { gerarSenhaProvisoria, regrasSenha, senhaValida, MSG_LINK_ENVIADO, MSG_LINK_SEM_CONEXAO } from '../src/services/senhaService';
import { TelaPrimeiroAcesso } from '../src/app/components/TelaPrimeiroAcesso';
import { LoginScreen } from '../src/app/components/TelaLogin';

beforeEach(() => {
  fb.auth.currentUser = { uid: 'u1' };
  fb.senhas = []; fb.updates = []; fb.resets = []; fb.erroSenha = null; fb.erroReset = null;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('senha provisória', () => {
  it('formato Xxxx-Xxxx com maiúscula, minúscula e número, sem caracteres ambíguos', () => {
    for (let i = 0; i < 500; i++) {
      const s = gerarSenhaProvisoria();
      expect(s).toMatch(/^[A-Z][a-z0-9]{3}-[A-Z][a-z0-9]{3}$/);
      expect(s).toMatch(/[a-z]/);
      expect(s).toMatch(/[0-9]/);
      expect(s).not.toMatch(/[0O1lI]/);
    }
  });

  it('não se repete', () => {
    const todas = new Set(Array.from({ length: 200 }, gerarSenhaProvisoria));
    expect(todas.size).toBe(200);
  });
});

describe('regras da senha nova', () => {
  it('8+ caracteres, letra, número e as duas iguais', () => {
    expect(regrasSenha('abc', '')).toEqual({ tamanho: false, letra: true, numero: false, iguais: false });
    expect(regrasSenha('12345678', '12345678')).toEqual({ tamanho: true, letra: false, numero: true, iguais: true });
    expect(senhaValida('banho2026', 'banho2026')).toBe(true);
    expect(senhaValida('banho2026', 'banho2025')).toBe(false);
    expect(senhaValida('tosaçãoé1', 'tosaçãoé1')).toBe(true); // acentos contam como letra
  });
});

describe('tela de primeiro acesso', () => {
  const abrir = () => {
    const onSalvo = vi.fn(); const onSair = vi.fn();
    render(<TelaPrimeiroAcesso nome="Ana" onSalvo={onSalvo} onSair={onSair} />);
    const nova = screen.getByLabelText('Nova senha'); const repetir = screen.getByLabelText('Repita a nova senha');
    const botao = screen.getByText('Salvar e entrar').closest('button')!;
    return { onSalvo, onSair, nova, repetir, botao };
  };

  it('mostra o nome e só libera o botão com todas as regras ok', () => {
    const { nova, repetir, botao } = abrir();
    expect(screen.getByText('Olá, Ana! Crie a sua senha')).toBeTruthy();
    expect(screen.getByText('Primeiro acesso')).toBeTruthy();
    expect(screen.getByText('Enquanto a senha não for trocada, o sistema não abre.')).toBeTruthy();
    expect(botao.disabled).toBe(true);
    fireEvent.change(nova, { target: { value: 'banhotosa' } });
    fireEvent.change(repetir, { target: { value: 'banhotosa' } });
    expect(botao.disabled).toBe(true); // falta número
    expect(screen.getByText('Pelo menos um número').closest('li')!.getAttribute('data-ok')).toBe('false');
    fireEvent.change(nova, { target: { value: 'banho2026' } });
    expect(botao.disabled).toBe(true); // não são iguais
    fireEvent.change(repetir, { target: { value: 'banho2026' } });
    expect(botao.disabled).toBe(false);
    for (const r of ['Pelo menos 8 caracteres', 'Pelo menos uma letra', 'Pelo menos um número', 'As duas senhas iguais'])
      expect(screen.getByText(r).closest('li')!.getAttribute('data-ok')).toBe('true');
  });

  it('salvar: troca a senha, grava trocarSenha false, mostra "Senha criada!" e entra', async () => {
    const { onSalvo, nova, repetir, botao } = abrir();
    fireEvent.change(nova, { target: { value: 'banho2026' } });
    fireEvent.change(repetir, { target: { value: 'banho2026' } });
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(botao); });
    expect(fb.senhas).toEqual(['banho2026']);
    expect(fb.updates).toEqual([{ caminho: 'usuarios/u1', dados: { trocarSenha: false } }]);
    expect(screen.getByText('Senha criada!')).toBeTruthy();
    expect(onSalvo).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onSalvo).toHaveBeenCalled();
  });

  it('login antigo demais: pede para sair e entrar de novo; não tira a marca', async () => {
    fb.erroSenha = Object.assign(new Error('x'), { code: 'auth/requires-recent-login' });
    const { onSalvo, nova, repetir, botao } = abrir();
    fireEvent.change(nova, { target: { value: 'banho2026' } });
    fireEvent.change(repetir, { target: { value: 'banho2026' } });
    fireEvent.click(botao);
    await screen.findByText('Por segurança, saia e entre de novo com a senha provisória para criar a sua senha.');
    expect(fb.updates).toEqual([]);
    expect(onSalvo).not.toHaveBeenCalled();
  });

  it('o link Sair desconecta', () => {
    const { onSair } = abrir();
    fireEvent.click(screen.getByText('Sair'));
    expect(onSair).toHaveBeenCalled();
  });
});

describe('Esqueci a senha (tela de login)', () => {
  const abrir = () => render(<LoginScreen onLogin={async () => false} error={null} />);

  it('sem e-mail digitado: pede o e-mail e não envia nada', () => {
    abrir();
    fireEvent.click(screen.getByText('Esqueci a senha'));
    expect(screen.getByText(/Digite o seu e-mail acima/)).toBeTruthy();
    expect(fb.resets).toEqual([]);
  });

  it('envia o link para o e-mail digitado e mostra a mensagem neutra', async () => {
    abrir();
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: ' ana@pet.com ' } });
    fireEvent.click(screen.getByText('Esqueci a senha'));
    await screen.findByText(MSG_LINK_ENVIADO);
    expect(fb.resets).toEqual(['ana@pet.com']);
  });

  it('e-mail sem cadastro: a MESMA mensagem (não revela quem existe)', async () => {
    fb.erroReset = Object.assign(new Error('x'), { code: 'auth/user-not-found' });
    abrir();
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'ninguem@pet.com' } });
    fireEvent.click(screen.getByText('Esqueci a senha'));
    await screen.findByText(MSG_LINK_ENVIADO);
  });

  it('sem internet: avisa da conexão', async () => {
    fb.erroReset = Object.assign(new Error('x'), { code: 'auth/network-request-failed' });
    abrir();
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'ana@pet.com' } });
    fireEvent.click(screen.getByText('Esqueci a senha'));
    await screen.findByText(MSG_LINK_SEM_CONEXAO);
  });
});
