# Stack Tecnológica: [Nome do Projeto]

**Tier:** [ver "Calibrando pelo estágio" no SKILL.md]
**ADR(s) relacionado(s):** ADR-XXX [decisão de escolha de stack deveria ter seu próprio ADR — não decida a stack inteira sem registrar o porquê]
**Requisito(s) de origem:** REQ-XXX

> Preencha versão específica sempre que possível ("Next.js 15", não "Next.js") — versão vaga é a primeira coisa que fica ambígua quando alguém revisita este documento meses depois. Ver playbook 08 do SKILL.md sobre verificar atualidade antes de fechar a versão como definitiva.

## Frontend

| Tecnologia | Versão | Função | Alternativa considerada (e por que não) |
|---|---|---|---|
| | | | |

## Backend / Servidor

| Tecnologia | Versão | Função | Alternativa considerada (e por que não) |
|---|---|---|---|
| | | | |

## Dados e Persistência

| Tecnologia | Versão | Função | Alternativa considerada (e por que não) |
|---|---|---|---|
| | | | |

## Infraestrutura e Deploy

| Tecnologia | Função | Alternativa considerada (e por que não) |
|---|---|---|
| | | |

## Serviços Externos

| Serviço | Função | Alternativa considerada (e por que não) |
|---|---|---|
| | | |

## Observabilidade e Qualidade

| Tecnologia | Função |
|---|---|
| | |

## Diagrama rápido de camadas (opcional)

Para uma visão de alto nível antes de um C4 completo (ver `c4-container.mmd` para o nível de detalhe formal), um diagrama de caixas em texto simples costuma comunicar mais rápido:

```
┌─────────────────────────────────────────────┐
│  CAMADA DE APRESENTAÇÃO + APLICAÇÃO          │
│  [framework] · [linguagem] · [UI kit]        │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  API — [onde vive: dentro do framework   │ │
│  │  principal ou serviço separado?]          │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  [CAMADA ASSÍNCRONA / WORKERS, se houver]    │
└─────────────────────────────────────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
┌───────────┐   ┌───────────────┐
│  DADOS    │   │  SERVIÇOS     │
│  [banco]  │   │  EXTERNOS     │
└───────────┘   └───────────────┘
```

Use este formato quando o objetivo for comunicar rápido em texto puro (README, PR, chat) — use C4/Mermaid (`c4-container.mmd`) quando o documento precisar detalhar relações de comunicação entre múltiplos serviços com mais precisão.

## Rastreabilidade

**REQ de origem:** REQ-XXX
**ADR desta decisão:** ADR-XXX

> Lembre-se de registrar este documento (se tratado como `DOC-XXX`) no `indice-mestre-rastreabilidade.md`.
