// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';

// Formulário falso: um botão que envia os dados
vi.mock('../src/app/components/PetRegistration', () => ({
  PetRegistration: ({ onSubmit }: any) => (
    <button onClick={() => onSubmit({ nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho' })}>salvar-formulario</button>
  ),
}));
vi.mock('../src/app/components/PetDetailModal', () => ({ PetDetailModal: () => null }));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ usados: new Set() }) }));

import { SlotGrid } from '../src/app/components/SlotGrid';
afterEach(cleanup);

const abrirSlot1 = async () => {
  await act(async () => { fireEvent.click(screen.getByTitle('Slot 1 - Livre')); });
  expect(screen.getByText('Cadastrar Pet - Slot 1')).toBeTruthy();
};

describe('SlotGrid: formulário de cadastro', () => {
  it('cadastrou: fecha o formulário', async () => {
    const onAddPet = vi.fn(async () => true);
    render(<SlotGrid pets={[]} onAddPet={onAddPet} onEditPet={vi.fn()} onDeletePet={vi.fn()} onCheckout={vi.fn()} filter="all" />);
    await abrirSlot1();
    await act(async () => { fireEvent.click(screen.getByText('salvar-formulario')); });
    expect(onAddPet).toHaveBeenCalledWith(expect.objectContaining({ slotNumber: 1, status: 'espera', nomePet: 'Rex' }));
    expect(screen.queryByText('Cadastrar Pet - Slot 1')).toBeNull();
  });

  it('vaga tomada (false): o formulário CONTINUA aberto, sem perder o que foi digitado', async () => {
    const onAddPet = vi.fn(async () => false);
    render(<SlotGrid pets={[]} onAddPet={onAddPet} onEditPet={vi.fn()} onDeletePet={vi.fn()} onCheckout={vi.fn()} filter="all" />);
    await abrirSlot1();
    await act(async () => { fireEvent.click(screen.getByText('salvar-formulario')); });
    expect(screen.getByText('Cadastrar Pet - Slot 1')).toBeTruthy();
  });

  it('toque duplo enquanto salva: cadastra uma vez só', async () => {
    let terminar: (v: boolean) => void = () => {};
    const onAddPet = vi.fn(() => new Promise<boolean>((r) => { terminar = r; }));
    render(<SlotGrid pets={[]} onAddPet={onAddPet} onEditPet={vi.fn()} onDeletePet={vi.fn()} onCheckout={vi.fn()} filter="all" />);
    await abrirSlot1();
    await act(async () => {
      fireEvent.click(screen.getByText('salvar-formulario'));
      fireEvent.click(screen.getByText('salvar-formulario'));
    });
    expect(onAddPet).toHaveBeenCalledTimes(1);
    await act(async () => { terminar(true); });
    expect(screen.queryByText('Cadastrar Pet - Slot 1')).toBeNull();
  });
});
