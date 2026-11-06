# Feature Specification: Cadastro do pet e ficha permanente

**Feature Branch**: `001-cadastro-pet-ficha` (spec retroativa; sem branch própria — o código está no branch `claude/project-thread-osv9jv`)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do cadastro de pets na fila do dia, com ficha permanente, código PET, alertas, raças e autorização LGPD."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar pet novo numa vaga (Priority: P1)

A atendente toca numa vaga livre, preenche tutor, telefone, pet, serviço, espécie, porte e raça, marca a autorização LGPD e salva. O pet entra na fila do dia como "Aguardando" e ganha um código permanente (ex.: PET-000123).

**Why this priority**: É a entrada de todo atendimento; sem isso nada funciona.

**Independent Test**: Cadastrar um pet novo numa vaga livre e ver o pet na vaga e no Fluxo, com o código exibido.

**Acceptance Scenarios**:

1. **Given** vaga livre e campos obrigatórios preenchidos com autorização marcada, **When** salvar, **Then** a ficha permanente é criada com código novo, a vaga é reservada e o pet entra na fila com status `espera`; o código aparece numa janela na 1ª visita.
2. **Given** espécie, porte ou raça vazios, **When** salvar, **Then** nada é gravado e o formulário avisa exatamente o que falta.
3. **Given** 1ª visita sem a autorização LGPD marcada, **When** salvar, **Then** não envia e avisa.
4. **Given** telefone vazio, **When** salvar, **Then** aparece aviso com "Cadastrar número" ou "Continuar sem telefone".

---

### User Story 2 - Pet que volta (ficha existente) (Priority: P1)

A atendente busca por "Nº, nome ou telefone", escolhe a ficha e os dados (inclusive alertas) vêm preenchidos.

**Why this priority**: Clientes recorrentes são a maioria; evita redigitar e duplicar fichas.

**Independent Test**: Buscar uma ficha existente, cadastrar e conferir que não foi gerado código novo.

**Acceptance Scenarios**:

1. **Given** ficha existente, **When** buscar por prefixo do código, final do telefone (4+ dígitos) ou início do nome, **Then** a ficha aparece na lista.
2. **Given** ficha escolhida, **When** salvar, **Then** não gasta código novo e atualiza a ficha.
3. **Given** pet dessa ficha já em atendimento hoje, **When** tentar cadastrar de novo, **Then** é bloqueado.
4. **Given** ficha antiga sem autorização LGPD, **When** cadastrar, **Then** pede a autorização nesta visita; ficha que já tem mostra "Tutor já autorizou (LGPD) em {data}" e a data original não muda.

---

### User Story 3 - Alertas do pet (Priority: P2)

Marcar alertas prontos (Alérgico, Morde, Bravo, Medroso, Idoso, Cardíaco, Não usar perfume, Pele sensível, Pelo embolado, Não usar secador), "Outro" com texto livre e uma observação. Os alertas ficam na ficha e uma cópia vai para o pet da fila.

**Why this priority**: Segurança da equipe e do animal.

**Independent Test**: Marcar alertas, salvar e ver os selos no card, na vaga e na janela de detalhes.

**Acceptance Scenarios**:

1. **Given** alertas marcados, **When** salvar, **Then** ficam limpos (sem espaços, vazios ou repetidos), no máximo 12 de até 40 caracteres e observação até 300.
2. **Given** ficha editada no Painel Admin com o pet na fila, **When** salvar, **Then** a cópia da fila de hoje também muda; pet fora da fila: só a ficha muda.
3. **Given** card pequeno, **Then** mostra os 2 primeiros alertas + contador; a janela de detalhes mostra todos + observação; a vaga da Grade mostra ícone com a quantidade.
4. **Given** pet entregue, **Then** o registro do dia guarda os alertas (aparecem em Entregues).

---

### User Story 4 - Raças personalizadas e foto (Priority: P3)

Escolher raça das listas padrão de cão e gato, ou cadastrar raça própria da loja em "Gerenciar raças". Enviar foto do pet.

**Why this priority**: Conveniência; o cadastro funciona com as listas padrão.

**Independent Test**: Criar uma raça nova e vê-la na lista ao cadastrar.

**Acceptance Scenarios**:

1. **Given** raça com nome já existente na espécie, **When** criar, **Then** é recusada.
2. **Given** usuário não admin, **Then** pode criar raça, mas não excluir nem renomear.
3. **Given** arquivo que não é imagem, ou foto acima de 5 MB que não deu para reduzir, **When** enviar, **Then** é recusado sem envio.

### Edge Cases

- Dois aparelhos cadastram na mesma vaga ao mesmo tempo: só um entra; o outro recebe "vaga ocupada" e o formulário continua aberto, sem perder o que foi digitado.
- Vaga já usada hoje (pet entregue): recusa com mensagem própria.
- Toque duplo no salvar: cadastra uma vez só.
- Erro de rede: mensagem genérica e formulário aberto.
- Editando pet que já começou o atendimento: espécie, porte e raça ficam travados e o salvar continua possível.
- Edição pela fila leva para a ficha só os campos da ficha que mudaram (nome, raça etc.), nunca observação nem serviço; se salvar o atendimento falhar, a ficha não é mexida; ficha excluída não é recriada.
- Editando um pet da fila: não pede autorização LGPD.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE gravar ficha, reserva da vaga e pet da fila numa única transação.
- **FR-002**: O sistema DEVE gerar código sequencial `PET-000000` só na 1ª visita, com contador que só sobe de 1 em 1.
- **FR-003**: Serviço, espécie, porte e raça DEVEM ser obrigatórios no cadastro.
- **FR-004**: O formulário DEVE oferecer os serviços Banho, Tosa, Higiênica, Ozônio e Hidratação.
- **FR-005**: O sistema DEVE exigir a autorização LGPD na 1ª visita e em fichas antigas sem autorização, gravando data e quem registrou uma única vez; o campo não vai para a fila.
- **FR-006**: A busca DEVE aceitar prefixo do código, final do telefone (4+ dígitos) ou início do nome.
- **FR-007**: Alertas DEVEM respeitar 12 itens / 40 caracteres / observação 300 (também nas regras do banco).
- **FR-008**: Nome do pet DEVE ter 1–100 caracteres e nome do tutor até 100.
- **FR-009**: Raças personalizadas DEVEM ser por loja (nome até 60, espécie cão/gato); só o admin renomeia ou exclui.
- **FR-010**: Fotos DEVEM ser enviadas ao Cloudinary.
- **FR-011**: Ao cadastrar, o sistema DEVE criar o link de acompanhamento do tutor (ver spec 013).
- **FR-012**: Só o admin PODE excluir uma ficha; a equipe cria e edita.

### Key Entities

- **Ficha do pet (petsCadastro)**: código, nome do pet, tutor, telefone (e telefone invertido para busca), espécie, porte, raça, foto, alertas, observação de alerta, autorização LGPD (data, por id, por nome).
- **Pet da fila (dias/{dia}/pets)**: vaga, status, serviço, dados copiados da ficha, cópia dos alertas.
- **Raça**: nome, espécie.
- **Contador**: próximo número de código.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma vaga fica com dois pets, mesmo com dois aparelhos ao mesmo tempo.
- **SC-002**: Pet recorrente nunca gera segundo código.
- **SC-003**: 100% das fichas novas têm a autorização LGPD registrada.

## Assumptions

- Telefone é opcional, por decisão da loja no momento do cadastro.
- Decisão do André (2026-11-06): "Banho + Tosa" (banho_tosa) fica fora do formulário de propósito, porque toda tosa já inclui o banho. O valor só existe para dados antigos, que continuam aparecendo normalmente. Também saiu do agendamento online (spec 014).
