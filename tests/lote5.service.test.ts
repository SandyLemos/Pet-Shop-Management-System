import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar();
  return ff.ref.mod;
});

import { marcarSlotUsado } from '../src/services/slotUsageService';
import { atualizarFichaComEdicao } from '../src/services/petService';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
beforeEach(() => { fs().limpar(); });

describe('Bug 5: slots usados nunca são apagados', () => {
  it('cria o dia e depois só acrescenta', async () => {
    await marcarSlotUsado('2026-10-02', 3);
    await marcarSlotUsado('2026-10-02', 7);
    await marcarSlotUsado('2026-10-02', 3);
    expect(fs().get('slotsUsados/2026-10-02').slots.sort()).toEqual([3, 7]);
  });
});

describe('Bug 11: edição atualiza a ficha permanente', () => {
  it('atualiza só os campos informados, com busca por nome/telefone', async () => {
    await fs().mod.setDoc({ path: 'petsCadastro/PET-000001' }, {
      petNumber: 'PET-000001', nomePet: 'Rex', nomePetLower: 'rex', nomeTutor: 'Ana',
      telefone: '24999991234', telefoneReverso: '43219999942', raca: 'SRD', observacoes: 'manter',
    });
    const ok = await atualizarFichaComEdicao('PET-000001', { nomePet: 'Thor', telefone: '(24) 98888-0000', raca: 'Beagle' });
    expect(ok).toBe(true);
    const f = fs().get('petsCadastro/PET-000001');
    expect(f).toMatchObject({
      nomePet: 'Thor', nomePetLower: 'thor', telefone: '24988880000', telefoneReverso: '00008888942',
      raca: 'Beagle', nomeTutor: 'Ana', observacoes: 'manter', petNumber: 'PET-000001',
    });
  });
  it('ficha excluída: não recria', async () => {
    expect(await atualizarFichaComEdicao('PET-000009', { nomePet: 'X' })).toBe(false);
    expect(fs().get('petsCadastro/PET-000009')).toBeUndefined();
  });
});
