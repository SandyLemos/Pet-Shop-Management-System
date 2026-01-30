export type SlotStatus = 'livre' | 'espera' | 'banho' | 'escovar' | 'tosa' | 'finalizado';

export interface Pet {
  id: string;
  slotNumber: number;
  nomePet: string;
  nomeTutor: string;
  especie?: 'cao' | 'gato';
  raca?: string;
  porte?: 'pequeno' | 'medio' | 'grande';
  foto?: string;
  servico: 'banho' | 'tosa' | 'banho_tosa' | 'higienica' | 'ozonio' | 'hidratacao';
  profissionalBanho?: string;
  profissionalTosa?: string;
  banhoCompleto?: boolean;
  escovarCompleto?: boolean;
  tosaCompleta?: boolean;
  observacoes?: string;
  checkInTime: string;
  status: SlotStatus;
}