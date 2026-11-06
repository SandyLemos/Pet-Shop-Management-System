# Feature Specification: Pets cadastrados, apagar dados do tutor (LGPD) e backup

**Feature Branch**: `006-pets-cadastrados-lgpd` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa da lista de pets cadastrados no Painel Admin, com edição, exclusão de ficha, apagar dados do tutor (LGPD) e backup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar e editar fichas (Priority: P1)

O admin vê a lista de fichas com busca, edita os dados do pet e do tutor e salva.

**Why this priority**: Mantém a base de clientes correta.

**Independent Test**: Editar o telefone de uma ficha e vê-lo no próximo cadastro.

**Acceptance Scenarios**:

1. **Given** nome do pet ou do tutor vazio, **Then** "Preencha nome do pet e do tutor."
2. **Given** ficha editada com o pet na fila de hoje, **Then** a cópia da fila (alertas) também muda.
3. **Given** nenhuma ficha, **Then** "Nenhum pet cadastrado — Os pets aparecem aqui após o primeiro cadastro."

---

### User Story 2 - Apagar dados do tutor (LGPD) (Priority: P1)

"Apagar dados" troca o nome do tutor por "Removido (LGPD)" e apaga o telefone em todo o histórico da loja e nos pedidos do agendamento online desse pet, e depois exclui a ficha.

**Why this priority**: Direito do titular pela LGPD.

**Independent Test**: Apagar os dados de um tutor e conferir histórico e análises.

**Acceptance Scenarios**:

1. **Given** tutor sem pet na fila, **When** apagar, **Then** o histórico desde 01/01/2026 passa a "Removido (LGPD)", os outros tutores não mudam e a ficha é excluída.
2. **Given** pet ainda na fila, **Then** não apaga nada e avisa.
3. **Given** tutor removido, **Then** não aparece nas listas de clientes das Análises.
4. **Given** registro antigo com telefone (mesmo que o nome já esteja "Removido (LGPD)"), **When** apagar, **Then** o telefone fica vazio.
5. **Given** pedidos do agendamento online desse pet (mesmo telefone e mesmo nome do pet, ou que viraram atendimento dele), **When** apagar, **Then** ficam com nome "Removido (LGPD)" e sem telefone, endereço e localização; pedidos de outro pet do mesmo telefone e de outras lojas não mudam.
6. **Given** pedido online em andamento (pendente, confirmado ou saiu para buscar), **Then** não apaga nada e avisa para recusar ou receber o pet antes.

---

### User Story 3 - Excluir ficha (Priority: P3)

O admin exclui uma ficha com confirmação ("Excluir cadastro?").

**Why this priority**: Limpeza de cadastros errados.

**Independent Test**: Excluir uma ficha e não encontrá-la na busca.

**Acceptance Scenarios**:

1. **Given** usuário não admin, **Then** não consegue excluir.

---

### User Story 4 - Backup (Priority: P2)

"Baixar backup" gera um arquivo com fichas e os dias com movimento, com datas em texto.

**Why this priority**: Segurança dos dados da loja.

**Independent Test**: Baixar o backup e abrir o arquivo.

**Acceptance Scenarios**:

1. **Given** clique em Baixar backup, **Then** mostra "Gerando backup…" e depois "Backup baixado! Guarde o arquivo em local seguro."

### Edge Cases

- Erro de rede ao apagar: "Erro ao apagar os dados. Tente novamente."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Apagar dados DEVE falhar com aviso se o pet estiver na fila.
- **FR-002**: Nos registros do dia, o admin só PODE mudar `nomeTutor` para "Removido (LGPD)" e `telefone` para vazio (regra do banco).
- **FR-002a**: Nos pedidos online que não estão em andamento, o admin só PODE mudar `nomeTutor` para "Removido (LGPD)", `telefone` para vazio e `endereco`/`localizacao` para nulo (regra do banco).
- **FR-002b**: As gravações DEVEM ir em lotes (até 400 por lote) para poupar o plano gratuito.
- **FR-002c**: O link do portal do tutor não guarda nome nem telefone, então não precisa ser limpo.
- **FR-003**: Só o admin PODE excluir fichas.
- **FR-004**: O backup DEVE conter só dados da loja do usuário.

### Key Entities

- **Ficha do pet**, **Registro do dia** (ver specs 001 e 004).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de apagar, o nome e o telefone do tutor não aparecem em nenhuma tela da loja.

## Assumptions

- O histórico anterior a 01/01/2026 não existe no formato atual, por isso a anonimização começa nessa data.
- Decisão do André (2026-11-06): ao apagar os dados, o telefone também é apagado nos registros antigos e nos pedidos online, além de o nome virar "Removido (LGPD)". A ficha (com telefone) é excluída.
- A fila não precisa de limpeza: com o pet na fila, o apagar é bloqueado.
