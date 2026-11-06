# Feature Specification: Painel do Proprietário

**Feature Branch**: `011-painel-proprietario` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do Painel do Proprietário: visão geral, lojas, liberação de módulos, financeiro, planos, comunicados, acessos e configurações."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar e gerenciar lojas (Priority: P1)

O Proprietário cria uma loja (nome, telefone, responsável, e-mail do admin, plano, mensalidade, dia de vencimento). A loja nasce em teste, com o admin já ligado a ela, e o admin recebe e-mail para criar a senha. Depois o Proprietário ativa, bloqueia ou libera a loja.

**Why this priority**: É como novas lojas entram no sistema.

**Independent Test**: Criar uma loja e entrar com o admin dela.

**Acceptance Scenarios**:

1. **Given** e-mail que já tem conta, **Then** "Esse e-mail já tem uma conta no sistema. Use outro." e nada é gravado.
2. **Given** campos faltando, **Then** "Preencha nome da loja, telefone, responsável e um e-mail válido."
3. **Given** ativar loja em teste, **Then** "Loja ativada. A cobrança começa no próximo vencimento."
4. **Given** bloquear, **Then** a equipe não entra mais; liberar devolve o acesso.
5. **Given** lista de lojas, **Then** filtros Todas, Ativas, Em teste, Atrasadas, Bloqueadas e uso (hoje, 30 dias, dias sem uso).

---

### User Story 2 - Financeiro (Priority: P1)

Mensalidades por mês: paga, a vencer e atrasada (com dias de atraso); marcar e desfazer pagamento; receita por mês.

**Why this priority**: Controle de receita.

**Independent Test**: Marcar uma mensalidade como paga e ver a receita do mês subir.

**Acceptance Scenarios**:

1. **Given** vencimento dia 31, **Then** vira o último dia nos meses curtos.
2. **Given** loja em teste, cortesia (R$ 0) ou mês antes de começar a pagar, **Then** não é cobrada.
3. **Given** primeira mensalidade, **Then** no mês se o vencimento ainda não passou; senão no mês seguinte.
4. **Given** loja bloqueada, **Then** não é cobrada, mas o que pagou continua aparecendo.

---

### User Story 3 - Alertas e visão geral (Priority: P2)

A visão geral mostra lojas, receita e alertas: atraso (sugere bloquear com 15 dias), teste acabando e loja parada.

**Why this priority**: Mostra o que precisa de atenção.

**Independent Test**: Loja 15 dias atrasada aparece com sugestão de bloqueio.

**Acceptance Scenarios**:

1. **Given** loja nova sem atendimento, **Then** não aparece como parada.

---

### User Story 4 - Comunicados (Priority: P2)

O Proprietário publica um aviso para todas as lojas, só lojas em teste ou um plano; as lojas veem no topo ao abrir o sistema ("Aviso da equipe Pata & Gestão"). Pode encerrar o comunicado.

**Why this priority**: Comunicação com clientes.

**Independent Test**: Publicar para "Só lojas em teste" e ver só nelas.

**Acceptance Scenarios**:

1. **Given** título vazio, **Then** "Escreva o título do comunicado."

---

### User Story 5 - Módulos, excluir loja e acessos (Priority: P2)

Liga/desliga módulos por loja (spec 010). Exclui loja digitando o nome exatamente igual. Cadastra outros Proprietários.

**Why this priority**: Administração da plataforma.

**Independent Test**: Excluir uma loja de teste e reutilizar o e-mail do responsável numa loja nova.

**Acceptance Scenarios**:

1. **Given** excluir loja, **Then** só confirma com o nome exato; apaga a loja e tudo dela sem tocar nas outras e libera o e-mail do responsável.
2. **Given** novo Proprietário, **Then** recebe e-mail para criar senha e aparece na lista; e-mail com conta não grava nada.
3. **Given** remover acesso, **Then** remove outros, nunca o próprio; o e-mail fica livre para novo cadastro.

### Edge Cases

- Id da loja sai do nome, sem acento e sem repetir.
- A aba Planos mostra os planos (Básico, Profissional…) com preço e descrição.
- Configurações: regras de cobrança, termos e privacidade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Só quem está em `donos` PODE abrir o painel e escrever lojas, cobranças, comunicados e contas livres.
- **FR-002**: Status de loja DEVEM ser ativa, teste ou bloqueada; a situação atrasada DEVE ser calculada pelas cobranças.
- **FR-003**: O painel DEVE ler só os entregues dos últimos 30 dias para medir uso.
- **FR-004**: Um Proprietário NÃO PODE remover o próprio acesso.
- **FR-005**: Na interface o papel DEVE se chamar "Proprietário".

### Key Entities

- **Loja**, **Cobrança** (loja, mês, valor, pago), **Comunicado** (título, texto, público, ativo), **Proprietário**, **Conta livre** (e-mail liberado após exclusão).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma loja em teste ou cortesia aparece como devedora.

## Assumptions

- Pagamentos são marcados à mão pelo Proprietário (não há integração de pagamento).
