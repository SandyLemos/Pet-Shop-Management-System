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
  /** ✅ Dia da fila onde o pet está (ex: "2026-10-02"). Preenchido pelo app ao
   *  ler do Firestore — NÃO é salvo no documento. Usado para editar/encerrar
   *  o pet na fila certa, mesmo depois da virada do dia. */
  dia?: string
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

  // ✅ Cópia dos alertas da ficha (para não ler a ficha a cada card)
  alertas?: string[];
  alertaObs?: string;
}

// ─── Ficha permanente do pet (coleção petsCadastro) ───────────────────────
// ✅ Centralizado aqui para reuso entre petService e componentes
export interface PetCadastro {
  petNumber: string;          // Ex: "PET-000123"
  petNumberSeq?: string;      // número puro sem zeros, ex: "123"
  nomePet: string;
  nomeTutor: string;
  telefone: string;
  telefoneReverso?: string;   // telefone (só dígitos) invertido, p/ busca por final
  especie?: "cao" | "gato";
  raca?: string;
  porte?: "pequeno" | "medio" | "grande";
  foto?: string;
  criadoEm?: any;
  atualizadoEm?: any;
  // ✅ LGPD: quando e quem registrou a autorização do tutor
  consentimentoEm?: any;
  consentimentoPorId?: string | null;
  consentimentoPorNome?: string | null;
  // ✅ Alertas fixos do pet (valem para todas as visitas)
  alertas?: string[];         // ex.: ["Morde", "Alérgico"] — até 12, cada um até 40 letras
  alertaObs?: string;         // detalhe livre, até 300 letras
}
