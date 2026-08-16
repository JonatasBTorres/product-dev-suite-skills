# Playbook 04 — Governança de APIs, Contratos & Compatibilidade (API First)

## Escopo

Design e versionamento de APIs, testes de contrato, linters de schema, e evolução de schemas em sistemas orientados a eventos. Use este playbook para perguntas sobre "como versiono minha API", "como evito quebrar consumidores", ou "Avro vs. Protobuf".

## Calibração por tier — o que vale a pena a partir de quando

Este playbook descreve práticas maduras de governança de API que fazem sentido pleno quando há múltiplos times/consumidores desacoplados — mas aplicá-las todas em uma API pequena com poucos consumidores é sobre-engenharia. Use esta tabela antes de recomendar as ferramentas específicas abaixo:

| Prática | Tier 0-1 (poucos consumidores, 1 time) | Tier 2 (múltiplos times/consumidores internos) | Tier 3 (API pública/parceiros, múltiplos consumidores externos) |
|---|---|---|---|
| Versionamento | Compatibilidade aditiva informal + semver simples já basta | Versionamento por URI formal + política de deprecação documentada | Headers `Sunset`/`Deprecation` obrigatórios, comunicação proativa a parceiros |
| Contract testing (Pact) | Geralmente dispensável — testes de integração manuais/E2E simples resolvem | Recomendado entre times com deploy independente | Essencial — substitui ambiente de integração compartilhado caro de manter |
| Linter de schema (Spectral) | Opcional, útil mesmo cedo se for barato de configurar | Recomendado como gate de CI | Obrigatório, com regras customizadas da organização |
| Schema Registry com compatibilidade forçada | Só se já há streaming de eventos com múltiplos consumidores | Recomendado (`Backward` como mínimo) | `Full` compatibility como padrão, rejeição automática de schema incompatível |

**Regra prática:** se você tem 1 time e poucos consumidores conhecidos, a conversa direta ("vamos mudar esse campo, avisa quem consome") resolve o que ferramental de contrato resolveria de forma automatizada — automatize quando a coordenação manual começar a falhar de verdade, não antes.

## Design API-First

- O contrato (OpenAPI/Protobuf/schema GraphQL) é escrito **antes** da implementação e vira a fonte de verdade — implementação e mocks de consumidor são gerados/validados contra ele, não o inverso.
- Isso permite que times consumidores comecem a integrar contra um mock antes do backend estar pronto, e que o contrato seja revisado (design review) antes de qualquer linha de código de negócio ser escrita.
- Valide o contrato com linters automatizados no CI (Spectral para OpenAPI) para garantir consistência de nomenclatura, presença de descrições, códigos de erro padronizados, etc. — não deixe isso para revisão manual de PR.

## Versionamento — framework de decisão

| Estratégia | Como funciona | Quando usar |
|---|---|---|
| **Versionamento por URI** (`/v1/pedidos`, `/v2/pedidos`) | Versão explícita no path | Mais simples de entender e de rotear (inclusive por proxy/gateway); preferido para APIs públicas por clareza |
| **Versionamento por Header** (`Accept: application/vnd.empresa.v2+json`) | Versão no cabeçalho HTTP | Quando se quer manter a URI "limpa" e estável; comum em APIs que seguem HATEOAS/hypermedia rigorosamente |
| **Sem versionamento explícito, só compatibilidade aditiva** | Nunca remove/renomeia campos, só adiciona campos opcionais | Prática recomendada como **padrão a mirar**, independente da estratégia acima — reduz a frequência real de precisar de uma nova versão |

**Regra prática:** trate versionamento como último recurso, não como processo rotineiro. A maioria das mudanças deveria ser compatível para trás (adicionar campo opcional, adicionar novo endpoint) sem exigir nova versão. Reserve bump de versão para mudanças verdadeiramente incompatíveis (remover campo, mudar tipo, mudar semântica de um campo existente).

### Descontinuação graciosa

Ao aposentar uma versão/endpoint, sinalize com os headers padrão em vez de simplesmente derrubar:

```http
Deprecation: true
Sunset: Sat, 31 Jan 2027 00:00:00 GMT
Link: <https://api.empresa.com/v2/pedidos>; rel="successor-version"
```

Combine com: (a) aviso antecipado com prazo real (não "descontinuado amanhã"), (b) métricas de quais consumidores ainda usam a versão antiga para contato direto antes do desligamento, (c) resposta de erro clara e acionável após o Sunset (não um 500 genérico).

## Contract-Driven Development

- **Pact (contract testing)**: o consumidor define as expectativas do contrato (quais requisições faz, quais respostas espera) e isso gera um contrato que o provedor verifica no seu próprio pipeline de CI, sem precisar de um ambiente de integração compartilhado sempre no ar. Essencial em arquiteturas de microsserviços com múltiplos times — substitui (ou complementa) testes de integração end-to-end caros e frágeis.
- Fluxo prático: consumidor roda testes contra um mock gerado do Pact → contrato é publicado num Pact Broker → pipeline do provedor baixa os contratos relevantes e roda testes de verificação contra sua própria implementação → só then o deploy do provedor é liberado (can-i-deploy check).
- **Spectral**: linter de schema para OpenAPI (e JSON Schema) — rode como gate obrigatório de CI para qualquer mudança de contrato, com regras customizadas da organização (convenções de nomenclatura, exigência de exemplos, padronização de respostas de erro).

## Evolução de Schemas (sistemas orientados a eventos)

Quando o "contrato" é o payload de um evento em um tópico Kafka/Kinesis/Pub-Sub (não uma API HTTP), a disciplina de compatibilidade é ainda mais crítica porque não há um "cliente" único — pode haver dezenas de consumidores desacoplados no tempo.

### Schema Registry (Avro / Protobuf wire format)

| Tipo de compatibilidade | O que garante | Regra de mudança permitida |
|---|---|---|
| **Backward** | Consumidor novo lê dado escrito com schema antigo | Pode remover campos opcionais e adicionar campos com valor default |
| **Forward** | Consumidor antigo lê dado escrito com schema novo | Pode adicionar campos opcionais; consumidor antigo simplesmente ignora o que não conhece |
| **Full** | Backward + Forward simultaneamente | Só adição/remoção de campos opcionais com default — a estratégia mais segura para operar sem coordenação apertada entre produtores e consumidores |

**Regra prática:** em produção, mire compatibilidade **Full** como padrão para tópicos com múltiplos consumidores desacoplados. Configure o Schema Registry para **rejeitar** no momento do registro qualquer schema novo que quebre a política de compatibilidade escolhida — não dependa de disciplina manual do time.

- **Avro**: schema explícito e separado do dado, ótimo para Schema Registry porque o schema é resolvido por ID em vez de embutido em cada mensagem (payloads menores). Comum no ecossistema Kafka.
- **Protobuf**: schema compilado (`.proto`) gera código fortemente tipado em múltiplas linguagens; wire format extremamente compacto; usado tanto para eventos quanto para gRPC. Migração de campo é segura (números de campo nunca são reutilizados) desde que a disciplina de "nunca reutilizar um número de campo removido" seja seguida.

## Antipadrões comuns

- **Breaking change "pequeno" sem bump de versão** (renomear campo, mudar tipo de string para int) — quebra consumidores silenciosamente, muitas vezes só descoberto em produção.
- **Versionar a API inteira quando só um endpoint mudou de forma incompatível** — força todos os consumidores a migrar por causa de uma mudança que não os afeta.
- **Nenhum linter de contrato no CI** — inconsistências de nomenclatura e formato se acumulam PR a PR até a API ficar difícil de consumir de forma previsível.
- **Schema Registry configurado sem política de compatibilidade** (modo `NONE`) — qualquer schema é aceito, e a "proteção" do registry vira apenas um catálogo, não uma garantia.
- **Depreciar sem media de uso real** — desligar uma versão sem saber quem ainda depende dela é a receita clássica para um incidente de "por que o cliente X parou de funcionar".

## Referência rápida

```yaml
# Exemplo mínimo de regra Spectral customizada
rules:
  api-error-schema:
    description: "Toda resposta de erro deve seguir o schema padrão de erro"
    given: "$.paths[*][*].responses[?(@property >= '400')]"
    then:
      field: content.application/json.schema.$ref
      function: pattern
      functionOptions:
        match: "#/components/schemas/ErrorResponse"
```
