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

import {
  addPet, encerrarPet, garantirReservasDeVaga,
  SLOT_OCUPADO, SLOT_USADO, JA_ENCERRADO, CAMPOS_OBRIGATORIOS,
} from '../src/services/petService';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
const DIA = '2026-10-02';

const novoPet = (slot: number, nome = 'Rex', extra: any = {}): any => ({
  slotNumber: slot, status: 'espera', nomePet: nome, nomeTutor: 'Ana', telefone: '(24) 99999-1234',
  especie: 'cao', raca: 'SRD', porte: 'medio', foto: '', servico: 'banho', observacoes: '', ...extra,
});

const petsDaFila = () => fs().lista(`dias/${DIA}/pets`).map((k) => fs().get(k));

beforeEach(() => { fs().limpar(); });

describe('Vaga (slot) nunca é ocupada por dois pets', () => {
  it('cadastro normal: cria ficha, reserva a vaga e põe o pet na fila', async () => {
    const r = await addPet(novoPet(5), DIA);
    expect(r).toMatchObject({ petNumber: 'PET-000001', isNovo: true });
    expect(fs().get(`dias/${DIA}`).slotsOcupados).toEqual([5]);
    expect(petsDaFila()).toHaveLength(1);
    expect(petsDaFila()[0]).toMatchObject({ slotNumber: 5, petNumber: 'PET-000001', nomePet: 'Rex' });
    expect(fs().get('petsCadastro/PET-000001')).toMatchObject({ nomePet: 'Rex', telefone: '24999991234', telefoneReverso: '43219999942' });
    expect(fs().get('contadores/petNumber')).toEqual({ valor: 1 });
  });

  it('DOIS APARELHOS AO MESMO TEMPO na mesma vaga: só um entra, o outro recebe SLOT_OCUPADO e nada sobra', async () => {
    const [a, b] = await Promise.allSettled([
      addPet(novoPet(5, 'Rex'), DIA),
      addPet(novoPet(5, 'Thor'), DIA),
    ]);
    const ok = [a, b].filter((x) => x.status === 'fulfilled');
    const falhou = [a, b].filter((x) => x.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(falhou).toHaveLength(1);
    expect(falhou[0].reason.message).toBe(SLOT_OCUPADO);
    expect(petsDaFila()).toHaveLength(1);                        // um só pet na vaga 5
    expect(fs().get('contadores/petNumber')).toEqual({ valor: 1 }); // nenhum código gasto à toa
    expect(fs().lista('petsCadastro')).toHaveLength(1);           // nenhuma ficha órfã
  });

  it('dois aparelhos ao mesmo tempo em vagas DIFERENTES: os dois entram com códigos diferentes', async () => {
    const [a, b] = await Promise.all([addPet(novoPet(5, 'Rex'), DIA), addPet(novoPet(6, 'Thor'), DIA)]);
    expect(new Set([a.petNumber, b.petNumber])).toEqual(new Set(['PET-000001', 'PET-000002']));
    expect(fs().get(`dias/${DIA}`).slotsOcupados.sort()).toEqual([5, 6]);
    expect(petsDaFila()).toHaveLength(2);
  });

  it('vaga já usada hoje (pet entregue): SLOT_USADO e nada é gravado', async () => {
    fs().set(`slotsUsados/${DIA}`, { slots: [5] });
    await expect(addPet(novoPet(5), DIA)).rejects.toThrow(SLOT_USADO);
    expect(petsDaFila()).toHaveLength(0);
    expect(fs().get('contadores/petNumber')).toBeUndefined();
  });

  it('pet que já tem ficha: não gasta código novo e atualiza a ficha', async () => {
    fs().set('contadores/petNumber', { valor: 40 });
    fs().set('petsCadastro/PET-000007', { petNumber: 'PET-000007', nomePet: 'Rex', criadoEm: 'antigo' });
    const r = await addPet(novoPet(3, 'Rex', { petNumber: 'PET-000007', telefone: '11 98888-7777' }), DIA);
    expect(r).toMatchObject({ petNumber: 'PET-000007', isNovo: false });
    expect(fs().get('contadores/petNumber')).toEqual({ valor: 40 });
    expect(fs().get('petsCadastro/PET-000007')).toMatchObject({ telefone: '11988887777', criadoEm: 'antigo' });
  });

  it('espécie, porte e raça são OBRIGATÓRIOS: sem eles, nada é gravado', async () => {
    for (const falta of [{ especie: undefined }, { porte: undefined }, { raca: undefined }, { raca: '' }]) {
      await expect(addPet(novoPet(2, 'Mimi', falta), DIA)).rejects.toThrow(CAMPOS_OBRIGATORIOS);
    }
    expect(petsDaFila()).toHaveLength(0);
    expect(fs().lista('petsCadastro')).toHaveLength(0);
    expect(fs().get('contadores/petNumber')).toBeUndefined();
    expect(fs().get(`dias/${DIA}`)).toBeUndefined();
  });

  it('remover o pet libera a vaga para outro cadastro', async () => {
    const r = await addPet(novoPet(5, 'Rex'), DIA);
    await encerrarPet({ ...novoPet(5, 'Rex'), id: r.id, dia: DIA, checkInTime: new Date().toISOString() }, 'removido');
    expect(fs().get(`dias/${DIA}`).slotsOcupados).toEqual([]);
    await addPet(novoPet(5, 'Thor'), DIA);
    expect(petsDaFila().map((p) => p.nomePet)).toEqual(['Thor']);
  });

  it('toque duplo em "Entregue": um único registro; o segundo recebe JA_ENCERRADO', async () => {
    const r = await addPet(novoPet(5), DIA);
    const pet = { ...novoPet(5), id: r.id, dia: DIA, checkInTime: new Date().toISOString() };
    const [a, b] = await Promise.allSettled([encerrarPet(pet, 'entregue'), encerrarPet(pet, 'entregue')]);
    expect([a.status, b.status].sort()).toEqual(['fulfilled', 'rejected']);
    const erro = [a, b].find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(erro.reason.message).toBe(JA_ENCERRADO);
    expect(fs().lista(`dias/${DIA}/logs`)).toHaveLength(1);
    expect(petsDaFila()).toHaveLength(0);
  });

  it('pet cadastrado ANTES desta versão (sem reserva) é encerrado normalmente', async () => {
    fs().set(`dias/${DIA}/pets/antigo`, { nomePet: 'Velho', slotNumber: 9 }); // sem slotsOcupados
    await encerrarPet({ ...novoPet(9, 'Velho'), id: 'antigo', dia: DIA, checkInTime: new Date().toISOString() }, 'entregue');
    expect(fs().lista(`dias/${DIA}/logs`)).toHaveLength(1);
    expect(fs().get(`dias/${DIA}`).slotsOcupados).toEqual([]);
  });

  describe('pets que já estavam na fila antes desta versão', () => {
    const antigo = (id: string, slot: number) => ({ ...novoPet(slot, 'Velho'), id, dia: DIA, checkInTime: new Date().toISOString() });

    it('a vaga deles é reservada automaticamente e passa a ser protegida', async () => {
      fs().set(`dias/${DIA}/pets/a1`, { nomePet: 'Velho', slotNumber: 9 });
      expect(await garantirReservasDeVaga(DIA, [antigo('a1', 9)])).toBe(1);
      expect(fs().get(`dias/${DIA}`).slotsOcupados).toEqual([9]);
      await expect(addPet(novoPet(9, 'Novo'), DIA)).rejects.toThrow(SLOT_OCUPADO);
    });

    it('pet que já saiu da fila não deixa vaga "presa"', async () => {
      // a tela ainda mostrava o pet, mas outro aparelho já o entregou
      expect(await garantirReservasDeVaga(DIA, [antigo('sumiu', 9)])).toBe(0);
      expect(fs().get(`dias/${DIA}`)).toBeUndefined();
    });

    it('reserva e entrega ao MESMO TEMPO: no fim a vaga nunca fica presa', async () => {
      fs().set(`dias/${DIA}/pets/a1`, { nomePet: 'Velho', slotNumber: 9 });
      await Promise.allSettled([
        garantirReservasDeVaga(DIA, [antigo('a1', 9)]),
        encerrarPet(antigo('a1', 9), 'entregue'),
      ]);
      expect(fs().get(`dias/${DIA}/pets/a1`)).toBeUndefined();
      expect(fs().get(`dias/${DIA}`).slotsOcupados ?? []).not.toContain(9);
    });

    it('pets já reservados não geram nova gravação', async () => {
      await addPet(novoPet(4, 'Rex'), DIA);
      const commitsAntes = fs().commits();
      const pet = { ...novoPet(4, 'Rex'), id: fs().lista(`dias/${DIA}/pets`)[0].split('/').at(-1), dia: DIA, checkInTime: '' };
      expect(await garantirReservasDeVaga(DIA, [pet])).toBe(0);
      expect(fs().commits()).toBe(commitsAntes);
    });
  });
});
