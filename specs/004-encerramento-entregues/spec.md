# Feature Specification: Avisar, entregar, remover, pendentes e aba Entregues

**Feature Branch**: `004-encerramento-entregues` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do fim do atendimento: avisar o tutor (WhatsApp), saiu para entrega, entregue, remover pet, pets pendentes de dias anteriores e aba Entregues."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avisar o tutor que o pet está pronto (Priority: P1)

Na janela do pet pronto, "Avisar" pergunta se é para abrir o WhatsApp com a mensagem pronta. A vaga fica azul (avisado) e a janela mostra "Tutor já foi avisado. Clique em Entregue quando retirar o pet."

**Why this priority**: É o contato com o cliente na hora da retirada.

**Independent Test**: Avisar um pet pronto e ver a vaga azul.

**Acceptance Scenarios**:

1. **Given** primeiro toque em Avisar, **Then** pergunta; **Sim** abre o WhatsApp (número com 55) e marca avisado; **Não** só marca avisado; **Cancelar** não faz nada.
2. **Given** pet sem telefone válido, **Then** o botão do WhatsApp fica desativado.
3. **Given** já avisado, **Then** não pergunta de novo e a vaga NÃO é queimada.

---

### User Story 2 - Entregar o pet (Priority: P1)

"Entregue" encerra o atendimento: grava o registro do dia, tira o pet da fila e queima a vaga.

**Why this priority**: Fecha o atendimento e alimenta relatórios e análises.

**Independent Test**: Entregar um pet e vê-lo na aba Entregues, com a vaga cinza.

**Acceptance Scenarios**:

1. **Given** pet pronto, **When** Entregue, **Then** o registro do dia é gravado (com alertas e quem entregou), o pet sai da fila, a vaga é liberada da reserva e marcada como usada.
2. **Given** pet já entregue em outro aparelho, **When** Entregue, **Then** aviso amigável e a vaga não é queimada de novo.
3. **Given** pet com entrega em casa, **When** "Saiu para entrega", **Then** grava o horário e mostra "Saiu para entrega às {hora}. Clique em Entregue quando entregar."

---

### User Story 3 - Remover pet da fila (Priority: P2)

Pet ainda aguardando pode ser excluído com dois toques ("Confirmar exclusão?"). A vaga volta a ficar livre.

**Why this priority**: Corrige cadastros errados ou desistências.

**Independent Test**: Excluir um pet aguardando e cadastrar outro na mesma vaga.

**Acceptance Scenarios**:

1. **Given** pet em `espera`, **When** primeiro toque, **Then** só pergunta; **Cancelar** volta; **Sim** exclui.
2. **Given** pet já em atendimento, **Then** o botão de excluir não aparece.

---

### User Story 4 - Pets pendentes de dias anteriores (Priority: P2)

Um aviso lista pets que ficaram na fila nos 7 dias anteriores, com a etapa de cada um, e permite entregar ou remover (com confirmação).

**Why this priority**: Evita filas "fantasma" e relatórios errados.

**Independent Test**: Deixar um pet ontem na fila e ver o aviso hoje.

**Acceptance Scenarios**:

1. **Given** pet de ontem na fila, **When** entregar pelo aviso, **Then** encerra no dia DO PET e não queima vaga de hoje.
2. **Given** nenhum pendente, **Then** nenhum aviso aparece.

---

### User Story 5 - Aba Entregues (Priority: P2)

Lista "Entregues hoje" com código, tutor, serviço, entrada, entrega, permanência e quem entregou, com busca.

**Why this priority**: Conferência do dia.

**Independent Test**: Entregar dois pets e buscar um deles.

**Acceptance Scenarios**:

1. **Given** nenhum entregue, **Then** "Nenhum pet entregue ainda hoje."
2. **Given** busca sem resultado, **Then** "Nenhum resultado para essa busca."

### Edge Cases

- Toque duplo em Entregue: encerra uma vez só.
- Pet cadastrado antes da reserva de vagas existir é encerrado normalmente.
- Entrega e reserva automática ao mesmo tempo: a vaga nunca fica presa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Entregar DEVE ser uma transação: registro do dia + exclusão do pet + liberação da reserva; repetir DEVE falhar com "já encerrado".
- **FR-002**: Entregar DEVE marcar a vaga como usada no dia do pet.
- **FR-003**: Avisado e removido DEVEM gravar registro, sem queimar vaga.
- **FR-004**: Excluir da fila DEVE ser possível só com o pet em `espera` e com confirmação.
- **FR-005**: Pendentes DEVEM considerar só os 7 dias anteriores (atravessando virada de mês e ano).
- **FR-006**: Cada mudança (avisado, saiu para entrega, entregue, removido) DEVE ser refletida na página do tutor.

### Key Entities

- **Registro do dia (dias/{dia}/logs)**: tipo (entregue, avisado, removido), pet, tutor, serviço, horários, profissionais, alertas, quem fez.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhum atendimento é contado duas vezes como entregue.
- **SC-002**: Nenhuma vaga de hoje é queimada por pet de outro dia.

## Assumptions

- Só "entregue" conta como atendimento em relatórios e análises.
