// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const st = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => ({ toast: st.toast }));
vi.mock('../src/hooks/useCloudinaryUpload', () => ({ useCloudinaryUpload: () => ({ uploadImage: vi.fn(), uploading: false, error: null }) }));
vi.mock('../src/hooks/useRacas', () => ({ useRacas: () => ({ nomesPorEspecie: () => [], criar: vi.fn() }) }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../src/services/petService', () => ({ buscarPetsCadastro: vi.fn(async () => []) }));
vi.mock('../src/app/components/GerenciarRacas', () => ({ GerenciarRacas: () => null }));

import { PetRegistration } from '../src/app/components/PetRegistration';
afterEach(cleanup);
beforeEach(() => Object.values(st.toast).forEach((f) => f.mockClear()));

// selects na ordem da tela: espécie, porte, raça, serviço
const selects = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
const preencherBasico = () => {
  fireEvent.change(document.getElementById('nomePet')!, { target: { value: 'Rex' } });
  fireEvent.change(document.getElementById('nomeTutor')!, { target: { value: 'Ana' } });
  fireEvent.change(document.getElementById('telefone')!, { target: { value: '24999991234' } });
  fireEvent.change(selects()[3], { target: { value: 'banho' } });
};
const finalizar = async () => { await act(async () => { fireEvent.click(screen.getByText('Finalizar e Cadastrar')); }); };

describe('Formulário: espécie, porte e raça obrigatórios', () => {
  it('sem espécie, porte e raça: NÃO envia e avisa o que falta', async () => {
    const onSubmit = vi.fn();
    render(<PetRegistration onSubmit={onSubmit} />);
    preencherBasico();
    await finalizar();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(st.toast.error).toHaveBeenCalledWith('Preencha antes de finalizar: Espécie, Porte, Raça.');
  });

  it('faltando só a raça: avisa só a raça', async () => {
    const onSubmit = vi.fn();
    render(<PetRegistration onSubmit={onSubmit} />);
    preencherBasico();
    fireEvent.change(selects()[0], { target: { value: 'cao' } });
    fireEvent.change(selects()[1], { target: { value: 'medio' } });
    await finalizar();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(st.toast.error).toHaveBeenCalledWith('Preencha antes de finalizar: Raça.');
  });

  it('tudo preenchido: envia normalmente', async () => {
    const onSubmit = vi.fn();
    render(<PetRegistration onSubmit={onSubmit} />);
    preencherBasico();
    fireEvent.change(selects()[0], { target: { value: 'cao' } });
    fireEvent.change(selects()[1], { target: { value: 'medio' } });
    fireEvent.change(selects()[2], { target: { value: 'Beagle' } });
    await finalizar();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ especie: 'cao', porte: 'medio', raca: 'Beagle', nomePet: 'Rex' }));
  });

  it('editando pet JÁ em atendimento sem espécie (campos travados): continua podendo salvar', async () => {
    const onSubmit = vi.fn();
    const antigo: any = { id: 'x', nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho', slotNumber: 3, status: 'banho', atendimentoIniciado: true, checkInTime: '' };
    render(<PetRegistration onSubmit={onSubmit} isEditing initialData={antigo} />);
    await act(async () => { fireEvent.click(screen.getByText('Atualizar Registro')); });
    expect(onSubmit).toHaveBeenCalled();
  });
});
