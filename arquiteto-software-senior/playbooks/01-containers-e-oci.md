# Playbook 01 — Containerização, Runtime & Packaging (Docker & OCI)

## Escopo

Engenharia de imagens de container, segurança de runtime, e a escolha entre orquestração local (DX) e produção (Kubernetes, ECS/Fargate, Cloud Run/GKE). Use este playbook para qualquer pergunta sobre Dockerfile, tamanho/segurança de imagem, Compose vs. Kubernetes, ou escolha de plataforma de execução de containers.

> **Nota de calibração (ver Tiers no `SKILL.md`):** o hardening de imagem (multi-stage, non-root, capabilities) vale em qualquer tier — é barato e sem trade-off real. Já a escolha de orquestrador já é tier-sensível por si só: a tabela abaixo assume isso e recomenda Kubernetes só a partir de necessidade concreta (tipicamente Tier 2+).

## Framework de decisão: qual orquestrador usar em produção?

| Cenário | Recomendação | Por quê |
|---|---|---|
| Time pequeno (<10 eng), sem expertise de K8s, cargas HTTP simples | **Cloud Run (GCP) ou App Runner/Fargate (AWS)** | Zero gestão de nós, scale-to-zero, menor custo operacional. Perde-se controle fino de rede/afinidade. |
| Necessidade de portabilidade multi-cloud, workloads heterogêneos (batch, stateful, GPU), organização já com plataforma própria | **Kubernetes (GKE Autopilot ou EKS)** | Ecossistema maior (Helm, Operators, service mesh), mas custo de operação real mesmo "managed". Prefira Autopilot/Fargate profiles para reduzir gestão de nós. |
| Cargas simples, previsíveis, já dentro do ecossistema AWS, sem necessidade de portabilidade | **ECS/Fargate** | Mais simples que EKS, integração nativa com IAM/ALB/CloudWatch, menor sobrecarga cognitiva. |
| Múltiplos serviços pequenos com deploy independente e o time ainda não tem plataforma de CI/CD madura | **Cloud Run / App Runner antes de Kubernetes** | Adote Kubernetes quando a dor real aparecer (múltiplos clusters, necessidade de operators, GPU scheduling) — não por padrão de mercado. Kubernetes cedo demais é a causa nº1 de squads gastando 30% do tempo em plataforma em vez de produto. |

**Regra prática:** só migre para Kubernetes quando conseguir nomear pelo menos 2 problemas concretos que ele resolve e que a alternativa gerenciada não resolve (ex: DaemonSets para sidecar de observabilidade em toda a frota, CRDs para um operator específico, bin-packing de GPU).

## Engenharia de imagens

### Multi-stage builds — padrão obrigatório em produção

```dockerfile
# Stage 1: build com todas as dependências de compilação
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false
COPY . .
RUN npm run build

# Stage 2: runtime mínimo — só o necessário para rodar
FROM gcr.io/distroless/nodejs20-debian12 AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER nonroot
EXPOSE 3000
CMD ["dist/server.js"]
```

**Escolha de imagem base — trade-offs:**

| Base | Tamanho | Superfície de ataque | Debug | Quando usar |
|---|---|---|---|---|
| `scratch` | Mínimo | Mínima | Impossível (sem shell) | Binários estáticos (Go, Rust) — máxima segurança |
| Distroless | Muito pequeno | Muito baixa (sem shell, sem package manager) | Difícil (`docker debug` ou sidecar) | Padrão recomendado para produção em runtimes gerenciados (Node, Python, JVM) |
| Alpine | Pequeno | Baixa, mas `musl libc` pode gerar bugs sutis vs. glibc | Shell básico (`sh`) | Quando precisar de um shell mínimo para operação, mas cuidado com libs que dependem de glibc |
| `slim` (Debian) | Médio | Moderada | Shell completo (`bash`) | Estágios de build, ou quando dependências nativas exigem glibc |

### Checklist de segurança de container (revisar antes de todo deploy em produção)

- [ ] Container roda como `USER` não-root (`USER 1000` ou `USER nonroot`)
- [ ] Linux capabilities dropadas (`--cap-drop=ALL`, adicionar de volta apenas o estritamente necessário com `--cap-add`)
- [ ] Filesystem raiz somente-leitura quando possível (`--read-only`, com `tmpfs` para diretórios que precisam de escrita)
- [ ] Sem segredos em `ENV`, `ARG` ou camadas de build — usar secret mounts (`RUN --mount=type=secret`) ou injeção em runtime (Secrets Manager/Secret Manager)
- [ ] Imagem escaneada (Trivy, Grype, AWS ECR Scan, GCP Artifact Analysis) no pipeline de CI, com *fail* configurado por severidade (ex: bloquear CRITICAL/HIGH)
- [ ] SBOM gerado e anexado à imagem (ver playbook 08 para assinatura com Cosign/Sigstore)
- [ ] Tag imutável usada em produção (digest ou tag semver fixa — nunca `:latest`)
- [ ] `.dockerignore` configurado para não vazar `.env`, `.git`, chaves locais para o contexto de build

### Redução de camadas e cache determinístico

- Ordene instruções da menos volátil para a mais volátil: dependências de sistema → dependências de aplicação (lockfile) → código-fonte. Isso maximiza o cache hit do Docker layer cache.
- Combine `RUN` relacionados com `&&` para reduzir número de camadas, mas não ao ponto de prejudicar legibilidade ou cache granular.
- Use `COPY package*.json ./` antes de `COPY . .` para que mudanças no código-fonte não invalidem o cache de `npm ci`.
- Em CI, use cache remoto de build (BuildKit `--cache-from`/`--cache-to`, ou cache nativo do GitHub Actions/GitLab) para builds reprodutíveis entre execuções de pipeline distintas.

## Docker Compose para DX (Developer Experience)

Compose continua sendo a ferramenta certa para ambiente local — não tente reproduzir Kubernetes localmente com `kind`/`minikube` só por "paridade" se isso deixar o onboarding do time mais lento. Boas práticas:

- Um `docker-compose.yml` base + `docker-compose.override.yml` para customizações locais (git-ignorado).
- `healthcheck` em cada serviço para que `depends_on: condition: service_healthy` funcione de verdade (evita race conditions de "app subiu antes do banco").
- Volumes nomeados para dados persistentes (Postgres, etc.), bind mounts apenas para código-fonte em hot-reload.
- Nunca reutilize o `Dockerfile` de produção sem stage de dev — crie um `target: dev` no multi-stage com hot-reload, debugger exposto, etc., separado do `target: runtime` de produção.

## Antipadrões comuns

- **Imagem "gigante única"**: instalar compiladores, ferramentas de debug e toda a toolchain no estágio final — sintoma de não usar multi-stage build.
- **Rodar como root "porque é mais simples"**: elimina uma das defesas mais baratas contra escalonamento de privilégio em caso de RCE na aplicação.
- **`:latest` em produção**: torna rollback e auditoria de "o que está rodando" impossíveis de garantir.
- **Segredos via `ARG`/`ENV` no Dockerfile**: ficam gravados no histórico de camadas da imagem, recuperáveis mesmo depois de removidos em camada posterior.
- **Kubernetes por padrão sem necessidade real**: multiplica a superfície operacional (RBAC, network policies, upgrades de versão, CVEs do control plane) sem benefício correspondente para cargas simples.

## Referência rápida

```bash
# Gerar SBOM e escanear com Trivy
trivy image --format cyclonedx --output sbom.json minha-imagem:1.2.3
trivy image --severity CRITICAL,HIGH --exit-code 1 minha-imagem:1.2.3

# Rodar container com hardening básico
docker run --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp --user 1000:1000 minha-imagem:1.2.3

# Build multi-stage com BuildKit e cache remoto
DOCKER_BUILDKIT=1 docker build \
  --cache-from type=registry,ref=meuregistro/app:cache \
  --cache-to type=registry,ref=meuregistro/app:cache,mode=max \
  -t meuregistro/app:1.2.3 .
```
