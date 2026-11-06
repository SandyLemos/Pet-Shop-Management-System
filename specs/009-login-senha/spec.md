# Feature Specification: Login, primeiro acesso e esqueci a senha

**Feature Branch**: `009-login-senha` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa da entrada no sistema: login por e-mail e senha, troca obrigatória da senha provisória e recuperação de senha."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar no sistema (Priority: P1)

A pessoa informa e-mail e senha. Funcionário e admin entram na loja deles; o Proprietário entra no Painel do Proprietário.

**Why this priority**: Porta de entrada de tudo.

**Independent Test**: Entrar com funcionário, admin e Proprietário.

**Acceptance Scenarios**:

1. **Given** senha errada, **Then** mostra a mensagem certa e não desconecta nada.
2. **Given** conta sem registro no sistema (ex.: ex-funcionário), **Then** é recusada, desconectada e vê a mensagem; sessão salva dessa conta é derrubada ao abrir o app.
3. **Given** sem internet ao abrir, **Then** não fica preso no splash e NÃO desconecta o tablet.
4. **Given** sair, **Then** pede confirmação e limpa tudo, sem mensagem de erro.

---

### User Story 2 - Primeiro acesso (Priority: P1)

Conta criada com senha provisória entra, mas cai na tela de primeiro acesso (com o nome da pessoa) para criar a senha nova.

**Why this priority**: Segurança: a senha provisória não pode continuar valendo.

**Independent Test**: Entrar com senha provisória e criar a senha nova.

**Acceptance Scenarios**:

1. **Given** senha nova, **Then** o botão só libera com 8+ caracteres, letra, número e as duas iguais.
2. **Given** salvar, **Then** troca a senha e grava `trocarSenha` = false.
3. **Given** login antigo demais, **Then** pede para sair e entrar de novo e não tira a marca.
4. **Given** contas antigas sem o campo, **Then** não são afetadas.

---

### User Story 3 - Esqueci a senha (Priority: P2)

Na tela de login, "Esqueci a senha" envia o link de troca para o e-mail digitado.

**Why this priority**: Evita chamar suporte para senha esquecida.

**Independent Test**: Pedir o link com um e-mail cadastrado.

**Acceptance Scenarios**:

1. **Given** sem e-mail digitado, **Then** pede o e-mail e não envia.
2. **Given** e-mail com ou sem cadastro, **Then** a MESMA mensagem neutra (não revela quem existe).
3. **Given** sem internet, **Then** avisa da conexão.

### Edge Cases

- Abrir outro componente que usa a autenticação não reinicia a loja de quem já entrou.
- Depois de uma recusa, outro funcionário entra sem a mensagem antiga.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A autenticação DEVE usar Firebase Auth (e-mail e senha).
- **FR-002**: Conta sem documento em `usuarios` ou `donos` DEVE ser recusada.
- **FR-003**: Com `trocarSenha` = true, a pessoa só PODE trocar a senha; a regra do banco só permite mudar esse campo de true para false.
- **FR-004**: A ordem das telas DEVE ser: login → primeiro acesso → Painel do Proprietário (se Proprietário) → aviso de módulo não liberado (se a loja não tem Banho e tosa) → sistema.

### Key Entities

- **Usuário**: papel, lojaId, trocarSenha, nome.
- **Proprietário (donos)**: nome, e-mail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhum ex-funcionário consegue usar o sistema depois de ser excluído.

## Assumptions

- O e-mail de recuperação é o padrão do Firebase.
