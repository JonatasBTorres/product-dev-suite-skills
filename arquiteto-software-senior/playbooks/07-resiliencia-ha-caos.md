# Playbook 07 — Resiliência, Alta Disponibilidade & Engenharia do Caos

## Escopo

Padrões de estabilidade para chamadas entre serviços, engenharia do caos, testes de carga, e disponibilidade multi-região com metas de RTO/RPO. Use este playbook para perguntas sobre "como evito que uma falha se propague" ou "como desenho para disaster recovery".

> **Nota de calibração (ver Tiers no `SKILL.md`):** timeout + retry com jitter deveriam existir desde Tier 0 (custo baixo, benefício alto). Circuit breaker/bulkhead compensam a partir de Tier 1-2, quando há dependências externas reais em produção. Chaos Engineering formal e GameDays de DR tipicamente só se pagam em Tier 2+. Importante: multi-região aqui é motivada por disponibilidade/RTO — se a motivação for soberania/residência de dados, veja o playbook 13, que é uma decisão diferente (às vezes conflitante) com implicações distintas.

## Padrões de estabilidade — quando aplicar cada um

| Padrão | O que resolve | Implementação prática |
|---|---|---|
| **Timeout** | Chamada que nunca retorna trava o chamador indefinidamente | Sempre configure timeout explícito em toda chamada de rede — nunca confie no default do cliente HTTP (frequentemente infinito ou absurdamente longo) |
| **Retry com Exponential Backoff + Full Jitter** | Falhas transitórias (rede, contenção momentânea) | Backoff exponencial evita martelar um serviço já sobrecarregado; **Full Jitter** (aleatoriedade total no tempo de espera, não só no incremento) evita que múltiplos clientes re-tentem sincronizados no mesmo instante, o que recria o pico que causou a falha original |
| **Circuit Breaker** | Serviço dependente já está falhando consistentemente — parar de tentar poupa recursos dos dois lados | Após N falhas consecutivas/percentual de erro acima do limiar, abra o circuito (falhe rápido sem tentar a chamada) por um período, depois teste com uma requisição de sonda (half-open) antes de fechar de novo |
| **Bulkhead** | Uma dependência lenta/degradada consome todos os recursos (threads/conexões) do chamador, afetando chamadas a outras dependências saudáveis | Isole pools de recursos (thread pool, connection pool) por dependência — uma dependência lenta esgota só o próprio pool, não o do sistema inteiro |
| **Throttling** | Proteger um serviço de ser sobrecarregado por clientes internos ou externos | Aplicar limites antes que a sobrecarga aconteça, não como reação depois que o serviço já está degradado |
| **Fallback elegante** | Dependência indisponível não deveria significar falha total da funcionalidade | Defina explicitamente o comportamento degradado aceitável (cache stale, resposta parcial, funcionalidade desabilitada temporariamente) em vez de deixar a falha se propagar como erro genérico ao usuário final |

**Ordem de aplicação prática:** Timeout é não-negociável e deveria existir em toda chamada. Retry só faz sentido combinado com timeout (senão o retry nunca é alcançado). Circuit Breaker complementa retry para não continuar tentando contra um serviço já claramente fora do ar. Bulkhead protege o sistema como um todo quando há múltiplas dependências. Fallback é a última linha de defesa que decide o que o usuário efetivamente vê.

## Engenharia do Caos

### Por que fazer isso deliberadamente

Testar resiliência só quando a falha acontece de verdade em produção significa aprender da forma mais cara possível. Chaos Engineering testa a hipótese "o sistema se comporta como esperado sob esta falha específica" de forma controlada.

### Processo recomendado

1. **Defina o "steady state"** (métricas que indicam comportamento normal) antes de qualquer experimento — sem isso não há como saber se o experimento causou um desvio real.
2. **Comece em ambiente não-produtivo**, evolua para produção com blast radius controlado (poucos hosts, tráfego de sombra, horário de menor impacto) só depois de confiança acumulada.
3. **Ferramentas**: Chaos Mesh (Kubernetes-nativo, injeta latência de rede, falha de pod, falha de disco) e AWS FIS (Fault Injection Simulator, integrado a serviços AWS — EC2, ECS, RDS). Escolha conforme a plataforma de execução (playbook 01/02).
4. **Continuous profiling** (Pyroscope ou equivalente) rodando continuamente em produção — não é só para experimentos de caos, mas o profiling contínuo é o que permite entender *por que* um experimento causou determinado efeito (qual função/linha de código estava consumindo CPU/memória no momento).
5. **GameDays de Disaster Recovery**: exercício agendado e comunicado (não uma pegadinha) onde a equipe pratica um cenário real (evacuação de região, perda de banco primário) incluindo as pessoas que executariam o runbook em um incidente real — o objetivo é validar tanto a tecnologia quanto o processo humano.

### Testes de carga distribuídos

- **k6**: scripts como código (JavaScript), boa integração com CI/CD para gate de performance em pipeline, métricas nativas exportáveis para observabilidade existente.
- **Locust**: baseado em Python, útil quando o time já tem lógica de teste complexa que se beneficia de um framework mais programável.
- Rode testes de carga com cenários realistas de padrão de tráfego (não só "throughput constante crescente") — inclua picos súbitos (spike test) e sustentação prolongada (soak test) para capturar problemas que só aparecem com vazamento de recursos ao longo do tempo.

## Disponibilidade Global

### Multi-Region: Active-Active vs. Active-Passive

| Modelo | Descrição | Trade-off |
|---|---|---|
| **Active-Passive** | Uma região serve tráfego; a(s) outra(s) ficam em standby, promovidas em caso de falha | Mais simples de operar e raciocinar sobre consistência; RTO depende do tempo de failover (detecção + promoção + propagação de DNS) |
| **Active-Active** | Múltiplas regiões servem tráfego simultaneamente | RTO próximo de zero para falha regional (outras regiões já estão servindo), mas exige lidar com consistência de dados entre regiões (replicação multi-master, resolução de conflito) — complexidade significativamente maior |

**Regra prática:** Active-Passive é o ponto de partida correto para a maioria dos sistemas — a complexidade de consistência multi-master do Active-Active só se justifica quando o RTO exigido pelo negócio é genuinamente próximo de zero (não apenas "queremos o melhor").

### RTO e RPO — definir antes de desenhar a solução

- **RTO (Recovery Time Objective)**: quanto tempo o sistema pode ficar indisponível até ser restaurado. Define a estratégia de failover (manual vs. automático, active-passive vs. active-active).
- **RPO (Recovery Point Objective)**: quantos dados (em tempo) a organização tolera perder. Define a estratégia de replicação/backup (síncrona vs. assíncrona, frequência de snapshot).
- Esses dois números devem vir do negócio (o custo de indisponibilidade/perda de dados), não ser inventados pela engenharia — e devem ser testados de verdade em GameDays, não apenas documentados em um wiki.

### Anycast / GeoDNS

Roteamento de usuários para a região mais próxima/saudável — combine com health checks reais de aplicação (não apenas ping de infraestrutura) para que o roteamento desvie automaticamente de uma região degradada, não só totalmente fora do ar.

## Antipadrões comuns

- **Retry sem jitter**: recria exatamente o pico de tráfego que causou a falha original, em sincronia entre todos os clientes.
- **Timeout ausente ou default absurdo**: uma dependência lenta consome threads/conexões indefinidamente, derrubando o chamador mesmo que a causa raiz seja externa.
- **Circuit breaker sem estado half-open**: o circuito nunca "testa a água" para fechar de novo automaticamente, exigindo intervenção manual após toda abertura.
- **Chaos engineering só em ambiente de teste, nunca em produção**: o ambiente de teste raramente reproduz a topologia de rede, o volume de tráfego real e as dependências externas reais — muitos problemas só aparecem sob condições de produção.
- **RTO/RPO nunca testados na prática**: o runbook de disaster recovery existe só no papel; a primeira vez que é executado de verdade é durante um incidente real, quando o custo de erro é máximo.
- **Active-Active adotado sem necessidade real de RTO ~0**: importa toda a complexidade de resolução de conflito multi-região sem o requisito de negócio que justificaria o custo.
