# Feature Specification: Agendamento online pelo tutor

**Feature Branch**: `014-agendamento-online` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do módulo Agendamento online: a loja libera vagas por dia, o tutor marca pelo link, a loja confirma, recusa, busca e confirma a chegada; vaga da grade dada na chegada; busca e entrega."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Loja libera vagas online (Priority: P1)

Com o módulo liberado pelo Proprietário, o admin escolhe quantas vagas de cada dia (próximos 14 dias, até 30 por dia) o tutor pode marcar e copia o link da página de agendamento (`/agendar/{loja}`).

**Why this priority**: Sem vagas liberadas o tutor não marca.

**Independent Test**: Liberar 3 vagas amanhã e vê-las na página do tutor.

**Acceptance Scenarios**:

1. **Given** dia com 0 vagas, **Then** "Nenhuma vaga online neste dia. O cliente não consegue marcar."
2. **Given** reduzir vagas, **Then** nunca tira uma vaga já marcada por tutor; tira primeiro as maiores livres.
3. **Given** loja sem o módulo, **Then** a área não aparece no Admin.

---

### User Story 2 - Tutor faz o pedido (Priority: P1)

O tutor escolhe o dia, informa nome, WhatsApp com DDD, pet, espécie, porte, raça (opcional), serviço, transporte (sem, busca e entrega, só busca, só entrega) e observação, marca a autorização LGPD e envia. Recebe um link (`/agendamento/{código}`) para acompanhar e pode cancelar.

**Why this priority**: É a função principal do módulo.

**Independent Test**: Fazer um pedido e ver o aviso na loja.

**Acceptance Scenarios**:

1. **Given** envio, **Then** a vaga online é marcada e o pedido `pendente` criado na mesma gravação.
2. **Given** dois tutores na mesma vaga, **Then** o segundo recebe "As vagas online deste dia acabaram de esgotar. Escolha outro dia."
3. **Given** transporte com busca ou entrega, **Then** exige endereço completo; localização é opcional.
4. **Given** pedido pendente ou confirmado, **When** o tutor cancela, **Then** a vaga online fica livre.
5. **Given** sem autorização LGPD, **Then** "Marque a autorização para a loja guardar seus dados."
6. **Given** a lista de serviços, **Then** não aparece "Banho e tosa" (toda tosa já inclui banho).

---

### User Story 3 - Loja trata os pedidos (Priority: P1)

O aviso de pedidos online mostra os pedidos: Confirmar, Recusar (motivo opcional; a vaga online volta a ficar livre), "Saiu para buscar" (com busca), "Não veio" e "Confirmar chegada". Na chegada o pet vai para a próxima vaga livre da grade depois da última ocupada, na ordem de chegada.

**Why this priority**: Liga o pedido online à fila real.

**Independent Test**: Confirmar e marcar a chegada; ver o pet na grade.

**Acceptance Scenarios**:

1. **Given** confirmar, **Then** fica "aguardando chegada"; a chegada mantém a vaga online presa.
2. **Given** chegada, **Then** o pet entra na fila com o link do tutor; se a vaga calculada for tomada, tenta de novo (até 5 vezes).
3. **Given** pedido com entrega, **Then** depois de pronto segue: pronto → saiu para entrega → entregue em casa (spec 004).

---

### User Story 4 - Tutor acompanha o pedido (Priority: P2)

A página do pedido mostra o andamento: pendente → confirmado → (saiu para buscar) → chegou → etapas da loja (pelo link do pet) → pronto/entrega → entregue. Atualiza sozinha.

**Why this priority**: Transparência para o cliente.

**Independent Test**: Avançar o pedido na loja e ver a página do tutor.

**Acceptance Scenarios**:

1. **Given** confirmado, **Then** a próxima etapa é a chegada na loja.
2. **Given** só busca, **Then** depois de pronto segue: pronto para buscar → entregue.

### Edge Cases

- Lugares online do dia são 1..N e NÃO são números da grade.
- Lugares livres = liberados menos marcados.
- Pedido vence em até 16 dias.
- A loja publica quantos pets estão na loja hoje quando o agendamento está aberto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O módulo DEVE estar ligado em `lojas/{id}.modulos.agendamento` (padrão desligado).
- **FR-002**: Só o Proprietário liga/desliga a página pública; o admin atualiza a agenda pública só com o módulo.
- **FR-003**: Cada vaga marcada DEVE ter trava própria (`marcadas/{vaga}`) para impedir duas marcações.
- **FR-004**: Telefone DEVE ter 10–13 dígitos; porte, serviço e transporte DEVEM ser validados nas regras.
- **FR-005**: Status do pedido: pendente, confirmado, buscando, chegou, recusado, faltou, cancelado (pelo tutor) e cancelado_ok (visto pela loja).
- **FR-006**: Motivo da recusa até 200 caracteres.
- **FR-007**: O tutor só PODE cancelar pedido pendente ou confirmado.
- **FR-008**: Os serviços do pedido online DEVEM ser Banho, Tosa, Tosa higiênica, Hidratação e Ozônio. "Banho + Tosa" é recusado no pedido novo (formulário e regras do banco), mas pedidos antigos com ele continuam válidos e aparecem com o nome "Banho e tosa".

### Key Entities

- **Agenda pública (agendaPublica/{lojaId})**: ativa, nome, logo, cores; dias com vagas (até 30) e petsNaLoja.
- **Trava de vaga (marcadas/{vaga})**.
- **Pedido (agendamentos/{codigo})**: loja, dia, vaga online, tutor, telefone, pet, espécie, porte, raça, serviço, transporte, endereço, localização, observação, status, motivo, petId, linkTutor, vaga da grade, buscaSaiuEm, validade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma vaga online é marcada por dois tutores.
- **SC-002**: Recusa e cancelamento sempre devolvem a vaga online.

## Assumptions

- Não há horário: o tutor leva o pet no dia, e a vaga na fila é dada na chegada.
- "Não veio" (status faltou) é marcado à mão pela loja no aviso de pedidos; não há marcação automática no fim do dia.
- Decisão do André (2026-11-06): "Banho + Tosa" (banho_tosa) saiu da página do tutor, igual ao cadastro da loja (spec 001), porque toda tosa já inclui o banho. Pedidos antigos com banho_tosa continuam aparecendo normalmente.
- Ao apagar os dados do tutor (LGPD, spec 006), os pedidos dele que não estão em andamento ficam com o nome "Removido (LGPD)" e sem telefone, endereço e localização.
