import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar();
  return ff.ref.mod;
});

import {
  updatePet, encerrarPet, marcarComoAvisado, getPetsPendentes, diasAnteriores,
} from '../src/services/petService';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;

const petDeOntem: any = {
  id: 'p9', dia: '2026-10-01', slotNumber: 7, nomePet: 'Bidu', nomeTutor: 'Ana',
  servico: 'banho', status: 'finalizado', checkInTime: '2026-10-01T13:00:00.000Z',
};

beforeEach(() => {
  fs().limpar();
  fs().set('dias/2026-10-01/pets/p9', { nomePet: 'Bidu', slotNumber: 7 });
  fs().set('dias/2026-10-01', { slotsOcupados: [7, 3] });
});

describe('petService: cada pet é tratado na fila do SEU dia', () => {
  it('updatePet grava na fila do dia informado e não salva os campos "dia"/"id"', async () => {
    await updatePet('p9', { observacoes: 'oi', dia: '2026-10-01', id: 'p9' } as any, '2026-10-01');
    expect(fs().get('dias/2026-10-01/pets/p9')).toEqual({ nomePet: 'Bidu', slotNumber: 7, observacoes: 'oi' });
  });

  it('encerrarPet de pet de ontem: log, exclusão e vaga liberada no dia DELE', async () => {
    await encerrarPet(petDeOntem, 'entregue');
    const logs = fs().lista('dias/2026-10-01/logs');
    expect(logs).toHaveLength(1);
    expect(fs().get(logs[0])).toMatchObject({ tipo: 'entregue', diaLocal: '2026-10-01', slotNumber: 7 });
    expect(fs().get('dias/2026-10-01/pets/p9')).toBeUndefined();
    expect(fs().get('dias/2026-10-01').slotsOcupados).toEqual([3]);
    expect(fs().lista('dias/2026-10-02/logs')).toHaveLength(0);
  });

  it('marcarComoAvisado também usa o dia do pet', async () => {
    await marcarComoAvisado(petDeOntem);
    expect(fs().lista('dias/2026-10-01/logs')).toHaveLength(1);
    expect(fs().get('dias/2026-10-01/pets/p9').avisado).toBe(true);
  });

  it('diasAnteriores atravessa a virada do mês e do ano corretamente', () => {
    expect(diasAnteriores('2026-10-02', 3)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
    expect(diasAnteriores('2026-01-01', 1)).toEqual(['2025-12-31']);
  });

  it('getPetsPendentes olha os 7 dias anteriores (não hoje) e marca o dia de cada pet', async () => {
    fs().set('dias/2026-09-28/pets/p1', { nomePet: 'Rex', slotNumber: 2 });
    fs().set('dias/2026-10-02/pets/hoje', { nomePet: 'DeHoje', slotNumber: 1 });
    fs().set('dias/2026-09-24/pets/velho', { nomePet: 'MuitoVelho', slotNumber: 1 }); // 8 dias atrás
    const pend = await getPetsPendentes('2026-10-02');
    expect(pend.map((p) => [p.nomePet, p.dia])).toEqual([['Rex', '2026-09-28'], ['Bidu', '2026-10-01']]);
  });
});
