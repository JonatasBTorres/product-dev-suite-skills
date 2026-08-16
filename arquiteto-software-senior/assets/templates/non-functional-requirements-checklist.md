# Checklist de Requisitos Não-Funcionais

Preencha no início de qualquer iniciativa de arquitetura relevante. O objetivo não é preencher todos os campos com precisão de laboratório — é forçar a conversa explícita sobre trade-offs antes de decisões de tecnologia serem tomadas por inércia.

## Escala e performance

- [ ] Volume esperado de usuários/requisições hoje e em 12-24 meses (ordem de grandeza é suficiente)
- [ ] Throughput alvo (requisições/segundo, eventos/segundo)
- [ ] Latência alvo por percentil (p50, p95, p99) — não apenas média
- [ ] Padrão de tráfego: constante, picos previsíveis (ex: Black Friday), ou imprevisível

## Disponibilidade e resiliência

- [ ] SLA/SLO de disponibilidade alvo (ex: 99.9%, 99.99%) e quem definiu esse número
- [ ] RTO — quanto tempo de indisponibilidade é tolerável em caso de falha (ver playbook 07)
- [ ] RPO — quanto dado (em tempo) é tolerável perder em caso de falha (ver playbook 07)
- [ ] Dependências externas críticas e o que acontece se cada uma ficar indisponível

## Consistência de dados

- [ ] Onde consistência forte (ACID) é obrigatória vs. onde consistência eventual é aceitável
- [ ] Existe requisito de auditoria completa / histórico imutável (candidato a Event Sourcing)?

## Segurança e compliance

- [ ] Dados pessoais/sensíveis envolvidos (PII, dados de saúde, dados financeiros)?
- [ ] Regulações aplicáveis (LGPD, GDPR, PCI-DSS, HIPAA, SOC2, etc.)
- [ ] Requisitos de isolamento multi-tenant, se aplicável (ver playbook 05)
- [ ] Requisitos de auditoria/logging para compliance

## Custo

- [ ] Orçamento de infraestrutura disponível (aproximado é suficiente)
- [ ] Restrição de custo por unidade de negócio (ex: custo por tenant, por transação)

## Operação e time

- [ ] Tamanho e expertise atual do time (isso limita realisticamente o que pode ser operado bem)
- [ ] Existe plantão/on-call para este sistema? Quem responde a incidentes?
- [ ] Nível de maturidade de observabilidade/CI-CD já existente na organização

## Evolução

- [ ] Quais partes deste design são mais prováveis de mudar nos próximos 6-12 meses?
- [ ] Esta decisão é reversível com baixo custo, ou é uma decisão "one-way door"?
