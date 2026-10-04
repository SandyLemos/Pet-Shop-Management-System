// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../src/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('../src/hooks/useCloudinaryUpload', () => ({ useCloudinaryUpload: () => ({ uploadImage: vi.fn(), uploading: false, error: null }) }));
vi.mock('../src/hooks/useRacas', () => ({ useRacas: () => ({ nomesPorEspecie: () => [], criar: vi.fn() }) }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../src/services/petService', () => ({ buscarPetsCadastro: vi.fn(async () => []) }));
vi.mock('../src/app/components/GerenciarRacas', () => ({ GerenciarRacas: () => null }));

import { PetDetailModal } from '../src/app/components/PetDetailModal';
afterEach(cleanup);

const base: any = { id: 'p1', nomePet: 'Rex', nomeTutor: 'Ana', telefone: '24999991234', slotNumber: 1, status: 'finalizado',
  servico: 'banho', checkInTime: new Date().toISOString(), especie: 'cao', raca: 'SRD', porte: 'medio' };
const abrir = (pet = base) => {
  const onCheckout = vi.fn();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<PetDetailModal pet={pet} open onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCheckout={onCheckout} />);
  fireEvent.click(screen.getByText('Avisar'));
  return { onCheckout, open };
};

describe('Avisar pergunta antes de abrir o WhatsApp', () => {
  it('só pergunta no primeiro toque', () => {
    const { onCheckout, open } = abrir();
    expect(screen.getByText('Avisar o tutor pelo WhatsApp?')).toBeTruthy();
    expect(onCheckout).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  });
  it('Sim: abre o WhatsApp e marca avisado', () => {
    const { onCheckout, open } = abrir();
    fireEvent.click(screen.getByText('Sim, abrir WhatsApp'));
    expect(open.mock.calls[0][0]).toContain('https://wa.me/5524999991234');
    expect(onCheckout).toHaveBeenCalledWith('p1', 'avisado');
  });
  it('Não: só marca avisado, sem abrir nada', () => {
    const { onCheckout, open } = abrir();
    fireEvent.click(screen.getByText('Não, só marcar avisado'));
    expect(open).not.toHaveBeenCalled();
    expect(onCheckout).toHaveBeenCalledWith('p1', 'avisado');
  });
  it('Cancelar: nada acontece', () => {
    const { onCheckout, open } = abrir();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(open).not.toHaveBeenCalled(); expect(onCheckout).not.toHaveBeenCalled();
  });
  it('sem telefone: botão do WhatsApp desativado', () => {
    abrir({ ...base, telefone: '' });
    expect((screen.getByText('Sim, abrir WhatsApp').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
