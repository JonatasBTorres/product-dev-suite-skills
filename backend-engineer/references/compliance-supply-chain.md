# Compliance, Zero-Trust & Supply Chain Security

## Sumário
1. [mTLS entre serviços](#mtls)
2. [Envelope Encryption e Vault](#envelope-vault)
3. [Crypto-Shredding (direito ao esquecimento técnico)](#crypto-shredding)
4. [Assinatura de imagens — Cosign/Sigstore](#cosign)
5. [Proveniência de build — SLSA](#slsa)
6. [Políticas de admissão — OPA/Gatekeeper e Kyverno](#admission-policies)
7. [Compliance — SOC2, ISO 27001, PCI-DSS](#compliance-frameworks)

---

## 1. mTLS entre serviços {#mtls}

### Por que mTLS além de autenticação de aplicação

```
TLS normal:           Cliente verifica identidade do servidor. Servidor não verifica cliente.
mTLS (mutual TLS):    Ambos os lados apresentam certificado e verificam um ao outro.

Uso em zero-trust: nenhum serviço confia em outro só por estar na mesma rede/VPC.
Toda comunicação serviço-a-serviço exige certificado válido, independente de IP/rede.
```

### Implementação — service mesh (Istio) vs. manual

```yaml
# Istio PeerAuthentication — força mTLS estrito em todo o namespace
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT   # rejeita qualquer conexão não-mTLS
---
# DestinationRule — client-side também exige mTLS
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: orders-service
spec:
  host: orders-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

```typescript
// mTLS manual (sem service mesh) — Node.js
import https from 'https';
import fs from 'fs';

const httpsAgent = new https.Agent({
    cert: fs.readFileSync('/etc/certs/client-cert.pem'),
    key: fs.readFileSync('/etc/certs/client-key.pem'),
    ca: fs.readFileSync('/etc/certs/ca.pem'),
    rejectUnauthorized: true, // NUNCA false em produção
});

async function callInternalService(path: string) {
    return fetch(`https://payments-service.internal${path}`, { agent: httpsAgent });
}
```

```
Rotação de certificados:
- Certificados de curta duração (24h) via cert-manager + Vault PKI ou SPIFFE/SPIRE
- Rotação automática, sem downtime, sem intervenção manual
- Nunca usar certificados com validade > 90 dias em ambiente zero-trust
```

---

## 2. Envelope Encryption e Vault {#envelope-vault}

### Envelope Encryption — por que não criptografar direto com a chave mestra

```
Problema: usar a chave mestra (KMS) diretamente para criptografar todo dado
é lento e caro (toda operação é uma chamada de API ao KMS).

Solução — Envelope Encryption:
1. Gerar uma Data Encryption Key (DEK) local, aleatória, por registro/lote
2. Criptografar o dado com a DEK (rápido, local, AES-256-GCM)
3. Criptografar a DEK com a Key Encryption Key (KEK) do KMS (1 chamada de API)
4. Armazenar: dado_criptografado + DEK_criptografada (nunca a DEK em texto puro)

Para decifrar: KMS decifra a DEK → usa a DEK para decifrar o dado localmente.
```

```typescript
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const kms = new KMSClient({ region: 'us-east-1' });

async function encryptWithEnvelope(plaintext: Buffer, kmsKeyId: string) {
    // 1. KMS gera uma DEK e retorna ela em texto puro + criptografada
    const { Plaintext: dek, CiphertextBlob: encryptedDek } = await kms.send(
        new GenerateDataKeyCommand({ KeyId: kmsKeyId, KeySpec: 'AES_256' })
    );

    // 2. Criptografar o dado localmente com a DEK em texto puro
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dek!, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    // 3. Descartar a DEK em texto puro da memória (não persistir!)
    dek?.fill(0);

    return {
        ciphertext: ciphertext.toString('base64'),
        encryptedDek: Buffer.from(encryptedDek!).toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
    };
}

async function decryptWithEnvelope(payload: EncryptedPayload, kmsKeyId: string) {
    // KMS decifra a DEK (única chamada de rede necessária)
    const { Plaintext: dek } = await kms.send(
        new DecryptCommand({ CiphertextBlob: Buffer.from(payload.encryptedDek, 'base64'), KeyId: kmsKeyId })
    );

    const decipher = createDecipheriv('aes-256-gcm', dek!, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
}
```

### HashiCorp Vault — segredos dinâmicos

```bash
# Vault gera credenciais de banco DE CURTA DURAÇÃO sob demanda
# Nada de senha de banco fixa em variável de ambiente

vault secrets enable database
vault write database/config/orders-db \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/orders" \
    allowed_roles="app-readonly,app-readwrite"

vault write database/roles/app-readwrite \
    db_name=orders-db \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"
```

```typescript
// App busca credencial dinâmica do Vault na inicialização, renova antes de expirar
class VaultDatabaseCredentialProvider {
    private currentLease?: { username: string; password: string; leaseId: string };

    async getCredentials(): Promise<DbCredentials> {
        if (!this.currentLease || this.isExpiringSoon()) {
            const { data, lease_id, lease_duration } = await this.vaultClient
                .read('database/creds/app-readwrite');
            this.currentLease = { username: data.username, password: data.password, leaseId: lease_id };
            this.scheduleRenewal(lease_duration);
        }
        return this.currentLease;
    }
}
```

---

## 3. Crypto-Shredding — direito ao esquecimento técnico {#crypto-shredding}

### O problema que crypto-shredding resolve

```
LGPD/GDPR exigem "direito ao esquecimento": apagar dados de um usuário sob pedido.

Problema: dados replicados em backups, data lakes, logs, réplicas de leitura —
apagar fisicamente de TODOS os lugares é operacionalmente inviável e caro.

Solução — Crypto-Shredding:
1. Cada usuário (ou registro sensível) tem sua PRÓPRIA chave de criptografia
2. Os dados são armazenados criptografados com essa chave
3. "Apagar" o usuário = destruir a chave (não o dado)
4. Sem a chave, o dado criptografado em qualquer lugar (backup, log, réplica)
   se torna permanentemente irrecuperável — efetivamente "esquecido"
```

```typescript
// Cada usuário tem uma DEK própria, armazenada separadamente dos dados
class UserDataEncryption {
    async createUserKey(userId: string): Promise<void> {
        const dek = randomBytes(32);
        // A chave do usuário é armazenada em um serviço separado (ou KMS com 1 DEK por usuário)
        await this.keyStore.store(userId, dek);
    }

    async encryptUserField(userId: string, plaintext: string): Promise<string> {
        const dek = await this.keyStore.get(userId);
        if (!dek) throw new Error('Chave do usuário não encontrada — dados já foram esquecidos');
        // ... criptografar com AES-256-GCM usando a DEK do usuário
        return encrypt(plaintext, dek);
    }

    // "Direito ao esquecimento" — operação O(1), não importa quantas cópias existem
    async forgetUser(userId: string): Promise<void> {
        await this.keyStore.delete(userId); // destrói a chave permanentemente
        await this.auditLog.record({
            action: 'CRYPTO_SHRED',
            userId,
            timestamp: new Date().toISOString(),
            note: 'Chave destruída. Dados criptografados remanescentes são irrecuperáveis.',
        });
    }
}
```

### Checklist de aplicabilidade
- [ ] Usar quando: dados replicados em múltiplos sistemas (backup, DW, cache, logs)
- [ ] Granularidade: 1 DEK por usuário/tenant (não uma DEK global — senão "esquecer" 1 usuário apaga todos)
- [ ] A DEK do usuário nunca é logada nem armazenada junto ao dado criptografado
- [ ] Auditar toda destruição de chave (comprovação de compliance)

---

## 4. Assinatura de imagens — Cosign/Sigstore {#cosign}

### Por que assinar imagens de container

```
Sem assinatura: qualquer imagem com o nome/tag certo pode ser deployada,
inclusive uma maliciosa injetada no registry (supply chain attack).

Com assinatura: o cluster só executa imagens assinadas por uma identidade confiável,
verificado criptograficamente antes do deploy.
```

```bash
# Cosign keyless (usa OIDC — sem gerenciar chave privada manualmente)
cosign sign --yes ghcr.io/minhaorg/api:1.0.0

# Verificação antes do deploy
cosign verify \
    --certificate-identity="https://github.com/minhaorg/api/.github/workflows/release.yml@refs/heads/main" \
    --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
    ghcr.io/minhaorg/api:1.0.0
```

```yaml
# GitHub Actions — assinar automaticamente no pipeline de release
- name: Sign image with Cosign
  run: |
    cosign sign --yes ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
  env:
    COSIGN_EXPERIMENTAL: "1"  # habilita keyless signing via OIDC
```

### Gerar e assinar SBOM (Software Bill of Materials)

```bash
# Gerar SBOM com Syft
syft ghcr.io/minhaorg/api:1.0.0 -o cyclonedx-json > sbom.json

# Anexar e assinar o SBOM junto com a imagem
cosign attach sbom --sbom sbom.json ghcr.io/minhaorg/api:1.0.0
cosign sign --yes --attachment sbom ghcr.io/minhaorg/api:1.0.0

# Verificar vulnerabilidades a partir do SBOM (Grype)
grype sbom:sbom.json --fail-on high
```

```yaml
# Pipeline completo: build → scan → SBOM → assinatura → push
- name: Scan image for vulnerabilities
  uses: anchore/scan-action@v3
  with:
    image: ${{ env.IMAGE_NAME }}:${{ github.sha }}
    fail-build: true
    severity-cutoff: high

- name: Generate SBOM
  run: syft ${{ env.IMAGE_NAME }}:${{ github.sha }} -o cyclonedx-json > sbom.json

- name: Sign image and attach SBOM
  run: |
    cosign sign --yes ${{ env.IMAGE_NAME }}:${{ github.sha }}
    cosign attach sbom --sbom sbom.json ${{ env.IMAGE_NAME }}:${{ github.sha }}
```

---

## 5. Proveniência de build — SLSA {#slsa}

### Níveis do SLSA (Supply-chain Levels for Software Artifacts)

| Nível | Requisito | Proteção |
|---|---|---|
| **SLSA 1** | Build documentado e automatizado (não manual) | Rastreabilidade básica |
| **SLSA 2** | Build em serviço gerenciado, histórico versionado | Evita builds locais não auditáveis |
| **SLSA 3** | Build isolado (ephemeral), proveniência não-forjável assinada | Protege contra comprometimento do runner |
| **SLSA 4** | Revisão de duas pessoas obrigatória, build hermético | Máxima garantia contra insider threat |

```yaml
# GitHub Actions com proveniência SLSA3 (usando slsa-github-generator)
jobs:
  build:
    permissions:
      id-token: write   # necessário para assinatura keyless
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

  provenance:
    needs: build
    permissions:
      actions: read
      id-token: write
      contents: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
    with:
      base64-subjects: "${{ needs.build.outputs.hashes }}"
```

```bash
# Verificar proveniência antes de aceitar um artefato de terceiros
slsa-verifier verify-artifact \
    --provenance-path provenance.intoto.jsonl \
    --source-uri github.com/minhaorg/api \
    api-binary
```

### Checklist mínimo de supply chain
- [ ] Builds rodam em CI gerenciado, nunca localmente para releases
- [ ] Dependências fixadas por hash (lockfile), não só por versão
- [ ] SBOM gerado e versionado a cada release
- [ ] Imagens assinadas (Cosign) antes de irem para registry de produção
- [ ] Admissão no cluster valida assinatura antes de rodar o pod (ver seção 6)

---

## 6. Políticas de admissão — OPA/Gatekeeper e Kyverno {#admission-policies}

### OPA/Gatekeeper — Rego policy

```yaml
# ConstraintTemplate — exige que toda imagem venha de registry confiável
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: allowedregistries
spec:
  crd:
    spec:
      names:
        kind: AllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items: { type: string }
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package allowedregistries
        violation[{"msg": msg}] {
            container := input.review.object.spec.containers[_]
            not starts_with_any(container.image, input.parameters.registries)
            msg := sprintf("Imagem '%v' não vem de um registry permitido", [container.image])
        }
        starts_with_any(image, registries) {
            registry := registries[_]
            startswith(image, registry)
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: registry-whitelist
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    registries: ["ghcr.io/minhaorg/", "gcr.io/minhaorg-prod/"]
```

### Kyverno — equivalente mais declarativo (sem Rego)

```yaml
# Kyverno — bloqueia imagens não assinadas (integra com Cosign)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences:
            - "ghcr.io/minhaorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/minhaorg/*"
                    issuer: "https://token.actions.githubusercontent.com"

---
# Kyverno — bloqueia containers rodando como root
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-root-user
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-non-root
      match:
        any:
          - resources: { kinds: ["Pod"] }
      validate:
        message: "Containers devem rodar com runAsNonRoot: true"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
```

### OPA/Gatekeeper vs. Kyverno — quando usar cada um

| Critério | OPA/Gatekeeper | Kyverno |
|---|---|---|
| Curva de aprendizado | Alta (aprender Rego) | Baixa (YAML declarativo) |
| Flexibilidade de lógica | Muito alta (linguagem completa) | Suficiente para 90% dos casos |
| Mutação de recursos (não só validação) | Limitado | Nativo (`mutate`) |
| Ecossistema/maturidade | Mais maduro, padrão CNCF | Crescendo rápido, mais simples |

---

## 7. Compliance — SOC2, ISO 27001, PCI-DSS {#compliance-frameworks}

### O que cada framework exige (visão técnica, não jurídica)

```
SOC2 Type II:
- Foco: controles operacionais ao longo do tempo (não é uma foto, é um vídeo)
- Trust Service Criteria: Segurança, Disponibilidade, Confidencialidade, Integridade, Privacidade
- Evidência técnica: logs de acesso, MFA obrigatório, revisão periódica de permissões,
  criptografia em trânsito e repouso, plano de resposta a incidentes testado

ISO 27001:
- Foco: sistema de gestão de segurança da informação (processo, não só tecnologia)
- Exige: matriz de risco, classificação de dados, política de acesso formal,
  auditoria interna periódica

PCI-DSS (se processa cartão de crédito):
- Foco: proteção de dados de cartão (PAN — Primary Account Number)
- Regra de ouro: NUNCA armazenar CVV. PAN completo só criptografado ou tokenizado.
- Segmentação de rede: ambiente de cartão isolado do resto da aplicação (CDE — Cardholder Data Environment)
```

### Padrões técnicos comuns aos três frameworks

```typescript
// Tokenização de cartão — nunca tocar no PAN real na sua aplicação
// Usar um provider PCI-compliant (Stripe, Braintree) que retorna um token
async function chargeCard(token: string, amountCents: number) {
    // Sua aplicação NUNCA vê o número do cartão — só o token
    return paymentProvider.charge({ source: token, amount: amountCents, currency: 'brl' });
}

// Log de auditoria — obrigatório para SOC2/ISO27001
interface AuditLogEntry {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
    ipAddress: string;
    result: 'success' | 'denied' | 'error';
}

async function auditLog(entry: AuditLogEntry): Promise<void> {
    // Append-only, nunca editável — idealmente em store separado do banco principal
    await auditStore.append(entry);
}
```

### Checklist técnico de compliance (comum aos 3 frameworks)
- [ ] MFA obrigatório para acesso administrativo
- [ ] Logs de auditoria append-only com retenção definida (geralmente 1 ano+)
- [ ] Revisão trimestral de quem tem acesso a quê (access review)
- [ ] Criptografia em trânsito (TLS 1.3) e em repouso (AES-256) em todos os dados sensíveis
- [ ] Segregação de ambientes: produção, staging e dev com credenciais e redes distintas
- [ ] Plano de resposta a incidentes documentado e testado (não só escrito, executado em simulação)
- [ ] Dados de cartão (se aplicável): nunca armazenar CVV, PAN sempre tokenizado
- [ ] Varredura de vulnerabilidade recorrente (não é setup único — é processo contínuo)
