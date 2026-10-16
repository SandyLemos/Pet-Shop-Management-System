// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

// ---------- Firebase e Cloudinary falsos ----------
const fb = vi.hoisted(() => ({ updates: [] as any[], falhar: false }));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...partes: string[]) => partes.join('/'),
  updateDoc: async (caminho: string, dados: any) => {
    if (fb.falhar) throw new Error('offline');
    fb.updates.push({ caminho, dados });
  },
  deleteField: () => '__apagar__',
  serverTimestamp: () => '__agora__',
}));
const up = vi.hoisted(() => ({ url: 'https://res.cloudinary.com/x/logo.png' as string | null, opcoes: null as any }));
vi.mock('../src/hooks/useCloudinaryUpload', () => ({
  useCloudinaryUpload: () => ({
    uploading: false,
    uploadImage: async (_f: any, opcoes: any) => { up.opcoes = opcoes; return up.url; },
  }),
}));
vi.mock('../src/utils/cores', async (original) => ({
  ...(await original<typeof import('../src/utils/cores')>()),
  coresDaImagem: async () => ['#0B5A70', '#F7931E'], // sem canvas no jsdom
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { coresDosPixels, sugerirCores, coresValidas, corMuitoClara, CORES_PADRAO } from '../src/utils/cores';
import { definirLoja, coresLoja, lojaTemCores, logoLoja, aoMudarLoja } from '../src/lib/lojaAtual';
import { salvarPersonalizacao } from '../src/services/personalizacaoService';
import { SecaoPersonalizacao } from '../src/app/components/AdminPersonalizacao';

const px = (...lista: [number, number, number, number, number][]) => {
  const out: number[] = [];
  for (const [r, g, b, a, vezes] of lista) for (let i = 0; i < vezes; i++) out.push(r, g, b, a);
  return out;
};

afterEach(cleanup);

beforeEach(() => {
  fb.updates = [];
  fb.falhar = false;
  up.url = 'https://res.cloudinary.com/x/logo.png';
  definirLoja({ id: 'elite', nome: 'Elite Pet Shop' });
});

describe('cores da logo', () => {
  it('ignora fundo transparente, branco, preto e cinza e ordena pela mais usada', () => {
    const lista = coresDosPixels(px(
      [255, 255, 255, 255, 50], // branco
      [0, 0, 0, 255, 50],       // preto
      [128, 128, 128, 255, 50], // cinza
      [200, 0, 0, 0, 50],       // transparente
      [11, 90, 112, 255, 30],   // petróleo
      [247, 147, 30, 255, 10],  // laranja
    ));
    expect(lista).toEqual(['#0B5A70', '#F7931E']);
  });

  it('sugere a mais escura como principal e outra como destaque', () => {
    expect(sugerirCores(['#F7931E', '#0B5A70'])).toEqual({ principal: '#0B5A70', destaque: '#F7931E' });
  });

  it('logo sem cor aproveitável não sugere nada (fica o padrão)', () => {
    expect(sugerirCores([])).toBeNull();
    expect(sugerirCores(['#FFFF99'])).toBeNull();
  });

  it('valida as cores vindas do banco', () => {
    expect(coresValidas({ principal: '#abcdef', destaque: '#123456' })).toEqual({ principal: '#ABCDEF', destaque: '#123456' });
    expect(coresValidas({ principal: 'red', destaque: '#123456' })).toBeNull();
    expect(coresValidas(undefined)).toBeNull();
    expect(corMuitoClara('#FFFFFF')).toBe(true);
    expect(corMuitoClara('#3B2FBE')).toBe(false);
  });
});

describe('loja atual', () => {
  it('sem personalização usa o padrão de hoje', () => {
    expect(lojaTemCores()).toBe(false);
    expect(coresLoja()).toEqual(CORES_PADRAO);
    expect(logoLoja()).toBe('/logo-pata-gestao.png');
  });

  it('salvar grava só logo e cores na loja e atualiza a tela na hora', async () => {
    const aviso = vi.fn();
    const parar = aoMudarLoja(aviso);
    await salvarPersonalizacao({ logoUrl: 'https://res.cloudinary.com/x/l.png', cores: { principal: '#0b5a70', destaque: '#F7931E' } });
    parar();
    expect(fb.updates).toEqual([{
      caminho: 'lojas/elite',
      dados: { logoUrl: 'https://res.cloudinary.com/x/l.png', cores: { principal: '#0B5A70', destaque: '#F7931E' }, personalizadoEm: '__agora__' },
    }]);
    expect(aviso).toHaveBeenCalled();
    expect(coresLoja()).toEqual({ principal: '#0B5A70', destaque: '#F7931E' });
    expect(logoLoja()).toBe('https://res.cloudinary.com/x/l.png');
  });

  it('voltar ao padrão apaga logo e cores do banco', async () => {
    await salvarPersonalizacao({ logoUrl: null, cores: null });
    expect(fb.updates[0].dados).toEqual({ logoUrl: '__apagar__', cores: '__apagar__', personalizadoEm: '__agora__' });
    expect(lojaTemCores()).toBe(false);
  });

  it('recusa logo que não veio do envio', async () => {
    await expect(salvarPersonalizacao({ logoUrl: 'https://outro.site/x.png', cores: null })).rejects.toThrow();
    expect(fb.updates).toEqual([]);
  });
});

describe('aba Personalização', () => {
  it('enviar a logo aplica as cores dela, e salvar grava', async () => {
    const { container } = render(<SecaoPersonalizacao />);
    const salvar = screen.getByRole('button', { name: /Salvar personalização/ });
    expect((salvar as HTMLButtonElement).disabled).toBe(true); // nada mudou ainda

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });
    });
    await waitFor(() => expect(screen.getByText('Cores que combinam com a sua logo')).toBeTruthy());
    expect(up.opcoes).toEqual({ manterTransparencia: true });
    expect((screen.getByLabelText('Cor principal') as HTMLInputElement).value).toBe('#0b5a70');

    await act(async () => { fireEvent.click(salvar); });
    expect(fb.updates[0].dados.cores).toEqual({ principal: '#0B5A70', destaque: '#F7931E' });
    expect(fb.updates[0].dados.logoUrl).toBe('https://res.cloudinary.com/x/logo.png');
  });

  it('voltar às cores padrão restaura o visual de hoje', async () => {
    definirLoja({ id: 'elite', nome: 'Elite', cores: { principal: '#0B5A70', destaque: '#F7931E' } });
    render(<SecaoPersonalizacao />);
    expect((screen.getByLabelText('Cor principal') as HTMLInputElement).value).toBe('#0b5a70');
    fireEvent.click(screen.getByRole('button', { name: /Voltar às cores padrão/ }));
    expect((screen.getByLabelText('Cor principal') as HTMLInputElement).value).toBe(CORES_PADRAO.principal.toLowerCase());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Salvar personalização/ })); });
    expect(fb.updates[0].dados.cores).toBe('__apagar__');
  });
});
