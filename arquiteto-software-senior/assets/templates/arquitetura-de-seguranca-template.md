# Arquitetura de Segurança: [Nome do Projeto] (DOC-XXX)

**Autor(a):** Claude, via skill `arquiteto-software-senior`
**Status:** Rascunho | Em revisão | Aprovado
**Data:**
**Tier do sistema:** [ver "Calibrando pelo estágio" no SKILL.md]
**Requisito(s)/fluxo(s) de origem (se houver PRD):** REQ-XXX, FLOW-XXX
**ADRs contidos ou motivados por este documento:** ADR-XXX, ADR-YYY [preencha conforme forem criados]

> Este documento consolida decisões que, individualmente, também deveriam existir como ADRs — este DOC-XXX é a visão panorâmica; os ADRs são o registro formal de cada decisão específica. Ver playbook 08 (arquiteto) para o mapeamento completo de que playbook alimenta cada seção abaixo.

## 1. Resumo executivo

[2-3 frases: postura de segurança geral do projeto e os riscos mais relevantes que este documento endereça.]

### Resumo compacto de decisões (referência rápida)

| Decisão | Escolha | Justificativa |
|---|---|---|
| | | |

## 2. Modelagem de ameaças

### Fronteiras de confiança identificadas

| Fronteira | O que cruza | Controle principal |
|---|---|---|
| Usuário → borda pública | | |
| Borda → rede interna | | |
| Serviço → banco de dados | | |
| Sistema → integração de terceiros | | |

### Análise STRIDE (por fronteira crítica)

| Fronteira | Spoofing | Tampering | Repudiation | Information Disclosure | DoS | Elevation of Privilege |
|---|---|---|---|---|---|---|
| | | | | | | |

## 3. Identidade, autenticação e criptografia

[Ver playbook 08 — OAuth2.1/OIDC/SAML escolhido e por quê, estratégia de JWT/JWKS, mTLS se aplicável, envelope encryption/Vault se aplicável.]

## 4. Rede e segmentação

[Ver playbook 02 — desenho de VPC, subnets públicas vs. privadas, WAF/Shield/Cloud Armor, conectividade entre serviços/contas.]

## 5. Isolamento multi-tenant

[Ver playbook 05 — se aplicável. Modelo de isolamento escolhido (RLS/schema/database-per-tenant) e como é garantido/testado.]

## 6. Hardening de aplicação e containers

[Ver playbook 01 — non-root, capabilities, imagens assinadas, scan de vulnerabilidade.]

## 7. Proteção de dados

[Ver playbook 06 e 08 — classificação de dado sensível, controle de acesso em busca/RAG, criptografia em repouso/trânsito, tokenização de PII, crypto-shredding se aplicável.]

## 8. Disponibilidade e resiliência a negação de serviço

[Ver playbook 07 — rate limiting, circuit breaker, plano de DR relevante à segurança (ex: resposta a ataque volumétrico).]

## 9. Supply chain e CI/CD

[Ver playbook 08 e 11 — SBOM, assinatura (Cosign/Sigstore), SLSA, políticas de admissão (OPA/Gatekeeper/Kyverno), gates de segurança no pipeline.]

## 10. Monitoramento e detecção

[Ver playbook 10 — o que é logado/alertado especificamente para fins de segurança (tentativas de autenticação falhas, acesso anômalo), e como isso se liga ao `postmortem-template.md` em caso de incidente.]

## 11. Data residency e compliance geográfico

[Ver playbook 13, se aplicável — requisitos de localização de dado por jurisdição.]

## 12. Compliance formal

[Ver playbook 08 — SOC2/ISO 27001/PCI-DSS/LGPD/GDPR aplicáveis, e o gap entre o estado atual e o exigido por cada um.]

## 13. Riscos residuais e próximos passos

| Risco residual | Severidade | Mitigação futura planejada |
|---|---|---|
| | | |

## 14. Rastreabilidade

**REQ/FLOW de origem:** [lista completa]
**ADRs gerados a partir deste documento:** [lista completa, atualizada conforme cada ADR nasce]
**Revisão humana necessária antes de aprovação final:** Sim/Não — [justifique; para Tier 2-3 ou dado regulado, a resposta padrão é Sim]

## Histórico de Revisões

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| v1.0 | | | Versão inicial |

> Lembre-se de registrar este `DOC-XXX` na tabela de Documentos do `indice-mestre-rastreabilidade.md`.
