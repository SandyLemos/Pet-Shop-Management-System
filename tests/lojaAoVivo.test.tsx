// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';

// mesmas trocas do teste da grade: o formulário e o detalhe viram botões/nada
const acoes = vi.hoisted(() => ({ salvou: false }));
vi.mock('../src/app/components/PetRegistration', () => ({
  PetRegistration: () => <button onClick={() => { acoes.salvou = true; }}>salvar-formulario</button>,
}));
vi.mock('../src/app/components/PetDetailModal', () => ({ PetDetailModal: () => null }));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ usados: new Set(), marcarUsado: vi.fn() }) }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => <p>lista-de-entregues</p> }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

import { TelaDaLoja } from '../src/app/components/dono/LojaAoVivo';
afterEach(cleanup);

const loja: any = { id: 'elite', nome: 'Elite Pet Shop', plano: 'basico', mensalidade: 0, vencimentoDia: 10, status: 'ativa' };
const pet: any = { id: 'p1', slotNumber: 2, nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho', status: 'espera', checkInTime: new Date().toISOString() };

describe('Loja ao vivo (só leitura)', () => {
  it('mostra a mesma grade da loja, com o pet na vaga dele', () => {
    render(<TelaDaLoja loja={loja} pets={[pet]} fechar={vi.fn()} />);
    expect(screen.getByText('Elite Pet Shop')).toBeTruthy();
    expect(screen.getByTitle(/Rex - Ana/)).toBeTruthy();
    expect(screen.getByText(/nada pode ser alterado daqui/)).toBeTruthy();
  });

  it('tocar numa vaga livre NÃO abre o cadastro', async () => {
    render(<TelaDaLoja loja={loja} pets={[pet]} fechar={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByTitle('Slot 1 - Livre')); });
    expect(screen.queryByText('Cadastrar Pet - Slot 1')).toBeNull();
    expect(screen.queryByText('salvar-formulario')).toBeNull();
    expect(acoes.salvou).toBe(false);
  });

  it('dá para trocar entre Grade, Fluxo e Entregues e fechar', async () => {
    const fechar = vi.fn();
    render(<TelaDaLoja loja={loja} pets={[pet]} fechar={fechar} />);
    fireEvent.click(screen.getByRole('button', { name: /Fluxo/ }));
    expect(screen.getByText('Aguardando')).toBeTruthy();
    // no Fluxo, o botão de adicionar animal também não faz nada
    await act(async () => { fireEvent.click(screen.getByText('Adicionar Animal')); });
    expect(screen.queryByText('salvar-formulario')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Entregues/ }));
    expect(screen.getByText('lista-de-entregues')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(fechar).toHaveBeenCalled();
  });
});
