// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';

const st = vi.hoisted(() => ({
  subs: [] as { onData: (p: any[]) => void; ativo: boolean }[],
  addPet: null as any, encerrarPet: null as any, marcarUsado: null as any,
  resultadoAdd: [] as any[],
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: st.toast, Toaster: () => null }));
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
  marcarComoAvisado: vi.fn(), updatePet: vi.fn(),
  addPet: (...a: any[]) => st.addPet(...a),
  encerrarPet: (...a: any[]) => st.encerrarPet(...a),
  getPetsPendentes: async () => [],
  subscribeToPets: (onData: any) => {
    const s = { onData, ativo: true };
    st.subs.push(s);
    return () => { s.ativo = false; };
  },
}));
// SlotGrid falso: mostra o retorno de onAddPet para conferirmos
vi.mock('../src/app/components/SlotGrid', () => ({
  SlotGrid: ({ pets, onAddPet, onCheckout }: any) => (
    <div>
      <button onClick={async () => st.resultadoAdd.push(await onAddPet({ slotNumber: 5, nomePet: 'Rex', status: 'espera' }))}>cadastrar</button>
      {pets.map((p: any) => <button key={p.id} onClick={() => onCheckout(p.id, 'entregue')}>entregar-{p.id}</button>)}
    </div>
  ),
}));
vi.mock('../src/app/components/KanbanBoard', () => ({ KanbanBoard: () => null }));
vi.mock('../src/app/components/AdminSidebar', () => ({ default: () => null }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => null }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/app/components/PetCodeModal', () => ({ PetCodeModal: () => null }));

import App from '../src/app/App';
afterEach(cleanup);

beforeEach(() => {
  st.subs = []; st.resultadoAdd = [];
  st.marcarUsado = vi.fn(async () => {});
  st.encerrarPet = vi.fn(async () => {});
  st.addPet = vi.fn(async () => ({ id: 'n', petNumber: 'PET-000001', isNovo: false }));
  Object.values(st.toast).forEach((f) => f.mockClear());
});

describe('App: mensagens de vaga e de toque duplo', () => {
  it('cadastro ok devolve true e usa o dia atual', async () => {
    render(<App />);
    await act(async () => { fireEvent.click(screen.getByText('cadastrar')); });
    expect(st.resultadoAdd).toEqual([true]);
    expect(st.addPet.mock.calls[0][1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('vaga tomada por outro aparelho: devolve false (formulário fica aberto) e explica', async () => {
    st.addPet = vi.fn(async () => { throw new Error('SLOT_OCUPADO'); });
    render(<App />);
    await act(async () => { fireEvent.click(screen.getByText('cadastrar')); });
    expect(st.resultadoAdd).toEqual([false]);
    expect(st.toast.error).toHaveBeenCalledWith('O slot 5 acabou de ser ocupado em outro aparelho. Escolha outro slot.');
  });

  it('vaga já usada hoje: mensagem própria', async () => {
    st.addPet = vi.fn(async () => { throw new Error('SLOT_USADO'); });
    render(<App />);
    await act(async () => { fireEvent.click(screen.getByText('cadastrar')); });
    expect(st.toast.error).toHaveBeenCalledWith('O slot 5 já foi usado hoje. Escolha outro slot.');
  });

  it('erro de rede no cadastro: mensagem genérica e formulário aberto', async () => {
    st.addPet = vi.fn(async () => { throw new Error('unavailable'); });
    render(<App />);
    await act(async () => { fireEvent.click(screen.getByText('cadastrar')); });
    expect(st.resultadoAdd).toEqual([false]);
    expect(st.toast.error).toHaveBeenCalledWith('Erro ao cadastrar pet. Tente novamente.');
  });

  it('pet já entregue em outro aparelho: aviso amigável e NÃO queima a vaga de novo', async () => {
    st.encerrarPet = vi.fn(async () => { throw new Error('JA_ENCERRADO'); });
    render(<App />);
    await act(async () => { st.subs.at(-1)!.onData([{ id: 'a', nomePet: 'Rex', slotNumber: 5, status: 'finalizado', servico: 'banho' }]); });
    await act(async () => { fireEvent.click(screen.getByText('entregar-a')); });
    expect(st.marcarUsado).not.toHaveBeenCalled();
    expect(st.toast.info).toHaveBeenCalledWith('Rex já tinha sido encerrado.');
    expect(st.toast.error).not.toHaveBeenCalled();
  });
});
