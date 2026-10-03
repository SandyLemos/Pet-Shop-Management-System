// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';

const st = vi.hoisted(() => ({
  subs: [] as any[], props: null as any,
  updatePet: null as any, ficha: null as any,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: st.toast, Toaster: () => null }));
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'f', email: 'f@x' }, loading: false, error: null, isAuthenticated: true, isAdmin: false, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ marcarUsado: vi.fn(), usados: new Set() }) }));
vi.mock('../src/hooks/useDiaAtual', () => ({ useDiaAtual: () => '2026-10-02' }));
vi.mock('../src/services/petService', () => ({
  SLOT_OCUPADO: 'SLOT_OCUPADO', SLOT_USADO: 'SLOT_USADO', JA_ENCERRADO: 'JA_ENCERRADO', CAMPOS_OBRIGATORIOS: 'CAMPOS_OBRIGATORIOS',
  CAMPOS_FICHA: ['nomePet', 'nomeTutor', 'telefone', 'especie', 'raca', 'porte', 'foto'],
  addPet: vi.fn(), encerrarPet: vi.fn(), marcarComoAvisado: vi.fn(),
  updatePet: (...a: any[]) => st.updatePet(...a),
  atualizarFichaComEdicao: (...a: any[]) => st.ficha(...a),
  getPetsPendentes: async () => [], garantirReservasDeVaga: async () => 0,
  subscribeToPets: (onData: any) => { st.subs.push(onData); return () => {}; },
}));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('../src/hooks/useCloudinaryUpload', () => ({ useCloudinaryUpload: () => ({ uploadImage: vi.fn(), uploading: false, error: null }) }));
vi.mock('../src/hooks/useRacas', () => ({ useRacas: () => ({ nomesPorEspecie: () => [], criar: vi.fn() }) }));
vi.mock('../src/app/components/GerenciarRacas', () => ({ GerenciarRacas: () => null }));
vi.mock('../src/app/components/SlotGrid', () => ({ SlotGrid: (p: any) => { st.props = p; return null; } }));
vi.mock('../src/app/components/KanbanBoard', () => ({ KanbanBoard: () => null }));
vi.mock('../src/app/components/AdminSidebar', () => ({ default: () => null }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => null }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/app/components/PetCodeModal', () => ({ PetCodeModal: () => null }));

import App from '../src/app/App';
import { PetDetailModal } from '../src/app/components/PetDetailModal';
afterEach(cleanup);

const pet: any = { id: 'p1', dia: '2026-10-02', petNumber: 'PET-000001', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234',
  especie: 'cao', raca: 'SRD', porte: 'medio', foto: '', slotNumber: 1, status: 'espera', servico: 'banho', observacoes: '', checkInTime: new Date().toISOString() };

beforeEach(() => {
  st.subs = []; st.updatePet = vi.fn(async () => {}); st.ficha = vi.fn(async () => true);
  Object.values(st.toast).forEach((f) => f.mockClear());
});
const montar = async () => { render(<App />); await act(async () => { st.subs.at(-1)([pet]); }); };

describe('Bug 11: editar na fila', () => {
  it('leva para a ficha só o que mudou (nome/raça), não observação nem serviço', async () => {
    await montar();
    await act(async () => { await st.props.onEditPet('p1', { ...pet, nomePet: 'Thor', raca: 'Beagle', observacoes: 'novo', servico: 'tosa' }); });
    expect(st.updatePet).toHaveBeenCalledWith('p1', expect.anything(), '2026-10-02');
    expect(st.ficha).toHaveBeenCalledWith('PET-000001', { nomePet: 'Thor', raca: 'Beagle' });
  });
  it('mudou só a observação: ficha intocada', async () => {
    await montar();
    await act(async () => { await st.props.onEditPet('p1', { observacoes: 'só hoje' }); });
    expect(st.ficha).not.toHaveBeenCalled();
  });
  it('se salvar o atendimento falhar, não mexe na ficha', async () => {
    st.updatePet = vi.fn(async () => { throw new Error('x'); });
    await montar();
    await act(async () => { await st.props.onEditPet('p1', { nomePet: 'Thor' }); });
    expect(st.ficha).not.toHaveBeenCalled();
    expect(st.toast.error).toHaveBeenCalled();
  });
  it('falha só na ficha: avisa, atendimento já salvo', async () => {
    st.ficha = vi.fn(async () => { throw new Error('x'); });
    await montar();
    await act(async () => { await st.props.onEditPet('p1', { nomePet: 'Thor' }); });
    expect(st.toast.error).toHaveBeenCalledWith('O atendimento foi salvo, mas a ficha permanente não foi atualizada.');
  });
});

describe('Bug 9: excluir pede confirmação', () => {
  it('1º toque só pergunta; Cancelar volta; Sim exclui', () => {
    const onDelete = vi.fn(); const onClose = vi.fn();
    render(<PetDetailModal pet={pet} open onClose={onClose} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Excluir'));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar exclusão?')).toBeNull();
    fireEvent.click(screen.getByText('Excluir'));
    fireEvent.click(screen.getByText('Sim, excluir'));
    expect(onDelete).toHaveBeenCalledWith('p1');
    expect(onClose).toHaveBeenCalled();
  });
});
