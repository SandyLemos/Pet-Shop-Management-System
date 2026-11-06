# Feature Specification: Várias lojas, isolamento de dados e módulos

**Feature Branch**: `010-multi-loja-isolamento` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do funcionamento multi-loja: cada loja vê só os próprios dados, situação da loja (ativa, teste, bloqueada) e módulos liberados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada loja vê só os próprios dados (Priority: P1)

O funcionário entra e o sistema passa a usar a loja dele (nome, fila, fichas, equipe). Nada de outra loja aparece.

**Why this priority**: Privacidade e confiança; base do negócio.

**Independent Test**: Entrar em duas lojas e conferir que as listas não se misturam.

**Acceptance Scenarios**:

1. **Given** funcionário da loja A, **Then** não lê nem grava nada da loja B (bloqueado nas regras do banco).
2. **Given** troca de conta sem recarregar, **Then** a lista anterior é zerada.

---

### User Story 2 - Situação da loja (Priority: P1)

Loja ativa entra normalmente; loja bloqueada não entra; loja em teste entra no prazo e é recusada depois que o teste acaba.

**Why this priority**: Controle comercial do Proprietário.

**Independent Test**: Bloquear uma loja e tentar entrar.

**Acceptance Scenarios**:

1. **Given** conta sem loja ligada, **Then** é recusada com o motivo.
2. **Given** teste vencido, **Then** recusa a entrada.

---

### User Story 3 - Módulos por loja (Priority: P2)

Cada loja tem módulos: Banho e tosa (padrão ligado) e Agendamento online (padrão desligado). Sem Banho e tosa, a loja vê "Módulo não liberado".

**Why this priority**: Permite vender funções separadas.

**Independent Test**: Desligar o Agendamento e ver a área de vagas online sumir do Admin.

**Acceptance Scenarios**:

1. **Given** loja sem o campo de módulos, **Then** só Banho e tosa fica ativo.
2. **Given** login, **Then** a loja atual guarda os módulos.

### Edge Cases

- Dados antigos na raiz (antes do multi-loja) foram migrados; o painel não consulta mais a raiz e a migração não roda duas vezes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todos os dados de loja DEVEM ficar em `lojas/{lojaId}/...`.
- **FR-002**: As regras do banco DEVEM exigir que o usuário seja da loja (isStaff/daLoja) e, para escrita sensível, admin da loja (adminDaLoja).
- **FR-003**: Só o Proprietário PODE alterar a loja (exceto logo e cores, spec 007).
- **FR-004**: Os módulos DEVEM ficar em `lojas/{id}.modulos`.
- **FR-005**: A coleção antiga `petsCadastro` na raiz só PODE ser lida pelo Proprietário.

### Key Entities

- **Loja**: nome, status (ativa, teste, bloqueada), fim do teste, plano, mensalidade, módulos, logo, cores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero leitura cruzada entre lojas nos testes das regras.

## Assumptions

- Tudo roda no plano gratuito (Spark), sem Cloud Functions; a segurança fica nas regras do banco.
