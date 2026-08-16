# RAID Log e Registro de Riscos — Guia do Product Manager

> RAID = Risks, Assumptions, Issues, Dependencies. É o artefato vivo que acompanha um projeto do início ao fim — diferente do PRD (que é a especificação), o RAID log é atualizado continuamente enquanto o trabalho acontece.

---

## 1. Quando manter um RAID log

- Projetos com múltiplas squads/times envolvidos
- Iniciativas com dependências externas (outro time, fornecedor, parceiro)
- Qualquer projeto com prazo comprometido externamente (cliente, regulador, contrato)

Para features pequenas e de squad único, a seção 5.3 do PRD (Premissas/Dependências/Riscos) já é suficiente — não crie overhead desnecessário.

---

## 2. Template de RAID Log

```
RAID LOG — [Nome do projeto]
Última atualização: [DD/MM/AAAA] | Owner: [PM]

## RISCOS (Risks) — coisas que PODEM acontecer e prejudicar o projeto
| # | Risco | Probabilidade | Impacto | Score (P×I) | Mitigação | Owner | Status |
|---|---|---|---|---|---|---|---|
| R1 | [Ex: Fornecedor de pagamento pode atrasar homologação] | Média | Alto | 🔴 Alto | [Iniciar homologação com 2 fornecedores em paralelo] | [Nome] | Aberto |

## SUPOSIÇÕES (Assumptions) — coisas que ESTAMOS ASSUMINDO como verdade
| # | Suposição | Se for falsa, o que muda? | Como/quando será validada | Status |
|---|---|---|---|---|
| A1 | [Ex: Usuários têm o app atualizado para a versão mínima] | [Retrabalho de compatibilidade] | [Checar % de usuários em versões antigas via analytics] | Validado / Pendente |

## PROBLEMAS (Issues) — coisas que JÁ ACONTECERAM e precisam de ação agora
| # | Problema | Impacto atual | Ação | Owner | Prazo | Status |
|---|---|---|---|---|---|---|
| I1 | [Ex: API do parceiro está retornando erro 500 em 5% das chamadas] | [Bloqueia QA do fluxo de pagamento] | [Abrir ticket com parceiro + implementar retry] | [Nome] | [Data] | Em andamento |

## DEPENDÊNCIAS (Dependencies) — coisas que este projeto precisa de outros para avançar
| # | Dependência | De quem/qual time | Necessário até | Risco se atrasar | Status |
|---|---|---|---|---|---|
| D1 | [Ex: Time de Identidade precisa liberar novo endpoint de SSO] | [Squad Identidade] | [DD/MM] | [Atrasa todo o lançamento] | No prazo / Em risco / Atrasado |
```

---

## 3. Matriz de Priorização de Risco (Probabilidade × Impacto)

```
                    ALTO IMPACTO
                         |
   🟡 Monitorar de perto |  🔴 Ação imediata
   (baixa prob.,         |  (mitigar antes de
    alto impacto)        |   avançar o projeto)
                         |
BAIXA ───────────────────┼─────────────────── ALTA
PROBABILIDADE            |              PROBABILIDADE
                         |
   🟢 Aceitar             |  🟡 Ter plano B pronto
   (baixa prob.,         |  (alta prob., impacto
    baixo impacto)       |   médio — não ignorar)
                         |
                    BAIXO IMPACTO
```

| Score | Ação recomendada |
|---|---|
| 🔴 Alto (alta prob. × alto impacto) | Escalar imediatamente, não seguir sem plano de mitigação |
| 🟡 Médio | Ter plano de contingência pronto, revisar semanalmente |
| 🟢 Baixo | Registrar e revisitar apenas se contexto mudar |

---

## 4. Critérios de Escalação

Defina antes do projeto começar, para não depender de julgamento no calor do momento:

```
Escalar para [liderança/stakeholder] IMEDIATAMENTE quando:
- Um risco 🔴 (alto/alto) se concretiza
- Uma dependência crítica atrasa mais de [X dias]
- O escopo precisa mudar de forma que afeta a data de entrega comprometida externamente
- Um problema de segurança ou privacidade de dados é identificado

Não precisa escalar (resolver no time) quando:
- Risco 🟢 ou 🟡 dentro do plano de mitigação já combinado
- Ajuste de escopo interno que não afeta compromisso externo
```

---

## 5. Cadência de Revisão

```
- RAID log revisado toda [semana/sprint] em conjunto com o status report
- Todo item "Aberto" há mais de [30 dias] sem movimento é revisado: ainda é relevante?
  Precisa de decisão para ser fechado (aceito, mitigado ou resolvido)?
- Ao final do projeto, itens não resolvidos viram input para o postmortem
  (ver `retro-postmortem.md`)
```

---

## Checklist — RAID log está sendo bem usado quando:
- [ ] Todo risco 🔴 tem um owner e um plano de mitigação, não só um registro
- [ ] Suposições críticas têm um plano concreto (e prazo) para serem validadas
- [ ] Dependências externas foram comunicadas ao outro time com prazo explícito
- [ ] O log é revisado periodicamente, não só criado uma vez e esquecido
