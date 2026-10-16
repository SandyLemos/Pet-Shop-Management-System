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

import { addPet } from '../src/services/petService';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
definirLoja({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' });
const DIA = '2026-10-14';
const novoPet = (slot: number, extra: any = {}): any => ({
  slotNumber: slot, status: 'espera', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '(24) 99999-1234',
  especie: 'cao', raca: 'SRD', porte: 'medio', foto: '', servico: 'banho', observacoes: '', ...extra,
});
const petsDaFila = () => fs().lista(`dias/${DIA}/pets`).map((k) => fs().get(k));

beforeEach(() => { fs().limpar(); });

describe('LGPD: autorização gravada na ficha', () => {
  it('1ª visita com autorização: grava a data na ficha e não leva o campo para a fila', async () => {
    await addPet(novoPet(1, { consentimentoLgpd: true }), DIA);
    expect(fs().get('petsCadastro/PET-000001')).toMatchObject({ consentimentoEm: 'TS' });
    expect(petsDaFila()[0].consentimentoLgpd).toBeUndefined();
  });

  it('ficha antiga confirmada na visita: passa a ter a autorização', async () => {
    fs().set('petsCadastro/PET-000007', { petNumber: 'PET-000007', nomePet: 'Rex', criadoEm: 'antigo' });
    await addPet(novoPet(2, { petNumber: 'PET-000007', consentimentoLgpd: true }), DIA);
    expect(fs().get('petsCadastro/PET-000007')).toMatchObject({ consentimentoEm: 'TS', criadoEm: 'antigo' });
  });

  it('ficha que já tinha autorização: a data original não é trocada', async () => {
    fs().set('petsCadastro/PET-000008', { petNumber: 'PET-000008', nomePet: 'Rex', consentimentoEm: 'original' });
    await addPet(novoPet(3, { petNumber: 'PET-000008', consentimentoLgpd: true }), DIA);
    expect(fs().get('petsCadastro/PET-000008').consentimentoEm).toBe('original');
  });
});
