import { definirLoja } from '../src/lib/lojaAtual';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar({ raiz: 'lojas/elite-pet-shop' });
  return ff.ref.mod;
});

import { apagarDadosTutor, PEDIDO_ABERTO, PET_NA_FILA, TUTOR_REMOVIDO } from '../src/services/petService';
import { clientes } from '../src/utils/analytics';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
definirLoja({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' });
const log = (petNumber: string, nomeTutor: string, extra: any = {}) => ({ tipo: 'entregue', petNumber, nomePet: 'Rex', nomeTutor, servico: 'banho', ...extra });

beforeEach(() => {
  fs().limpar();
  fs().set('petsCadastro/PET-000007', { petNumber: 'PET-000007', nomePet: 'Rex', nomeTutor: 'Ana Souza', telefone: '24999991234' });
  fs().set('dias/2026-10-01', { slotsOcupados: [] });
  fs().set('dias/2026-10-01/logs/a', log('PET-000007', 'Ana Souza'));
  fs().set('dias/2026-10-01/logs/b', log('PET-000009', 'Carlos Lima'));
  // dia antigo SEM o documento do dia, só com a subcoleção
  fs().set('dias/2026-05-03/logs/c', log('PET-000007', 'Ana Souza'));
});

describe('LGPD: apagar dados do tutor', () => {
  it('troca o nome do tutor em todo o histórico, não mexe nos outros e exclui a ficha', async () => {
    const n = await apagarDadosTutor('PET-000007');
    expect(n).toBe(2);
    expect(fs().get('dias/2026-10-01/logs/a')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, servico: 'banho' });
    expect(fs().get('dias/2026-05-03/logs/c').nomeTutor).toBe(TUTOR_REMOVIDO);
    expect(fs().get('dias/2026-10-01/logs/b').nomeTutor).toBe('Carlos Lima');
    expect(fs().get('petsCadastro/PET-000007')).toBeUndefined();
  });

  it('pet ainda na fila: não apaga nada e avisa', async () => {
    fs().set('dias/2026-10-01/pets/x', { petNumber: 'PET-000007', nomePet: 'Rex', nomeTutor: 'Ana Souza' });
    await expect(apagarDadosTutor('PET-000007')).rejects.toThrow(PET_NA_FILA);
    expect(fs().get('dias/2026-10-01/logs/a').nomeTutor).toBe('Ana Souza');
    expect(fs().get('petsCadastro/PET-000007')).toBeDefined();
  });

  it('apaga também o telefone dos registros antigos, inclusive dos que já tinham o nome removido', async () => {
    fs().set('dias/2026-10-01/logs/d', log('PET-000007', 'Ana Souza', { telefone: '24999991234' }));
    fs().set('dias/2026-10-01/logs/e', log('PET-000007', TUTOR_REMOVIDO, { telefone: '24999991234' }));
    fs().set('dias/2026-10-01/logs/f', log('PET-000009', 'Carlos Lima', { telefone: '24988887777' }));
    const n = await apagarDadosTutor('PET-000007');
    expect(n).toBe(4);
    expect(fs().get('dias/2026-10-01/logs/d')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, telefone: '' });
    expect(fs().get('dias/2026-10-01/logs/e')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, telefone: '' });
    // registro sem telefone não ganha o campo
    expect('telefone' in fs().get('dias/2026-10-01/logs/a')).toBe(false);
    expect(fs().get('dias/2026-10-01/logs/f')).toMatchObject({ nomeTutor: 'Carlos Lima', telefone: '24988887777' });
  });

  it('limpa os pedidos do agendamento online do tutor (nome, telefone, endereço) e só deles', async () => {
    const pedido = (extra: any) => ({
      lojaId: 'elite-pet-shop', nomeTutor: 'Ana Souza', telefone: '24999991234', nomePet: 'Rex', servico: 'banho',
      status: 'chegou', dia: '2026-10-01', vaga: 1, ...extra,
    });
    fs().set('dias/2026-10-01/logs/g', log('PET-000007', 'Ana Souza', { petId: 'fila-rex' }));
    fs().set('agendamentos/p1', pedido({ endereco: { rua: 'Rua A', numero: '10' }, localizacao: { lat: 1, lng: 2 } }));
    fs().set('agendamentos/p2', pedido({ status: 'recusado', nomePet: ' rex ' }));
    // chegou com outro telefone, mas virou atendimento deste pet
    fs().set('agendamentos/p3', pedido({ telefone: '24911112222', petId: 'fila-rex' }));
    // mesmo telefone, outro pet do mesmo tutor: não mexe
    fs().set('agendamentos/p4', pedido({ nomePet: 'Mel' }));
    // outra loja: não mexe
    fs().set('agendamentos/p5', pedido({ lojaId: 'outra-loja' }));

    const n = await apagarDadosTutor('PET-000007');
    expect(n).toBe(3 + 3); // logs a, c, g + pedidos p1, p2, p3
    expect(fs().get('agendamentos/p1')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, telefone: '', endereco: null, localizacao: null, status: 'chegou' });
    expect(fs().get('agendamentos/p2')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, telefone: '' });
    expect('endereco' in fs().get('agendamentos/p2')).toBe(false);
    expect(fs().get('agendamentos/p3')).toMatchObject({ nomeTutor: TUTOR_REMOVIDO, telefone: '' });
    expect(fs().get('agendamentos/p4')).toMatchObject({ nomeTutor: 'Ana Souza', telefone: '24999991234' });
    expect(fs().get('agendamentos/p5')).toMatchObject({ nomeTutor: 'Ana Souza', telefone: '24999991234' });
    // tudo gravado em lote (uma ida ao banco), não um documento por vez
    expect(fs().lotes()).toBe(1);
  });

  it('pedido online em andamento: não apaga nada e avisa', async () => {
    fs().set('agendamentos/p1', { lojaId: 'elite-pet-shop', nomeTutor: 'Ana Souza', telefone: '24999991234', nomePet: 'Rex', status: 'confirmado' });
    await expect(apagarDadosTutor('PET-000007')).rejects.toThrow(PEDIDO_ABERTO);
    expect(fs().get('agendamentos/p1').nomeTutor).toBe('Ana Souza');
    expect(fs().get('dias/2026-10-01/logs/a').nomeTutor).toBe('Ana Souza');
    expect(fs().get('petsCadastro/PET-000007')).toBeDefined();
  });

  it('tutor removido não aparece nas listas de clientes das Análises', () => {
    const logs: any[] = [
      { ...log('PET-000007', TUTOR_REMOVIDO), dia: '2026-08-01' },
      { ...log('PET-000007', TUTOR_REMOVIDO), dia: '2026-08-10' },
      { ...log('PET-000009', 'Carlos Lima'), dia: '2026-08-01' },
      { ...log('PET-000009', 'Carlos Lima'), dia: '2026-08-05' },
    ];
    const r = clientes(logs, [], '2026-10-15');
    expect(r.fieis.map((c) => c.nomeTutor)).toEqual(['Carlos Lima']);
    expect(r.sumidos.map((c) => c.nomeTutor)).toEqual(['Carlos Lima']);
  });
});
