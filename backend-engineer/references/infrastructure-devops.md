# Infraestrutura e DevOps — Docker, Kubernetes, CI/CD, Cloud

## Sumário
1. [Docker — containerização](#docker)
2. [Segurança de containers — rootless, capabilities, scanning, SBOM](#container-security)
3. [Kubernetes — orquestração](#kubernetes)
4. [CI/CD — pipelines](#cicd)
5. [AWS — serviços essenciais](#aws)
6. [GCP — arquitetura em profundidade](#gcp-deep)
7. [Azure — referência rápida](#azure)

---

## 1. Docker {#docker}

### Dockerfile multi-stage otimizado

```dockerfile
# Node.js — Dockerfile multi-stage (menor imagem final, sem dev deps)
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
# Usuário não-root (segurança)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

```dockerfile
# Python FastAPI — multi-stage
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
RUN adduser --disabled-password --gecos '' appuser
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### docker-compose para desenvolvimento local

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build:
      context: .
      target: runtime
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    env_file: .env.local
    volumes:
      - ./src:/app/src  # hot reload em dev
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

volumes:
  postgres_data:
  redis_data:
```

---

## 2. Segurança de containers — rootless, capabilities, scanning, SBOM {#container-security}

### Imagens mínimas: Distroless vs Alpine vs Scratch

| Base | Tamanho | Shell/debug tools | Quando usar |
|---|---|---|---|
| `scratch` | 0 MB (só o binário) | Nenhum | Go/Rust com binário estático — superfície de ataque mínima possível |
| `gcr.io/distroless/*` | ~20-50 MB | Nenhum (sem shell) | Node/Python/Java em produção — reduz CVEs de pacotes de SO não usados |
| `alpine` | ~5-8 MB base | `sh` (busybox) | Quando precisa de debug rápido ou instalar pacotes de sistema leves |
| `debian-slim`/`ubuntu` | ~70-120 MB | Shell completo | Evitar em produção — só para imagens de build intermediárias |

```dockerfile
# Go — binário estático em scratch (imagem final ~10MB, zero SO)
FROM golang:1.22 AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

FROM scratch
COPY --from=build /app/server /server
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/  # necessário para TLS
USER 65534:65534   # nobody — scratch não tem /etc/passwd, usar UID numérico
ENTRYPOINT ["/server"]
```

```dockerfile
# Node.js — distroless (sem shell, reduz superfície de ataque vs alpine)
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER nonroot   # usuário non-root já vem pronto na imagem distroless
EXPOSE 3000
CMD ["dist/main.js"]
```

### Rootless containers e drop de capabilities

```dockerfile
# Rootless: o próprio container roda como usuário não-root desde o build
FROM python:3.12-slim
RUN groupadd -r appgroup && useradd -r -g appgroup -u 10001 appuser
WORKDIR /app
COPY --chown=appuser:appgroup . .
USER 10001
CMD ["python", "main.py"]
```

```yaml
# Kubernetes — drop de TODAS as capabilities Linux, adicionar só o essencial
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    fsGroup: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: api
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]                    # remove todas as capabilities Linux por padrão
          add: ["NET_BIND_SERVICE"]        # adiciona de volta só o que é necessário
                                             # (ex: bind em porta <1024 sem ser root)
```

```bash
# Docker standalone (fora do K8s) — equivalente via CLI
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE \
    --security-opt=no-new-privileges:true \
    --read-only \
    --user 10001:10001 \
    myapp:1.0.0
```

### Scanning de vulnerabilidades — Trivy e Grype

```bash
# Trivy — scan de imagem, filesystem ou repositório Git
trivy image --severity HIGH,CRITICAL --exit-code 1 myregistry/api:1.0.0

# Grype — alternativa, integra bem com Syft (SBOM)
grype myregistry/api:1.0.0 --fail-on high
```

```yaml
# GitHub Actions — bloquear merge se vulnerabilidade crítica for encontrada
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    severity: 'HIGH,CRITICAL'
    exit-code: '1'          # falha o pipeline
    ignore-unfixed: true    # ignora CVEs sem patch disponível ainda
```

```bash
# AWS ECR — scanning nativo ao push
aws ecr put-image-scanning-configuration \
    --repository-name api --image-scanning-configuration scanOnPush=true

aws ecr describe-image-scan-findings --repository-name api --image-id imageTag=1.0.0

# GCP Artifact Analysis — scanning nativo no Artifact Registry
gcloud artifacts docker images scan IMAGE_URI --remote
```

### SBOM (Software Bill of Materials)

```bash
# Gerar SBOM com Syft — formato CycloneDX (padrão da indústria)
syft myregistry/api:1.0.0 -o cyclonedx-json > sbom.json

# SBOM permite responder rapidamente: "estamos expostos ao CVE-XXXX?"
# sem precisar re-escanear tudo — é um inventário estático de dependências
grype sbom:sbom.json
```

> Para assinatura de imagem e anexação do SBOM assinado (Cosign/Sigstore),
> proveniência de build (SLSA) e políticas de admissão que validam tudo isso
> antes do pod subir (OPA/Gatekeeper, Kyverno) → ver `compliance-supply-chain.md`.

### Checklist de segurança de containers
- [ ] Imagem base mínima (distroless/scratch/alpine), nunca `latest` como tag
- [ ] Container roda como non-root (`USER` explícito, `runAsNonRoot: true`)
- [ ] `--cap-drop=ALL` + adicionar só as capabilities estritamente necessárias
- [ ] `readOnlyRootFilesystem: true` sempre que a aplicação não escreve em disco local
- [ ] Scan de vulnerabilidade (Trivy/Grype) bloqueando o pipeline em CRITICAL/HIGH
- [ ] SBOM gerado e versionado a cada build de release

---

## 3. Kubernetes {#kubernetes}

### Deployment completo com boas práticas

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
  labels:
    app: api
    version: "1.0.0"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime deployment
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values: [api]
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: myregistry/api:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
      terminationGracePeriodSeconds: 60

---
# k8s/hpa.yaml — Auto scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Health checks no código

```typescript
// /health/live — o processo está vivo?
app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// /health/ready — pronto para receber tráfego?
app.get('/health/ready', async (req, res) => {
    try {
        await db.query('SELECT 1');
        await redis.ping();
        res.status(200).json({ status: 'ready', db: 'ok', cache: 'ok' });
    } catch (err) {
        res.status(503).json({ status: 'not_ready', error: String(err) });
    }
});
```

---

## 4. CI/CD {#cicd}

### GitHub Actions — pipeline completo

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Unit tests
        run: npm run test:unit -- --coverage
      
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - name: SAST scan
        uses: github/codeql-action/analyze@v3

  build-and-push:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build-and-push
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n staging
          kubectl rollout status deployment/api -n staging --timeout=5m

  deploy-production:
    needs: deploy-staging
    environment:
      name: production
      url: https://api.meuapp.com
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/api -n production --timeout=10m
```

---

## 5. AWS — Serviços essenciais {#aws}

### Mapa de serviços por necessidade

| Necessidade | Serviço AWS | Observação |
|---|---|---|
| Computação containerizada | **ECS Fargate** ou **EKS** | Fargate = sem gerenciar EC2 |
| Banco relacional gerenciado | **RDS (PostgreSQL/MySQL)** | Multi-AZ para HA |
| Cache gerenciado | **ElastiCache (Redis)** | Cluster mode para escala |
| Armazenamento de objetos | **S3** | Imagens, assets, backups |
| CDN | **CloudFront** | S3 + cache edge global |
| Fila de mensagens | **SQS** | FIFO ou standard |
| Event streaming | **MSK (Kafka)** ou **Kinesis** | Alto throughput |
| Functions serverless | **Lambda** | Eventos, webhooks, batch |
| API Gateway gerenciado | **API Gateway** | Throttling, auth, CORS |
| Secrets | **Secrets Manager** | Rotação automática |
| Logs e métricas | **CloudWatch** | APM + alertas |
| DNS | **Route 53** | Health checks + failover |
| Load balancer | **ALB** | Layer 7, suporte a gRPC |
| VPN / Rede privada | **VPC** | Isolamento de rede |

### Infrastructure as Code — Terraform

```hcl
# terraform/main.tf — exemplo básico de ECS + RDS
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.app_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${var.ecr_image}:${var.image_tag}"
    portMappings = [{ containerPort = 3000 }]
    environment = [
      { name = "NODE_ENV", value = "production" }
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_url.arn }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = "/ecs/${var.app_name}"
        "awslogs-region" = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.app_name}-db"
  engine            = "postgres"
  engine_version    = "16.1"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  multi_az               = true   # Alta disponibilidade
  deletion_protection    = true
  backup_retention_period = 7
  skip_final_snapshot    = false
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
}
```

---

## 6. GCP — Arquitetura em profundidade {#gcp-deep}

### Mapa de serviços por necessidade

| Necessidade | Serviço GCP | Observação |
|---|---|---|
| Computação containerizada | **Cloud Run** ou **GKE Autopilot** | Cloud Run = serverless, sem gerenciar nós; GKE Autopilot = K8s sem gerenciar node pool |
| Banco relacional gerenciado | **Cloud SQL** (PostgreSQL/MySQL) | Regional HA com failover automático |
| Banco relacional distribuído global | **Spanner** | Consistência forte + escala horizontal global (sem equivalente direto na AWS) |
| Banco NoSQL documento | **Firestore** | Real-time sync nativo, bom para apps mobile/web |
| Banco NoSQL wide-column | **Bigtable** | Alto throughput, séries temporais, analytics |
| Cache gerenciado | **Memorystore (Redis)** | Equivalente ao ElastiCache |
| Armazenamento de objetos | **Cloud Storage** | Classes: Standard, Nearline, Coldline, Archive |
| CDN | **Cloud CDN** | Integrado nativamente ao Load Balancer global |
| Mensageria pub/sub | **Pub/Sub** | Entrega at-least-once, ordenação opcional por chave |
| Orquestração de eventos | **Eventarc** | Conecta eventos de qualquer serviço GCP a handlers (Cloud Run, Functions) |
| Pipeline de dados em streaming/batch | **Dataflow** | Apache Beam gerenciado — processamento unificado stream+batch |
| Functions serverless | **Cloud Functions** (2ª geração roda sobre Cloud Run) | Eventos, webhooks, batch |
| Secrets | **Secret Manager** | Versionamento e rotação |
| Logs e métricas | **Cloud Monitoring + Cloud Logging** | Equivalente ao CloudWatch |
| DNS | **Cloud DNS** | Health checks + geolocation routing |
| Load balancer | **Cloud Load Balancing** | Global (anycast) por padrão — diferença chave vs ALB da AWS, que é regional |
| Rede privada / peering | **VPC + Private Service Connect (PSC)** | PSC é o equivalente ao AWS PrivateLink |
| Identidade entre serviços | **Workload Identity Federation** | Equivalente ao IAM Roles com OIDC da AWS |
| WAF / proteção DDoS | **Cloud Armor** | Equivalente ao AWS WAF + Shield |

### Diferenças arquiteturais importantes vs. AWS

```
Load Balancing: no GCP, o Load Balancer HTTP(S) global já é anycast por padrão
(1 IP único, roteado para a região mais próxima automaticamente). Na AWS, o ALB
é regional — para ter equivalente global, é preciso Global Accelerator + múltiplos ALBs.

Rede: GCP tem "Global VPC" nativamente — uma única VPC cobre todas as regiões
sem peering. Na AWS, VPCs são regionais e exigem VPC Peering ou Transit Gateway
para conectar regiões diferentes.

Spanner: não tem equivalente direto na AWS. É um banco relacional com
consistência forte E escala horizontal global (TrueTime API) — útil quando
você precisa de ACID cross-region, algo que normalmente exigiria abrir mão
de consistência forte em outros bancos distribuídos.
```

### Infrastructure as Code — Terraform para GCP

```hcl
# terraform/gcp-main.tf — Cloud Run + Cloud SQL, equivalente ao exemplo de ECS+RDS acima
resource "google_cloud_run_v2_service" "api" {
  name     = "${var.app_name}-api"
  location = var.region

  template {
    containers {
      image = "${var.artifact_registry_repo}/api:${var.image_tag}"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = { cpu = "1", memory = "512Mi" }
      }

      startup_probe {
        http_get { path = "/health/ready" }
        initial_delay_seconds = 5
        period_seconds         = 5
      }
      liveness_probe {
        http_get { path = "/health/live" }
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 20
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"   # só sai por VPC para IPs privados (economiza egress e é mais seguro)
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.app_name}-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"   # HA com failover automático — equivalente ao Multi-AZ da AWS

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id   # sem IP público — só acessível via VPC
    }
  }

  deletion_protection = true
}

# Workload Identity Federation — Cloud Run assume identidade sem chave de serviço estática
resource "google_service_account" "api_runtime" {
  account_id = "${var.app_name}-api-runtime"
}

resource "google_project_iam_member" "api_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}
```

### GitHub Actions → deploy no Cloud Run com Workload Identity (sem chave estática)

```yaml
# .github/workflows/deploy-gcp.yml
- name: Authenticate to GCP
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/gh-pool/providers/gh-provider'
    service_account: 'deployer@meu-projeto.iam.gserviceaccount.com'
    # Sem chave JSON de service account — federação OIDC do GitHub Actions direto com o GCP

- name: Deploy to Cloud Run
  run: |
    gcloud run deploy api \
      --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      --region us-central1 \
      --no-allow-unauthenticated
```

### Mapa rápido AWS ↔ GCP (para tradução mental rápida)

| AWS | GCP Equivalente |
|---|---|
| ECS/EKS | Cloud Run / GKE |
| RDS | Cloud SQL |
| Aurora (multi-region) | Spanner (mais próximo, embora arquitetura diferente) |
| DynamoDB | Firestore |
| MSK (Kafka gerenciado) | Pub/Sub (modelo diferente, não é Kafka-compatible) |
| ElastiCache | Memorystore |
| S3 | Cloud Storage |
| CloudFront | Cloud CDN |
| SQS | Pub/Sub |
| Lambda | Cloud Functions |
| Kinesis/Dataflow(AWS Glue) | Dataflow |
| Secrets Manager | Secret Manager |
| CloudWatch | Cloud Monitoring + Logging |
| VPC Peering/Transit Gateway | Global VPC (nativo, sem peering) |
| PrivateLink | Private Service Connect |
| WAF + Shield | Cloud Armor |
| IAM Roles (OIDC) | Workload Identity Federation |

---

## 7. Azure — Referência rápida {#azure}

| AWS | Azure Equivalente |
|---|---|
| ECS/EKS | ACI / AKS |
| RDS | Azure Database for PostgreSQL |
| ElastiCache | Azure Cache for Redis |
| S3 | Azure Blob Storage |
| CloudFront | Azure CDN / Front Door |
| SQS | Azure Service Bus / Queue Storage |
| Lambda | Azure Functions |
| Secrets Manager | Azure Key Vault |
| CloudWatch | Azure Monitor |
