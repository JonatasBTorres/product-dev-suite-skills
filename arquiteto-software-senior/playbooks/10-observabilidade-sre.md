# Playbook 10 — Observabilidade & SRE

## Escopo

Logs estruturados, métricas, tracing distribuído, definição de SLIs/SLOs e error budgets, filosofia de alertas, e dashboards. Use este playbook para "como sei se meu sistema está saudável", "como desenho meus alertas", ou "o que é um SLO de verdade".

> **Nota de calibração (ver Tiers no `SKILL.md`):** logs estruturados + métricas básicas (RED) valem desde Tier 0 — são baratos e o retorno é imediato assim que o primeiro incidente acontecer. Tracing distribuído só se paga quando há mais de um serviço na cadeia de uma requisição (tipicamente Tier 2+). SLOs formais com error budget governando o processo de release fazem mais sentido a partir de Tier 2-3, quando há SLA (implícito ou contratual) a proteger.

## Os três pilares — e por que nenhum substitui o outro

| Pilar | Responde | Quando é a ferramenta certa |
|---|---|---|
| **Logs** | "O que exatamente aconteceu neste evento específico?" | Investigação detalhada de um caso específico — mensagem de erro exata, payload que causou o problema |
| **Métricas** | "Como o sistema está se comportando ao longo do tempo/agregado?" | Dashboards, alertas de tendência, capacity planning — baratas de armazenar e agregar em alta cardinalidade temporal |
| **Traces** | "Onde exatamente o tempo/erro está sendo gasto dentro de uma requisição que atravessa múltiplos serviços?" | Depurar latência/erro em arquitetura distribuída — sem trace, "por que essa requisição demorou 3s" vira arqueologia manual entre logs de serviços diferentes |

Um sistema maduro de observabilidade tem os três correlacionados pelo mesmo identificador (trace_id/request_id) — poder pular de uma métrica anômala para os traces daquela janela de tempo e depois para os logs detalhados de um trace específico é o que torna a investigação rápida em vez de uma caça manual.

## Logs estruturados

- Sempre em formato estruturado (JSON), nunca string livre concatenada — permite consulta e agregação por campo em vez de `grep` frágil.
- Todo log de uma requisição carrega `trace_id`/`request_id` para correlação com métricas e traces.
- Disciplina de nível de log: `ERROR` reservado para algo que precisa de atenção humana; `WARN` para degradação tolerada; `INFO` para eventos de negócio relevantes (não todo passo interno); `DEBUG` desligado em produção por padrão, ligável sob demanda por serviço/instância quando investigando um problema específico.
- **Nunca** logar PII em texto claro (ver playbook 08) — tokenize/mascare antes do log sair da aplicação, idealmente com verificação automatizada no CI, não disciplina manual.

## Métricas: RED e USE

- **RED** (para serviços/requests): **R**ate (taxa de requisições), **E**rrors (taxa de erro), **D**uration (latência, sempre em percentis — p50/p95/p99, nunca só média, que esconde as caudas que os usuários realmente sentem).
- **USE** (para recursos: CPU, memória, disco, conexões de pool): **U**tilization (% de tempo ocupado), **S**aturation (fila de trabalho pendente/quão perto do limite), **E**rrors (falhas do próprio recurso, ex: erros de disco).
- **Cuidado com cardinalidade**: nunca use como label de métrica um valor de alta cardinalidade (user_id, request_id, e-mail) — isso explode o número de séries temporais e pode multiplicar o custo do sistema de métricas por ordens de magnitude, ou derrubá-lo. Cardinalidade alta é para logs/traces, não para métricas agregadas.

## Tracing distribuído

- **OpenTelemetry** é o padrão vendor-neutral recomendado — instrumentar contra a API do OpenTelemetry (em vez de uma API proprietária de um APM específico) evita lock-in no backend de observabilidade escolhido.
- **Propagação de contexto**: o trace context (W3C Trace Context — headers `traceparent`/`tracestate`) precisa atravessar toda chamada entre serviços, incluindo filas assíncronas (o ID do trace deveria viajar como metadado da mensagem, não se perder na fronteira síncrono→assíncrono).
- **Sampling**: capturar 100% dos traces em alta escala é caro e geralmente desnecessário.
  - **Head-based sampling**: decide se amostra logo no início da requisição (ex: 1% aleatório) — simples, mas pode perder exatamente os traces raros e interessantes (os que deram erro).
  - **Tail-based sampling**: decide depois de ver o resultado completo do trace — permite garantir que 100% dos traces com erro ou latência anômala sejam retidos, mesmo amostrando agressivamente o tráfego "normal". Mais caro de operar (precisa reter todos os spans temporariamente até decidir), mas muito mais valioso na prática.

## SLIs, SLOs e Error Budgets

- **SLI (Service Level Indicator)**: uma métrica quantitativa da experiência real do usuário (ex: "% de requisições respondidas em menos de 300ms", "% de requisições sem erro 5xx"). Escolha SLIs que reflitam o que o usuário percebe, não o que é fácil de medir internamente.
- **SLO (Service Level Objective)**: a meta-alvo para o SLI ao longo de uma janela de tempo (ex: "99.9% das requisições em menos de 300ms, medido em janela móvel de 28 dias"). Deveria ser definido pelo negócio/produto em conjunto com engenharia, não apenas copiado de "o que a concorrência promete".
- **Error Budget**: o complemento do SLO (se o SLO é 99.9%, o error budget é 0.1% de falha tolerada na janela). O valor prático do error budget: quando ele se esgota, isso é o sinal objetivo para **parar de lançar features novas e focar em confiabilidade** até o orçamento se recompor — tira a decisão de "podemos arriscar esse deploy?" do campo político/subjetivo e coloca em um número acordado previamente.
- Escolha poucos SLOs (2-4) para os fluxos que realmente importam para o negócio (ex: "login", "checkout"), não um SLO para cada endpoint interno — SLOs demais diluem o sinal e ninguém realmente os monitora.

## Filosofia de alertas

- **Alerte em sintomas, não em causas, como regra geral**: alertar quando o SLO está em risco (sintoma que o usuário sente) é mais acionável e gera menos ruído do que alertar em toda métrica de causa possível (CPU alta, que pode ou não estar causando impacto real).
- **Page vs. ticket**: reserve alertas que acordam alguém (page) para o que exige ação humana **imediata** e não pode esperar até o próximo horário comercial. Tudo o que pode esperar vira um ticket/item de backlog revisado no dia seguinte, não uma interrupção às 3h da manhã.
- **Alert fatigue é um antipadrão sério**: um time que recebe alertas que na maioria das vezes não exigem ação real aprende a ignorá-los — e aí o alerta importante se perde no meio do ruído. Trate a taxa de "alertas que não geraram ação" como uma métrica a ser monitorada e reduzida ativamente.
- Todo alerta deveria linkar para um runbook (ou pelo menos um contexto mínimo de "o que isso significa e o que checar primeiro") — um alerta sem contexto de ação é só ansiedade, não uma ferramenta operacional.

## Dashboards

- Golden signals (RED/USE) visíveis por serviço, em um lugar único e conhecido pelo time — não espalhados em dashboards ad-hoc que só quem criou sabe onde estão.
- Dashboards diferentes por audiência: um dashboard executivo (SLOs, tendência de negócio) é diferente de um dashboard de on-call (detalhe técnico para diagnosticar rápido durante um incidente) — misturar os dois deixa ambos piores para seu respectivo público.

## Antipadrões comuns

- **Log como principal ferramenta de debug em produção** ("vou dar um grep") em vez de métricas/dashboards/traces — sintoma de observabilidade que nunca amadureceu além do estágio de prototipagem.
- **Métrica com label de alta cardinalidade** (user_id, request_id) explodindo custo/cardinalidade do sistema de métricas.
- **Alertar em toda métrica "só para garantir"** — leva a alert fatigue e ao time ignorando alertas por reflexo.
- **SLO copiado de um blog post da indústria sem conversa real com o negócio** sobre o que o error budget realmente significa em trade-off de velocidade de feature vs. confiabilidade.
- **Trace_id que não se propaga através de fila assíncrona** — quebra a correlação exatamente na fronteira onde mais se precisa dela (debugar um fluxo assíncrono é normalmente mais difícil que um síncrono).
- **Nenhum runbook linkado nos alertas** — cada incidente reinventa o diagnóstico do zero, mesmo quando já aconteceu antes.
