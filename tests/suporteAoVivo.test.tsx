// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup, renderHook } from '@testing-library/react';

vi.mock('../src/app/components/PetRegistration', () => ({ PetRegistration: () => <p>formulario-de-cadastro</p> }));
vi.mock('../src/app/components/PetDetailModal', () => ({
  PetDetailModal: ({ pet, open }: any) => (open && pet ? <p>detalhe-de-{pet.nomePet}</p> : null),
}));
vi.mock('../src/hooks/useSlotsUsadosHoje', () => ({ useSlotsUsadosHoje: () => ({ usados: new Set(), marcarUsado: vi.fn() }) }));
vi.mock('../src/app/components/EntreguesTab', () => ({ EntreguesTab: () => <p>lista-de-entregues</p> }));
vi.mock('../src/app/components/PawBackground', () => ({ default: () => null }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));

const sv = vi.hoisted(() => ({ ativoAte: 0, cb: null as null | ((n: number) => void), publicadas: [] as any[], apagadas: 0 }));
vi.mock('../src/services/suporteService', async (original) => ({
  ...(await original<typeof import('../src/services/suporteService')>()),
  ouvirSuporte: (cb: (n: number) => void) => { sv.cb = cb; cb(sv.ativoAte); return () => {}; },
  publicarTela: async (_id: string, nome: string, tela: any) => { sv.publicadas.push({ nome, ...tela }); },
  apagarTela: async () => { sv.apagadas++; },
  idDoAparelho: () => 'tablet-1',
}));

import { SlotGrid } from '../src/app/components/SlotGrid';
import { TelaDaLoja } from '../src/app/components/dono/LojaAoVivo';
import { telaAtual, informarAba } from '../src/lib/espelho';
import { useSuporteAcompanhando } from '../src/hooks/useSuporteAcompanhando';

afterEach(cleanup);
beforeEach(() => { sv.ativoAte = 0; sv.cb = null; sv.publicadas = []; sv.apagadas = 0; informarAba('grid'); });

const loja: any = { id: 'elite', nome: 'Elite Pet Shop', plano: 'basico', mensalidade: 0, vencimentoDia: 10, status: 'ativa' };
const rex: any = { id: 'p1', slotNumber: 2, nomePet: 'Rex', nomeTutor: 'Ana', servico: 'banho', status: 'espera', checkInTime: new Date().toISOString() };
const tela = (x: any) => ({ id: 'tablet-1', nome: 'recepcao', aba: 'grid', janela: null, atualizadoEm: Date.now(), ...x });

describe('Na loja: o aparelho conta o que está aberto', () => {
  it('abrir e fechar o cadastro de uma vaga muda a janela informada', async () => {
    render(<SlotGrid pets={[rex]} onAddPet={vi.fn()} onEditPet={vi.fn()} onDeletePet={vi.fn()} onCheckout={vi.fn()} filter="all" />);
    await act(async () => { fireEvent.click(screen.getByTitle('Slot 1 - Livre')); });
    expect(telaAtual().janela).toEqual({ tipo: 'cadastro', vaga: 1 });
    await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }); });
    expect(telaAtual().janela).toBeNull();
    await act(async () => { fireEvent.click(screen.getByTitle(/Rex - Ana/)); });
    expect(telaAtual().janela).toEqual({ tipo: 'detalhe', petId: 'p1', vaga: 2 });
  });

  it('só envia enquanto o suporte acompanha, e apaga ao parar', async () => {
    const { result } = renderHook(() => useSuporteAcompanhando(true, 'recepcao'));
    expect(result.current).toBe(false);
    expect(sv.publicadas).toEqual([]); // ninguém olhando: não grava nada

    await act(async () => { sv.cb!(Date.now() + 60_000); });
    expect(result.current).toBe(true);
    expect(sv.publicadas.at(-1)).toEqual({ nome: 'recepcao', aba: 'grid', janela: null });

    await act(async () => { sv.cb!(0); }); // proprietário fechou a tela ao vivo
    expect(result.current).toBe(false);
    expect(sv.apagadas).toBe(1);
  });
});

describe('No painel: a tela ao vivo segue o aparelho', () => {
  it('abre a mesma janela de cadastro que o tablet abriu', () => {
    render(<TelaDaLoja loja={loja} pets={[rex]} telas={[tela({ janela: { tipo: 'cadastro', vaga: 1 } })]} fechar={vi.fn()} />);
    expect(screen.getByText('Cadastrar Pet - Slot 1')).toBeTruthy();
    expect(screen.getAllByText(/Cadastrar pet · vaga 1/).length).toBeGreaterThan(0);
  });

  it('abre o detalhe do mesmo pet e segue a aba do tablet', () => {
    const { rerender } = render(<TelaDaLoja loja={loja} pets={[rex]} telas={[tela({ janela: { tipo: 'detalhe', petId: 'p1' } })]} fechar={vi.fn()} />);
    expect(screen.getByText('detalhe-de-Rex')).toBeTruthy();
    rerender(<TelaDaLoja loja={loja} pets={[rex]} telas={[tela({ aba: 'entregues' })]} fechar={vi.fn()} />);
    expect(screen.getByText('lista-de-entregues')).toBeTruthy();
    expect(screen.queryByText('detalhe-de-Rex')).toBeNull();
  });

  it('dá para parar de acompanhar e navegar sozinho', () => {
    render(<TelaDaLoja loja={loja} pets={[rex]} telas={[tela({ aba: 'entregues' })]} fechar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Aparelho acompanhado'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Fluxo/ }));
    expect(screen.getByText('Aguardando')).toBeTruthy();
  });
});
