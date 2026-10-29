// ✅ Módulos por loja: o proprietário libera cada módulo na aba "Módulos" do painel.
// Guardado em lojas/{id}.modulos. Loja sem o campo = só o Banho e tosa (o sistema de sempre).

export type ModuloId = 'banhoTosa' | 'agendamento';
export type Modulos = Record<ModuloId, boolean>;

export const MODULOS: { id: ModuloId; nome: string; descricao: string }[] = [
  { id: 'banhoTosa', nome: 'Banho e tosa', descricao: 'Grade de vagas, fluxo do atendimento, entregues, relatórios e link do tutor.' },
  { id: 'agendamento', nome: 'Agendamento online', descricao: 'O tutor vê as vagas liberadas pela loja e marca o banho por uma página própria. A loja confirma cada pedido.' },
];

export const MODULOS_PADRAO: Modulos = { banhoTosa: true, agendamento: false };

/** Módulos de uma loja, completando o que faltar com o padrão */
export function modulosDaLoja(loja?: { modulos?: Partial<Modulos> | null } | null): Modulos {
  const m = loja?.modulos ?? {};
  return {
    banhoTosa: typeof m.banhoTosa === 'boolean' ? m.banhoTosa : MODULOS_PADRAO.banhoTosa,
    agendamento: typeof m.agendamento === 'boolean' ? m.agendamento : MODULOS_PADRAO.agendamento,
  };
}
