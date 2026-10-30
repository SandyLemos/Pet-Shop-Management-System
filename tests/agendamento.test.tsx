// @vitest-environment jsdom
// Agendamento online pelo tutor + módulos por loja (regras puras, serviço e telas)
import { definirLoja, temModulo } from '../src/lib/lojaAtual';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar();
  // escuta = leitura única do que está gravado agora
  ff.ref.mod.onSnapshot = (r: any, cb: any) => {
    if (r.kind === 'col') {
      ff.ref.mod.getDocs(r).then((s: any) => cb(s));
    } else {
      const e = ff.ref.store.get(r.path);
      cb({ exists: () => !!e, data: () => e?.data });
    }
    return () => {};
  };
  return ff.ref.mod;
});

import {
  andamentoDoPedido, escolherVagasOnline, vagasLivres, proximaVagaNaChegada, problemaNoPedido, limparPedido, proximosDias, diaCurto, mensagemPedido,
  type DadosPedido,
} from '../src/utils/agendamento';
import { modulosDaLoja } from '../src/utils/modulos';
import {
  criarPedido, cancelarPedido, confirmarPedido, recusarPedido, liberarCancelado, marcarChegou, VAGA_TOMADA, type Pedido,
} from '../src/services/agendamentoService';
import { PedidosOnlineBanner } from '../src/app/components/agendamento/PedidosOnlineBanner';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
const LOJA = 'teste-01';
const DIA = '2026-10-30';
const AGENDA = { ativo: true, nomeLoja: 'Teste 01' };
const DADOS: DadosPedido = {
  nomeTutor: '  Ana Souza ', telefone: '(24) 99999-1234', nomePet: 'Thor', especie: 'cao', raca: 'SRD', porte: 'medio', servico: 'banho', obs: '',
};

beforeEach(() => { fs().limpar(); });
afterEach(() => cleanup());

describe('Módulos por loja', () => {
  it('loja sem o campo: só Banho e tosa (Elite continua igual)', () => {
    expect(modulosDaLoja({})).toEqual({ banhoTosa: true, agendamento: false });
    expect(modulosDaLoja({ modulos: { agendamento: true } })).toEqual({ banhoTosa: true, agendamento: true });
  });

  it('a loja atual guarda os módulos do login', () => {
    definirLoja({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' });
    expect(temModulo('agendamento')).toBe(false);
    definirLoja({ id: LOJA, nome: 'Teste 01', modulos: { banhoTosa: true, agendamento: true } });
    expect(temModulo('agendamento')).toBe(true);
  });
});

describe('Agendamento: regras puras', () => {
  it('lugares online do dia: 1..N (não são números da grade)', () => {
    expect(escolherVagasOnline(3, [], [])).toEqual([1, 2, 3]);
  });

  it('nunca tira uma vaga já marcada por tutor; para baixo tira primeiro as maiores livres', () => {
    expect(escolherVagasOnline(2, [1, 2, 3, 4], [4])).toEqual([1, 4]);
    expect(escolherVagasOnline(0, [1, 2, 3], [2])).toEqual([2]);
  });

  it('lugares livres = liberados menos marcados', () => {
    expect(vagasLivres([3, 1, 2], [2])).toEqual([1, 3]);
  });

  it('na chegada o pet vai para a primeira vaga livre depois da última ocupada', () => {
    expect(proximaVagaNaChegada([])).toBe(1);
    expect(proximaVagaNaChegada([1, 2, 5])).toBe(6); // não volta para 3 e 4
    expect(proximaVagaNaChegada([1, 2, 5, 6])).toBe(7);
    expect(proximaVagaNaChegada([99, 100])).toBe(1); // passou de 100: primeira livre do começo
  });

  it('confere o formulário do tutor', () => {
    expect(problemaNoPedido(DADOS)).toBeNull();
    expect(problemaNoPedido({ ...DADOS, telefone: '123' })).toMatch(/WhatsApp/);
    expect(problemaNoPedido({ ...DADOS, especie: '' })).toMatch(/cão ou gato/);
    expect(limparPedido(DADOS)).toMatchObject({ nomeTutor: 'Ana Souza', telefone: '24999991234' });
  });

  it('dias e mensagens', () => {
    expect(proximosDias('2026-10-30', 3)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(diaCurto('2026-10-30')).toBe('sex, 30/10');
    const msg = mensagemPedido('confirmado', { nomeTutor: 'Ana Souza', nomePet: 'Thor', servico: 'banho', dia: DIA }, 'Teste 01', 'https://x/agendamento/abc');
    expect(msg).toContain('Ana');
    expect(msg).toContain('sex, 30/10');
  });
});

describe('Agendamento: andamento na página do tutor', () => {
  const p = { nomePet: 'Thor', servico: 'banho', criadoEm: 1, atualizadoEm: 1 };
  it('depois da chegada mostra "Aguardando atendimento" (não "Chegou")', () => {
    const a = andamentoDoPedido({ ...p, status: 'chegou' }, null);
    expect(a.titulo).toBe('Aguardando atendimento');
    expect(a.etapas.find((e) => e.estado === 'agora')?.nome).toBe('Na loja, aguardando atendimento');
  });
  it('segue as etapas do pet na loja pelo link de acompanhamento', () => {
    const a = andamentoDoPedido({ ...p, status: 'chegou' }, { status: 'banho', banhoEm: 5 });
    expect(a.titulo).toBe('No banho');
    expect(a.etapas.find((e) => e.estado === 'agora')).toMatchObject({ id: 'banho', hora: 5 });
  });
  it('confirmado: a próxima etapa é a chegada na loja', () => {
    const a = andamentoDoPedido({ ...p, status: 'confirmado' });
    expect(a.etapas.find((e) => e.estado === 'agora')?.nome).toBe('Chegada na loja');
  });
});

describe('Agendamento: pedido do tutor e ações da loja', () => {
  const travas = () => fs().lista(`agendaPublica/${LOJA}/dias/${DIA}/marcadas`);

  it('marca a vaga e cria o pedido pendente juntos', async () => {
    const codigo = await criarPedido(LOJA, AGENDA, DIA, 2, DADOS);
    const p = fs().get(`agendamentos/${codigo}`);
    expect(p).toMatchObject({ lojaId: LOJA, dia: DIA, vaga: 2, status: 'pendente', nomeTutor: 'Ana Souza', telefone: '24999991234' });
    expect(fs().get(`agendaPublica/${LOJA}/dias/${DIA}/marcadas/2`)).toBeTruthy();
  });

  it('dois tutores na mesma vaga: o segundo recebe VAGA_TOMADA', async () => {
    await criarPedido(LOJA, AGENDA, DIA, 2, DADOS);
    await expect(criarPedido(LOJA, AGENDA, DIA, 2, { ...DADOS, nomePet: 'Mel' })).rejects.toThrow(VAGA_TOMADA);
  });

  it('confirmar → aguardando chegada; chegada mantém a vaga presa', async () => {
    const codigo = await criarPedido(LOJA, AGENDA, DIA, 2, DADOS);
    const p = { ...fs().get(`agendamentos/${codigo}`), codigo } as Pedido;
    await confirmarPedido(p);
    expect(fs().get(`agendamentos/${codigo}`).status).toBe('confirmado');
    await marcarChegou(p, { petId: 'pet1', linkTutor: 'L'.repeat(20) });
    expect(fs().get(`agendamentos/${codigo}`)).toMatchObject({ status: 'chegou', petId: 'pet1', linkTutor: 'L'.repeat(20) });
    expect(fs().get(`agendaPublica/${LOJA}/dias/${DIA}/marcadas/2`)).toBeTruthy();
  });

  it('recusar e cancelamento do tutor soltam a vaga', async () => {
    const c1 = await criarPedido(LOJA, AGENDA, DIA, 1, DADOS);
    await recusarPedido({ ...fs().get(`agendamentos/${c1}`), codigo: c1 } as Pedido, ' agenda cheia ');
    expect(fs().get(`agendamentos/${c1}`)).toMatchObject({ status: 'recusado', motivo: 'agenda cheia' });

    const c2 = await criarPedido(LOJA, AGENDA, DIA, 3, DADOS);
    await cancelarPedido(c2);
    expect(fs().get(`agendamentos/${c2}`).status).toBe('cancelado');
    await liberarCancelado({ ...fs().get(`agendamentos/${c2}`), codigo: c2 } as Pedido);
    expect(fs().get(`agendamentos/${c2}`).status).toBe('cancelado_ok');
    expect(travas()).toEqual([]);
  });
});

describe('Agendamento: telas da loja', () => {
  const pedido = (extra: Partial<Pedido> = {}): Pedido => ({
    ...limparPedido(DADOS), codigo: 'c'.repeat(24), lojaId: LOJA, nomeLoja: 'Teste 01', dia: DIA, vaga: 2,
    status: 'pendente', criadoEm: 1, atualizadoEm: 1, expiraEm: 9e15, ...extra,
  });

  it('aviso: "pet X foi agendado online, necessário confirmar"', () => {
    render(<PedidosOnlineBanner pedidos={[pedido()]} />);
    expect(screen.getByRole('region', { name: /agendamentos online a confirmar/i }).textContent)
      .toMatch(/Thor foi agendado online para.*Necessário confirmar/);
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeTruthy();
  });

  it('confirmados de hoje: lista "aguardando chegada" com Confirmar chegada', () => {
    const chegou = vi.fn();
    const mel = pedido({ nomePet: 'Mel', status: 'confirmado', codigo: 'd'.repeat(24) });
    render(<PedidosOnlineBanner pedidos={[]} aguardando={[mel]} onChegou={chegou} />);
    expect(screen.getByRole('region', { name: /aguardando chegada/i }).textContent).toMatch(/Mel/);
    fireEvent.click(screen.getByRole('button', { name: /confirmar chegada/i }));
    expect(chegou).toHaveBeenCalledWith(mel);
  });
});
