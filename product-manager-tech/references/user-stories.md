# User Stories, Epics e Critérios de Aceite

## Estrutura hierárquica de trabalho

```
Initiative (Objetivo estratégico)
└── Epic (Capacidade de produto grande)
    └── Feature (Funcionalidade agrupada)
        └── User Story (Unidade de valor para o usuário)
            └── Task (Trabalho técnico, geralmente criado pelo time)
```

---

## Formato de Epic

```
EPIC-[número]: [Nome curto e descritivo]

Objetivo: [Por que este epic existe? Qual capacidade de produto ele habilita?]
Usuários impactados: [Quem se beneficia?]
Valor de negócio: [Como conecta aos objetivos estratégicos?]

Stories incluídas:
- US-001: [título]
- US-002: [título]
- US-003: [título]

Critérios de saída do epic:
- [O que precisa estar pronto para o epic ser considerado completo?]

Dependências: [Outros epics ou sistemas]
Estimativa de esforço: [P / M / G / XG]
```

---

## Formato de User Story

```
US-[número]: [Título da story — ação + resultado]

Como [tipo de usuário específico],
Quero [ação concreta e específica],
Para [benefício ou objetivo de negócio].

Requisito de origem (PRD): REQ-XXX
ADR relacionado (se a implementação foi moldada por uma decisão de arquitetura): ADR-XXX

Contexto adicional:
[Qualquer contexto que o time precisa saber que não cabe no título]

Critérios de aceite:

CA-01: [Nome do cenário]
  DADO  [pré-condição ou estado inicial]
  QUANDO [ação realizada pelo usuário ou evento do sistema]
  ENTÃO  [resultado esperado e verificável]

CA-02: [Nome do cenário — fluxo alternativo]
  DADO  [...]
  QUANDO [...]
  ENTÃO  [...]

CA-03: [Nome do cenário — caso de erro]
  DADO  [...]
  QUANDO [...]
  ENTÃO  [...]

Notas para o time:
- [Decisão técnica relevante, se houver]
- [Link para design no Figma]
- [Referência a regras de negócio do PRD]

Definition of Done:
- [ ] Código revisado (code review aprovado)
- [ ] Testes unitários escritos com cobertura > 80%
- [ ] Testes de integração passando
- [ ] QA funcional aprovado nos critérios de aceite
- [ ] Sem erros no console / logs de produção
- [ ] Feature flag configurada (se aplicável)
- [ ] Analytics implementado conforme spec
- [ ] Documentação atualizada (se necessário)
- [ ] Acessibilidade verificada (WCAG 2.1 AA)
- [ ] PM fez a aprovação final (sign-off)

Estimativa: [Story points: 1 / 2 / 3 / 5 / 8 / 13]
Prioridade: [Must have / Should have / Nice to have]
```

> **Rastreabilidade:** toda story nova (`US-XXX`) precisa entrar no `indice-mestre-rastreabilidade-template.md` com seu `REQ-XXX` de origem. Se a story só existir por causa de uma decisão de arquitetura (`ADR-XXX`) — ex: uma story técnica de migração de banco —, referencie o ADR também, não só o requisito de produto. Ver `references/rastreabilidade-e-handoff.md` para a cadeia completa.

---

## Exemplos de User Stories por domínio

### Autenticação e Onboarding

```
US-001: Cadastro com e-mail e senha

Como novo usuário,
Quero criar uma conta com meu e-mail e senha,
Para acessar a plataforma com segurança.

CA-01: Cadastro com dados válidos
  DADO  que o usuário está na tela de cadastro
  QUANDO preenche nome, e-mail válido e senha com mínimo 8 caracteres
  ENTÃO  a conta é criada e o usuário é redirecionado ao onboarding

CA-02: E-mail já cadastrado
  DADO  que o e-mail informado já existe no sistema
  QUANDO o usuário tenta criar a conta
  ENTÃO  uma mensagem de erro informa que o e-mail já está em uso
  E     exibe link para recuperação de senha

CA-03: Senha fraca
  DADO  que o usuário preenche uma senha com menos de 8 caracteres
  QUANDO clica em "Criar conta"
  ENTÃO  o campo senha é destacado com erro
  E     a mensagem "A senha deve ter no mínimo 8 caracteres" é exibida
```

### Listagem e Busca

```
US-015: Busca de produtos por nome

Como usuário logado,
Quero buscar produtos por nome na barra de pesquisa,
Para encontrar rapidamente o que preciso sem navegar por categorias.

CA-01: Busca com resultados
  DADO  que o usuário está em qualquer tela com a barra de busca
  QUANDO digita ao menos 3 caracteres
  ENTÃO  o sistema exibe resultados em tempo real (debounce de 300ms)
  E     cada resultado mostra nome, imagem miniatura e preço

CA-02: Busca sem resultados
  DADO  que o termo buscado não retorna nenhum produto
  QUANDO a busca é concluída
  ENTÃO  uma mensagem "Nenhum resultado para '[termo]'" é exibida
  E     sugestões de buscas populares são exibidas abaixo

CA-03: Erro de rede durante a busca
  DADO  que o usuário perdeu conexão com a internet
  QUANDO digita na barra de busca
  ENTÃO  um indicador de "Sem conexão" é exibido
  E     os últimos resultados em cache são exibidos (se houver)
```

### Formulários e Edição

```
US-032: Editar perfil de usuário

Como usuário autenticado,
Quero editar meu nome, foto e preferências no perfil,
Para manter minhas informações atualizadas.

CA-01: Edição de nome com sucesso
  DADO  que o usuário está na tela de perfil
  QUANDO altera o nome e clica em "Salvar"
  ENTÃO  as alterações são persistidas
  E     uma mensagem de "Perfil atualizado com sucesso" é exibida por 3 segundos

CA-02: Upload de foto de perfil
  DADO  que o usuário seleciona um arquivo de imagem (JPG, PNG, WebP, max 5MB)
  QUANDO confirma o upload
  ENTÃO  a imagem é redimensionada para 200x200px e salva
  E     a nova foto aparece imediatamente na tela sem reload

CA-03: Arquivo inválido para foto
  DADO  que o usuário tenta fazer upload de um PDF ou arquivo > 5MB
  QUANDO confirma o upload
  ENTÃO  uma mensagem de erro específica é exibida
  E     o arquivo anterior é mantido sem alteração
```

---

## Definition of Ready

> Definition of Done (dentro do formato de User Story acima) define quando uma
> story está pronta para SAIR do sprint. Definition of Ready define quando ela
> está pronta para ENTRAR — evita puxar trabalho mal especificado para o sprint,
> o que costuma gerar retrabalho e estouro de prazo.

```
Uma story está PRONTA para entrar em um sprint quando:

- [ ] Tem título claro e objetivo (ação + resultado)
- [ ] Formato "Como/Quero/Para" preenchido, sem placeholders
- [ ] Critérios de aceite escritos no formato DADO/QUANDO/ENTÃO, cobrindo
      happy path + pelo menos 1 fluxo alternativo + pelo menos 1 caso de erro
- [ ] Design/wireframe anexado (link Figma), se a story envolve UI
- [ ] Dependências de outras stories/times identificadas e resolvidas ou
      sinalizadas como bloqueio conhecido
- [ ] Time de engenharia já viu a story e não levantou dúvida de escopo não
      respondida (idealmente discutida em refinement/grooming)
- [ ] Estimativa de esforço dada pelo time (story points ou T-shirt size)
- [ ] Sem "⚠️ Pendente de decisão" em aberto que bloqueie o desenvolvimento
      (pendências que não bloqueiam o início podem ficar registradas e resolvidas
      durante o sprint)

Regra prática: se o time de engenharia não consegue começar a trabalhar na
story sem fazer 3+ perguntas de esclarecimento ao PM, ela NÃO está pronta —
volta para refinamento antes de entrar no sprint.
```

### Estimativa — Técnicas comuns

| Técnica | Como funciona | Quando usar |
|---|---|---|
| **Planning Poker** | Cada pessoa do time estima em paralelo (cartas com valores da sequência de Fibonacci: 1,2,3,5,8,13...), revela ao mesmo tempo, discute divergências grandes | Times que já trabalham juntos, backlog com stories bem definidas |
| **T-shirt sizing** | Estimativa grosseira em P / M / G / GG, sem número exato | Estimativa rápida em fase de roadmap, antes do refinamento detalhado |
| **Story points relativos** | Comparar o esforço de uma story nova com uma story já feita antes (referência) | Times maduros que já calibraram a régua de pontos |

Regra: story points medem **esforço/complexidade relativa**, não tempo em horas — evite converter pontos em dias de forma rígida; use velocidade histórica do time para prever prazo.

---

## Bug Report Template

```
BUG-[número]: [Título descritivo — O que está errado]

Severidade: Crítico / Alto / Médio / Baixo
Ambiente: Produção / Staging / Dev
Versão: [app v2.3.1 / web build #1234]
Reportado por: [Nome]
Data: [DD/MM/AAAA]

Comportamento esperado:
[O que deveria acontecer]

Comportamento atual (bug):
[O que está acontecendo de errado]

Passos para reproduzir:
1. [Passo 1]
2. [Passo 2]
3. [Resultado incorreto]

Evidências:
- [Screenshot / Vídeo / Log]

Impacto:
- Usuários afetados: [Ex: todos os usuários no iOS 17+]
- Frequência: [Ex: 100% de reprodução / Intermitente]
- Workaround: [Existe? Qual?]
```

---

## Spike / Research Story

```
SPIKE-[número]: [Investigar / Avaliar / Definir] [Tema]

Objetivo: Responder à seguinte pergunta com evidência:
"[Pergunta específica que este spike deve responder]"

Timebox: [Ex: 2 dias de esforço]

Entregável esperado:
- [Documento de decisão / ADR / Nota técnica]
- [Estimativa de esforço para implementação]
- [Recomendação com prós e contras]

Critério de conclusão:
O spike está completo quando o time consegue responder a pergunta objetivo
com evidência suficiente para tomar uma decisão técnica ou de produto.
```
