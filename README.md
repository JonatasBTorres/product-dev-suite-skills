# product-dev-suite-skills

Skills do Claude Code para squads de produto/engenharia:

- **arquiteto-software-senior** — arquitetura de sistemas distribuidos, AWS/GCP, DDD, C4, ADRs, resiliencia, seguranca, FinOps.
- **backend-engineer** — codigo backend, APIs, microsservicos, Docker/Kubernetes, CI/CD, seguranca, testes, observabilidade.
- **product-manager-tech** — discovery, PRD, user stories, roadmap, OKRs, priorizacao, metricas.

## Instalar via npx

Sem precisar clonar nada, direto do GitHub:

```bash
npx github:JonatasBTorres/product-dev-suite-skills
```

Isso copia as 3 skills para `./.claude/skills/` do projeto atual.

### Instalar so uma skill

```bash
npx github:JonatasBTorres/product-dev-suite-skills backend-engineer
```

### Instalar global (todos os projetos da maquina)

```bash
npx github:JonatasBTorres/product-dev-suite-skills --global
```

Copia para `~/.claude/skills/`.

### Ajuda

```bash
npx github:JonatasBTorres/product-dev-suite-skills --help
```

## Requisitos

Node.js >= 16.7.

## Estrutura

Cada skill segue o formato padrao do Claude Code: uma pasta com `SKILL.md` e, opcionalmente, `references/`, `playbooks/` ou `assets/` de apoio.
