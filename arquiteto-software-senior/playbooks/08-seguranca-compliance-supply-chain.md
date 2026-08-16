# Playbook 08 — Compliance, Segurança Zero-Trust & Supply Chain Security

## Escopo

Identidade e criptografia entre serviços, privacidade de dados (LGPD/GDPR/CCPA), e segurança da cadeia de suprimento de software (assinatura de imagem, proveniência de build, políticas de admissão). Este playbook é uma **lente transversal**: consulte-o sempre que outro playbook envolver dados, identidade ou deploy de infraestrutura, mesmo que o usuário não tenha perguntado explicitamente sobre segurança.

## Calibração por tier — postura mínima viável vs. postura madura

Segurança básica (HTTPS, secrets fora do código, princípio do menor privilégio) não é opcional em nenhum tier. O que é tier-sensível é o **ferramental e a cerimônia** ao redor disso — a tabela abaixo evita que a skill empurre um projeto pequeno para complexidade de mTLS/service-mesh/Vault sem necessidade real:

| Prática | Tier 0-1 (produto pequeno/único time) | Tier 2 (múltiplos times/serviços) | Tier 3 (regulado/global) |
|---|---|---|---|
| Autenticação | OIDC via provedor gerenciado (Auth0/Cognito/Firebase Auth/Clerk) — não implemente do zero | OIDC próprio ou gerenciado + JWKS com rotação | OIDC + SAML para SSO enterprise, federação multi-IdP |
| Comunicação serviço-a-serviço | HTTPS interno + rede privada (VPC) já é uma postura razoável | mTLS via service mesh quando o número de serviços justificar a operação do mesh | mTLS obrigatório, zero-trust completo, sem exceção por estar "na rede interna" |
| Segredos | Secrets Manager/Secret Manager nativo do provedor de nuvem | Idem, com rotação automatizada | Vault (ou equivalente) quando há necessidade multi-cloud/híbrida ou credenciais dinâmicas de curtíssimo TTL |
| Supply chain | Scan de vulnerabilidade (Trivy/Grype) no CI já cobre a maior parte do risco | + SBOM gerado e versionado | + Assinatura Cosign/Sigstore, políticas de admissão (OPA/Gatekeeper), SLSA como framework de maturidade |
| Compliance formal | Geralmente não aplicável ainda | Pode começar a ser exigido por clientes B2B (questionários de segurança) | SOC2 Type II / ISO 27001 / PCI-DSS conforme o setor |

**Regra prática:** a pergunta certa não é "estamos seguindo zero-trust?" para todo produto — é "qual é o risco real e qual o menor investimento que reduz esse risco o suficiente agora?". Escale o ferramental conforme o tier, mas nunca negocie os fundamentos (HTTPS, segredos fora do código, menor privilégio, PII fora de logs) — esses valem em qualquer tier porque são baratos e o custo de não fazer é alto desde o dia 1.

## Modelagem de ameaças — o ponto de partida antes dos controles

Antes de listar controles (identidade, criptografia, rede), um documento de arquitetura de segurança completo começa identificando o que está sendo protegido e de quê — sem isso, a lista de controles vira uma coleção de boas práticas genéricas em vez de uma resposta a riscos concretos deste sistema.

- **Fronteiras de confiança (trust boundaries)**: identifique onde dados/requisições cruzam de um nível de confiança para outro (usuário → borda pública, borda → rede interna, serviço → banco de dados, sistema → integração de terceiros). Cada fronteira é onde um controle precisa existir — não porque o outro lado é "não confiável" por definição, mas porque é ali que um erro do outro lado não deveria virar um erro do seu lado.
- **STRIDE**: framework leve para não esquecer uma classe inteira de risco ao percorrer cada fronteira — **S**poofing (alguém se passando por outra identidade), **T**ampering (alteração não autorizada de dado/código), **R**epudiation (negar ter feito uma ação, sem trilha de auditoria para provar o contrário), **I**nformation Disclosure (exposição de dado que deveria ser privado), **D**enial of Service (indisponibilidade forçada — ver playbook 07), **E**levation of Privilege (obter mais acesso do que deveria).

Para cada fronteira identificada, percorra as 6 categorias e pergunte "isso é possível aqui, e o que impede?" — não é preciso um exercício acadêmico completo para todo projeto (ver calibração por tier abaixo), mas mesmo uma passada rápida revela lacunas que uma lista solta de boas práticas não revela sozinha.

**Calibração por tier:** em Tier 0-1, uma modelagem informal (10-15 minutos identificando as fronteiras principais) já cobre a maior parte do valor. Em Tier 2-3, com dado sensível ou compliance formal envolvido, um exercício estruturado e documentado (por fronteira, por categoria STRIDE) vira parte da evidência de auditoria.

## Identidade & Criptografia

### OAuth 2.1 / OIDC / SAML — qual usar

| Necessidade | Escolha |
|---|---|
| Autenticação de usuário final (login) em aplicação moderna (web/mobile) | **OIDC** (camada de identidade sobre OAuth 2.0/2.1) |
| Autorização de acesso a API em nome de um usuário (delegação de escopo) | **OAuth 2.1** — sempre com Authorization Code + PKCE, mesmo para clientes confidenciais; nunca Implicit Flow (removido no 2.1 por razões de segurança) |
| Integração com IdP corporativo legado (SSO empresarial) | **SAML** — ainda relevante em ambientes enterprise, mas prefira OIDC para novas integrações quando o IdP suportar ambos |

### JWT com rotação assimétrica (JWKS)

- Assine tokens com par de chaves assimétrico (RS256/ES256), nunca simétrico (HS256) quando múltiplos serviços precisam **verificar** o token — HS256 exigiria distribuir a chave secreta de assinatura para todo verificador, o que a torna, na prática, uma chave compartilhada e não mais secreta.
- Publique as chaves públicas de verificação via endpoint JWKS (`/.well-known/jwks.json`) e implemente rotação: mantenha a chave anterior válida por um período de sobreposição após introduzir a nova, para que tokens já emitidos não sejam invalidados abruptamente.
- Tokens de curta duração (minutos) + refresh token de vida mais longa é o padrão a mirar — reduz a janela de exposição caso um access token vaze.

### mTLS entre serviços

- Em arquiteturas de microsserviços, mTLS garante que tanto cliente quanto servidor se autenticam mutuamente na camada de transporte — essencial em um modelo zero-trust onde "estar dentro da rede interna" não é mais considerado suficiente para confiança.
- Na prática, raramente implementado manualmente por serviço — um service mesh (Istio, Linkerd) ou a própria plataforma de orquestração provê mTLS de forma transparente entre pods/serviços, sem que cada time precise gerenciar certificados individualmente.

### Envelope Encryption e Vault

- **Envelope Encryption**: dado é criptografado com uma chave de dados (DEK) local, e a DEK é criptografada por uma chave mestra (KEK) gerenciada centralmente (KMS/Cloud KMS/Vault). Evita que toda operação de criptografia precise de uma chamada de rede à chave mestra, mantendo controle central de rotação e revogação.
- **Vault** (HashiCorp): quando a organização precisa de gestão de segredos dinâmica (credenciais de banco geradas sob demanda com TTL curto, não estáticas) e além do que Secrets Manager/Secret Manager nativos de nuvem oferecem — geralmente justificado em ambientes multi-cloud ou híbridos onde um único cofre de segredos centralizado é requisito.

## Privacidade de Dados — LGPD/GDPR/CCPA (conformidade técnica)

Estes princípios legais têm implicações arquiteturais concretas — não são só responsabilidade jurídica:

- **Direito ao Esquecimento via Crypto-Shredding**: em vez de deletar fisicamente cada registro de um titular de dados espalhado por múltiplos sistemas/backups (operacionalmente inviável em escala), criptografe os dados de cada titular com uma chave própria (ou por pequeno grupo) e, para "esquecer", basta destruir essa chave — o dado permanece fisicamente presente (inclusive em backups antigos) mas se torna permanentemente irrecuperável.
- **Anonimização vs. Pseudonimização**: pseudonimização (substituir identificador direto por um token, mantendo re-identificação possível com uma chave separada) ainda é dado pessoal sob LGPD/GDPR. Anonimização de verdade (irreversível, sem chave de re-identificação possível) tira o dado do escopo da regulação — a maioria dos "dados anonimizados" em sistemas reais é na verdade só pseudonimizada, o que muda as obrigações de conformidade.
- **Tokenização de PII em logs**: nunca logue PII em texto claro (CPF, e-mail, telefone) — tokenize/mascare antes de qualquer log chegar a um sistema de observabilidade centralizado. Trate isso como uma regra de linting/CI (verificação automatizada de padrões de PII em código que loga), não como disciplina manual do desenvolvedor.
- **Minimização de dados**: colete e retenha apenas o que tem base legal e necessidade real de negócio — cada campo de PII armazenado é superfície de risco e de obrigação de compliance adicional.

## Supply Chain & Políticas

### Assinatura e proveniência

- **Cosign / Sigstore**: assine toda imagem de container publicada, e verifique a assinatura antes do deploy (via política de admissão — ver abaixo). Isso garante que a imagem rodando em produção é exatamente a que passou pelo pipeline de CI, e não foi substituída/adulterada em algum ponto entre o build e o deploy.
- **SLSA framework** (Supply-chain Levels for Software Artifacts): framework de níveis crescentes de garantia sobre como um artefato foi construído (de "build script existe" até "build hermético, reproduzível, com proveniência verificável assinada"). Use como referência para avaliar a maturidade da própria pipeline de CI/CD, não apenas de dependências de terceiros.
- **SBOM** (ver também playbook 01): gerar SBOM não é suficiente sozinho — o valor real vem de monitorar continuamente o SBOM contra bases de vulnerabilidade conhecidas (CVE) *depois* do deploy também, não só no momento do build (vulnerabilidades novas são descobertas em dependências já em produção o tempo todo).

### Políticas de admissão no cluster

- **OPA/Gatekeeper** e **Kyverno**: impõem políticas antes que um recurso seja admitido no cluster Kubernetes — por exemplo, rejeitar qualquer Pod que use imagem sem assinatura Cosign válida, que rode como root, ou que não tenha limits de recurso definidos.
- Trate essas políticas como a aplicação automática, em tempo de deploy, de tudo o que os outros playbooks recomendam como boa prática (containers não-root, capabilities limitadas, imagens assinadas) — sem enforcement automatizado, boas práticas viram sugestões que degradam ao longo do tempo conforme a pressão de prazo aumenta.

### Compliance formal

- **SOC 2 Type II**: auditoria de controles operando efetivamente ao longo de um período (não apenas "existem no papel" como no Type I) — relevante para vender para clientes enterprise B2B nos EUA.
- **ISO 27001**: sistema de gestão de segurança da informação (SGSI) certificável, mais amplo que só controles técnicos — inclui processo organizacional.
- **PCI-DSS**: obrigatório para qualquer sistema que processa/armazena/transmite dados de cartão de pagamento — a arquitetura recomendada quase sempre é minimizar o escopo de PCI tokenizando dados de cartão o mais cedo possível (via gateway de pagamento) para que a maior parte do sistema nunca toque o dado sensível diretamente.

## Documento consolidado de Arquitetura de Segurança

Quando o pedido for um documento único cobrindo **toda** a arquitetura de segurança do projeto (não uma decisão pontual), sintetize — não se limite ao conteúdo deste playbook isoladamente. Segurança é uma lente transversal (ver Escopo acima); um documento completo precisa reunir o que está espalhado por vários playbooks:

| Seção do documento | Playbook de origem |
|---|---|
| Modelagem de ameaças e fronteiras de confiança | Este playbook (acima) |
| Identidade, autenticação e criptografia | Este playbook |
| Rede, segmentação (VPC), WAF/DDoS | Playbook 02 |
| Isolamento entre tenants (se multi-tenant) | Playbook 05 |
| Hardening de containers e runtime | Playbook 01 |
| Proteção de dados/controle de acesso em RAG e cache | Playbook 06 |
| Resiliência a negação de serviço, disponibilidade | Playbook 07 |
| Supply chain, SBOM, assinatura, políticas de admissão | Este playbook |
| Gates de segurança no pipeline de CI/CD | Playbook 11 |
| Monitoramento e detecção (observabilidade de segurança) | Playbook 10 |
| Data residency e requisitos regulatórios geográficos | Playbook 13 |
| Compliance formal (SOC2/ISO/PCI/LGPD/GDPR) | Este playbook |

Use `assets/templates/arquitetura-de-seguranca-template.md` como esqueleto — já vem com essa estrutura e com os campos de rastreabilidade (`REQ-XXX`/`FLOW-XXX` de entrada, `DOC-XXX` como identificador do próprio documento, e a lista de `ADR-XXX` que ele contém ou motiva) prontos para preencher, não como texto solto desconectado dos outros documentos do produto.

**O que este documento não substitui:** é um blueprint sênior calibrado para o tier do sistema — não um pentest, uma auditoria formal, nem uma certificação. Para sistemas Tier 2-3 ou com dado regulado, sinalize explicitamente que uma revisão de segurança humana (idealmente por alguém com conhecimento do sistema real em produção, ou um auditor externo para certificações formais) continua necessária antes de tratar o documento como aprovação final.

## Antipadrões comuns

- **JWT assinado com HS256 e chave compartilhada entre múltiplos serviços "para simplificar"** — qualquer serviço que pode verificar também pode forjar tokens.
- **PII em logs "temporariamente, só até resolver o bug"** — vira hábito permanente e um vazamento de compliance esperando para ser descoberto em uma auditoria.
- **SBOM gerado uma vez no lançamento e nunca mais revisitado** — não protege contra CVEs descobertas depois em dependências já em produção.
- **Confiar apenas em revisão manual de PR para bloquear containers rodando como root ou sem assinatura** — sem política de admissão automatizada (OPA/Kyverno), é questão de tempo até algo passar despercebido sob pressão de prazo.
- **Tratar "pseudonimizado" como equivalente a "anonimizado"** para fins de conformidade — expõe a organização a obrigações regulatórias que ela acredita não ter.
- **Zero-trust "de nome"**: manter confiança implícita total dentro da rede interna (sem mTLS, sem autenticação serviço-a-serviço) só porque o tráfego "não sai para a internet".
