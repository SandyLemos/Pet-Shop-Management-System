import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any, contas: [] as string[], resetEnviado: [] as string[] }));
vi.mock('../src/lib/firebase', () => ({ db: {}, firebaseConfig: {} }));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}), deleteApp: async () => {} }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  createUserWithEmailAndPassword: async (_a: any, email: string) => {
    if (ff.contas.includes(email)) throw Object.assign(new Error('x'), { code: 'auth/email-already-in-use' });
    ff.contas.push(email);
    return { user: { uid: `uid-${email}` } };
  },
  sendPasswordResetEmail: async (_a: any, email: string) => { ff.resetEnviado.push(email); },
}));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar();
  return ff.ref.mod;
});

import {
  linhasFinanceiro, situacaoDaLoja, alertasDoDono, resumoUso, idParaLoja, vencimentoNoMes,
  primeiroMesCobrado, comunicadoParaLoja, receitaPorMes, type Loja, type Cobranca, type DadosDono,
} from '../src/utils/dono';
import { carregarDadosDono, criarLoja, registrarPagamento, EMAIL_EM_USO } from '../src/services/donoService';
import { migrarDadosAntigos, JA_MIGRADO } from '../src/services/migracaoService';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
const HOJE = '2026-10-15';
const loja = (x: Partial<Loja> = {}): Loja => ({
  id: 'a', nome: 'Loja A', plano: 'basico', mensalidade: 89, vencimentoDia: 10, status: 'ativa', cobrarDesde: '2026-08', ...x,
});

beforeEach(() => { fs().limpar(); ff.contas = []; ff.resetEnviado = []; });

describe('Painel do Dono: contas', () => {
  it('vencimento no dia 31 vira o último dia de meses curtos', () => {
    expect(vencimentoNoMes({ vencimentoDia: 31 }, '2026-02')).toBe('2026-02-28');
    expect(vencimentoNoMes({ vencimentoDia: 10 }, '2026-10')).toBe('2026-10-10');
  });

  it('primeira mensalidade: no mês, se o vencimento ainda não passou; senão no mês seguinte', () => {
    expect(primeiroMesCobrado({ vencimentoDia: 20 }, '2026-10-15')).toBe('2026-10');
    expect(primeiroMesCobrado({ vencimentoDia: 10 }, '2026-10-15')).toBe('2026-11');
  });

  it('mensalidade: paga, a vencer e atrasada (com dias de atraso)', () => {
    const lojas = [loja({ id: 'p' }), loja({ id: 'v', vencimentoDia: 20 }), loja({ id: 'x', vencimentoDia: 1 })];
    const cob: Cobranca[] = [{ id: 'p_2026-10', lojaId: 'p', mes: '2026-10', valor: 89, pagaEm: '2026-10-09' }];
    const l = Object.fromEntries(linhasFinanceiro(lojas, cob, '2026-10', HOJE).map((r) => [r.loja.id, r]));
    expect(l.p.status).toBe('paga');
    expect(l.v.status).toBe('a_vencer');
    expect(l.x).toMatchObject({ status: 'atrasada', diasAtraso: 14 });
  });

  it('não cobra loja em teste, cortesia (R$ 0) nem meses antes de começar a pagar', () => {
    const lojas = [loja({ id: 't', status: 'teste' }), loja({ id: 'c', mensalidade: 0 }), loja({ id: 'n', cobrarDesde: '2026-11' })];
    expect(linhasFinanceiro(lojas, [], '2026-10', HOJE)).toHaveLength(0);
  });

  it('situação: atrasada pelo mês anterior também conta', () => {
    const l = loja({ vencimentoDia: 20 });
    const cob: Cobranca[] = []; // setembro não pago
    expect(situacaoDaLoja(l, cob, HOJE)).toEqual({ situacao: 'atrasada', diasAtraso: 25 });
    expect(situacaoDaLoja(loja({ status: 'bloqueada', vencimentoDia: 20 }), cob, HOJE).situacao).toBe('bloqueada');
  });

  it('financeiro: loja bloqueada não é cobrada, mas o que pagou continua aparecendo', () => {
    const b = loja({ id: 'b', status: 'bloqueada', vencimentoDia: 5 });
    expect(linhasFinanceiro([b], [], '2026-10', HOJE)).toHaveLength(0);
    const pago: Cobranca[] = [{ id: 'b_2026-10', lojaId: 'b', mes: '2026-10', valor: 89, pagaEm: '2026-10-04' }];
    expect(linhasFinanceiro([b], pago, '2026-10', HOJE)[0].status).toBe('paga');
  });

  it('uso: hoje, 30 dias e dias sem uso', () => {
    const r = resumoUso({ porDia: { '2026-10-15': 3, '2026-10-01': 5 }, usuarios: 2 }, HOJE);
    expect(r).toEqual({ hoje: 3, ultimos30: 8, diasSemUso: 0, usuarios: 2 });
    expect(resumoUso({ porDia: { '2026-10-06': 1 }, usuarios: 1 }, HOJE).diasSemUso).toBe(9);
    expect(resumoUso(undefined, HOJE).diasSemUso).toBeNull();
  });

  it('alertas: atraso (sugere bloquear com 15 dias), teste acabando e loja parada', () => {
    const d: DadosDono = {
      hoje: HOJE, cobrancas: [], comunicados: [], migracaoPendente: false,
      lojas: [
        loja({ id: 'atr', nome: 'Atrasada', vencimentoDia: 1, cobrarDesde: '2026-10' }),
        loja({ id: 'tst', nome: 'Teste', status: 'teste', fimTeste: '2026-10-20' }),
        loja({ id: 'par', nome: 'Parada', mensalidade: 0 }),
      ],
      atividade: { atr: { porDia: { [HOJE]: 1 }, usuarios: 1 }, tst: { porDia: { [HOJE]: 1 }, usuarios: 1 }, par: { porDia: { '2026-10-01': 4 }, usuarios: 1 } },
    };
    const a = alertasDoDono(d);
    expect(a.map((x) => [x.loja.id, x.tipo, x.acao])).toEqual([
      ['atr', 'atraso', 'Cobrar'], ['tst', 'teste', 'Falar com a loja'], ['par', 'sem_uso', 'Ver loja'],
    ]);
    expect(a[0].texto).toBe('Mensalidade atrasada há 14 dias');
  });

  it('comunicado vai só para o público escolhido', () => {
    expect(comunicadoParaLoja({ alvo: 'todas', ativo: true }, loja())).toBe(true);
    expect(comunicadoParaLoja({ alvo: 'teste', ativo: true }, loja())).toBe(false);
    expect(comunicadoParaLoja({ alvo: 'basico', ativo: true }, loja())).toBe(true);
    expect(comunicadoParaLoja({ alvo: 'todas', ativo: false }, loja())).toBe(false);
  });

  it('id da loja sai do nome, sem acento e sem repetir', () => {
    expect(idParaLoja('Banho & Cheiroso', [])).toBe('banho-cheiroso');
    expect(idParaLoja('Cão Chique', ['cao-chique'])).toBe('cao-chique-2');
  });

  it('receita por mês soma as mensalidades pagas', () => {
    const cob: Cobranca[] = [
      { id: '1', lojaId: 'a', mes: '2026-10', valor: 89, pagaEm: '' },
      { id: '2', lojaId: 'b', mes: '2026-10', valor: 149, pagaEm: '' },
      { id: '3', lojaId: 'a', mes: '2026-09', valor: 89, pagaEm: '' },
    ];
    expect(receitaPorMes(cob, HOJE, 3)).toEqual([
      { mes: '2026-08', receita: 0 }, { mes: '2026-09', receita: 89 }, { mes: '2026-10', receita: 238 },
    ]);
  });
});

describe('Painel do Dono: banco', () => {
  const nova = { nome: 'Pet Mania', cidade: 'Volta Redonda/RJ', telefone: '(24) 99999-0000', responsavel: 'Juliana Reis',
    emailAdmin: 'Admin@PetMania.com', plano: 'basico' as const, mensalidade: 89, vencimentoDia: 10, diasDeTeste: 14 };

  it('nova loja: cria a loja em teste, o admin ligado a ela e manda o e-mail de senha', async () => {
    const l = await criarLoja(nova, HOJE, []);
    expect(l).toMatchObject({ id: 'pet-mania', status: 'teste', fimTeste: '2026-10-28', cobrarDesde: '2026-11' });
    expect(fs().get('lojas/pet-mania')).toMatchObject({ nome: 'Pet Mania', emailAdmin: 'admin@petmania.com' });
    expect(fs().get('usuarios/uid-admin@petmania.com')).toMatchObject({ role: 'admin', lojaId: 'pet-mania', nome: 'Juliana', sobrenome: 'Reis' });
    expect(ff.resetEnviado).toEqual(['admin@petmania.com']);
  });

  it('e-mail já usado: avisa e não grava nada', async () => {
    ff.contas.push('admin@petmania.com');
    await expect(criarLoja(nova, HOJE, [])).rejects.toThrow(EMAIL_EM_USO);
    expect(fs().get('lojas/pet-mania')).toBeUndefined();
  });

  it('carrega lojas, pagamentos e atendimentos entregues dos últimos 30 dias', async () => {
    fs().set('lojas/a', { nome: 'Loja A', status: 'ativa', plano: 'basico', mensalidade: 89, vencimentoDia: 10 });
    fs().set('lojas/a/dias/2026-10-15/logs/1', { tipo: 'entregue' });
    fs().set('lojas/a/dias/2026-10-15/logs/2', { tipo: 'removido' });
    fs().set('lojas/a/dias/2026-10-02/logs/3', { tipo: 'entregue' });
    fs().set('lojas/a/dias/2026-08-01/logs/velho', { tipo: 'entregue' });
    fs().set('usuarios/u1', { lojaId: 'a' });
    fs().set('usuarios/u2', { lojaId: 'b' });
    await registrarPagamento({ id: 'a' } as Loja, '2026-10', 89, HOJE);
    const d = await carregarDadosDono(HOJE);
    expect(d.lojas.map((l) => l.id)).toEqual(['a']);
    expect(d.atividade.a).toEqual({ porDia: { '2026-10-15': 1, '2026-10-02': 1 }, usuarios: 1 });
    expect(d.cobrancas).toEqual([{ id: 'a_2026-10', lojaId: 'a', mes: '2026-10', valor: 89, pagaEm: HOJE }]);
    expect(d.migracaoPendente).toBe(false);
  });
});

describe('Migração do formato antigo', () => {
  const antigo = () => {
    fs().set('petsCadastro/PET-000001', { nomePet: 'Rex' });
    fs().set('petsCadastro/PET-000002', { nomePet: 'Bidu' });
    fs().set('profissionais/p1', { nome: 'Carla' });
    fs().set('contadores/petNumber', { valor: 2 });
    fs().set('slotsUsados/2026-10-15', { slots: [1] });
    fs().set('dias/2026-10-15', { slotsOcupados: [1] });
    fs().set('dias/2026-10-15/pets/x', { nomePet: 'Rex', slotNumber: 1 });
    fs().set('dias/2026-03-02/logs/l1', { tipo: 'entregue' }); // dia sem documento
    fs().set('usuarios/u1', { nome: 'Ana', role: 'admin' });
  };

  it('copia tudo para a loja, liga os funcionários, confere e não mexe no original', async () => {
    antigo();
    const passos: string[] = [];
    const r = await migrarDadosAntigos({ id: 'elite-pet-shop', nome: 'Elite Pet Shop', logoUrl: '/logo-elite.png' }, HOJE, (t) => passos.push(t));
    expect(r.confere).toBe(true);
    expect(r.destino).toEqual({ fichas: 2, profissionais: 1, racas: 0, contadores: 1, slotsUsados: 1, dias: 2, naFila: 1, atendimentos: 1, usuarios: 1 });
    expect(fs().get('lojas/elite-pet-shop/contadores/petNumber')).toEqual({ valor: 2 });
    expect(fs().get('lojas/elite-pet-shop/dias/2026-03-02/logs/l1')).toEqual({ tipo: 'entregue' });
    expect(fs().get('lojas/elite-pet-shop')).toMatchObject({ nome: 'Elite Pet Shop', status: 'ativa', mensalidade: 0, migradaEm: HOJE });
    expect(fs().get('usuarios/u1').lojaId).toBe('elite-pet-shop');
    expect(fs().get('petsCadastro/PET-000001')).toEqual({ nomePet: 'Rex' }); // original intacto
    expect(passos.at(-1)).toBe('Conferindo...');
  });

  it('não roda duas vezes (apagaria o que a loja fez depois)', async () => {
    antigo();
    await migrarDadosAntigos({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' }, HOJE);
    await expect(migrarDadosAntigos({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' }, HOJE)).rejects.toThrow(JA_MIGRADO);
  });

  it('painel avisa que há dados antigos até a migração ser feita', async () => {
    antigo();
    expect((await carregarDadosDono(HOJE)).migracaoPendente).toBe(true);
    await migrarDadosAntigos({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' }, HOJE);
    expect((await carregarDadosDono(HOJE)).migracaoPendente).toBe(false);
  });
});
