import { describe, it, expect } from 'vitest';
import { telefoneWhatsApp, linkWhatsAppPetPronto, mensagemPetPronto } from '../src/utils/whatsapp';
import { estaParado, minutosNaLoja, formatarTempo } from '../src/utils/parado';

describe('WhatsApp do Avisar', () => {
  it('monta o número com 55', () => {
    expect(telefoneWhatsApp('(24) 99999-1234')).toBe('5524999991234');
    expect(telefoneWhatsApp('2433331234')).toBe('552433331234');
    expect(telefoneWhatsApp('5524999991234')).toBe('5524999991234');
    expect(telefoneWhatsApp('')).toBeNull();
    expect(telefoneWhatsApp('1234')).toBeNull();
  });
  it('link com a mensagem pronta', () => {
    const url = linkWhatsAppPetPronto('24999991234', 'Ana Souza', 'Rex')!;
    expect(url.startsWith('https://wa.me/5524999991234?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(mensagemPetPronto('Ana Souza', 'Rex'));
    expect(mensagemPetPronto('Ana Souza', 'Rex')).toContain('Olá, Ana!');
    expect(linkWhatsAppPetPronto(undefined, 'Ana', 'Rex')).toBeNull();
  });
});

describe('Pet parado', () => {
  const agora = new Date('2026-10-02T15:00:00Z').getTime();
  const pet = (min: number, status: any) => ({ status, checkInTime: new Date(agora - min * 60_000).toISOString() });
  it('aguardando: só depois de 30 min', () => {
    expect(estaParado(pet(30, 'espera'), agora)).toBe(false);
    expect(estaParado(pet(31, 'espera'), agora)).toBe(true);
  });
  it('em atendimento: só depois de 2 h', () => {
    expect(estaParado(pet(119, 'banho'), agora)).toBe(false);
    expect(estaParado(pet(121, 'tosa'), agora)).toBe(true);
  });
  it('pronto (finalizado) nunca conta', () => {
    expect(estaParado(pet(500, 'finalizado'), agora)).toBe(false);
  });
  it('formata o tempo', () => {
    expect(minutosNaLoja(pet(80, 'banho'), agora)).toBe(80);
    expect(formatarTempo(45)).toBe('45min');
    expect(formatarTempo(80)).toBe('1h20');
    expect(formatarTempo(120)).toBe('2h');
  });
});
