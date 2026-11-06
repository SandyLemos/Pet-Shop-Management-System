# Feature Specification: Fluxo de atendimento (etapas)

**Feature Branch**: `003-fluxo-atendimento` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do Fluxo: colunas Aguardando, Banho, Escovar e Tosa, escolha de profissional, checagem de saúde, voltar etapa e reverter."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar atendimento com profissional (Priority: P1)

No card "Aguardando", "Iniciar Atendimento" abre a escolha do profissional (só ativos) e a checagem de saúde (ao menos um item, podendo ser "Nenhuma"). O pet vai para Banho.

**Why this priority**: Registra quem atendeu e o estado de saúde na chegada.

**Independent Test**: Iniciar atendimento e ver o pet na coluna Banho com o profissional.

**Acceptance Scenarios**:

1. **Given** nenhum item de saúde marcado, **Then** não deixa confirmar.
2. **Given** profissional inativo, **Then** ele não aparece na lista.
3. **Given** confirmado, **Then** o status muda de `espera` para `banho` e a página do tutor avança.

---

### User Story 2 - Avançar pelas etapas (Priority: P1)

Banho: "Marcar Banho Completo" → "Avançar para Escovar". Escovar: "Finalizar Escovação" → "Avançar para Tosa" (serviços com tosa: tosa, banho+tosa, higiênica) ou "Disponibilizar para Retirada" (ou "Entrega", se houver transporte). Tosa: "Marcar Tosa Completa" → "Disponibilizar…".

**Why this priority**: É o trabalho do dia a dia.

**Independent Test**: Levar um pet de Banho até finalizado.

**Acceptance Scenarios**:

1. **Given** etapa necessária não concluída, **When** tentar disponibilizar, **Then** não deixa.
2. **Given** tudo concluído, **When** disponibilizar, **Then** pede confirmação, o status vira `finalizado`, o pet sai do Fluxo e aparece o aviso "está pronto! Disponibilizado para retirada".
3. **Given** cada etapa nova, **Then** a página do tutor é atualizada.

---

### User Story 3 - Voltar etapa e reverter (Priority: P2)

"Voltar para Aguardando/Banho/Escovar" e "Reverter" com motivo obrigatório (ex.: erro de marcação, serviço incompleto, outro com texto). O histórico de reversões fica no pet.

**Why this priority**: Corrige erros sem apagar o atendimento.

**Independent Test**: Reverter um banho e ver o motivo no histórico.

**Acceptance Scenarios**:

1. **Given** motivo vazio, **Then** não reverte.
2. **Given** reversão confirmada, **Then** o pet volta uma etapa e os campos daquela etapa são limpos.

---

### User Story 4 - Problemas de saúde por etapa (Priority: P3)

Em cada etapa o profissional marca problemas encontrados (lista de 11 itens, ex.: pulgas, carrapatos, sarna). Fica gravado o que apareceu em cada etapa.

**Why this priority**: Informação para o tutor e para a loja.

**Independent Test**: Marcar pulgas no banho e ver na janela do pet.

**Acceptance Scenarios**:

1. **Given** problema marcado no banho, **Then** fica registrado na etapa banho, sem repetir o que já vinha de antes.

### Edge Cases

- No celular o Fluxo mostra uma etapa por vez, com seletor de abas.
- "Adicionar Animal" no Fluxo usa a próxima vaga livre; sem vaga, mostra "Todos os slots do dia já foram utilizados".
- Falha ao atualizar o link do tutor não derruba a loja.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Os status válidos DEVEM ser espera, banho, escovar, tosa e finalizado.
- **FR-002**: A coluna Aguardando DEVE usar #F7931E e as demais #0B5A70, independente da personalização da loja.
- **FR-003**: Cada etapa feita DEVE registrar o profissional (banho, escovar, tosa).
- **FR-004**: A etapa Tosa DEVE existir só para serviços com tosa.
- **FR-005**: A reversão DEVE exigir motivo e ficar no histórico do pet.

### Key Entities

- **Pet da fila**: status, profissional por etapa, marcas de etapa concluída, histórico de reversões, problemas de saúde por etapa.
- **Profissional**: nome, sobrenome, função, ativo/inativo (spec 005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhum pet é finalizado com etapa obrigatória pendente.
- **SC-002**: Todo atendimento finalizado tem profissional em cada etapa feita.

## Assumptions

- Serviços sem tosa (banho, ozônio, hidratação) passam por Banho e Escovar e depois ficam prontos.
