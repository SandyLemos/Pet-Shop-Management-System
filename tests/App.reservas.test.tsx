// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

const st = vi.hoisted(() => ({
  subs: [] as { onData: (p: any[]) => void; ativo: boolean }[],
  garantir: null as any,
}));

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'func1', email: 'f@x.com' }, loading: false, error: null,
    isAuthenticated: true, isAdmin: false, login: vi.fn(), logout: vi.fn(),
  }),
}));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ marcarUsado: vi.fn(), usados: new Set() }) }));
vi.mock('../src/hooks/useDiaAtual', () => ({ useDiaAtual: () => '2026-10-02' }));
vi.mock('../src/services/petService', () => ({
  SLOT_OCUPADO: 'SLOT_OCUPADO', SLOT_USADO: 'SLOT_USADO', JA_ENCERRADO: 'JA_ENCERRADO', CAMPOS_OBRIGATORIOS: 'CAMPOS_OBRIGATORIOS',
  addPet: vi.fn(), encerrarPet: vi.fn(), updatePet: vi.fn(), marcarComoAvisado: vi.fn(),
  getPetsPendentes: async () => [],
  garantirReservasDeVaga: (...a: any[]) => st.garantir(...a),
  subscribeToPets: (onData: any) => {
    const s = { onData, ativo: true };
    st.subs.push(s);
    return () => { s.ativo = false; };
  },
}));
vi.mock('../src/app/components/SlotGrid', () => ({ SlotGrid: () => null }));
vi.mock('../src/app/components/KanbanBoard', () => ({ KanbanBoard: () => null }));
vi.mock('../src/app/components/AdminSidebar', () => ({ default: () => null }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => null }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/app/components/PetCodeModal', () => ({ PetCodeModal: () => null }));

import App from '../src/app/App';
afterEach(cleanup);

const pet = (id: string, slot: number) => ({ id, dia: '2026-10-02', nomePet: id, slotNumber: slot, status: 'espera', servico: 'banho' });
const enviar = async (lista: any[]) => { await act(async () => { st.subs.at(-1)!.onData(lista); }); };

beforeEach(() => { st.subs = []; st.garantir = vi.fn(async () => 0); });

describe('App: reserva automática das vagas dos pets já na fila', () => {
  it('confere os pets da fila uma única vez e depois só os novos', async () => {
    render(<App />);
    await enviar([pet('a', 1), pet('b', 2)]);
    expect(st.garantir).toHaveBeenCalledTimes(1);
    expect(st.garantir.mock.calls[0][0]).toBe('2026-10-02');
    expect(st.garantir.mock.calls[0][1].map((p: any) => p.id)).toEqual(['a', 'b']);

    await enviar([pet('a', 1), pet('b', 2)]);               // mesma lista: nada novo
    expect(st.garantir).toHaveBeenCalledTimes(1);

    await enviar([pet('a', 1), pet('b', 2), pet('c', 3)]);  // chegou um pet novo
    expect(st.garantir).toHaveBeenCalledTimes(2);
    expect(st.garantir.mock.calls[1][1].map((p: any) => p.id)).toEqual(['c']);
  });

  it('se a conferência falhar (sem internet), tenta de novo na próxima atualização', async () => {
    st.garantir = vi.fn(async () => { throw new Error('offline'); });
    render(<App />);
    await enviar([pet('a', 1)]);
    await act(async () => { await Promise.resolve(); });
    await enviar([pet('a', 1)]);
    expect(st.garantir).toHaveBeenCalledTimes(2);
  });

  it('fila vazia: não faz nada', async () => {
    render(<App />);
    await enviar([]);
    expect(st.garantir).not.toHaveBeenCalled();
  });
});
