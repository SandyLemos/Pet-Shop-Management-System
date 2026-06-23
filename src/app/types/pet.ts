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
  petNumber?: string;
  slotNumber: number
  nomePet: string
  nomeTutor: string
  telefone?: string;
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
  profissionalBanho?: string | null      // ✅ aceita null (usado em encerrarPet)
  profissionalTosa?: string | null       // ✅ aceita null
  profissionalEscovar?: string | null    // ✅ aceita null
  atendimentoIniciado?: boolean
  historicoReversoes?: {
    etapa: string
    motivo: string
    data: string
  }[]
  banhoCompleto?: boolean
  escovarCompleto?: boolean
  tosaCompleta?: boolean
  observacoes?: string | null            // ✅ aceita null
  checkInTime: string
  status: SlotStatus
  avisado?: boolean
  avisadoEm?: string | null              // ✅ aceita null

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

// ─── Ficha permanente do pet (coleção petsCadastro) ───────────────────────
// ✅ Centralizado aqui para reuso entre petService e componentes
export interface PetCadastro {
  petNumber: string;          // Ex: "PET-000123"
  nomePet: string;
  nomeTutor: string;
  telefone: string;
  especie?: "cao" | "gato";
  raca?: string;
  porte?: "pequeno" | "medio" | "grande";
  foto?: string;
  criadoEm?: any;
  atualizadoEm?: any;
}
