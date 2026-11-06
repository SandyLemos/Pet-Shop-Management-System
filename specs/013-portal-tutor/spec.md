# Feature Specification: Portal do tutor (link de acompanhamento)

**Feature Branch**: `013-portal-tutor` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa do link de acompanhamento: o tutor vê as etapas do pet ao vivo, sem app e sem senha."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar o link ao tutor (Priority: P1)

Na janela do pet, a equipe vê o link de acompanhamento e pode copiar ou enviar pelo WhatsApp com mensagem pronta (primeiro nome do tutor, pet, serviço, loja e link).

**Why this priority**: Reduz ligações perguntando "já está pronto?".

**Independent Test**: Enviar o link e abri-lo no celular.

**Acceptance Scenarios**:

1. **Given** pet antigo sem link, **Then** botão "Gerar link para o tutor".
2. **Given** sem telefone válido, **Then** WhatsApp desativado e aviso para copiar.
3. **Given** já enviado, **Then** mostra "Enviado às {hora}" e oferece "Reenviar no WhatsApp".

---

### User Story 2 - Tutor acompanha as etapas (Priority: P1)

O tutor abre o link e vê o pet, a etapa atual e a linha do tempo (chegada, banho, escovar, tosa se houver, pronto, entregue); a página muda sozinha.

**Why this priority**: Experiência do cliente.

**Independent Test**: Avançar o pet na loja e ver a página do tutor mudar.

**Acceptance Scenarios**:

1. **Given** serviço sem tosa, **Then** a etapa Tosa não aparece.
2. **Given** link vencido ou inexistente, **Then** "Link indisponível" com aviso amigável.
3. **Given** pet com entrega, **Then** mostra "saiu para entrega" e "entregue".

### Edge Cases

- Erro ao atualizar o link não derruba a loja.
- Pet sem link: as mudanças de etapa não fazem nada no portal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O código DEVE ser longo e aleatório (20–40 letras e números).
- **FR-002**: O link DEVE valer até as 6h do dia seguinte (horário de Brasília); o banco recusa validade acima de 3 dias.
- **FR-003**: O documento do link DEVE guardar só o necessário (sem telefone) e ser lido só por código (`get`, sem `list`).
- **FR-004**: Status do link DEVEM cobrir as etapas da fila mais saiu_entrega, entregue e removido.

### Key Entities

- **Acompanhamento (acompanhamentos/{codigo})**: loja (id, nome, logo, cores), nome do pet, espécie, serviço, etapa, dia, horários de cada etapa, validade. Não guarda nome nem telefone do tutor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A página do tutor reflete a mudança de etapa sem recarregar.

## Assumptions

- O envio é opcional: a equipe só manda se o cliente quiser.
