# Rastreabilidade e Handoff — Produto → Arquitetura → Engenharia

> Este é o núcleo que conecta `product-manager-tech` com as skills `arquiteto-software-senior` e `backend-engineer`. Sem ele, PRD, arquitetura e código viram três narrativas que divergem silenciosamente assim que qualquer uma das três muda depois de gerada. Consulte esta referência sempre que: (a) for acionar a skill de arquitetura ou de backend, (b) mais de um documento do produto estiver sendo gerado na mesma conversa/projeto, ou (c) o usuário pedir para "revisar"/"auditar" consistência entre documentos já existentes.

---

## Por que isso precisa de disciplina explícita, não boa vontade

Vários documentos escritos em momentos diferentes — mesmo quando é o mesmo Claude gerando todos — divergem silenciosamente se não houver um mecanismo estrutural amarrando-os. Nenhum documento isolado "sabe" o que os outros contêm a menos que seja explicitamente lembrado disso. A convenção de IDs e o índice mestre existem para tornar essa consistência uma propriedade da estrutura, não da memória.

---

## A convenção de IDs — cadeia completa das 3 skills

```
product-manager-tech          arquiteto-software-senior       backend-engineer
─────────────────────         ─────────────────────────       ─────────────────
REQ-XXX  (requisito)    ───►  ADR-XXX  (decisão)        ───►  TASK-XXX (item técnico
US-XXX   (user story)         DOC-XXX  (doc consolidado         de backlog/sprint)
FLOW-XXX (fluxo crítico)       de arquitetura: segurança,  ───►  IMPL-XXX (doc consolidado
NAV-XXX  (navigation map)      performance, etc.)                de implementação:
OKR-XXX  (objective/KR)                                          performance real,
                                                                   segurança implementada,
                                                                   navigation/rotas técnicas)
```

| Prefixo | O que identifica | Nasce em | Skill dona |
|---|---|---|---|
| `REQ-XXX` | Requisito funcional ou não-funcional do PRD | PRD | `product-manager-tech` |
| `US-XXX` | User story do backlog de produto | Backlog | `product-manager-tech` (referencia `REQ-XXX` de origem) |
| `FLOW-XXX` | Fluxo crítico de negócio (pagamento, onboarding, cancelamento...) | Documento de fluxo crítico | `product-manager-tech` |
| `NAV-XXX` | Tela/nó no navigation map de produto | Navigation map | `product-manager-tech` |
| `OKR-XXX` | Objective ou Key Result | Documento de métricas/OKRs | `product-manager-tech` |
| `ADR-XXX` | Decisão arquitetural pontual | Skill de arquitetura | `arquiteto-software-senior` (referencia `REQ-XXX`/`FLOW-XXX` que a motivaram) |
| `DOC-XXX` | Documento de arquitetura cobrindo um domínio inteiro (ex: Arquitetura de Segurança) | Skill de arquitetura | `arquiteto-software-senior` (agrega `ADR-XXX`, referencia `REQ-XXX`/`FLOW-XXX`) |
| `TASK-XXX` | Item de backlog técnico/sprint de engenharia (a implementação concreta de uma `US-XXX`) | Backlog técnico | `backend-engineer` (referencia `US-XXX` e/ou `ADR-XXX`) |
| `IMPL-XXX` | Documento consolidado de implementação (performance real medida, segurança implementada, navigation/rotas técnicas, ou outro domínio pedido) | Skill de backend | `backend-engineer` (referencia `DOC-XXX`/`ADR-XXX` de arquitetura que implementa) |

**Numeração é sequencial e nunca reutilizada** dentro do mesmo produto/projeto — se um requisito é removido, marque como `REQ-004 (removido)` no índice em vez de reaproveitar o número para outra coisa. Referências antigas em outros documentos não podem passar a apontar para o conteúdo errado.

---

## Regra prática, sem exceção

Sempre que você gerar (ou atualizar) qualquer documento desta cadeia, faça três coisas antes de considerar a resposta completa:

1. **Atribua IDs** seguindo a tabela acima — nunca deixe um requisito, story, fluxo ou tela sem identificador.
2. **Inclua uma seção "Rastreabilidade" ou "Documentos relacionados"** no próprio documento, citando os IDs de outros documentos que ele referencia ou que o referenciam.
3. **Atualize o Índice Mestre de Rastreabilidade** (`references/indice-mestre-rastreabilidade-template.md`) — crie-o na primeira vez que qualquer documento do produto for gerado na conversa/projeto, e adicione uma linha nova a cada novo ID criado depois disso.

**Nunca duplique conteúdo entre documentos em vez de referenciar por ID.** Se o backlog precisa do contexto de um requisito, cita `REQ-014` e adiciona só o que for específico da story — não copia o parágrafo inteiro do PRD. Duplicação é exatamente o que causa divergência silenciosa quando um dos dois lados muda depois.

---

## Antes de criar qualquer documento novo

Se estiver rodando dentro de um projeto com arquivos em disco (Claude Code / Cowork), **verifique se já existem** `indice-mestre-rastreabilidade.md`, um PRD, ou outros documentos do produto/arquitetura/engenharia no diretório do projeto antes de gerar algo do zero. Liste o diretório, procure por arquivos com os prefixos de ID desta convenção, e leia o índice mestre existente se houver. Sessões novas não carregam memória automática do que foi gerado antes — a única forma de continuidade real é o arquivo salvo em disco. Só assuma que não existe nada anterior depois de checar.

---

## Protocolo de handoff: Produto → Arquitetura

1. **Critério de prontidão**: o PRD tem problema validado, objetivos/métricas, escopo dentro/fora, requisitos funcionais principais, e a seção de não-funcionais preenchida com o mesmo nível de detalhe do `non-functional-requirements-checklist.md` da skill `arquiteto-software-senior` — isso evita retrabalho de tradução entre as duas.
2. **O que entregar explicitamente ao acionar `arquiteto-software-senior`**:
   - A lista completa de `REQ-XXX` relevantes (os IDs específicos que importam para a decisão técnica em questão — não o PRD inteiro solto).
   - O **Tier estimado** do produto (ver seção de Tiers no `SKILL.md` — evita que a arquitetura precise re-descobrir isso do zero).
   - Quaisquer `FLOW-XXX` com implicação técnica direta — sinalize explicitamente quando um fluxo tocar segurança/compliance (pagamento, dado sensível), escala (alto volume esperado), ou requisitos geográficos (usuários fora do país de origem).
   - O `NAV-XXX` relevante quando a navegação afetar decisões de API/BFF (ex: um app mobile agregando dados de vários serviços é sinal para considerar BFF).
3. **O que esperar de volta**: ADRs/RFCs/documentos consolidados que citam de volta os `REQ-XXX`/`FLOW-XXX` que motivaram cada decisão — se a resposta da arquitetura não referenciar nenhum ID de produto, algo se perdeu no handoff.
4. **Atualize o índice mestre** com os novos `ADR-XXX`/`DOC-XXX` e suas conexões de volta aos IDs de produto.

---

## Protocolo de handoff: Arquitetura → Engenharia (backend-engineer)

Depois que a arquitetura produz ADRs/RFC/stack tecnológica, o próximo passo é acionar `backend-engineer` para transformar a decisão em backlog técnico executável e código:

1. **Critério de prontidão**: existe pelo menos um ADR aceito (ou um RFC completo) para o domínio que vai ser implementado, com stack tecnológica definida (`stack-tecnologica-template.md` da skill de arquitetura) e modelo de dados (`modelo-de-dados-template.md`).
2. **O que entregar explicitamente ao acionar `backend-engineer`**:
   - A lista de `US-XXX` (user stories de produto) que estão sendo implementadas nesta rodada.
   - A lista de `ADR-XXX`/`DOC-XXX` relevantes que a implementação precisa respeitar.
   - O Tier do produto (o mesmo já usado na arquitetura — calibra o nível de robustez esperado do código: um Tier 0 não precisa do mesmo rigor de observabilidade/resiliência que um Tier 3).
3. **O que esperar de volta**:
   - Um **backlog técnico com sprints** (`TASK-XXX`), onde cada item referencia a `US-XXX` de produto e/ou o `ADR-XXX` que implementa.
   - Código que cita, em comentário ou na descrição do PR, qual `ADR-XXX`/`TASK-XXX` está sendo implementado (ver `references/engineering-practices.md` da skill de backend).
   - Documentos consolidados de implementação (`IMPL-XXX`) quando solicitados — ex: plano de performance real, checklist de segurança implementada, mapa de rotas/navegação técnica — cada um referenciando o `DOC-XXX`/`ADR-XXX` de arquitetura correspondente.
4. **Atualize o índice mestre** com os novos `TASK-XXX`/`IMPL-XXX`.

---

## Quando um documento muda depois do handoff

Se um requisito (`REQ-XXX`) muda depois que a arquitetura já decidiu algo baseado nele, ou uma decisão de arquitetura (`ADR-XXX`) muda depois que o backend já implementou código baseado nela, isso não é um detalhe menor — é um evento que deveria disparar reavaliação explícita da decisão/implementação correspondente (identificável via o índice mestre, que já sabe quais IDs downstream referenciam aquele ID). Tratar mudança de requisito e decisão técnica como eventos desconectados é exatamente o que a rastreabilidade existe para evitar.

## Atualização retroativa — o passo que mais se perde

Documentos nascem em ordem, mas a rastreabilidade é bidirecional: quando um `TASK-XXX` é criado a partir de um `ADR-XXX`, o documento de arquitetura original também ganha essa referência de volta na sua seção de rastreabilidade — não só o backlog técnico aponta para o ADR, o ADR passa a apontar para o backlog técnico. O mesmo vale para `US-XXX` criados a partir de `REQ-XXX`, e para `IMPL-XXX` criados a partir de `DOC-XXX`. Isso significa que **gerar um documento novo quase sempre implica editar um documento anterior**, não só criar um arquivo isoladamente.

## Referência distribuída — o complemento que reduz o risco do índice centralizado

O Índice Mestre é centralizado por design — e isso cria um risco real: se ele parar de ser atualizado, a rastreabilidade inteira degrada de uma vez. Mitigue isso mantendo referência **também** de forma distribuída, direto em cada documento: o PRD carrega um "Mapa de Documentos do Projeto" (ver `prd-template.md`), o backlog carrega "Posição no Conjunto de Documentos", e assim por diante. Perder ou não atualizar o índice mestre não deixa a rastreabilidade cega — cada documento ainda sabe, sozinho, de onde veio e o que o implementa.

## Auditoria de consistência

Quando o usuário pedir para "revisar", "auditar", ou "conferir consistência" do que já foi gerado — ou periodicamente antes de um marco importante (handoff de arquitetura, handoff de engenharia, início de um sprint crítico) — use `references/registro-de-auditoria-template.md`: liste os itens encontrados numerados, aplique a correção com uma nota inline no documento afetado referenciando o número do item, e atualize o Índice Mestre e o Histórico de Revisões do(s) documento(s) afetado(s).

---

## Antipadrões comuns

- **Gerar PRD, backlog, arquitetura e código na mesma conversa sem nenhum ID cruzado entre eles** — cada documento fica "bonito" isoladamente, mas não há como saber, meses depois, que o `TASK-014` implementa o `ADR-003` que resolve o `REQ-007` sem reler tudo manualmente.
- **Acionar `arquiteto-software-senior` ou `backend-engineer` só com uma descrição em prosa**, sem os IDs/Tier explícitos — obriga a skill seguinte a re-perguntar informação que já existia, ou pior, a assumir por conta própria.
- **Índice mestre criado uma vez e nunca mais atualizado** — degrada rapidamente de "fonte de verdade" para "artefato desatualizado que ninguém confia", o que é pior que não ter índice nenhum.
- **ADR ou TASK que não cita nenhum ID de origem** — decisão/implementação desconectada da motivação de negócio, difícil de justificar ou revisitar depois.
- **Reescrever o conteúdo de um documento dentro de outro** em vez de referenciar por ID — a primeira divergência entre as duas cópias já é a prova de que a duplicação era uma má ideia.
