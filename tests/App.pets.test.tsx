// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

const st = vi.hoisted(() => ({
  auth: { user: null as any, loading: false, error: null as any, isAuthenticated: false, isAdmin: false },
  subs: [] as { onData: (p: any[]) => void; onErr: () => void; ativo: boolean; dia?: string }[],
}));

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ ...st.auth, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ marcarUsado: vi.fn(), usados: new Set() }) }));
vi.mock('../src/services/petService', () => ({
  SLOT_OCUPADO: 'SLOT_OCUPADO', SLOT_USADO: 'SLOT_USADO', JA_ENCERRADO: 'JA_ENCERRADO', CAMPOS_OBRIGATORIOS: 'CAMPOS_OBRIGATORIOS',
  garantirReservasDeVaga: async () => 0,
  addPet: vi.fn(), encerrarPet: vi.fn(), updatePet: vi.fn(), marcarComoAvisado: vi.fn(),
  getPetsPendentes: async () => [],
  subscribeToPets: (onData: any, onErr: any, dia?: string) => {
    const s = { onData, onErr, ativo: true, dia };
    st.subs.push(s);
    return () => { s.ativo = false; };
  },
}));
// componentes pesados viram stubs: só interessa a lista de pets que o App repassa
vi.mock('../src/app/components/SlotGrid', () => ({
  SlotGrid: ({ pets }: any) => <ul>{pets.map((p: any) => <li key={p.id}>{p.nomePet}</li>)}</ul>,
}));
vi.mock('../src/app/components/KanbanBoard', () => ({ KanbanBoard: () => null }));
vi.mock('../src/app/components/AdminSidebar', () => ({ default: () => null }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => null }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/app/components/PetCodeModal', () => ({ PetCodeModal: () => null }));

import App from '../src/app/App';
afterEach(cleanup);

const logado = (uid: string) => {
  st.auth = { user: { uid, email: uid + '@x.com' }, loading: false, error: null, isAuthenticated: true, isAdmin: false };
};
const ativo = () => st.subs.filter(s => s.ativo).at(-1)!;

beforeEach(() => { st.subs = []; });

describe('App: lista de pets nunca vaza entre contas', () => {
  it('troca de conta sem recarregar: zera a lista e assina de novo', async () => {
    logado('func1');
    const { rerender } = render(<App />);
    await act(async () => { ativo().onData([{ id: 'p1', nomePet: 'Rex', slotNumber: 1, status: 'espera', servico: 'banho' }]); });
    expect(screen.getByText('Rex')).toBeTruthy();

    logado('outraConta');
    await act(async () => { rerender(<App />); });
    expect(screen.queryByText('Rex')).toBeNull();          // lista antiga sumiu
    expect(st.subs.filter(s => s.ativo).length).toBe(1);   // só 1 escuta ativa (a nova)
  });

  it('acesso negado pelo servidor: limpa a lista que estava na tela', async () => {
    logado('func1');
    render(<App />);
    await act(async () => { ativo().onData([{ id: 'p1', nomePet: 'Rex', slotNumber: 1, status: 'espera', servico: 'banho' }]); });
    expect(screen.getByText('Rex')).toBeTruthy();
    await act(async () => { ativo().onErr(); });
    expect(screen.queryByText('Rex')).toBeNull();
  });

  it('mesma conta: a escuta não é refeita à toa', async () => {
    logado('func1');
    const { rerender } = render(<App />);
    await act(async () => { rerender(<App />); });
    expect(st.subs.length).toBe(1);
  });
});
