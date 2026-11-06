# Feature Specification: Painel Admin — usuários e profissionais

**Feature Branch**: `005-painel-admin-equipe` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do Painel Admin da loja: usuários do sistema com senha provisória e cadastro de profissionais."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar funcionário com senha provisória (Priority: P1)

O admin da loja cria um usuário (nome, sobrenome, e-mail, nível de acesso). O sistema gera uma senha provisória e mostra a tela de sucesso com login, senha, botão copiar, WhatsApp e Pronto.

**Why this priority**: A equipe só entra no sistema assim.

**Independent Test**: Criar um funcionário e entrar com a senha provisória.

**Acceptance Scenarios**:

1. **Given** formulário, **Then** não pede senha ("O sistema gera uma senha provisória na próxima tela").
2. **Given** salvar, **Then** cria a conta, grava `trocarSenha` e NÃO envia e-mail.
3. **Given** e-mail já em uso, **Then** avisa "Este e-mail já está em uso." e não grava nada.
4. **Given** campos vazios, **Then** "Preencha todos os campos." e nada é criado.

---

### User Story 2 - Editar e excluir usuários (Priority: P2)

O admin edita nome e nível (admin ou user) e exclui usuários da loja. O e-mail não pode ser alterado.

**Why this priority**: Manutenção da equipe.

**Independent Test**: Trocar o nível de um funcionário e excluir outro.

**Acceptance Scenarios**:

1. **Given** o próprio admin, **Then** não pode mudar o próprio nível nem se excluir.
2. **Given** usuário de outra loja, **Then** o admin não consegue ver nem editar.

---

### User Story 3 - Profissionais (Priority: P1)

O admin cadastra profissionais (nome, sobrenome, função, status ativo/inativo). Só ativos aparecem nas seleções do Fluxo.

**Why this priority**: Necessário para iniciar atendimentos.

**Independent Test**: Cadastrar um profissional e vê-lo ao iniciar atendimento; inativá-lo e ver que some.

**Acceptance Scenarios**:

1. **Given** campos vazios, **Then** "Preencha todos os campos."
2. **Given** excluir, **Then** pede confirmação ("Esta ação é permanente").

### Edge Cases

- Cada funcionário recebe senha provisória diferente.
- O botão "Admin" do topo aparece só para admin.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Senha provisória DEVE ter o formato Xxxx-Xxxx, com maiúscula, minúscula e número, sem caracteres ambíguos.
- **FR-002**: Admin DEVE criar e editar usuários só da própria loja; papéis válidos: admin, user.
- **FR-003**: Admin NÃO PODE alterar o próprio papel nem se excluir.
- **FR-004**: Só admin DEVE escrever profissionais.
- **FR-005**: O Painel Admin DEVE ter as áreas: Usuários, Profissionais, Pets (spec 006), Personalização (spec 007), Relatórios/Análises (spec 008), Backup e, com o módulo liberado, vagas online (spec 014).

### Key Entities

- **Usuário (usuarios/{uid})**: nome, sobrenome, e-mail, papel, lojaId, trocarSenha.
- **Profissional**: nome, sobrenome, função, ativo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um funcionário novo entra no sistema em menos de 2 minutos após ser criado.
- **SC-002**: Nenhum admin consegue mexer em usuários de outra loja.

## Assumptions

- A senha provisória é entregue pelo admin (copiar ou WhatsApp), nunca por e-mail.
