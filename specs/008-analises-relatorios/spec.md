# Feature Specification: Análises, dicas e relatórios em PDF

**Feature Branch**: `008-analises-relatorios` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa das Análises (visão geral, dicas, serviços e equipe, pets, clientes) e dos Relatórios (contagem por período e PDF)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os números da loja (Priority: P1)

O admin abre Análises e escolhe o período (7 dias, 30 dias, este mês, 90 dias). Vê atendimentos, tempo médio, clientes novos e que voltaram, removidos, atendimentos por dia, chegadas por hora, serviços, profissionais, perfil dos pets e clientes fiéis/sumidos.

**Why this priority**: É o principal valor de gestão para o dono da loja.

**Independent Test**: Abrir Análises com 30 dias e conferir a soma com a aba Entregues.

**Acceptance Scenarios**:

1. **Given** período de 30 dias, **Then** compara com os 30 dias anteriores; 90 dias não compara.
2. **Given** dias sem movimento, **Then** aparecem com zero no gráfico.
3. **Given** chegada às 12:30 UTC, **Then** conta às 9h (horário de São Paulo).
4. **Given** cliente sumido (última visita entre 30 e 90 dias), **Then** aparece com botão "Abrir WhatsApp com mensagem pronta" (desativado sem telefone válido).

---

### User Story 2 - Dicas automáticas (Priority: P2)

A aba Dicas mostra recomendações ordenadas por prioridade: queda ou alta de movimento, pico e horário ocioso, dia mais fraco, clientes sumidos, baixo retorno, serviço lento por porte, pouco procurado, muitos removidos, divisão de banhos desequilibrada, ou "Tudo em equilíbrio".

**Why this priority**: Transforma números em ação.

**Independent Test**: Período com queda de 10%+ mostra "Movimento caiu X%".

**Acceptance Scenarios**:

1. **Given** poucos dados, **Then** pede um período maior.
2. **Given** várias dicas, **Then** vêm ordenadas por prioridade.

---

### User Story 3 - Relatório por período e PDF (Priority: P2)

Em Relatórios o admin escolhe início e fim, gera a contagem de serviços entregues e baixa o PDF "Relatório de Atendimentos" com o nome da loja.

**Why this priority**: Prestação de contas e conferência.

**Independent Test**: Gerar o PDF de uma semana.

**Acceptance Scenarios**:

1. **Given** início maior que fim, **Then** "A data de início não pode ser maior que a data fim."
2. **Given** mais de 31 dias, **Then** "Período máximo: 31 dias."
3. **Given** período sem registros, **Then** "Nenhum registro encontrado para o período selecionado."

### Edge Cases

- Sem internet: "Não foi possível carregar os dados. Verifique a internet."
- Tutor removido (LGPD) não aparece nas listas de clientes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Atendimentos DEVEM contar só registros "entregue".
- **FR-002**: Horários DEVEM usar o fuso America/Sao_Paulo.
- **FR-003**: O relatório DEVE limitar o período a 31 dias.
- **FR-004**: Os dados DEVEM ser só da loja do usuário.

### Key Entities

- **Registro do dia**, **Ficha do pet** (fonte dos cálculos).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Os totais das Análises batem com a soma das abas Entregues no período.

## Assumptions

- As leituras ficam dentro do limite do plano gratuito do Firebase porque o período máximo é 90 dias.
