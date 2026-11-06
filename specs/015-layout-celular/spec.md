# Feature Specification: Uso no celular (layout responsivo e PWA)

**Feature Branch**: `015-layout-celular` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do layout para celular (abaixo de 640px) sem quebrar tablet e computador, e do app instalável (PWA)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Usar o sistema no celular (Priority: P1)

Abaixo de 640px as telas se reorganizam: o Fluxo mostra uma etapa por vez com seletor, janelas ocupam a tela, botões ficam em coluna, o Painel Admin, as Análises e o Painel do Proprietário se ajustam.

**Why this priority**: Muitas lojas usam o celular no salão.

**Independent Test**: Abrir em 375px e fazer um atendimento completo.

**Acceptance Scenarios**:

1. **Given** tela de 375px, **Then** nada fica cortado nem exige rolagem lateral.
2. **Given** tablet ou computador, **Then** o layout continua o mesmo de antes.

---

### User Story 2 - Instalar como app (Priority: P3)

O sistema pode ser instalado na tela inicial (PWA).

**Why this priority**: Conveniência.

**Independent Test**: Instalar pelo navegador do celular.

**Acceptance Scenarios**:

1. **Given** navegador compatível, **Then** oferece instalar e abre em tela cheia.

### Edge Cases

- Página do tutor e página de agendamento são pensadas primeiro para celular.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ajustes de celular DEVEM valer só abaixo de 640px.
- **FR-002**: Cores fixas (Aguardando #F7931E, demais #0B5A70) DEVEM ser mantidas no celular.

### Key Entities

- Nenhuma (só apresentação).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Todas as telas principais são usáveis em 375px de largura.

## Assumptions

- A largura de referência para celular é 375px.
