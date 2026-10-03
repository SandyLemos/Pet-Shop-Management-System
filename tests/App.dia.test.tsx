// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';

const st = vi.hoisted(() => ({
  subs: [] as { onData: (p: any[]) => void; ativo: boolean; dia?: string }[],
  pendentes: [] as any[],
  updatePet: null as any, encerrarPet: null as any, marcarUsado: null as any,
}));

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'func1', email: 'f@x.com' }, loading: false, error: null,
    isAuthenticated: true, isAdmin: false, login: vi.fn(), logout: vi.fn(),
  }),
}));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({
  useSlotsUsadosHoje: () => ({ marcarUsado: (...a: any[]) => st.marcarUsado(...a), usados: new Set() }),
}));
vi.mock('../src/services/petService', () => ({
  SLOT_OCUPADO: 'SLOT_OCUPADO', SLOT_USADO: 'SLOT_USADO', JA_ENCERRADO: 'JA_ENCERRADO', CAMPOS_OBRIGATORIOS: 'CAMPOS_OBRIGATORIOS',
  garantirReservasDeVaga: async () => 0,
  addPet: vi.fn(), marcarComoAvisado: vi.fn(),
  updatePet: (...a: any[]) => st.updatePet(...a),
  encerrarPet: (...a: any[]) => st.encerrarPet(...a),
  getPetsPendentes: async () => st.pendentes,
  subscribeToPets: (onData: any, _e: any, dia?: string) => {
    const s = { onData, ativo: true, dia };
    st.subs.push(s);
    return () => { s.ativo = false; };
  },
}));
// SlotGrid falso com botões para disparar os handlers do App
vi.mock('../src/app/components/SlotGrid', () => ({
  SlotGrid: ({ pets, onEditPet, onCheckout }: any) => (
    <ul>{pets.map((p: any) => (
      <li key={p.id}>
        {p.nomePet}
        <button onClick={() => onEditPet(p.id, { observacoes: 'nova' })}>editar-{p.id}</button>
        <button onClick={() => onCheckout(p.id, 'entregue')}>entregar-{p.id}</button>
      </li>
    ))}</ul>
  ),
}));
vi.mock('../src/app/components/KanbanBoard', () => ({ KanbanBoard: () => null }));
vi.mock('../src/app/components/AdminSidebar', () => ({ default: () => null }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => null }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/app/components/PetCodeModal', () => ({ PetCodeModal: () => null }));

import App from '../src/app/App';
afterEach(cleanup);

const ativo = () => st.subs.filter((s) => s.ativo).at(-1)!;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

beforeEach(() => {
  st.subs = []; st.pendentes = [];
  st.updatePet = vi.fn(async () => {}); st.encerrarPet = vi.fn(async () => {}); st.marcarUsado = vi.fn(async () => {});
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date('2026-10-03T02:59:00Z')); // 02/10 às 23:59 em São Paulo
});
afterEach(() => { vi.useRealTimers(); });

describe('App: virada do dia com o tablet ligado', () => {
  it('à meia-noite troca sozinho para a fila do novo dia e limpa a lista antiga', async () => {
    render(<App />);
    expect(ativo().dia).toBe('2026-10-02');
    await act(async () => { ativo().onData([{ id: 'a', nomePet: 'Rex', dia: '2026-10-02', slotNumber: 1, status: 'espera', servico: 'banho' }]); });
    expect(screen.getByText('Rex')).toBeTruthy();

    await act(async () => { vi.advanceTimersByTime(61_000); }); // passa da meia-noite
    expect(ativo().dia).toBe('2026-10-03');
    expect(st.subs.filter((s) => s.ativo)).toHaveLength(1);
    expect(screen.queryByText('Rex')).toBeNull();
  });

  it('editar um pet usa o dia da fila dele', async () => {
    render(<App />);
    await act(async () => { ativo().onData([{ id: 'a', nomePet: 'Rex', dia: '2026-10-02', slotNumber: 1, status: 'espera', servico: 'banho' }]); });
    await act(async () => { fireEvent.click(screen.getByText('editar-a')); });
    expect(st.updatePet).toHaveBeenCalledWith('a', { observacoes: 'nova' }, '2026-10-02');
  });

  it('entregar pet de hoje queima o slot normalmente', async () => {
    render(<App />);
    await act(async () => { ativo().onData([{ id: 'a', nomePet: 'Rex', dia: '2026-10-02', slotNumber: 4, status: 'finalizado', servico: 'banho' }]); });
    await act(async () => { fireEvent.click(screen.getByText('entregar-a')); });
    expect(st.encerrarPet).toHaveBeenCalled();
    expect(st.marcarUsado).toHaveBeenCalledWith(4);
  });

  it('mostra o aviso de pendentes e encerra no dia do pet, sem queimar slot de hoje', async () => {
    st.pendentes = [{ id: 'p9', nomePet: 'Bidu', nomeTutor: 'Ana', dia: '2026-10-01', slotNumber: 7, status: 'finalizado', servico: 'banho' }];
    render(<App />);
    await flush();
    expect(screen.getByText(/1 pet de dias anteriores não foi encerrado/)).toBeTruthy();
    expect(screen.getByText(/Dia 01\/10\/2026/)).toBeTruthy();

    st.pendentes = []; // depois de encerrar, a busca volta vazia
    fireEvent.click(screen.getByText('Entregue'));
    expect(screen.getByText('Confirmar entrega?')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText('Sim')); });
    await flush();
    expect(st.encerrarPet).toHaveBeenCalledWith(expect.objectContaining({ id: 'p9', dia: '2026-10-01' }), 'entregue');
    expect(st.marcarUsado).not.toHaveBeenCalled();
    expect(screen.queryByText(/dias anteriores/)).toBeNull();
  });

  it('Remover também pede confirmação e pode ser cancelado', async () => {
    st.pendentes = [{ id: 'p9', nomePet: 'Bidu', nomeTutor: 'Ana', dia: '2026-10-01', slotNumber: 7, status: 'espera', servico: 'banho' }];
    render(<App />);
    await flush();
    fireEvent.click(screen.getByText('Remover'));
    expect(screen.getByText('Confirmar remoção?')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(st.encerrarPet).not.toHaveBeenCalled();
    expect(screen.getByText('Remover')).toBeTruthy();
  });

  it('sem pendentes: nenhum aviso aparece', async () => {
    render(<App />);
    await flush();
    expect(screen.queryByText(/dias anteriores/)).toBeNull();
  });
});
