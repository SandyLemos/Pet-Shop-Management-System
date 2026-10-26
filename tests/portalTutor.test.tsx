// @vitest-environment jsdom
// Portal do tutor: link de acompanhamento (serviço, regras puras e telas)
import { definirLoja } from '../src/lib/lojaAtual';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any, ouvinte: null as null | ((s: any) => void) }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar({ raiz: 'lojas/elite-pet-shop' });
  // a página do tutor escuta o link: devolve o que está gravado agora
  ff.ref.mod.onSnapshot = (r: any, cb: any) => {
    const e = ff.ref.store.get(r.path);
    cb({ exists: () => !!e, data: () => e?.data });
    ff.ouvinte = cb;
    return () => {};
  };
  return ff.ref.mod;
});

import { addPet, getTodayKey } from '../src/services/petService';
import { criarLinkTutor, atualizarLinkTutor, marcarLinkEnviado } from '../src/services/acompanhamentoService';
import {
  etapasDoServico, expiraEmDoDia, gerarCodigo, CODIGO_VALIDO, mensagemLinkTutor, linkWhatsAppDoLink, urlDoLink,
} from '../src/utils/acompanhamento';
import { LinkTutorPet } from '../src/app/components/LinkTutorPet';
import { PortalTutor } from '../src/app/components/PortalTutor';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
definirLoja({ id: 'elite-pet-shop', nome: 'Elite Pet Shop' });
const DIA = getTodayKey();
const link = (codigo: string) => fs().store.get(`acompanhamentos/${codigo}`)?.data;

const novoPet = (slot: number, extra: any = {}): any => ({
  slotNumber: slot, status: 'espera', nomePet: 'Thor', nomeTutor: 'Marcos Silva', telefone: '24999991234',
  especie: 'cao', raca: 'SRD', porte: 'medio', foto: '', servico: 'banho_tosa', ...extra,
});

async function petNaFila(extra: any = {}) {
  const { id } = await addPet(novoPet(1, extra), DIA);
  const dados = fs().get(`dias/${DIA}/pets/${id}`);
  return { ...dados, id, dia: DIA, checkInTime: new Date().toISOString() } as any;
}

beforeEach(() => { fs().limpar(); });
afterEach(() => cleanup());

describe('Link do tutor: regras puras', () => {
  it('código longo e aleatório, só letras e números', () => {
    const a = gerarCodigo(), b = gerarCodigo();
    expect(a).toMatch(CODIGO_VALIDO);
    expect(a).not.toBe(b);
  });

  it('vale até as 6h do dia seguinte (horário de Brasília)', () => {
    expect(new Date(expiraEmDoDia('2026-10-21')).toISOString()).toBe('2026-10-22T09:00:00.000Z');
  });

  it('a etapa Tosa só aparece para serviços com tosa', () => {
    expect(etapasDoServico('banho')).toEqual(['espera', 'banho', 'escovar', 'finalizado']);
    expect(etapasDoServico('banho_tosa')).toContain('tosa');
  });

  it('mensagem do WhatsApp com o primeiro nome do tutor e o link', () => {
    const url = urlDoLink('abc', 'https://pet-shop-manegement.web.app/');
    expect(url).toBe('https://pet-shop-manegement.web.app/a/abc');
    const msg = mensagemLinkTutor('Marcos Silva', 'Thor', 'banho_tosa', 'Elite Pet Shop', url);
    expect(msg).toContain('Olá, Marcos!');
    expect(msg).toContain('banho e tosa');
    expect(msg).toContain(url);
    expect(linkWhatsAppDoLink('(24) 99999-1234', msg)).toMatch(/^https:\/\/wa\.me\/5524999991234\?text=/);
    expect(linkWhatsAppDoLink('123', msg)).toBeNull();
  });
});

describe('Link do tutor: banco', () => {
  it('cria o link com só o necessário e guarda o código no pet', async () => {
    const pet = await petNaFila();
    const codigo = await criarLinkTutor(pet);
    const d = link(codigo);
    expect(d).toMatchObject({ lojaId: 'elite-pet-shop', nomeLoja: 'Elite Pet Shop', nomePet: 'Thor', servico: 'banho_tosa', status: 'espera', dia: DIA });
    expect(d.expiraEm).toBe(expiraEmDoDia(DIA));
    expect(typeof d.chegouEm).toBe('number');
    // LGPD: nada de tutor ou telefone no link público
    expect(JSON.stringify(d)).not.toContain('Marcos');
    expect(JSON.stringify(d)).not.toContain('99999');
    expect(fs().get(`dias/${DIA}/pets/${pet.id}`).linkTutor).toBe(codigo);
  });

  it('avança as etapas e marca a entrega', async () => {
    const codigo = await criarLinkTutor(await petNaFila());
    await atualizarLinkTutor(codigo, 'banho');
    expect(link(codigo).status).toBe('banho');
    expect(typeof link(codigo).banhoEm).toBe('number');
    await atualizarLinkTutor(codigo, 'entregue');
    expect(link(codigo)).toMatchObject({ status: 'entregue' });
    expect(typeof link(codigo).entregueEm).toBe('number');
  });

  it('pet sem link: não faz nada; erro ao atualizar não derruba a loja', async () => {
    await expect(atualizarLinkTutor(undefined, 'banho')).resolves.toBeUndefined();
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(atualizarLinkTutor('naoexiste000000000000', 'banho')).resolves.toBeUndefined();
    espiao.mockRestore();
  });

  it('marca quando o link foi enviado', async () => {
    const pet = await petNaFila();
    await marcarLinkEnviado(pet);
    expect(fs().get(`dias/${DIA}/pets/${pet.id}`).linkTutorEnviadoEm).toMatch(/^\d{4}-/);
  });
});

describe('Link do tutor na janela do pet', () => {
  it('pet antigo, sem link: botão para gerar', async () => {
    const pet = await petNaFila();
    render(<LinkTutorPet pet={pet} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar link para o tutor/ }));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(fs().get(`dias/${DIA}/pets/${pet.id}`).linkTutor).toMatch(CODIGO_VALIDO);
  });

  it('com link: mostra o endereço, copiar e WhatsApp', () => {
    render(<LinkTutorPet pet={{ ...novoPet(1), id: 'p1', linkTutor: 'x7k2Qm9Rt4abcdefghij', checkInTime: '' }} />);
    expect(screen.getByText(/\/a\/x7k2Qm9Rt4abcdefghij$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copiar link/ })).toBeTruthy();
    expect((screen.getByRole('button', { name: /Enviar no WhatsApp/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('sem telefone válido: WhatsApp apagado e aviso para copiar', () => {
    render(<LinkTutorPet pet={{ ...novoPet(1, { telefone: '' }), id: 'p1', linkTutor: 'x7k2Qm9Rt4abcdefghij', checkInTime: '' }} />);
    expect((screen.getByRole('button', { name: /Enviar no WhatsApp/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Sem telefone válido/)).toBeTruthy();
  });

  it('já enviado: mostra o horário e oferece reenviar', () => {
    render(<LinkTutorPet pet={{ ...novoPet(1), id: 'p1', linkTutor: 'x7k2Qm9Rt4abcdefghij', linkTutorEnviadoEm: '2026-10-21T11:42:00.000Z', checkInTime: '' }} />);
    expect(screen.getByText(/Enviado às 08:42/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reenviar no WhatsApp/ })).toBeTruthy();
  });
});

describe('Página do tutor', () => {
  it('mostra o pet, a etapa atual e muda sozinha', async () => {
    const codigo = await criarLinkTutor(await petNaFila());
    render(<PortalTutor codigo={codigo} />);
    expect(screen.getByText('Thor')).toBeTruthy();
    expect(screen.getByText('Aguardando a vez')).toBeTruthy();
    expect(screen.getByText('Elite Pet Shop')).toBeTruthy();
    await atualizarLinkTutor(codigo, 'tosa');
    act(() => { ff.ouvinte!({ exists: () => true, data: () => link(codigo) }); });
    expect(screen.getByText('Na tosa')).toBeTruthy();
  });

  it('link vencido ou inexistente: aviso amigável', () => {
    render(<PortalTutor codigo="naoexiste000000000000" />);
    expect(screen.getByText('Link indisponível')).toBeTruthy();
  });
});
