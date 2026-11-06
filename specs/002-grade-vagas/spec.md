# Feature Specification: Grade de vagas do dia

**Feature Branch**: `002-grade-vagas` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa da aba Grade: vagas numeradas do dia, cores por situação, vagas usadas, pets parados e virada do dia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a situação de todas as vagas (Priority: P1)

A equipe vê as vagas do dia numeradas, com cor por situação: livre (verde), aguardando (âmbar), em atendimento (azul-céu), pronto (roxo), avisado (azul), usada (cinza, bloqueada).

**Why this priority**: É a tela principal de controle do salão.

**Independent Test**: Cadastrar pets em situações diferentes e conferir as cores.

**Acceptance Scenarios**:

1. **Given** vaga livre, **When** tocar, **Then** abre o cadastro (spec 001).
2. **Given** vaga ocupada, **When** tocar, **Then** abre a janela de detalhes do pet.
3. **Given** vaga usada hoje, **When** tocar, **Then** nada abre (bloqueada).
4. **Given** pet que saiu para entrega, **Then** a vaga mostra o ícone de caminhão.

---

### User Story 2 - Tamanho da grade (Priority: P2)

A grade mostra de 10 em 10 até 100 vagas, com botões -1, -10 e +10, e cresce sozinha quando não há vaga livre visível.

**Why this priority**: Adapta-se ao movimento do dia.

**Independent Test**: Ocupar todas as vagas visíveis e ver a grade crescer.

**Acceptance Scenarios**:

1. **Given** vagas ocupadas ou usadas, **When** reduzir, **Then** a grade não fica abaixo da maior vaga ocupada ou usada.
2. **Given** nenhuma vaga livre visível, **Then** a grade aumenta automaticamente.

---

### User Story 3 - Pets parados e vagas usadas (Priority: P2)

Selo de "pets parados" (aguardando há mais de 30 min ou em atendimento há mais de 2 h; pronto nunca conta) e contador de "usados hoje".

**Why this priority**: Ajuda a não esquecer animais.

**Independent Test**: Simular um pet aguardando há 31 min e ver o selo.

**Acceptance Scenarios**:

1. **Given** pet aguardando há 29 min, **Then** não é parado; com 31 min, é.
2. **Given** pet finalizado há horas, **Then** nunca conta como parado.

---

### User Story 4 - Virada do dia (Priority: P1)

À meia-noite (horário de São Paulo) a tela troca sozinha para a fila do novo dia, mesmo com o tablet ligado.

**Why this priority**: Evita misturar dias e contagens.

**Independent Test**: Simular a virada e ver a lista antiga sumir.

**Acceptance Scenarios**:

1. **Given** tablet aberto às 23:59, **When** passar da meia-noite, **Then** a fila e as vagas usadas passam a ser as do novo dia.
2. **Given** pet de ontem, **When** editar, **Then** a edição vai para a fila do dia dele.

### Edge Cases

- Vaga usada nunca é apagada: o registro do dia só recebe acréscimos.
- Pets que já estavam na fila antes da reserva existir têm a vaga reservada automaticamente, uma única vez; se falhar sem internet, tenta de novo na próxima atualização.
- Troca de conta sem recarregar zera a lista e escuta de novo; acesso negado pelo servidor limpa a tela.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A grade DEVE ter no máximo 100 vagas (vaga 1–100 nas regras do banco).
- **FR-002**: Remover pet ou marcar avisado NÃO DEVE queimar a vaga; entregar DEVE queimar a vaga no dia do pet.
- **FR-003**: O dia DEVE ser calculado no fuso America/Sao_Paulo.
- **FR-004**: O filtro por serviço (todos, banho, tosa, banho+tosa, higiênica, ozônio, hidratação) DEVE valer para Grade e Fluxo.
- **FR-005**: O sinal de parado DEVE aparecer só na Grade.
- **FR-006**: A grade DEVE informar a janela aberta para o suporte ao vivo (spec 012).

### Key Entities

- **Dia (dias/{dia})**: vagas ocupadas do dia.
- **Vagas usadas (slotsUsados/{dia})**: lista de vagas já gastas no dia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma vaga entregue nunca é reutilizada no mesmo dia.
- **SC-002**: A troca de dia acontece sem recarregar a página.

## Assumptions

- O número de vagas visíveis é controlado no aparelho, não salvo por loja.
