# Business Case e Precificação — Guia do Product Manager

> Nota: este documento ajuda a **estruturar** a análise financeira de uma decisão de produto (formato, perguntas certas, frameworks). Ele não substitui um analista financeiro ou consultor para decisões de investimento reais — números finais de negócio devem ser validados com finance/RevOps antes de virar compromisso externo.

---

## 1. Business Case — Template

Use antes de investir esforço de engenharia em algo caro ou incerto, especialmente quando a resposta para "por que fazer isso" não é óbvia para stakeholders.

```
BUSINESS CASE: [Nome da iniciativa]
Autor: [PM] | Data: [DD/MM/AAAA] | Status: Proposta / Aprovado / Rejeitado

## 1. Problema / Oportunidade
[Qual dor ou oportunidade de negócio motiva isso — com dado, não opinião]

## 2. Custo de não fazer nada (Cost of Inaction)
[O que acontece se mantivermos o status quo? Perda de receita, churn, risco de compliance, perda de competitividade?]

## 3. Opções consideradas
| Opção | Descrição | Custo estimado | Benefício estimado | Risco |
|---|---|---|---|---|
| A — Não fazer | Manter como está | R$ 0 | R$ 0 | [Risco de não agir] |
| B — [Solução mínima] | [Descrição] | [R$ / pessoas-mês] | [Estimativa] | [Risco] |
| C — [Solução completa] | [Descrição] | [R$ / pessoas-mês] | [Estimativa] | [Risco] |

## 4. Recomendação
[Qual opção e por quê — em uma frase clara]

## 5. Investimento necessário
- Esforço de engenharia: [X pessoas-mês]
- Custo de terceiros/licenças: [Se houver]
- Custo de oportunidade: [O que NÃO será feito por causa disso]

## 6. Retorno esperado
- Ganho estimado: [R$ ou métrica de negócio, com prazo]
- Payback period: [Ver fórmula abaixo]
- Nível de confiança na estimativa: Alto / Médio / Baixo

## 7. Riscos e mitigação
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| [Risco 1] | Alta/Média/Baixa | Alto/Médio/Baixo | [Plano] |

## 8. Critério de sucesso e ponto de revisão
[Em que momento vamos revisar se a aposta está valendo a pena? Que métrica decide continuar ou parar?]
```

### Fórmula de Payback Period
```
Payback (meses) = Investimento total / Ganho mensal estimado

Exemplo:
Investimento: R$ 300.000 (3 devs × 4 meses, custo carregado)
Ganho mensal estimado: R$ 40.000 (redução de churn projetada)
Payback = 300.000 / 40.000 = 7,5 meses
```

### ROI simples
```
ROI (%) = ((Ganho total - Investimento) / Investimento) × 100

Exemplo, considerando 12 meses de ganho após o payback:
Ganho em 12 meses: R$ 480.000
Investimento: R$ 300.000
ROI = ((480.000 - 300.000) / 300.000) × 100 = 60%
```

> Estimativas de ganho devem vir com a fonte do número (dado histórico, benchmark de mercado, piloto) — nunca apenas "achamos que vai melhorar X%". Se não há base, marcar `⚠️ Estimativa especulativa` explicitamente.

---

## 2. Build vs. Buy vs. Partner

```
DECISÃO: [Nome da capacidade que precisamos ter — ex: "motor de busca", "gateway de pagamento"]

Critério                          Build          Buy            Partner/Integrar
Tempo até disponível              [estimativa]   [estimativa]   [estimativa]
Custo inicial                     [estimativa]   [estimativa]   [estimativa]
Custo recorrente (manutenção)     [estimativa]   [estimativa]   [estimativa]
É diferencial competitivo core?   [Sim/Não]      [Sim/Não]      [Sim/Não]
Controle sobre roadmap da peça    Total          Nenhum         Parcial
Risco de dependência externa      Nenhum         Alto           Médio

Regra prática: construa (build) o que é diferencial competitivo central e difícil
de replicar; compre (buy) commodities onde o mercado já resolveu bem
(pagamento, e-mail transacional, autenticação); parceria quando o valor está
na integração e não na tecnologia em si.

Decisão: [Build / Buy / Partner]
Justificativa: [Por quê]
Revisão em: [Quando reavaliar essa decisão — nada é permanente]
```

---

## 3. Modelos de Precificação

| Modelo | Como funciona | Quando faz sentido | Risco |
|---|---|---|---|
| **Flat fee** | Preço único, todos os recursos | Produto simples, público homogêneo | Deixa dinheiro na mesa com clientes de alto uso |
| **Tiered (planos)** | Pacotes com limites crescentes (Basic/Pro/Enterprise) | Público heterogêneo com necessidades diferentes | Complexidade de decidir o que vai em cada tier |
| **Usage-based** | Cobra por uso (API calls, GB, transações) | Custo variável real por uso, público técnico | Receita imprevisível, pode desincentivar uso |
| **Per-seat** | Cobra por usuário/licença | Ferramentas colaborativas B2B | Pode incentivar cliente a compartilhar login |
| **Freemium** | Grátis com limite, paga para expandir | Produto com efeito de rede ou viral, CAC baixo via boca a boca | Conversão free→paid geralmente baixa (2-5%) |
| **Híbrido** | Base fixa + consumo variável | SaaS com custo de infra variável (ex: IA, storage) | Mais difícil de comunicar/entender |

### Perguntas para decidir o modelo
```
1. O que o cliente considera "unidade de valor"? (usuários, transações, resultado gerado)
   → A cobrança deveria estar alinhada a essa unidade.
2. Nosso custo variável cresce com o uso? (ex: custo de inferência de IA, storage)
   → Se sim, cobrança flat pode gerar prejuízo em clientes de uso intenso.
3. O produto tem efeito de rede (fica mais valioso com mais usuários)?
   → Favorece freemium/aquisição ampla antes de monetizar.
4. O comprador é o mesmo que o usuário final? (B2B: comprador é gestor, usuário é operador)
   → Precificação por seat pode não refletir valor percebido pelo usuário real.
```

### Template de Pricing Change Proposal
```
Mudança de preço proposta: [De X para Y / Nova estrutura Z]
Motivação: [Dado que embasa — margem, benchmark de mercado, pesquisa de disposição a pagar]
Impacto em clientes atuais: [Grandfathering? Aumento gradual? Comunicação necessária]
Impacto estimado em receita: [+/- R$, com nível de confiança]
Impacto estimado em conversão/churn: [Hipótese e como será monitorado]
Plano de comunicação: [Prazo de aviso prévio, canais]
Data de vigência: [DD/MM/AAAA]
```

---

## Checklist — Antes de levar um business case para aprovação
- [ ] O custo de não fazer nada foi quantificado, não só descrito
- [ ] Existe pelo menos uma alternativa mais barata considerada e descartada com justificativa
- [ ] As estimativas de ganho têm fonte (dado histórico, piloto, benchmark) — não são só otimismo
- [ ] Existe um ponto de revisão definido (quando parar se não estiver funcionando)
- [ ] O que será sacrificado (custo de oportunidade) está explícito
