# Especificação de API — Perspectiva de Produto

> Este documento define o contrato de APIs do ponto de vista de produto e negócio, sem entrar em implementação técnica. O objetivo é alinhar o que cada endpoint deve fazer, seus comportamentos esperados, e os casos de uso que ele suporta.

---

## Quando o PM precisa especificar APIs

- Quando dois times precisam integrar sistemas
- Quando o produto expõe APIs para parceiros ou clientes externos
- Quando a feature envolve sincronização de dados entre plataformas
- Quando há contratos de dados entre frontend e backend

---

## Template de Especificação de Endpoint

```
## [MÉTODO] /v[N]/[recurso]/[caminho]

**Descrição:** O que este endpoint faz, em linguagem de produto.
**Caso de uso principal:** Quando e por que este endpoint é chamado?
**Owner do endpoint:** [Time/squad responsável]
**Status:** Novo / Existente / Em deprecação

### Autenticação e Autorização
- Autenticação: Bearer token / API Key / Sem autenticação
- Autorização: Quais perfis/roles podem chamar este endpoint?

### Request

**Path params:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | ✅ | ID único do recurso |

**Query params:**
| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `page` | integer | ❌ | 1 | Página da paginação |
| `limit` | integer | ❌ | 20 | Itens por página (máx: 100) |

**Body (JSON):**
| Campo | Tipo | Obrigatório | Validação | Descrição |
|---|---|---|---|---|
| `name` | string | ✅ | Min 2, Max 100 chars | Nome do recurso |
| `email` | string | ✅ | Formato e-mail válido | E-mail do usuário |
| `role` | enum | ✅ | admin / user / viewer | Perfil de acesso |

**Exemplo de request:**
```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "role": "user"
}
```

### Responses

**200 OK — Sucesso**
```json
{
  "id": "usr_abc123",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "role": "user",
  "createdAt": "2025-03-06T14:30:00Z"
}
```

**400 Bad Request — Dados inválidos**
```json
{
  "error": "validation_error",
  "message": "Campo 'email' inválido",
  "fields": {
    "email": "Formato de e-mail inválido"
  }
}
```

**401 Unauthorized — Token inválido ou expirado**
```json
{
  "error": "unauthorized",
  "message": "Token de autenticação inválido ou expirado"
}
```

**403 Forbidden — Sem permissão**
```json
{
  "error": "forbidden",
  "message": "Seu perfil não tem permissão para realizar esta ação"
}
```

**404 Not Found — Recurso não encontrado**
```json
{
  "error": "not_found",
  "message": "Usuário não encontrado"
}
```

**422 Unprocessable Entity — Regra de negócio violada**
```json
{
  "error": "business_rule_violation",
  "message": "Este e-mail já está cadastrado em outra conta",
  "code": "email_already_exists"
}
```

**429 Too Many Requests — Rate limit atingido**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Limite de requisições atingido. Tente novamente em 60 segundos.",
  "retryAfter": 60
}
```

**500 Internal Server Error — Erro inesperado**
```json
{
  "error": "internal_error",
  "message": "Ocorreu um erro inesperado. Nossa equipe foi notificada.",
  "requestId": "req_xyz789"
}
```

### Regras de negócio
- RN-01: [Regra que deve ser aplicada neste endpoint]
- RN-02: [Outra regra]

### Rate Limiting
- Limite: [X requisições por minuto por usuário/IP]
- Comportamento ao atingir limite: [Retorna 429, aguardar X segundos]

### Side effects
Liste o que mais acontece quando este endpoint é chamado com sucesso:
- [Ex: Envia e-mail de boas-vindas ao usuário criado]
- [Ex: Dispara evento `user.created` para o CRM]
- [Ex: Cria registro de auditoria na tabela de logs]
```

---

## Padrões de API de Produto

### Paginação

Use cursor-based ou offset pagination consistentemente:

**Offset (simples, para poucos dados):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Cursor-based (para grandes volumes ou feeds em tempo real):**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "cursor_abc123",
    "hasMore": true
  }
}
```

### Versionamento de API
- Versão no path: `/api/v1/`, `/api/v2/`
- Nunca quebrar contrato de v1 sem deprecation period mínimo de 6 meses
- Comunicar breaking changes com antecedência para consumidores externos

### Formato de datas
- Sempre UTC
- Formato ISO 8601: `2025-03-06T14:30:00Z`
- Timezone do usuário é responsabilidade do frontend

### Erros — Contrato padrão
```json
{
  "error": "código_do_erro_snake_case",
  "message": "Mensagem legível para log/debug",
  "code": "CODIGO_NEGOCIO_OPCIONAL",
  "requestId": "req_para_rastrear_no_log",
  "details": {} // objeto opcional com detalhes adicionais
}
```

---

## Checklist de API — Before Merge

- [ ] Autenticação e autorização definidas e implementadas
- [ ] Todos os status HTTP corretos e documentados
- [ ] Validações de input no servidor
- [ ] Mensagens de erro úteis e sem exposição de informações sensíveis
- [ ] Rate limiting configurado
- [ ] Logs estruturados com requestId
- [ ] Testes de integração cobrindo happy path e principais erros
- [ ] Documentação atualizada (Swagger/OpenAPI)
- [ ] Breaking changes sinalizados e comunicados
