# Observabilidade — Logs, Métricas, Tracing, Alertas e Incidentes

## Sumário
1. [Logging estruturado](#logging)
2. [Métricas de aplicação](#metrics)
3. [Tracing distribuído](#tracing)
4. [Monitoramento e alertas](#monitoring)
5. [Análise de incidentes](#incidents)
6. [Observabilidade como código](#obs-as-code)

---

## 1. Logging estruturado {#logging}

### Playbook: Implementar logs estruturados

**Quando usar:** Toda aplicação em produção precisa de logs consultáveis e correlacionáveis.

**Passos:**
1. Escolha uma lib de log estruturado (Pino, Winston, structlog, zap, logrus)
2. Defina campos obrigatórios em todo log: `timestamp`, `level`, `service`, `traceId`, `userId` (quando disponível)
3. Nunca logue dados sensíveis (senhas, tokens, CPF, cartão)
4. Use níveis corretos: DEBUG (dev), INFO (fluxo normal), WARN (degradação), ERROR (falha), FATAL (sistema inoperável)
5. Inclua contexto suficiente para reproduzir o problema sem reproduzir o ambiente

```typescript
// ✅ Logger estruturado com contexto rico
import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'orders-service', version: process.env.APP_VERSION },
    redact: ['req.headers.authorization', 'body.password', 'body.creditCard'],
    timestamp: pino.stdTimeFunctions.isoTime,
});

// Criar child logger com contexto de requisição
function createRequestLogger(req: Request) {
    return logger.child({
        traceId: req.headers['x-trace-id'] ?? generateId(),
        requestId: generateId(),
        userId: req.user?.id,
        method: req.method,
        path: req.path,
    });
}

// Uso nos handlers
async function createOrder(req: Request, res: Response) {
    const log = createRequestLogger(req);

    log.info({ body: req.body }, 'Iniciando criação de pedido');

    try {
        const order = await orderService.create(req.body);
        log.info({ orderId: order.id, totalCents: order.totalCents }, 'Pedido criado com sucesso');
        res.status(201).json(order);
    } catch (err) {
        log.error({ err, body: req.body }, 'Falha ao criar pedido');
        throw err;
    }
}
```

```python
# Python com structlog
import structlog

log = structlog.get_logger()

# Configuração global
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
)

# Uso com contexto
bound_log = log.bind(trace_id=trace_id, user_id=user_id, service="orders")
bound_log.info("order_created", order_id=order.id, total_cents=order.total_cents)
bound_log.error("order_failed", error=str(e), order_id=order_id)
```

**Anti-patterns:**
- ❌ `print("erro aconteceu")` — sem contexto, sem nível, não consultável
- ❌ `logger.info(f"User {user.password} logged in")` — expõe dado sensível
- ❌ Log dentro de loops sem rate limiting — inunda o sistema de logs
- ❌ Capturar exceção e não logar — perde rastreabilidade de erros

**Checklist de logging:**
- [ ] Todos os logs têm `traceId` propagado de serviço em serviço
- [ ] Nenhum dado sensível está sendo logado (use redact)
- [ ] Logs de erro incluem stack trace
- [ ] Logs de operações críticas (pagamento, autenticação) têm auditoria separada
- [ ] Log rotation configurado para não encher disco

---

## 2. Métricas de aplicação {#metrics}

### Playbook: Instrumentar métricas com Prometheus/OpenTelemetry

**Quando usar:** Toda aplicação que precisa de SLA, troubleshooting de performance ou capacity planning.

**Passos:**
1. Defina as 4 métricas Golden Signals: Latência, Tráfego, Erros, Saturação
2. Instrumente automaticamente HTTP (middleware) e manualmente pontos críticos de negócio
3. Use histogramas para latência (não gauges — você precisa de percentis)
4. Exponha endpoint `/metrics` no formato Prometheus
5. Configure Grafana com dashboards para cada serviço

```typescript
// Express + prom-client
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry }); // CPU, memória, GC

// Métricas HTTP (latência, throughput, erros)
const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
});

const httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
});

// Métricas de negócio
const ordersCreated = new Counter({
    name: 'orders_created_total',
    help: 'Total de pedidos criados',
    labelNames: ['payment_method', 'channel'],
    registers: [registry],
});

const activeConnections = new Gauge({
    name: 'db_pool_active_connections',
    help: 'Conexões ativas no pool do banco',
    registers: [registry],
});

// Middleware automático
function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: req.route?.path ?? req.path,
            status_code: String(res.statusCode),
        };
        end(labels);
        httpRequestTotal.inc(labels);
    });
    next();
}

// Endpoint para Prometheus scrape
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});
```

**SLIs (Service Level Indicators) essenciais:**
| Métrica | PromQL | SLO típico |
|---|---|---|
| Taxa de erro | `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])` | < 0.1% |
| Latência P99 | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | < 500ms |
| Disponibilidade | `avg_over_time(up[30d])` | > 99.9% |
| Saturação (CPU) | `rate(process_cpu_seconds_total[5m])` | < 80% |

---

## 3. Tracing distribuído {#tracing}

### Playbook: Implementar rastreamento com OpenTelemetry

**Quando usar:** Sistemas com mais de 2 serviços, especialmente para diagnosticar latência e rastrear requisições end-to-end.

**Passos:**
1. Adicione OpenTelemetry SDK (instrumentation automática para HTTP, DB, filas)
2. Configure exportador (Jaeger, Zipkin, Tempo, Datadog, Honeycomb)
3. Propague `traceparent` header em todas as chamadas entre serviços
4. Adicione spans customizados para operações críticas de negócio
5. Correlacione trace IDs com seus logs

```typescript
// OpenTelemetry setup (Node.js)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';

// Inicializar ANTES de qualquer import da aplicação
const sdk = new NodeSDK({
    serviceName: 'orders-service',
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    instrumentations: [
        new HttpInstrumentation({
            requestHook: (span, req) => {
                span.setAttribute('http.request.body', JSON.stringify(req.body));
            },
        }),
        new PgInstrumentation(),
        new RedisInstrumentation(),
    ],
});

sdk.start();

// Span customizado para operação de negócio
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('orders-service');

async function processPayment(orderId: string, amount: number) {
    return tracer.startActiveSpan('process_payment', async (span) => {
        span.setAttributes({
            'order.id': orderId,
            'payment.amount_cents': amount,
        });

        try {
            const result = await paymentGateway.charge(orderId, amount);
            span.setAttribute('payment.transaction_id', result.transactionId);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
            span.recordException(err as Error);
            throw err;
        } finally {
            span.end();
        }
    });
}
```

**Propagação entre serviços:**
```typescript
// Sempre propague o contexto em chamadas HTTP
import { propagation, context } from '@opentelemetry/api';

async function callInventoryService(productId: string) {
    const headers: Record<string, string> = {};
    propagation.inject(context.active(), headers);  // Injeta traceparent, tracestate

    return fetch(`${INVENTORY_URL}/products/${productId}`, { headers });
}
```

---

## 4. Monitoramento e alertas {#monitoring}

### Playbook: Configurar alertas que detectam problemas reais

**Quando usar:** Toda aplicação em produção que precisa de resposta rápida a incidentes.

**Passos:**
1. Alerte em sintomas, não causas (alta latência, não "CPU > 80%")
2. Defina SLOs claros antes de escrever alertas
3. Calibre alertas para evitar false positives (ruído mata a atenção)
4. Configure pagerduty/opsgenie com escalation policy
5. Documente runbooks para cada alerta

```yaml
# Prometheus AlertManager rules
groups:
  - name: orders-service
    interval: 30s
    rules:
      # SINTOMA: Alta taxa de erro (alerta em 5xx, não "DB down")
      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{service="orders-service", status_code=~"5.."}[5m])
            /
            rate(http_requests_total{service="orders-service"}[5m])
          ) > 0.01
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Taxa de erro > 1% em orders-service"
          description: "{{ $value | humanizePercentage }} dos requests estão falhando nos últimos 5 min"
          runbook: "https://wiki.company.com/runbooks/orders-high-error-rate"

      # SINTOMA: Latência alta
      - alert: HighP99Latency
        expr: |
          histogram_quantile(0.99,
            rate(http_request_duration_seconds_bucket{service="orders-service"}[5m])
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latência > 500ms"
          runbook: "https://wiki.company.com/runbooks/orders-high-latency"

      # SINTOMA: Fila acumulando (workers não estão dando conta)
      - alert: QueueDepthHigh
        expr: rabbitmq_queue_messages{queue="orders.processing"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Fila orders.processing com > 1000 mensagens"

      # SINTOMA: Saturação de banco
      - alert: DBConnectionPoolExhausted
        expr: |
          db_pool_active_connections / db_pool_max_connections > 0.9
        for: 1m
        labels:
          severity: critical
```

**Anti-patterns de alertas:**
- ❌ Alerta em CPU > 80% (causa, não sintoma — CPU alta não significa usuários afetados)
- ❌ Alertas sem runbook (a pessoa que acorda às 3am precisa saber o que fazer)
- ❌ Threshold estático sem `for` (transients disparam alertas desnecessários)
- ❌ Muitos alertas de baixa severidade (alert fatigue)

**Runbook template:**
```markdown
## Runbook: HighErrorRate em orders-service

### O que está acontecendo
Taxa de erros HTTP 5xx acima de 1% nos últimos 5 minutos.

### Impacto
Usuários não conseguem criar/visualizar pedidos.

### Passos de diagnóstico
1. Verificar logs de erro: `kubectl logs -l app=orders-service --tail=200 | grep ERROR`
2. Verificar status do banco: `psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state"`
3. Verificar métricas de DB pool: Grafana → Orders Dashboard → DB Pool panel
4. Verificar dependências externas: payment-service, inventory-service

### Ações de mitigação
- Se DB pool saturado: `kubectl scale deployment orders-service --replicas=5`
- Se serviço externo down: verificar circuit breaker status, habilitar fallback mode
- Se memory leak: `kubectl rollout restart deployment orders-service`

### Escalação
Se não resolvido em 15 min → escalar para @backend-oncall no Slack
```

---

## 5. Análise de incidentes {#incidents}

### Playbook: Investigar falhas em produção

**Quando usar:** Toda vez que houver degradação ou indisponibilidade em produção.

**Durante o incidente (timeline em minutos):**
```
T+0: Alerta dispara ou usuário reporta
T+5: Identificar severidade e abrir war room (Slack/Meet)
T+10: Designar roles: Incident Commander, Comunicação, Técnico
T+15: Primeira atualização de status para stakeholders
T+30: Se não resolvido, escalar ou aplicar mitigação (rollback, feature flag)
T+X: Resolvido — comunicar resolução e agendar post-mortem
```

**Comandos de diagnóstico rápido:**
```bash
# Ver logs dos últimos 10 minutos com erros
kubectl logs -l app=my-service --since=10m | grep -E "(ERROR|FATAL|Exception)"

# Ver pods em crash loop
kubectl get pods --field-selector=status.phase=Failed

# Ver eventos do namespace
kubectl get events --sort-by='.lastTimestamp' -n production | tail -30

# Verificar resource limits
kubectl top pods -n production

# Ver últimos deployments
kubectl rollout history deployment/orders-service

# Rollback rápido
kubectl rollout undo deployment/orders-service

# Verificar conexões de banco
psql -c "SELECT pid, state, query, now() - pg_stat_activity.query_start AS duration
         FROM pg_stat_activity
         WHERE state != 'idle'
         ORDER BY duration DESC LIMIT 20;"
```

**Post-mortem (blameless):**
```markdown
## Post-mortem: [Título do Incidente]

**Data:** [DD/MM/AAAA]
**Duração:** [início] → [fim] ([X horas])
**Severidade:** P1 / P2 / P3
**Autores:** [nomes]

### Resumo executivo
[2-3 frases: o que aconteceu, impacto, causa raiz]

### Timeline
| Horário | Evento |
|---|---|
| 14:32 | Alerta HighErrorRate disparou |
| 14:35 | Engenheiro investigou logs |
| 14:50 | Causa raiz identificada: migration mal escrita bloqueou tabela |
| 15:10 | Rollback da migration aplicado |
| 15:12 | Serviço normalizado |

### Causa raiz (5 Whys)
- Por quê o serviço ficou lento? → Queries travadas no banco
- Por quê as queries travaram? → ALTER TABLE sem CONCURRENT em tabela de 50M linhas
- Por quê passou em produção? → Processo de review não incluía DBA para migrations grandes
- Por quê não tinha alerta? → Alert de lock wait não estava configurado
- Causa raiz: **Falta de processo de review para migrations de alto risco**

### Impacto
- X usuários afetados
- Y pedidos falharam ($ de receita impactada)
- Z minutos de downtime parcial

### O que foi bem
- Detecção foi rápida (alerta disparou em 3 min)
- Rollback foi executado sem problemas

### Ações corretivas
| Ação | Responsável | Prazo |
|---|---|---|
| Adicionar revisão de DBA para migrations > 1M rows | @devops | 1 semana |
| Criar alerta para lock_wait_timeout > 30s | @backend | 3 dias |
| Documentar checklist de migrations de alto risco | @backend | 1 semana |
```

---

## 6. Observabilidade como código {#obs-as-code}

### Playbook: Padronizar observabilidade como parte do delivery

**Princípio:** Nenhuma feature vai para produção sem logs, métricas e tracing adequados.

**Checklist de observabilidade antes do deploy:**
- [ ] Toda operação de negócio crítica tem log INFO de início e fim
- [ ] Erros têm log ERROR com contexto suficiente para debug
- [ ] Endpoints HTTP instrumentados com histograma de latência
- [ ] Operações lentas (> 100ms) têm span customizado no trace
- [ ] Health check endpoint `/health` ou `/healthz` implementado
- [ ] Métricas de negócio definidas e expostas (ex: `orders_created_total`)
- [ ] Alertas configurados para SLOs do serviço
- [ ] Dashboard básico criado no Grafana
- [ ] Runbook escrito para o alerta mais crítico

**Health check robusto:**
```typescript
app.get('/health', async (req, res) => {
    const checks = await Promise.allSettled([
        db.query('SELECT 1'),           // banco
        redis.ping(),                    // cache
        kafka.admin().listTopics(),      // mensageria
    ]);

    const status = {
        status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION,
        checks: {
            database: checks[0].status === 'fulfilled' ? 'ok' : 'fail',
            cache:    checks[1].status === 'fulfilled' ? 'ok' : 'fail',
            queue:    checks[2].status === 'fulfilled' ? 'ok' : 'fail',
        }
    };

    res.status(status.status === 'healthy' ? 200 : 503).json(status);
});
```
