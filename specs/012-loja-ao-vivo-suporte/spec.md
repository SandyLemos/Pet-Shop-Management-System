# Feature Specification: Loja ao vivo e suporte acompanhando

**Feature Branch**: `012-loja-ao-vivo-suporte` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa da tela Loja ao vivo no Painel do Proprietário (só leitura) e do acompanhamento do aparelho da loja pelo suporte."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a loja ao vivo (Priority: P1)

O Proprietário abre uma loja e vê a mesma Grade, Fluxo e Entregues da loja, em tempo real, só para leitura.

**Why this priority**: Suporte e acompanhamento sem ir à loja.

**Independent Test**: Cadastrar um pet na loja e vê-lo aparecer na tela ao vivo.

**Acceptance Scenarios**:

1. **Given** pet na vaga 3, **Then** aparece na vaga 3 da tela ao vivo.
2. **Given** vaga livre, **When** tocar, **Then** NÃO abre o cadastro.
3. **Given** a tela, **Then** dá para trocar entre Grade, Fluxo e Entregues e fechar.

---

### User Story 2 - Acompanhar o aparelho da loja (Priority: P2)

O suporte escolhe um aparelho da loja e a tela ao vivo segue o que está aberto nele (aba e janela: cadastro de uma vaga, detalhe de um pet). A loja vê o selo "Suporte Pata & Gestão acompanhando esta tela".

**Why this priority**: Ajuda a orientar a equipe por telefone.

**Independent Test**: Abrir o cadastro da vaga 5 no tablet e ver a mesma janela no painel.

**Acceptance Scenarios**:

1. **Given** o tablet abre o detalhe de um pet, **Then** o painel abre o mesmo detalhe e segue a aba.
2. **Given** "Parar de acompanhar", **Then** o painel navega sozinho.
3. **Given** nenhum aparelho aberto, **Then** "nenhum aparelho com o sistema aberto agora".

### Edge Cases

- O aparelho só envia o que está aberto enquanto o suporte acompanha, e apaga ao parar (economia do plano gratuito).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela ao vivo NÃO PODE alterar nada na loja.
- **FR-002**: Cada aparelho DEVE informar em `telas/{aparelho}` nome, aba (grid, kanban, entregues), janela e horário, só enquanto houver suporte acompanhando.
- **FR-003**: A loja DEVE ver o selo enquanto o suporte acompanha.

### Key Entities

- **Tela (lojas/{id}/telas/{aparelho})**: nome, aba, janela, atualizadoEm.
- **Suporte (lojas/{id}/suporte)**: marca de acompanhamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A janela aberta no tablet aparece no painel em poucos segundos.

## Assumptions

- O aparelho é identificado por um nome local guardado no navegador.
