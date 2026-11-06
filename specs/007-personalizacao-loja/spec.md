# Feature Specification: Personalização da loja (logo e cores)

**Feature Branch**: `007-personalizacao-loja` (spec retroativa; sem branch própria)

**Created**: 2026-11-06

**Status**: Draft (retroativa — descreve o comportamento atual)

**Input**: User description: "Spec retroativa da aba Personalização: logo da loja e cores principal e de destaque, aplicadas só no topo e no Painel Admin."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar logo e usar as cores dela (Priority: P1)

O admin envia a logo (PNG ou JPG, até 5 MB). O sistema sugere cores tiradas da logo (a mais escura como principal, outra como destaque); o admin ajusta e salva.

**Why this priority**: Dá a cara da loja ao sistema.

**Independent Test**: Enviar uma logo colorida, salvar e ver o topo mudar na hora.

**Acceptance Scenarios**:

1. **Given** logo colorida, **Then** "Logo enviada! Aplicamos cores que combinam com ela."
2. **Given** logo sem cor aproveitável (preto e branco), **Then** não sugere nada e pede para escolher.
3. **Given** salvar, **Then** grava só logo e cores na loja e a tela atualiza na hora.

---

### User Story 2 - Voltar ao padrão (Priority: P2)

"Voltar às cores padrão" apaga logo e cores do banco e restaura o visual Pata & Gestão.

**Why this priority**: Desfaz uma personalização ruim.

**Independent Test**: Voltar ao padrão e ver o topo original.

**Acceptance Scenarios**:

1. **Given** cores já escolhidas, **When** abrir a aba, **Then** não são trocadas pelas da logo.
2. **Given** loja com logo antiga fora do Cloudinary, **Then** consegue salvar só as cores.

### Edge Cases

- Logo que não veio do envio (URL de fora do Cloudinary) é recusada.
- Ao sair da conta, o topo não volta para a logo da Pata & Gestão antes de terminar de sair.
- Cores no sistema: sem personalização, as da Pata & Gestão; com personalização, as da loja.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin da loja só PODE alterar `logoUrl`, `cores` e `personalizadoEm` da sua loja.
- **FR-002**: `logoUrl` DEVE ser https do Cloudinary, até 500 caracteres; cores DEVEM ser hexadecimais.
- **FR-003**: A personalização DEVE mudar só o topo e o Painel Admin; colunas do Fluxo e cores de situação ficam fixas.
- **FR-004**: Cores vindas do banco DEVEM ser validadas antes de usar.

### Key Entities

- **Loja (lojas/{id})**: logoUrl, cores {principal, destaque}, personalizadoEm.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A loja fica com logo e cores próprias em menos de 1 minuto.

## Assumptions

- O Proprietário também vê logo e cores de cada loja no seu painel.
