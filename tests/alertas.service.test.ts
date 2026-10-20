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

import {
  addPet, encerrarPet, updatePetCadastro, atualizarFichaComEdicao, atualizarAlertasNaFila, getLogsByDate, getTodayKey,
} from '../src/services/petService';
import {
  normalizarAlertas, normalizarAlertaObs, resumirAlertas, separarAlertas, juntarAlertas, mesmosAlertas,
  MAX_ALERTAS, MAX_ALERTA_OUTRO, MAX_ALERTA_OBS,
} from '../src/utils/alertas';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
definirLoja({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' });
const DIA = getTodayKey();

const novoPet = (slot: number, extra: any = {}): any => ({
  slotNumber: slot, status: 'espera', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234',
  especie: 'cao', raca: 'SRD', porte: 'medio', foto: '', servico: 'banho', observacoes: '', ...extra,
});
const petsDaFila = () => fs().lista(`dias/${DIA}/pets`).map((k) => ({ id: k.split('/').at(-1)!, ...fs().get(k) }));

beforeEach(() => { fs().limpar(); });

describe('Alertas: regras de limpeza', () => {
  it('tira espaços, vazios e repetidos e respeita os limites', () => {
    expect(normalizarAlertas([' Morde ', 'morde', '', null, 'Alérgico'])).toEqual(['Morde', 'Alérgico']);
    const muitos = Array.from({ length: 20 }, (_, i) => `A${i}`);
    expect(normalizarAlertas(muitos)).toHaveLength(MAX_ALERTAS);
    expect(normalizarAlertas(['x'.repeat(60)])[0]).toHaveLength(MAX_ALERTA_OUTRO);
    expect(normalizarAlertaObs('y'.repeat(400))).toHaveLength(MAX_ALERTA_OBS);
  });

  it('"+N": mostra 2 e conta o resto', () => {
    expect(resumirAlertas(['Morde', 'Idoso', 'Cardíaco', 'Bravo'])).toEqual({ visiveis: ['Morde', 'Idoso'], restantes: 2 });
    expect(resumirAlertas(['Morde'])).toEqual({ visiveis: ['Morde'], restantes: 0 });
    expect(resumirAlertas(undefined)).toEqual({ visiveis: [], restantes: 0 });
  });

  it('separa a lista pronta do "Outro" e junta de volta na ordem da lista', () => {
    expect(separarAlertas(['Epilético', 'Morde', 'Alérgico'])).toEqual({ prontos: ['Morde', 'Alérgico'], outro: 'Epilético' });
    expect(juntarAlertas(['Morde', 'Alérgico'], ' Epilético ')).toEqual(['Alérgico', 'Morde', 'Epilético']);
    expect(mesmosAlertas([], undefined)).toBe(true);
    expect(mesmosAlertas(['Morde'], ['Idoso'])).toBe(false);
  });
});

describe('Alertas: gravar e ler na ficha e na fila', () => {
  it('1ª visita: grava os alertas na ficha e a cópia no pet da fila', async () => {
    const r = await addPet(novoPet(3, { alertas: ['Morde', ' morde ', 'Idoso'], alertaObs: ' alérgico a shampoo X ' }), DIA);
    expect(fs().get(`petsCadastro/${r.petNumber}`)).toMatchObject({ alertas: ['Morde', 'Idoso'], alertaObs: 'alérgico a shampoo X' });
    expect(petsDaFila()[0]).toMatchObject({ alertas: ['Morde', 'Idoso'], alertaObs: 'alérgico a shampoo X' });
  });

  it('volta do pet sem mandar alertas: a fila copia o que já está na ficha (sem leitura extra)', async () => {
    fs().set('petsCadastro/PET-000007', { petNumber: 'PET-000007', nomePet: 'Rex', nomeTutor: 'Ana', alertas: ['Cardíaco'], alertaObs: 'cansa fácil' });
    await addPet(novoPet(4, { petNumber: 'PET-000007' }), DIA);
    expect(petsDaFila()[0]).toMatchObject({ alertas: ['Cardíaco'], alertaObs: 'cansa fácil' });
    expect(fs().get('petsCadastro/PET-000007')).toMatchObject({ alertas: ['Cardíaco'] });
  });

  it('volta do pet com alertas alterados no cadastro: ficha e fila ficam com a lista nova (vazia tira todos)', async () => {
    fs().set('petsCadastro/PET-000007', { petNumber: 'PET-000007', nomePet: 'Rex', nomeTutor: 'Ana', alertas: ['Cardíaco'], alertaObs: 'x' });
    await addPet(novoPet(4, { petNumber: 'PET-000007', alertas: [], alertaObs: '' }), DIA);
    expect(fs().get('petsCadastro/PET-000007')).toMatchObject({ alertas: [], alertaObs: '' });
    expect(petsDaFila()[0]).toMatchObject({ alertas: [], alertaObs: '' });
  });

  it('ficha editada no Painel Admin com o pet na fila: a cópia da fila de hoje também muda', async () => {
    const r = await addPet(novoPet(5, { alertas: ['Morde'] }), DIA);
    await addPet(novoPet(6, { nomePet: 'Thor', alertas: ['Idoso'] }), DIA);
    await updatePetCadastro(r.petNumber, {
      nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234', alertas: ['Morde', 'Bravo'], alertaObs: 'usar focinheira',
    }, DIA);
    expect(fs().get(`petsCadastro/${r.petNumber}`)).toMatchObject({ alertas: ['Morde', 'Bravo'], alertaObs: 'usar focinheira' });
    const rex = petsDaFila().find((p: any) => p.nomePet === 'Rex')!;
    const thor = petsDaFila().find((p: any) => p.nomePet === 'Thor')!;
    expect(rex).toMatchObject({ alertas: ['Morde', 'Bravo'], alertaObs: 'usar focinheira', status: 'espera', slotNumber: 5 });
    expect(thor.alertas).toEqual(['Idoso']); // outro pet não é tocado
  });

  it('pet fora da fila: só a ficha muda', async () => {
    fs().set('petsCadastro/PET-000009', { petNumber: 'PET-000009', nomePet: 'Bob', nomeTutor: 'Lu' });
    expect(await atualizarAlertasNaFila('PET-000009', ['Morde'], '', DIA)).toBe(0);
  });

  it('edição pelo card (fila → ficha) leva os alertas limpos para a ficha', async () => {
    fs().set('petsCadastro/PET-000001', { petNumber: 'PET-000001', nomePet: 'Rex', nomeTutor: 'Ana' });
    await atualizarFichaComEdicao('PET-000001', { alertas: ['Medroso', 'medroso'], alertaObs: ' treme ' });
    expect(fs().get('petsCadastro/PET-000001')).toMatchObject({ alertas: ['Medroso'], alertaObs: 'treme', nomePet: 'Rex' });
  });

  it('entrega: o registro do dia guarda os alertas (aparecem em Entregues)', async () => {
    await addPet(novoPet(8, { alertas: ['Alérgico'] }), DIA);
    const p = petsDaFila()[0];
    await encerrarPet({ ...p, dia: DIA, checkInTime: new Date().toISOString() } as any, 'entregue');
    const logs = await getLogsByDate(DIA);
    expect(logs[0]).toMatchObject({ tipo: 'entregue', alertas: ['Alérgico'] });
  });
});
