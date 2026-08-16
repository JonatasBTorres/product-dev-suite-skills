# Playbook 02 — Cloud Architecture & Serviços Nativos (AWS & GCP)

## Escopo

Escolha e desenho de serviços de nuvem: compute, storage/dados, mensageria/streaming, redes/CDN, e identidade/segredos. Use este playbook para comparar AWS ↔ GCP, escolher entre serviços dentro do mesmo provedor, ou desenhar topologia de rede.

> **Nota de calibração (ver Tiers no `SKILL.md`):** os frameworks de decisão abaixo (compute, storage) já favorecem opções gerenciadas/serverless como ponto de partida, adequadas de Tier 0 a Tier 2. Para multi-região motivada por soberania de dados (não apenas latência/DR), veja o playbook 13 — é uma decisão tipicamente Tier 3.

## Tabela de equivalências AWS ↔ GCP

Útil para tradução rápida quando o usuário conhece um provedor e pergunta pelo outro, ou quando a organização é multi-cloud.

| Categoria | AWS | GCP |
|---|---|---|
| VM | EC2 (+ Auto Scaling Groups, Spot) | Compute Engine (+ MIGs, Preemptible/Spot VMs) |
| Serverless function | Lambda | Cloud Functions |
| Container serverless | App Runner / Fargate | Cloud Run |
| Kubernetes gerenciado | EKS | GKE (Autopilot/Standard) |
| Object storage | S3 (Standard/Glacier/Intelligent-Tiering) | Cloud Storage (Hot/Nearline/Coldline/Archive) |
| Block storage | EBS | Persistent Disk |
| Filesystem compartilhado | EFS | Filestore |
| Banco relacional gerenciado | RDS / Aurora (Postgres/MySQL) | Cloud SQL / AlloyDB |
| Banco relacional distribuído global | (sem equivalente direto nativo — usar Aurora Global DB) | Spanner |
| NoSQL key-value/documento | DynamoDB | Firestore |
| NoSQL wide-column | (Keyspaces/Cassandra gerenciado) | Bigtable |
| Cache in-memory | ElastiCache (Redis/Memcached) | Memorystore |
| Busca/full-text | OpenSearch | (Elastic no Marketplace; sem nativo direto) |
| Fila | SQS | Cloud Tasks / Pub/Sub (com semântica de fila) |
| Pub/Sub | SNS + EventBridge | Cloud Pub/Sub + Eventarc |
| Streaming de eventos | Kinesis Data Streams / MSK (Kafka gerenciado) | Pub/Sub + Dataflow (ou Kafka self-managed) |
| Rede virtual | VPC (Subnets, NAT, Peering, Transit Gateway, PrivateLink) | VPC global (Cloud NAT, PSC — Private Service Connect) |
| DNS | Route 53 | Cloud DNS |
| CDN | CloudFront | Cloud CDN |
| WAF/DDoS | AWS WAF + Shield | Cloud Armor |
| IAM | IAM (Roles, Policies, OIDC Federation, SCPs) | Cloud IAM (Workload Identity Federation) |
| Segredos | Secrets Manager | Secret Manager |
| Chaves de criptografia | KMS | Cloud KMS |

## Framework de decisão: compute

1. **Workload stateless, tráfego HTTP, picos previsíveis ou desconhecidos** → Serverless container (Cloud Run / App Runner). Menor custo em baixa utilização, escala automática, sem gestão de servidor.
2. **Função pequena, orientada a evento, execução curta (<15 min)** → Lambda / Cloud Functions. Cuidado com cold start em linguagens com runtime pesado (JVM) — considere provisioned concurrency (AWS) ou minimum instances (GCP) se latência p99 for crítica.
3. **Workload stateful, precisa de controle fino de rede/kernel, ou GPU dedicada** → EC2 / Compute Engine com Auto Scaling Group / MIG.
4. **Custo é a restrição dominante e a carga tolera interrupção** → Spot (AWS) / Preemptible (GCP), com estratégia de fallback (mix de Spot + On-Demand, ou checkpointing) — ver playbook 09 (FinOps).
5. **Necessidade de portabilidade ou já operando Kubernetes** → EKS / GKE. Prefira modos gerenciados de nó (Fargate profiles / Autopilot) a menos que haja necessidade concreta de customização de nó.

## Framework de decisão: storage e dados

| Necessidade | Escolha | Observação |
|---|---|---|
| Arquivos/objetos, custo declinante com idade do dado | S3 com lifecycle policy (Standard → Intelligent-Tiering → Glacier) / Cloud Storage (Hot → Nearline → Coldline → Archive) | Configure lifecycle rules desde o dia 1 — retrofit em terabytes já armazenados é caro e trabalhoso |
| OLTP relacional, consistência forte, ACID | Aurora (Postgres/MySQL) / Cloud SQL ou AlloyDB (se precisar de performance analítica sobre transacional) | AlloyDB e Aurora ambos oferecem separação compute/storage para scale-out de leitura |
| Consistência forte + escala horizontal global | Spanner (GCP tem vantagem nativa aqui; AWS exige Aurora Global DB com trade-offs de replicação assíncrona) | Só justifica o custo/complexidade de Spanner quando há requisito real de consistência global multi-região |
| Chave-valor de altíssima escala, latência de milissegundos | DynamoDB / Firestore (ou Bigtable para wide-column analítico) | Modele o *access pattern* antes do schema (DynamoDB single-table design) — mudar padrão de acesso depois é caro |
| Busca vetorial para RAG/embeddings | pgvector (se já usa Postgres e escala é moderada), ou Qdrant/Pinecone dedicados para escala maior, ou OpenSearch/Vector se já há stack de busca | Ver playbook 06 para profundidade em arquiteturas de RAG |
| Cache distribuído | ElastiCache / Memorystore (Redis) | Ver playbook 06 para padrões de cache (aside, write-through, stampede) |

## Redes e borda

- **VPC**: comece com CIDR ranges que nunca colidam entre ambientes/contas (planeje o range de endereçamento da organização inteira antes do primeiro `terraform apply`) — redesenhar CIDR depois de peering estabelecido é doloroso.
- **Segmentação**: subnets públicas apenas para recursos que realmente precisam de IP público (NAT Gateway, Load Balancer); tudo o mais em subnets privadas.
- **Conectividade entre VPCs/projetos**: VPC Peering para poucas conexões ponto-a-ponto; Transit Gateway (AWS) para topologia hub-and-spoke com muitas VPCs; PrivateLink (AWS) / Private Service Connect (GCP) para consumir serviços de terceiros sem expor tráfego à internet pública.
- **CDN/WAF na borda**: sempre que houver tráfego público relevante, coloque CloudFront/Cloud CDN + WAF (AWS WAF/Cloud Armor) na frente da origem — reduz custo de egress, absorve picos e filtra ataques antes de chegar à aplicação.
- **DNS**: use política de roteamento por latência/geolocalização (Route 53 / Cloud DNS) para arquiteturas multi-região (ver playbook 07 para Anycast/GeoDNS em disaster recovery).

## Identidade, acesso e segredos

- **Nunca** chaves de acesso de longa duração para workloads — use OIDC Federation (AWS IAM Roles for Service Accounts / GitHub Actions OIDC) ou Workload Identity Federation (GCP) para que CI/CD e serviços assumam papéis temporários.
- Princípio do menor privilégio: políticas IAM específicas por recurso (ARN/resource-level), nunca `*:*`. Use SCPs (AWS) / Org Policies (GCP) para colocar limites organizacionais que nem administradores de conta podem furar acidentalmente.
- Segredos de aplicação sempre em Secrets Manager/Secret Manager, nunca em variáveis de ambiente commitadas ou arquivos de config no repositório — injeção em runtime via integração nativa do serviço de compute.
- Rotação de segredos e chaves (KMS/Cloud KMS) automatizada, não manual — ver playbook 08 para profundidade em criptografia e zero-trust.

## Antipadrões comuns

- Multi-cloud "por segurança de vendor lock-in" sem necessidade de negócio real — multiplica custo operacional (duas stacks de observabilidade, dois modelos de IAM, dois times de expertise) por um benefício teórico que raramente se realiza.
- Provisionar tudo em subnet pública "para simplificar" — expande a superfície de ataque desnecessariamente.
- Ignorar lifecycle policies de storage até a conta de S3/GCS já estar em dezenas de TB — migre o hábito de tiering para o início do projeto.
- Usar instâncias On-Demand para 100% da frota quando parte relevante da carga tolera interrupção — deixa economia de FinOps na mesa (ver playbook 09).

## Referência rápida

```bash
# AWS: assumir role via OIDC (exemplo GitHub Actions)
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::123456789012:role/deploy-role \
  --role-session-name gha-deploy \
  --web-identity-token "$ID_TOKEN"

# GCP: configurar Workload Identity Federation para GitHub Actions
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" --display-name="GitHub Actions Pool"
```
