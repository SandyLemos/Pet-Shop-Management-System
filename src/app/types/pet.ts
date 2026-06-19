export type SlotStatus = 'livre' | 'espera' | 'banho' | 'escovar' | 'tosa' | 'finalizado';

// ─── Profissional ──────────────────────────────────────────────────────────────
export interface Profissional {
  id: string
  nome: string
  sobrenome: string
  funcao: string
  ativo: boolean
}

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
  atendimentoIniciado?: boolean
  historicoReversoes?: {
    etapa: string
    motivo: string
    data: string
  }[]
  banhoCompleto?: boolean
  escovarCompleto?: boolean
  tosaCompleta?: boolean
  observacoes?: string
  checkInTime: string
  status: SlotStatus
  avisado?: boolean
  avisadoEm?: string

  // ✅ Quem cadastrou o pet
  cadastradoPorId?:   string | null
  cadastradoPorNome?: string | null

  // ✅ Quem marcou como avisado
  avisadoPorId?:   string | null
  avisadoPorNome?: string | null

  // ── NOVO: Problemas de saúde registrados por etapa ──
  problemasSaudeBanho?: string[];
  problemasSaudeEscovar?: string[];
  problemasSaudeTosa?: string[];
}
