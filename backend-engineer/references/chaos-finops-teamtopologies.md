# Chaos Engineering, Alta Disponibilidade Global, FinOps & Team Topologies

## Sumário
1. [Chaos Engineering — Chaos Mesh e AWS FIS](#chaos-engineering)
2. [GameDays de Disaster Recovery](#gamedays)
3. [Testes de carga distribuídos — k6 e Locust](#load-testing)
4. [Multi-Region Active-Active vs Active-Passive](#multi-region)
5. [Anycast / GeoDNS](#anycast-geodns)
6. [FinOps — otimização de custo cloud](#finops)
7. [Fitness Functions arquiteturais](#fitness-functions)
8. [Shadow Traffic / Traffic Mirroring](#shadow-traffic)
9. [Team Topologies e Lei de Conway](#team-topologies)

---

## 1. Chaos Engineering {#chaos-engineering}

### Princípios

```
Chaos Engineering não é "quebrar coisas aleatoriamente" — é um experimento científico:

1. Definir o "estado estável" (steady state) via métricas (ex: latência P99 < 200ms)
2. Formular hipótese: "Se o pod de pagamento cair, o circuit breaker deve isolar
   a falha e o checkout deve degradar graciosamente, sem cair por completo"
3. Injetar a falha em ambiente controlado (staging primeiro, produção depois)
4. Comparar o estado real com a hipótese
5. Corrigir o gap encontrado, documentar, repetir
```

### Chaos Mesh — Kubernetes

```yaml
# Simular latência de rede entre serviços
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payment-service-latency
  namespace: production
spec:
  action: delay
  mode: fixed-percent
  value: "50"   # afeta 50% das réplicas
  selector:
    namespaces: [production]
    labelSelectors:
      app: payment-service
  delay:
    latency: "300ms"
    jitter: "50ms"
  duration: "5m"
  scheduler:
    cron: "@every 1h"   # experimento recorrente, não só manual

---
# Matar pods aleatoriamente (pod-kill) para testar resiliência do orquestrador
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: random-pod-kill
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [production]
    labelSelectors:
      app: orders-service
  scheduler:
    cron: "0 3 * * MON"  # toda segunda às 3h — horário de baixo tráfego

---
# Simular falta de recurso (CPU stress)
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: recommendation-service
  stressors:
    cpu:
      workers: 4
      load: 90
  duration: "3m"
```

### AWS Fault Injection Simulator (FIS)

```json
{
  "description": "Simular falha de AZ inteira",
  "targets": {
    "ec2-instances": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": { "Environment": "production", "AZ": "us-east-1a" },
      "selectionMode": "ALL"
    }
  },
  "actions": {
    "stop-instances": {
      "actionId": "aws:ec2:stop-instances",
      "targets": { "Instances": "ec2-instances" }
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:us-east-1:123456789:alarm:error-rate-critical"
    }
  ]
}
```

```
stopConditions é o mais importante: interrompe o experimento automaticamente
se um alarme crítico disparar — chaos engineering em produção SEMPRE precisa
de um "kill switch" automático, não só monitoramento manual.
```

### Progressão recomendada de maturidade

```
Nível 1: Chaos manual em staging (matar pod, ver o que acontece)
Nível 2: Chaos automatizado em staging, agendado (CI roda experimentos)
Nível 3: Chaos automatizado em produção, com stopConditions e blast radius pequeno
Nível 4: GameDays trimestrais simulando desastre regional completo (ver seção 2)
```

---

## 2. GameDays de Disaster Recovery {#gamedays}

### Estrutura de um GameDay

```
Antes:
- Definir cenário (ex: "região primária inteira fica indisponível")
- Definir critérios de sucesso (RTO/RPO alvo — ver performance.md)
- Avisar stakeholders (mas NÃO o time on-call que vai responder — testa reação real)
- Ter um "abort button" claro para interromper se sair do controle

Durante:
- Executar o cenário (ex: bloquear tráfego para a região primária via Route53/Cloud DNS)
- Time on-call responde como se fosse incidente real
- Um facilitador observa e documenta (sem intervir, a menos que necessário)
- Cronometrar: tempo até detecção, tempo até mitigação, tempo até resolução total

Depois:
- Post-mortem sem culpa (blameless): o que funcionou, o que não funcionou
- Comparar RTO/RPO real vs. alvo
- Criar itens de ação com dono e prazo
- Reagendar o próximo GameDay já testando a correção dos gaps encontrados
```

### Runbook de exemplo — GameDay de failover regional

```markdown
## GameDay: Failover de us-east-1 para us-west-2

**Cenário**: us-east-1 fica completamente indisponível (rede, não apenas 1 serviço).

**Critério de sucesso**: RTO < 15 min, RPO < 5 min (perda de dados aceitável).

**Passos do experimento**:
1. [T+0min] Facilitador bloqueia tráfego de entrada para us-east-1 (via WAF/LB)
2. [T+0min] Time on-call é acionado pelo alerta automático (não pelo facilitador)
3. [T+?min] Time detecta a indisponibilidade → registrar tempo de detecção
4. [T+?min] Time decide fazer failover → registrar tempo de decisão
5. [T+?min] DNS/Route53 aponta para us-west-2 → registrar tempo de propagação
6. [T+?min] Verificar integridade de dados (réplica estava sincronizada?) → registrar RPO real
7. [T+?min] Sistema respondendo normalmente em us-west-2 → registrar RTO real

**Métricas a capturar**: tempo de detecção, tempo de decisão, tempo de execução, RPO real.
```

---

## 3. Testes de carga distribuídos — k6 e Locust {#load-testing}

### k6 — teste de carga como código

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '2m', target: 100 },   // ramp-up
        { duration: '5m', target: 100 },   // sustentar carga
        { duration: '2m', target: 500 },   // spike
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },     // ramp-down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],  // SLA de latência
        errors: ['rate<0.01'],                             // taxa de erro < 1%
    },
};

export default function () {
    const res = http.post('https://api.meuapp.com/orders', JSON.stringify({
        productId: 'prod_123',
        quantity: 1,
    }), { headers: { 'Content-Type': 'application/json' } });

    const passed = check(res, {
        'status é 201': (r) => r.status === 201,
        'latência < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!passed);

    sleep(1);
}
```

```bash
# Rodar distribuído (k6 Cloud ou operator no Kubernetes) para simular escala real
k6 run --out cloud load-test.js

# No CI, falhar o pipeline se os thresholds não forem atingidos
k6 run load-test.js  # exit code != 0 se threshold falhar
```

### Locust — quando preferir (Python, cenários complexos com estado)

```python
from locust import HttpUser, task, between

class CheckoutFlow(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # Login uma vez por usuário virtual — simula sessão real
        response = self.client.post("/auth/login", json={"email": "test@test.com", "password": "test"})
        self.token = response.json()["accessToken"]

    @task(3)  # peso: executado 3x mais que add_to_cart isoladamente
    def browse_products(self):
        self.client.get("/products", headers={"Authorization": f"Bearer {self.token}"})

    @task(1)
    def full_checkout_flow(self):
        # Simula fluxo completo com estado entre requests — Locust é melhor que k6 pra isso
        cart = self.client.post("/cart/items", json={"productId": "prod_123", "quantity": 2},
                                 headers={"Authorization": f"Bearer {self.token}"})
        self.client.post("/checkout", json={"cartId": cart.json()["id"]},
                          headers={"Authorization": f"Bearer {self.token}"})
```

```bash
# Distribuído: 1 master + N workers para gerar carga realista de milhares de VUs
locust -f locustfile.py --master
locust -f locustfile.py --worker --master-host=master-ip
```

### k6 vs Locust

| Critério | k6 | Locust |
|---|---|---|
| Linguagem | JavaScript | Python |
| Cenários com estado complexo | Possível, mais verboso | Natural (classes Python) |
| Integração CI/CD | Excelente (thresholds nativos) | Requer script adicional |
| Distribuição de carga | k6 Cloud ou k6-operator (K8s) | Master/worker nativo |

---

## 4. Multi-Region Active-Active vs Active-Passive {#multi-region}

### Comparação

```
Active-Passive:
✅ Mais simples de operar e raciocinar
✅ Sem conflitos de escrita concorrente entre regiões
❌ Região passiva ociosa a maior parte do tempo (custo)
❌ RTO maior (failover não é instantâneo)

Active-Active:
✅ Melhor latência (usuário atende pela região mais próxima)
✅ RTO ~0 (outra região já está servindo tráfego)
❌ Requer resolver conflitos de escrita (last-write-wins, CRDTs, ou particionamento por região)
❌ Complexidade operacional muito maior
```

### Active-Passive — implementação

```typescript
// Health check cross-region que decide o failover
class RegionHealthMonitor {
    async checkPrimaryHealth(): Promise<boolean> {
        try {
            const res = await fetch('https://api-primary.internal/health/ready', { signal: AbortSignal.timeout(3000) });
            return res.ok;
        } catch {
            return false;
        }
    }

    async triggerFailoverIfNeeded(): Promise<void> {
        const consecutiveFailures = await this.countRecentFailures();
        if (consecutiveFailures >= 3) {  // evita failover por falha transitória única
            await this.promoteSecondaryToPrimary();
            await this.updateDnsToSecondary();
            await this.alertOncall('Failover automático executado: primary → secondary');
        }
    }
}
```

```hcl
# Route 53 failover routing
resource "aws_route53_health_check" "primary" {
  fqdn              = "api-primary.meuapp.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health/ready"
  failure_threshold = 3
  request_interval  = 10
}

resource "aws_route53_record" "primary" {
  zone_id = var.zone_id
  name    = "api.meuapp.com"
  type    = "A"
  failover_routing_policy { type = "PRIMARY" }
  health_check_id = aws_route53_health_check.primary.id
  set_identifier  = "primary"
  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  zone_id = var.zone_id
  name    = "api.meuapp.com"
  type    = "A"
  failover_routing_policy { type = "SECONDARY" }
  set_identifier = "secondary"
  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}
```

### Active-Active — resolução de conflitos

```typescript
// Estratégia 1: particionar escrita por região (sem conflito possível)
// Usuário do Brasil sempre escreve na região sa-east-1, EUA em us-east-1
// Leitura pode ser cross-region, escrita não.

// Estratégia 2: CRDT (Conflict-free Replicated Data Type) para dados que precisam
// aceitar escrita em qualquer região simultaneamente (ex: contador de likes)
class GCounter {  // Grow-only counter CRDT
    private counts: Map<string, number> = new Map(); // por região

    increment(region: string, amount = 1): void {
        this.counts.set(region, (this.counts.get(region) ?? 0) + amount);
    }

    // Merge de estados de regiões diferentes é sempre determinístico e sem conflito
    merge(other: GCounter): void {
        for (const [region, count] of other.counts) {
            this.counts.set(region, Math.max(this.counts.get(region) ?? 0, count));
        }
    }

    total(): number {
        return [...this.counts.values()].reduce((a, b) => a + b, 0);
    }
}

// Estratégia 3: last-write-wins com vetor de versão (aceitar perda de escrita rara)
// Usar quando o dado tolera "o mais recente vence" (ex: preferências de UI do usuário)
```

---

## 5. Anycast / GeoDNS {#anycast-geodns}

```
GeoDNS: resolve o DNS para o IP do datacenter mais próximo GEOGRAFICAMENTE
do usuário, baseado na localização do resolver DNS dele.
→ Simples de configurar (Route53 Geolocation Routing, Cloud DNS)
→ Roteamento acontece 1x, no momento da resolução DNS (TTL pode causar
  usuário ficar preso em uma região por um tempo após mudança)

Anycast: o MESMO endereço IP é anunciado via BGP a partir de múltiplos
datacenters. O roteamento de rede (não DNS) decide qual datacenter responde,
baseado no caminho de rede mais curto.
→ Mais rápido para convergir em caso de falha (segundos, não depende de TTL de DNS)
→ Requer infraestrutura de rede própria ou provider que ofereça isso
  (Cloudflare, AWS Global Accelerator, Google Cloud's Anycast IPs)
```

```hcl
# Route53 Geolocation Routing — GeoDNS
resource "aws_route53_record" "api_americas" {
  zone_id = var.zone_id
  name    = "api.meuapp.com"
  type    = "A"
  geolocation_routing_policy {
    continent = "NA"
  }
  set_identifier = "americas"
  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_europe" {
  zone_id = var.zone_id
  name    = "api.meuapp.com"
  type    = "A"
  geolocation_routing_policy {
    continent = "EU"
  }
  set_identifier = "europe"
  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

```bash
# AWS Global Accelerator — Anycast gerenciado (2 IPs anycast fixos, roteamento por rede AWS)
aws globalaccelerator create-accelerator --name api-accelerator
aws globalaccelerator create-endpoint-group \
    --listener-arn $LISTENER_ARN \
    --endpoint-group-region us-east-1 \
    --endpoint-configurations EndpointId=$ALB_US_ARN,Weight=100
```

---

## 6. FinOps — otimização de custo cloud {#finops}

### Framework FinOps: Inform → Optimize → Operate

```
Inform: visibilidade de custo por time/produto/feature (tagging obrigatório)
Optimize: right-sizing, spot/preemptible, storage tiering
Operate: automação de políticas de custo contínuas (não é projeto único)
```

### Right-sizing e instâncias Spot/Preemptible

```typescript
// Estratégia: workload tolerante a interrupção → Spot/Preemptible (60-90% mais barato)
// Workload crítico e sem tolerância → On-Demand/Reserved

const workloadClassification = {
    'batch-processing': 'spot',       // pode reprocessar se interrompido
    'ci-runners': 'spot',              // job falha, CI re-roda
    'recommendation-worker': 'spot',   // best-effort, não crítico
    'payment-api': 'on-demand',        // crítico, não tolera interrupção
    'database-primary': 'reserved',    // sempre ligado, contrato de 1-3 anos = desconto
};
```

```yaml
# Kubernetes — node pool spot com fallback automático para on-demand
apiVersion: v1
kind: Pod
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: node.kubernetes.io/capacity-type
                operator: In
                values: ["spot"]  # prefere spot, mas aceita on-demand se não houver
  tolerations:
    - key: "spot"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
  containers:
    - name: batch-worker
      # Deve ser idempotente e tolerar SIGTERM com checkpoint — spot pode ser reclamado a qualquer momento
```

### Ciclo de vida de armazenamento (tiering)

```json
// S3 Lifecycle Policy — move dados frios automaticamente para tiers mais baratos
{
  "Rules": [{
    "Id": "tier-old-logs",
    "Status": "Enabled",
    "Filter": { "Prefix": "logs/" },
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 }
  }]
}
```

```hcl
# GCS equivalente
resource "google_storage_bucket" "logs" {
  name = "app-logs"
  lifecycle_rule {
    condition { age = 30 }
    action { type = "SetStorageClass", storage_class = "NEARLINE" }
  }
  lifecycle_rule {
    condition { age = 90 }
    action { type = "SetStorageClass", storage_class = "COLDLINE" }
  }
  lifecycle_rule {
    condition { age = 365 }
    action { type = "SetStorageClass", storage_class = "ARCHIVE" }
  }
}
```

### Minimizar custo de egress

```
Egress de rede é frequentemente o custo cloud mais subestimado:

✅ Servir assets estáticos via CDN (egress do CDN é mais barato que direto do storage)
✅ Manter tráfego entre serviços na MESMA região/AZ quando possível
   (cross-AZ e cross-region têm custo de transferência)
✅ Usar VPC endpoints/Private Service Connect para S3/GCS
   (evita sair pela internet pública, elimina custo de NAT Gateway para esse tráfego)
✅ Comprimir payloads de API (gzip/brotli) — reduz bytes transferidos
```

### Tags obrigatórias para visibilidade de custo

```hcl
# Toda infra deve carregar essas tags — sem isso, "Inform" do FinOps é impossível
locals {
  mandatory_tags = {
    team        = var.team_name
    product     = var.product_name
    environment = var.environment
    cost_center = var.cost_center
  }
}

resource "aws_instance" "example" {
  # ...
  tags = local.mandatory_tags
}
```

---

## 7. Fitness Functions arquiteturais {#fitness-functions}

### O que são e por que usar

```
Fitness Functions são testes automatizados que validam se a arquitetura
continua respeitando as regras definidas (não o comportamento funcional,
mas a ESTRUTURA do código) — rodam no CI, quebram o build se violadas.

Exemplos de regras que uma fitness function valida:
- "Camada de domínio não pode importar nada da camada de infraestrutura"
- "Módulo de billing não pode depender diretamente do módulo de notifications"
- "Nenhum ciclo de dependência entre pacotes"
- "Complexidade ciclomática máxima de 10 por função"
```

### ArchUnit — Java/Kotlin

```java
@AnalyzeClasses(packages = "com.minhaempresa.orders")
class ArchitectureTest {

    @ArchTest
    static final ArchRule domain_nao_deve_depender_de_infraestrutura =
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..");

    @ArchTest
    static final ArchRule controllers_nao_devem_acessar_repository_diretamente =
        noClasses().that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAPackage("..repository..")
            .because("Controllers devem passar pela camada de use case/service");

    @ArchTest
    static final ArchRule sem_ciclos_entre_pacotes =
        slices().matching("com.minhaempresa.orders.(*)..")
            .should().beFreeOfCycles();

    @ArchTest
    static final ArchRule billing_nao_deve_depender_de_notifications =
        noClasses().that().resideInAPackage("..billing..")
            .should().dependOnClassesThat().resideInAPackage("..notifications..");
}
```

### Packwerk — Ruby (modular monolith)

```yaml
# packwerk.yml
package_paths: packs/*

# packs/billing/package.yml
enforce_dependencies: true
enforce_privacy: true
dependencies:
  - packs/shared_kernel
# Nota: billing NÃO lista notifications como dependência —
# Packwerk falha o CI se algum código de billing importar de notifications
```

```bash
# Rodar validação de arquitetura como parte do CI, igual um teste normal
bundle exec packwerk check
# CI falha automaticamente se houver violação de fronteira entre packs
```

### Fitness function customizada (qualquer linguagem) — validação de imports

```javascript
// eslint com regra customizada — fitness function leve para Node/TypeScript
// .eslintrc.js
module.exports = {
    rules: {
        'import/no-restricted-paths': ['error', {
            zones: [
                {
                    target: './src/domain',
                    from: './src/infrastructure',
                    message: 'Domínio não pode depender de infraestrutura (Clean Architecture)',
                },
                {
                    target: './src/modules/billing',
                    from: './src/modules/notifications',
                    message: 'Billing não pode depender diretamente de notifications',
                },
            ],
        }],
    },
};
```

---

## 8. Shadow Traffic / Traffic Mirroring {#shadow-traffic}

### Conceito

```
Shadow traffic: espelhar tráfego de produção REAL para uma versão nova do
serviço, SEM que a resposta dela afete o usuário — só para observar
comportamento, performance e corretude antes de expor de verdade.

Diferença de Canary: Canary expõe uma % de usuários reais à nova versão
(eles recebem a resposta dela). Shadow não expõe ninguém — só observa.

Use shadow quando: mudança arriscada demais para até um canary pequeno
(ex: reescrita completa do serviço, troca de banco de dados, novo modelo de ML).
```

```yaml
# Istio — mirroring de tráfego para uma versão shadow (v2)
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: orders-service
spec:
  hosts: [orders-service]
  http:
    - route:
        - destination:
            host: orders-service
            subset: v1
          weight: 100
      mirror:
        host: orders-service
        subset: v2       # recebe cópia do tráfego, resposta é descartada
      mirrorPercentage:
        value: 100.0     # espelhar 100% do tráfego (ou reduzir gradualmente)
```

```typescript
// Shadow traffic manual (sem service mesh) — fire-and-forget para o novo serviço
async function handleOrderRequest(req: Request): Promise<Response> {
    const response = await legacyOrderService.process(req);

    // Envia cópia assíncrona para o novo serviço, SEM esperar nem usar a resposta
    shadowToNewService(req).catch(err => {
        logger.warn('Shadow request falhou (não afeta produção)', { err });
    });

    return response; // resposta do usuário vem SEMPRE do serviço legado
}

async function shadowToNewService(req: Request): Promise<void> {
    const shadowResponse = await newOrderService.process(req);
    // Comparar resposta do shadow vs. legado para detectar divergências
    await comparisonLogger.log({
        requestId: req.id,
        legacyResult: null, // já retornado ao usuário
        shadowResult: shadowResponse,
    });
}
```

### Checklist de shadow traffic
- [ ] Serviço shadow NUNCA deve ter efeitos colaterais reais (não enviar email, não cobrar cartão)
- [ ] Se o shadow escreve em banco, usar banco/schema separado (nunca o de produção)
- [ ] Comparar resultados automaticamente (diff entre resposta legada e shadow) e alertar divergências
- [ ] Monitorar latência/erro do shadow separadamente — não deve competir por recursos com produção

---

## 9. Team Topologies e Lei de Conway {#team-topologies}

### Lei de Conway

```
"Organizações que desenham sistemas são obrigadas a produzir designs que são
cópias das estruturas de comunicação dessas organizações." — Melvin Conway

Na prática: se dois times não se comunicam bem, os sistemas que eles constroem
terão uma interface mal definida entre si — a arquitetura reflete o organograma,
quer você planeje isso ou não.

Conway Reverso (Inverse Conway Maneuver): desenhar a estrutura de TIMES
que você quer, para que a ARQUITETURA desejada emerja naturalmente.
```

### Os 4 tipos de time (Team Topologies)

```
1. Stream-aligned team
   → Time alinhado a um fluxo de valor de negócio de ponta a ponta
   → Ex: "Time de Checkout" — dono do fluxo completo de compra
   → É o tipo PADRÃO — a maioria dos times deveria ser deste tipo

2. Platform team
   → Constrói plataformas internas (IDP) que os stream-aligned teams consomem
     como self-service, reduzindo carga cognitiva deles
   → Ex: "Time de Plataforma" — provê CI/CD, observabilidade, provisionamento como produto interno

3. Enabling team
   → Time temporário de especialistas que ajuda outros times a adquirir uma
     capacidade nova (ex: segurança, performance) e depois se retira
   → NÃO deve virar dependência permanente — o objetivo é capacitar, não executar para sempre

4. Complicated-subsystem team
   → Time dono de um subsistema que exige expertise muito específica
     (ex: motor de matching de pagamentos, algoritmo de pricing)
   → Existe para PROTEGER os stream-aligned teams de precisar entender aquela complexidade
```

### Os 3 modos de interação entre times

```
Collaboration: dois times trabalham juntos intensamente por um período —
  usar quando descobrindo algo novo, alto acoplamento temporário é esperado

X-as-a-Service: um time consome o que o outro provê via API/contrato bem definido,
  sem precisar entender o funcionamento interno — baixo acoplamento, ideal para
  Platform teams servindo Stream-aligned teams

Facilitating: um time (geralmente Enabling) ajuda outro a superar um obstáculo,
  transferindo conhecimento — temporário por definição
```

### Aplicando ao desenho de arquitetura

```
Exemplo prático — e-commerce com 4 stream-aligned teams:

Time Catálogo  ──X-as-a-Service──▶  Platform Team (IDP: deploy, observability)
Time Checkout  ──X-as-a-Service──▶  Platform Team
Time Pricing (complicated-subsystem) ──X-as-a-Service──▶  Time Checkout consome
                                                            API de pricing sem
                                                            entender o algoritmo
Time Segurança (enabling) ──Facilitating──▶ Todos os stream-aligned teams
                                              (temporário, até times terem
                                              maturidade de segurança própria)

Cada bounded context (DDD, ver architecture-patterns.md) deveria idealmente
ter UM time dono — quando um bounded context tem múltiplos times escrevendo
nele, é sinal de que ou o bounded context está mal definido, ou a estrutura
organizacional está brigando com a arquitetura desejada (Lei de Conway).
```

### Sinais de que a estrutura de times está brigando com a arquitetura
- [ ] Toda mudança pequena precisa de coordenação entre 3+ times → bounded contexts mal alinhados aos times
- [ ] Um time precisa entender profundamente o domínio de outro para fazer seu trabalho → falta de X-as-a-Service
- [ ] Enabling team virou dependência permanente → está fazendo trabalho de stream-aligned team
- [ ] Deploy de um serviço trava esperando outro time → acoplamento arquitetural refletindo silo organizacional
