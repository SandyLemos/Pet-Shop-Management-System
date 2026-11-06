# Constituição do Pata & Gestão

Pata & Gestão é um SaaS multi-loja de gestão de banho e tosa para petshops, feito em
React + Vite + TypeScript, com Firebase (Auth, Firestore, Hosting) e Cloudinary para imagens.

## Core Principles

### I. Plano gratuito do Firebase (NÃO NEGOCIÁVEL)

- O sistema DEVE funcionar inteiro no plano gratuito (Spark) do Firebase.
- É PROIBIDO usar Cloud Functions, servidores próprios ou qualquer serviço pago; toda a
  lógica roda no navegador e a segurança fica nas `firestore.rules`.
- Toda funcionalidade DEVE manter leituras e gravações baixas: preferir consultas
  filtradas por loja/dia, documentos agregados e listeners só onde forem necessários;
  evitar varreduras de coleções inteiras e gravações repetidas.
- Uploads de imagem vão para o Cloudinary; só URLs `https://res.cloudinary.com/` são
  aceitas (validadas no app e nas regras).

**Razão**: o projeto precisa ter custo zero de infraestrutura para ser viável.

### II. Isolamento por loja nas regras do Firestore

- Todo dado de uma loja DEVE ficar sob `lojas/{lojaId}` (ou ser vinculado a ela por
  `lojaId`) e só pode ser lido/gravado por quem é da loja (`daLoja`/`adminDaLoja`) ou
  pelo Proprietário do sistema.
- O isolamento DEVE ser garantido nas `firestore.rules`, nunca só na interface.
- Toda mudança de modelo de dados ou de acesso DEVE atualizar, no mesmo trabalho, o
  código, as `firestore.rules` e os testes correspondentes. Regra sem teste, ou teste
  desatualizado em relação à regra, é defeito.
- Contas sem registro em `/usuarios` (ou `/donos`) não acessam nada.

**Razão**: várias lojas usam o mesmo banco; vazamento entre lojas é inaceitável.

### III. Testes e build verdes antes de qualquer deploy

- `npm run check` (typecheck + vitest) e `npm run build` DEVEM passar antes de qualquer
  deploy. Falha em qualquer um bloqueia o deploy.
- Toda funcionalidade nova ou correção DEVE vir com testes vitest em `tests/` que cubram
  o comportamento e as regras de acesso afetadas.

**Razão**: o sistema é usado ao vivo no balcão; regressão para o atendimento.

### IV. LGPD e dados do tutor

- O cadastro DEVE registrar o consentimento do tutor (`consentimentoLgpd`, com data e
  quem registrou) antes de guardar os dados.
- DEVE existir e continuar funcionando a ação "apagar dados do tutor"
  (`apagarDadosTutor`), removendo os dados pessoais do tutor.
- É PROIBIDO coletar dados sensíveis (saúde do tutor, documentos, dados financeiros
  etc.) além do necessário para o atendimento do pet.
- Senhas existem SOMENTE no Firebase Auth; nunca são gravadas no Firestore, em logs ou
  no código.

**Razão**: obrigação legal e confiança dos tutores e das lojas.

### V. Padrão visual fixo e personalização restrita

- O padrão visual do sistema é fixo: fundo claro no tom de `#1A90D0`; no Fluxo, a coluna
  "Aguardando" é laranja `#F7931E` e as demais colunas são petróleo `#0B5A70`.
- A personalização da loja (logo, cores, nome) altera SOMENTE o topo e o Painel Admin;
  não pode mudar o Fluxo, as colunas nem o restante da interface.

**Razão**: identidade consistente do produto e leitura rápida do Fluxo pela equipe.

### VI. Linguagem do sistema

- O papel de dono do sistema/da loja é chamado de "Proprietário" em todo texto visível
  ao usuário; nunca "dono". (Nomes internos de código, como `isDono`, podem ficar.)
- Toda a interface e as mensagens são em português do Brasil.

**Razão**: vocabulário escolhido pelo André e esperado pelos clientes.

### VII. Celular sem quebrar tablet/desktop

- Telas com largura abaixo de 640px DEVEM ter layout próprio para celular.
- Ajustes para celular NÃO PODEM alterar o layout de tablet e desktop (≥640px);
  qualquer mudança de layout é conferida nas três larguras.

**Razão**: o sistema é usado no balcão (tablet/desktop) e no celular da equipe e dos
tutores.

## Restrições técnicas

- Stack: React 18 + Vite + TypeScript, Tailwind, Firebase (Auth, Firestore, Hosting),
  Cloudinary para imagens, PWA via `vite-plugin-pwa`, testes com vitest + Testing Library.
- Nenhuma dependência nova pode exigir servidor, função em nuvem ou plano pago.
- Módulos restritos a uma loja (ex.: agendamento online da loja "teste 01") DEVEM ser
  liberados por configuração da loja e protegidos também nas regras.

## Fluxo de trabalho, deploy e commits

- Deploy (`npx firebase deploy` ou `npm run deploy`) SÓ acontece depois que o André
  disser explicitamente "pode fazer o deploy".
- Antes de pedir essa autorização, DEVE ser mostrada uma prévia visual (capturas de tela
  das telas alteradas, incluindo celular quando houver mudança de layout).
- Ordem obrigatória: implementar → testes e build verdes (Princípio III) → prévia visual
  → autorização do André → deploy.
- Commits e pushes são feitos manualmente pelo André. Agentes e assistentes NÃO fazem
  commit nem push.

## Governance

- Esta constituição prevalece sobre outras práticas do projeto. Specs, planos e tarefas
  do Spec Kit DEVEM verificar conformidade com ela (Constitution Check).
- Exceções a um princípio exigem justificativa escrita no plano e aprovação do André.
- Emendas: propostas por escrito, aprovadas pelo André, com atualização da versão e da
  data abaixo.
- Versionamento semântico: MAJOR = remoção ou redefinição incompatível de princípio;
  MINOR = princípio ou seção nova, ou orientação ampliada; PATCH = esclarecimentos e
  redação.
- Revisão de conformidade: a cada funcionalidade, antes do pedido de deploy.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
