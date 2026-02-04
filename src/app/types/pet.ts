export type SlotStatus = 'livre' | 'espera' | 'banho' | 'escovar' | 'tosa' | 'finalizado';

export interface Pet {
  id: string
  slotNumber: number
  nomePet: string
  nomeTutor: string
  especie?: "cao" | "gato"
  raca?: string
  porte?: "pequeno" | "medio" | "grande"
  foto?: string
  servico:
    | "banho"
    | "tosa"
    | "banho_tosa"
    | "higienica"
    | "ozonio"
    | "hidratacao"
  proximaEtapa?: string
  profissionalBanho?: string
  profissionalTosa?: string
  profissionalEscovar?: string
  atendimentoIniciado?: boolean // Nova Flag
  historicoReversoes?: {
    etapa: string
    motivo: string
    data: string
    // usuario?: string // opcional, caso tenha login no futuro
  }[]
  banhoCompleto?: boolean
  escovarCompleto?: boolean
  tosaCompleta?: boolean
  observacoes?: string
  checkInTime: string
  status: SlotStatus
}