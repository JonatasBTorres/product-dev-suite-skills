# Playbook 12 — Migração de Legados & Arquitetura Brownfield

## Escopo

Estratégias para evoluir/substituir sistemas legados com segurança: Strangler Fig Pattern, migração de dados durante a transição, e a decisão entre big-bang e migração incremental. Use este playbook para "como eu migro/substituo esse sistema legado" ou "como eu reescrevo isso sem quebrar tudo".

> **Nota de calibração (ver Tiers no `SKILL.md`):** a maioria dos sistemas Tier 0-1 não tem "legado" de verdade — se o pivot de produto exige jogar fora o MVP, reescrever direto costuma ser mais barato do que orquestrar uma migração incremental, porque o volume de dados e a criticidade ainda são baixos. A partir de Tier 2, a migração incremental via Strangler Fig deixa de ser "cuidado extra" e passa a ser a única opção responsável — o custo de um big-bang que dá errado em produção com dados/clientes reais é alto demais.

## Por que brownfield é a norma, não a exceção

A maior parte do trabalho real de um arquiteto sênior acontece em sistemas que já existem e já têm usuários, dados e receita dependendo deles — não em projetos green-field. Isso muda a pergunta central de "qual é a arquitetura ideal no vácuo" para "qual é o caminho seguro, incremental e reversível daqui até uma arquitetura melhor". Ignorar essa realidade é a causa mais comum de projetos de "reescrita" que consomem trimestres e nunca entregam valor incremental no caminho.

## Strangler Fig Pattern

A estratégia padrão para migrar um sistema legado sem um corte único de alto risco:

1. Coloque uma camada de fachada (proxy/API gateway) na frente do sistema legado, por onde todo tráfego passa a fluir.
2. Migre funcionalidade por funcionalidade para o novo sistema — cada pedaço migrado é pequeno o suficiente para ser testado e revertido isoladamente.
3. Redirecione, na camada de fachada, cada rota/funcionalidade para o novo sistema assim que ela estiver pronta e validada — o legado e o novo coexistem durante toda a transição.
4. Quando todas as funcionalidades tiverem sido migradas, o sistema legado pode finalmente ser desligado — e só então, não antes.

O nome vem da metáfora de um cipó estrangulador que cresce ao redor de uma árvore existente até substituí-la completamente, sem que a árvore precise ser derrubada de uma vez. O valor central é reduzir o *blast radius* de cada mudança: se uma fatia migrada tem um bug, o impacto é limitado àquela fatia, não ao sistema inteiro.

### Anticorruption Layer como ferramenta de execução

O Anticorruption Layer (introduzido no playbook 03) é o mecanismo técnico que viabiliza o Strangler Fig na prática: ele traduz entre o modelo de dados/conceitos do sistema legado e o modelo do novo sistema durante a transição, para que o novo sistema não herde as decisões de modelagem do antigo. **Risco a monitorar ativamente**: um Anticorruption Layer criado como solução "temporária" tende a virar permanente se ninguém revisitar periodicamente o progresso real da extração — trate a existência contínua da camada de tradução como um sinal de trabalho pendente, não como um componente arquitetural definitivo.

## Estratégias de migração de dados

| Estratégia | Como funciona | Trade-off |
|---|---|---|
| **Dual-write** | A aplicação escreve simultaneamente no sistema legado e no novo durante a transição | Simples de entender, mas risco real de inconsistência se uma das duas escritas falhar e a outra não — exige verificação de consistência periódica entre os dois sistemas para detectar divergência |
| **CDC-based sync** (ver playbook 06 — Debezium) | Captura mudanças do sistema legado via CDC e replica para o novo sistema, mantendo uma única fonte de verdade (o legado) durante a maior parte da transição | Mais seguro que dual-write porque elimina o risco de escrita dupla falhar parcialmente; exige alguém operando a infraestrutura de CDC |
| **Backfill + cutover** | Migra o histórico de dados em lote (batch) e, só então, troca o fluxo de escrita ativo para o novo sistema numa janela de corte curta e bem definida | Menor complexidade de sincronização contínua, mas exige uma janela de corte (mesmo que pequena) e um plano de rollback testado caso o cutover revele um problema |

**Regra prática:** prefira CDC-based sync a dual-write sempre que a infraestrutura de CDC já existir ou for barata de montar — elimina uma classe inteira de bugs de inconsistência por escrita dupla que falha parcialmente.

## Big-bang vs. migração incremental

- **Big-bang** (trocar tudo de uma vez) só se justifica quando o sistema é pequeno o suficiente para caber em um teste completo confiável **e** o custo de operar dois sistemas em paralelo por semanas/meses supera claramente o risco do corte único.
- Para qualquer sistema de porte relevante (volume de dados real, usuários ativos, receita dependente), a resposta correta é quase sempre incremental via Strangler Fig — o custo aparente de "demorar mais" é, na prática, menor que o risco de um corte único que pode falhar com clientes reais em produção.

## Reescrever vs. redesenhar: não faça as duas coisas ao mesmo tempo

Decida explicitamente, antes de começar, se a migração é:
- **Migração 1:1** (feature parity): só trocar a tecnologia/plataforma subjacente, mantendo a funcionalidade idêntica — mais fácil de validar porque o comportamento esperado já é conhecido.
- **Redesenho**: aproveitar a migração para repensar o modelo de domínio/UX/arquitetura.

Tentar fazer as duas coisas simultaneamente (reescrever a tecnologia **e** redesenhar o comportamento ao mesmo tempo) é a causa clássica da "reescrita que nunca termina": não há mais uma versão de referência estável para comparar, o escopo cresce continuamente ("já que estamos mexendo, vamos melhorar isso também"), e a migração perde o critério objetivo de "pronto". Se ambos são necessários, migre primeiro 1:1 via Strangler Fig, depois redesenhe incrementalmente o sistema já migrado.

## Quando o legado força a mão, mesmo sem business case direto

Às vezes o argumento de negócio para migrar não é forte o suficiente para priorizar sozinho — mas um sistema legado sem patches de segurança, rodando em tecnologia fora de suporte, ou dependente de uma pessoa que está de saída, é um risco que se paga sozinho independente do "ROI" da migração. Nomeie esse risco explicitamente ao priorizar (ver playbook 08 para supply chain/CVEs em dependências não mantidas).

## Antipadrões comuns

- **"Vamos reescrever tudo do zero"** como primeira proposta, sem considerar Strangler Fig — alto risco de nunca terminar (o "Second System Effect": a reescrita tenta corrigir todo problema histórico de uma vez e nunca converge).
- **Dual-write sem verificação de consistência** — diverge silenciosamente entre os dois sistemas até alguém notar um dado errado em produção, muitas vezes tarde demais para reconstruir a causa.
- **Cutover sem plano de rollback testado de verdade** — o plano existe no papel, mas nunca foi executado nem uma vez em um ensaio, e falha exatamente quando é executado de verdade sob pressão.
- **Anticorruption Layer "temporário" que nunca é revisitado** — a migração estagna, mas a complexidade extra da camada de tradução permanece indefinidamente, sem que ninguém questione o progresso real.
- **Migrar E redesenhar ao mesmo tempo** sem decisão explícita — o escopo nunca fecha e o time perde a capacidade de dizer objetivamente "a migração terminou".
