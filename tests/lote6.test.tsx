// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { criarFirestoreFalso } from './fakeFirestore';

const ff = vi.hoisted(() => ({ ref: null as any }));
vi.mock('../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock('firebase/firestore', async () => {
  const { criarFirestoreFalso: criar } = await import('./fakeFirestore');
  ff.ref = criar();
  return ff.ref.mod;
});

import { gerarBackup, nomeArquivoBackup } from '../src/services/backupService';
import { useCloudinaryUpload, MSG_NAO_E_FOTO, MSG_FOTO_GRANDE } from '../src/hooks/useCloudinaryUpload';

const fs = () => ff.ref as ReturnType<typeof criarFirestoreFalso>;
const put = (path: string, data: any) => fs().mod.setDoc({ path }, data);
beforeEach(() => { fs().limpar(); });

describe('Backup', () => {
  it('traz cadastros e os dias com movimento, com datas em texto', async () => {
    await put('petsCadastro/PET-000001', { nomePet: 'Rex', criadoEm: { toDate: () => new Date('2026-09-01T12:00:00Z') } });
    await put('usuarios/u1', { nome: 'Ana', role: 'admin' });
    await put('dias/2026-10-02/pets/a', { nomePet: 'Rex' });
    await put('dias/2026-09-15/logs/l1', { tipo: 'entregue' });
    await put('dias/2026-05-01/logs/velho', { tipo: 'entregue' }); // fora dos 90 dias
    const b = await gerarBackup('2026-10-02');
    expect(b.colecoes.petsCadastro['PET-000001']).toEqual({ nomePet: 'Rex', criadoEm: '2026-09-01T12:00:00.000Z' });
    expect(b.colecoes.usuarios.u1.nome).toBe('Ana');
    expect(Object.keys(b.dias).sort()).toEqual(['2026-09-15', '2026-10-02']);
    expect(b.dias['2026-10-02'].pets.a.nomePet).toBe('Rex');
    expect(nomeArquivoBackup('2026-10-02')).toBe('backup-elite-pet-shop-2026-10-02.json');
  });
});

describe('Envio de foto', () => {
  const enviar = async (file: any) => {
    const { result } = renderHook(() => useCloudinaryUpload());
    let url: any;
    await act(async () => { url = await result.current.uploadImage(file); });
    return { url, erro: result.current.error };
  };
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ secure_url: 'https://img/x.jpg' }) })) as any;
  });

  it('recusa arquivo que não é imagem, sem enviar', async () => {
    const r = await enviar(new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    expect(r.url).toBeNull(); expect(r.erro).toBe(MSG_NAO_E_FOTO);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('recusa foto acima de 5 MB que não deu para reduzir', async () => {
    const r = await enviar({ type: 'image/jpeg', size: 6 * 1024 * 1024, name: 'g.jpg' });
    expect(r.url).toBeNull(); expect(r.erro).toBe(MSG_FOTO_GRANDE);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('foto normal é enviada', async () => {
    const r = await enviar(new File(['abc'], 'p.jpg', { type: 'image/jpeg' }));
    expect(r.url).toBe('https://img/x.jpg'); expect(r.erro).toBeNull();
  });
});
