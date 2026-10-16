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

import { apagarDadosTutor, PET_NA_FILA, TUTOR_REMOVIDO } from '../src/services/petService';
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
