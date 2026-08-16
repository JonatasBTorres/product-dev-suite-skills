# Métricas, KPIs e Analytics — Guia do Product Manager

## Framework de Métricas: North Star + Supporting Metrics

### North Star Metric (NSM)
A métrica que melhor captura o valor que o produto entrega aos usuários e que correlaciona com crescimento de longo prazo.

```
Produto: [Nome]
North Star Metric: [Ex: "Número de transações completadas por mês"]
Por que esta é a NSM: [Justificativa de que captura valor real ao usuário]
Meta atual: [Valor] [Prazo]
```

### Framework AARRR (Pirate Metrics)

| Estágio | O que mede | Exemplos de métricas |
|---|---|---|
| **Acquisition** | Como usuários chegam | CAC, tráfego orgânico, taxa de cadastro |
| **Activation** | Primeiro momento de valor | Taxa de conclusão do onboarding, "aha moment" |
| **Retention** | Usuários que voltam | DAU/MAU, churn rate, D1/D7/D30 retention |
| **Revenue** | Monetização | MRR, ARPU, LTV, conversão free→paid |
| **Referral** | Crescimento viral | NPS, taxa de indicação, viral coefficient |

---

## Templates de Definição de Métricas por Feature

### Formato padrão de definição de métrica

```
Métrica: [Nome da métrica]
Tipo: [Primária / Guardrail / Indicador]
Definição: [Fórmula ou descrição exata de como é calculada]
Fonte de dados: [Tabela/evento/sistema onde vive]
Frequência de medição: [Real-time / Diário / Semanal / Mensal]
Owner: [Quem monitora e age sobre esta métrica]
Baseline atual: [Valor atual, se disponível]
Meta: [Valor alvo e prazo]
Alerta em: [Quando gerar alerta? Ex: queda > 10% em 24h]
```

### Exemplo preenchido

```
Métrica: Taxa de conversão do checkout
Tipo: Primária
Definição: (pedidos_finalizados / sessões_que_iniciaram_checkout) × 100
Fonte de dados: Evento `checkout_completed` / `checkout_started` no Mixpanel
Frequência: Diário (dashboard atualizado às 8h)
Owner: PM de Growth
Baseline atual: 62%
Meta: 70% até Q3 2025
Alerta em: Queda abaixo de 55% em janela de 24h
```

---

## Plano de Analytics por Feature

Antes de qualquer feature entrar em desenvolvimento, definir:

### Eventos a rastrear

```
Feature: [Nome da feature]

Evento 1: [nome_do_evento]
  Trigger: [Quando este evento deve disparar?]
  Propriedades:
    - user_id: string
    - [propriedade_relevante]: [tipo] — [descrição]
    - [propriedade_relevante]: [tipo] — [descrição]

Evento 2: [nome_do_evento]
  Trigger: [...]
  Propriedades:
    - user_id: string
    - [...]

Convenção de nomenclatura:
  - Formato: [objeto]_[verbo] (ex: button_clicked, form_submitted, page_viewed)
  - Snake_case para todos os nomes de eventos e propriedades
  - Sem espaços, sem caracteres especiais
```

### Exemplo de plano de analytics

```
Feature: Fluxo de checkout

Eventos:

checkout_started
  Trigger: Usuário clica em "Finalizar compra"
  Propriedades:
    - user_id: string
    - cart_value: number (em centavos)
    - item_count: number
    - has_coupon: boolean

checkout_step_completed
  Trigger: Usuário avança para o próximo passo do checkout
  Propriedades:
    - user_id: string
    - step_name: string (address | payment | review)
    - time_on_step_seconds: number

checkout_completed
  Trigger: Pedido confirmado com sucesso
  Propriedades:
    - user_id: string
    - order_id: string
    - revenue: number (em centavos)
    - payment_method: string
    - coupon_used: string | null

checkout_abandoned
  Trigger: Usuário sai do checkout sem concluir (após 30min de inatividade)
  Propriedades:
    - user_id: string
    - last_step_reached: string
    - cart_value: number

checkout_error_shown
  Trigger: Qualquer erro exibido ao usuário no checkout
  Propriedades:
    - user_id: string
    - error_type: string (payment_failed | address_invalid | session_expired)
    - step_name: string
```

---

## Métricas por tipo de produto

### SaaS B2B
- **MRR** (Monthly Recurring Revenue): receita recorrente mensal
- **Churn Rate**: % de clientes que cancelaram no mês
- **NRR** (Net Revenue Retention): expansão vs contração vs churn
- **CAC** (Customer Acquisition Cost): custo para adquirir um cliente
- **LTV** (Lifetime Value): receita total esperada de um cliente
- **LTV/CAC Ratio**: deve ser > 3x para negócio saudável
- **Time to Value**: tempo até o cliente perceber o primeiro valor
- **Feature Adoption Rate**: % de usuários ativos usando cada feature
- **DAU/MAU ratio**: nível de engajamento diário vs mensal ("stickiness")

### E-commerce / Marketplace
- **GMV** (Gross Merchandise Value): volume total transacionado
- **Take Rate**: % que a plataforma retém de cada transação
- **Taxa de conversão**: visitas / pedidos finalizados
- **Ticket médio**: receita / número de pedidos
- **Taxa de recompra**: usuários que fizeram 2+ pedidos
- **Cart abandonment rate**: carrinhos iniciados mas não finalizados
- **NPS transacional**: satisfação pós-compra

### Apps Mobile (Consumer)
- **DAU / WAU / MAU**: usuários ativos diários, semanais, mensais
- **D1 / D7 / D30 Retention**: % de usuários que voltam após 1, 7, 30 dias
- **Session length**: duração média da sessão
- **Sessions per user per day**: frequência de uso
- **Crash rate**: % de sessões com crash
- **App store rating**: nota média e volume de reviews
- **Push notification opt-in rate**: % que aceita receber notificações

---

## Experimentos A/B — Guia para PMs

### Quando rodar um A/B test
- Há hipótese clara e mensurável
- Tráfego suficiente para resultados estatisticamente significativos
- Mudança é reversível sem impacto crítico
- Critério de sucesso definido antes de começar

### Template de experimento

```
Experimento: [Nome descritivo]
Hipótese: "Acreditamos que [mudança X] vai [resultado Y] porque [raciocínio Z]"

Variantes:
  Control (A): [Comportamento atual]
  Variant (B): [Mudança proposta]
  Variant (C): [Opcional — variação adicional]

Métrica primária: [O que vamos medir como sucesso?]
Métricas secundárias: [O que mais vamos observar?]
Métricas de guardrail: [O que não pode piorar?]

Segmentação: [Quem entra no experimento?]
Tamanho da amostra: [Mínimo para significância estatística]
  Calculado com: [Ferramenta / poder estatístico de 80%, α = 0.05]

Duração mínima: [X dias — pelo menos 2 semanas para capturar variação semanal]

Critério de decisão:
  - Adotar B se: [condição]
  - Manter A se: [condição]
  - Investigar se: [condição de resultado ambíguo]

Owner: [PM responsável]
Engenheiro: [Dev responsável pela implementação do flag]
Data de início: [DD/MM/AAAA]
Data de leitura de resultados: [DD/MM/AAAA]
```
