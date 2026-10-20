// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';

const st = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, fichas: [] as any[] }));
vi.mock('sonner', () => ({ toast: st.toast }));
vi.mock('../src/hooks/useCloudinaryUpload', () => ({ useCloudinaryUpload: () => ({ uploadImage: vi.fn(), uploading: false, error: null }) }));
vi.mock('../src/hooks/useRacas', () => ({ useRacas: () => ({ nomesPorEspecie: () => [], criar: vi.fn() }) }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../src/services/petService', () => ({ buscarPetsCadastro: vi.fn(async () => st.fichas) }));
vi.mock('../src/app/components/GerenciarRacas', () => ({ GerenciarRacas: () => null }));

import { PetRegistration } from '../src/app/components/PetRegistration';
import { AlertaSelos, AlertaSeloVaga } from '../src/app/components/AlertasPet';

afterEach(cleanup);
beforeEach(() => { Object.values(st.toast).forEach((f) => f.mockClear()); st.fichas = []; });

describe('Selos de alerta', () => {
  it('card pequeno: 2 primeiros + "+N"', () => {
    render(<AlertaSelos alertas={['Morde', 'Idoso', 'Cardíaco', 'Bravo']} compacto />);
    const selos = screen.getByTestId('alerta-selos');
    expect(within(selos).getByText('Morde')).toBeTruthy();
    expect(within(selos).getByText('Idoso')).toBeTruthy();
    expect(within(selos).queryByText('Cardíaco')).toBeNull();
    expect(within(selos).getByText('+2')).toBeTruthy();
  });

  it('sem alertas: não mostra nada', () => {
    const { container } = render(<AlertaSelos alertas={[]} compacto />);
    expect(container.innerHTML).toBe('');
    const vaga = render(<AlertaSeloVaga alertas={undefined} />);
    expect(vaga.container.innerHTML).toBe('');
  });

  it('janela de detalhes: mostra todos + a observação', () => {
    render(<AlertaSelos alertas={['Morde', 'Idoso', 'Cardíaco']} alertaObs="alérgico a shampoo X" />);
    for (const t of ['Morde', 'Idoso', 'Cardíaco', 'alérgico a shampoo X']) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('vaga da Grade: ícone com a quantidade', () => {
    render(<AlertaSeloVaga alertas={['Morde', 'Idoso']} />);
    expect(screen.getByTestId('alerta-selo-vaga').textContent).toBe('2');
  });
});

const selects = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
const preencher = () => {
  fireEvent.change(document.getElementById('nomePet')!, { target: { value: 'Rex' } });
  fireEvent.change(document.getElementById('nomeTutor')!, { target: { value: 'Ana' } });
  fireEvent.change(document.getElementById('telefone')!, { target: { value: '24999991234' } });
  fireEvent.change(selects()[0], { target: { value: 'cao' } });
  fireEvent.change(selects()[1], { target: { value: 'medio' } });
  fireEvent.change(selects()[2], { target: { value: 'Beagle' } });
  fireEvent.change(selects()[3], { target: { value: 'banho' } });
};
const finalizar = async () => { await act(async () => { fireEvent.click(screen.getByText('Finalizar e Cadastrar')); }); };

describe('Cadastro: alertas da ficha', () => {
  it('marca alertas, "Outro" e detalhe e envia junto com o cadastro', async () => {
    const onSubmit = vi.fn();
    render(<PetRegistration onSubmit={onSubmit} />);
    preencher();
    fireEvent.click(document.getElementById('consentimentoLgpd')!);
    fireEvent.click(screen.getByRole('button', { name: /Morde/ }));
    fireEvent.click(screen.getByRole('button', { name: /Alérgico/ }));
    fireEvent.change(document.getElementById('alertaOutro')!, { target: { value: 'Epilético' } });
    fireEvent.change(document.getElementById('alertaObs')!, { target: { value: 'alérgico a shampoo X' } });
    await finalizar();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      alertas: ['Alérgico', 'Morde', 'Epilético'], alertaObs: 'alérgico a shampoo X',
    }));
  });

  it('ficha encontrada na busca: os alertas salvos já aparecem marcados e podem ser alterados', async () => {
    st.fichas = [{ petNumber: 'PET-000005', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234', especie: 'cao', raca: 'Beagle', porte: 'medio',
      consentimentoEm: '2026-10-01T12:00:00Z', alertas: ['Idoso', 'Cardíaco'], alertaObs: 'cansa fácil' }];
    const onSubmit = vi.fn();
    render(<PetRegistration onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Nº, nome ou telefone...'), { target: { value: 'Rex' } });
    const achado = await screen.findByText('PET-000005', {}, { timeout: 2000 });
    await act(async () => { fireEvent.click(achado); });

    expect(screen.getByRole('button', { name: /Idoso/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Cardíaco/ }).getAttribute('aria-pressed')).toBe('true');
    expect((document.getElementById('alertaObs') as HTMLInputElement).value).toBe('cansa fácil');

    fireEvent.click(screen.getByRole('button', { name: /Cardíaco/ })); // desmarca
    fireEvent.change(selects()[3], { target: { value: 'banho' } });
    await finalizar();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ petNumber: 'PET-000005', alertas: ['Idoso'], alertaObs: 'cansa fácil' }));
  });

  it('editando o pet da fila: mostra os alertas da cópia', () => {
    render(<PetRegistration isEditing onSubmit={vi.fn()} initialData={{
      id: 'p1', slotNumber: 1, nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho', status: 'espera', checkInTime: '',
      alertas: ['Bravo', 'Usa colete'], alertaObs: 'morde orelha',
    } as any} />);
    expect(screen.getByRole('button', { name: /Bravo/ }).getAttribute('aria-pressed')).toBe('true');
    expect((document.getElementById('alertaOutro') as HTMLInputElement).value).toBe('Usa colete');
  });

  it('campo antigo "Observações" saiu da tela; o texto antigo vira o detalhe do alerta', async () => {
    const onSubmit = vi.fn();
    render(<PetRegistration isEditing onSubmit={onSubmit} initialData={{
      id: 'p1', slotNumber: 1, nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho', status: 'espera', checkInTime: '',
      especie: 'cao', porte: 'medio', raca: 'Beagle', observacoes: 'não gosta de secador',
    } as any} />);
    expect(screen.queryByText('Observações')).toBeNull();
    expect(screen.queryByPlaceholderText('Alergias, comportamento, etc...')).toBeNull();
    expect((document.getElementById('alertaObs') as HTMLInputElement).value).toBe('não gosta de secador');
    await act(async () => { fireEvent.click(screen.getByText('Atualizar Registro')); });
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ alertaObs: 'não gosta de secador', observacoes: 'não gosta de secador' }));
  });
});
