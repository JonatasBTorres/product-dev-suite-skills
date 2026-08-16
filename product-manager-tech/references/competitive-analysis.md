# Análise Competitiva e de Mercado — Guia do Product Manager

> Objetivo: entender o cenário competitivo o suficiente para tomar decisão de produto — não para copiar concorrente feature por feature. Análise competitiva vira lista de tarefas ruim quando o objetivo é "ter o que eles têm" em vez de "vencer onde importa para o nosso usuário".

---

## 1. Competitor Teardown — Template

```
CONCORRENTE: [Nome]
Categoria: Direto (mesmo problema, mesmo público) / Indireto (mesmo problema, público diferente) / Substituto (problema adjacente resolvido de outra forma, ex: planilha)

Posicionamento declarado: [Como eles se descrevem no site/marketing]
Público-alvo aparente: [Quem eles parecem mirar]
Modelo de preço: [Freemium / Assinatura / Usage-based / Enterprise sob consulta]
Faixa de preço: [Se público]

Pontos fortes (o que fazem melhor que nós):
- [Item 1 — com evidência: review, print, dado]
- [Item 2]

Pontos fracos (onde há espaço):
- [Item 1 — com evidência]
- [Item 2]

O que os usuários reclamam deles (G2, Reclame Aqui, App Store reviews, Reddit):
- "[Citação real com fonte]"
- "[Citação real com fonte]"

O que os usuários elogiam:
- "[Citação real com fonte]"

Movimento recente: [Lançamento, aquisição, mudança de preço, pivot — quando relevante]

Implicação para nós: [O que isso muda na nossa estratégia, se muda algo]
```

**Regra:** nunca preencher "pontos fracos" com suposição. Se não há evidência (review, teste próprio, dado de win/loss de vendas), marcar como `⚠️ Não validado`.

---

## 2. Matriz de Posicionamento (2x2)

Escolha os dois eixos que mais importam para o comprador na sua categoria — não use genéricos como "preço x qualidade" se não for o que decide a compra.

```
                    EIXO Y (ex: Facilidade de uso)
                              ALTO
                               |
        [Concorrente C]        |        [Nós]
                               |
   BAIXO ─────────────────────┼───────────────────── ALTO
   EIXO X                     |                    EIXO X
   (ex: Profundidade          |              (ex: Profundidade
    de funcionalidades)       |               de funcionalidades)
                               |
        [Concorrente A]        |        [Concorrente B]
                               |
                             BAIXO
```

Depois de plotar, pergunte: **existe um quadrante vazio que representa uma necessidade real não atendida?** Isso é uma hipótese de diferenciação, não uma certeza — validar com discovery antes de apostar nela.

---

## 3. Positioning Statement (produto vs. mercado)

```
Para [público-alvo]
Que [necessidade/problema não atendido],
[Nome do produto] é [categoria de mercado]
Que [benefício-chave/diferencial].

Diferente de [principal alternativa/concorrente],
[Nome do produto] [diferença defensável e verdadeira].
```

> Nota: este template é o mesmo formato do Vision Statement (ver `product-strategy.md`), mas aqui o foco é comparação direta com concorrentes nomeados — útil para marketing e vendas, não só para visão interna.

---

## 4. Battlecard de Vendas (quando o PM precisa apoiar o time comercial)

```
BATTLECARD — Nós vs. [Concorrente]

Quando o cliente menciona [Concorrente], geralmente é porque: [motivo comum de comparação]

Onde ganhamos:
- [Diferencial 1] → "Pergunte ao cliente: [pergunta que expõe a dor que só nós resolvemos]"
- [Diferencial 2]

Onde perdemos (seja honesto — vendas vai descobrir de qualquer jeito):
- [Fraqueza real] → Resposta recomendada: [como reposicionar sem mentir]

Perguntas de qualificação para descobrir se somos a escolha certa:
- [Pergunta 1]
- [Pergunta 2]

Objeções comuns e como responder:
| Objeção do cliente | Resposta recomendada |
|---|---|
| "[Concorrente] é mais barato" | [Resposta baseada em valor/TCO, não desconto] |
| "[Concorrente] já é usado por [empresa conhecida]" | [Resposta] |
```

---

## 5. SWOT Aplicado a Produto (usar com moderação)

SWOT tende a virar lista genérica. Use apenas se for gerar uma decisão concreta logo depois — caso contrário, prefira "Where to Play / How to Win" (`product-strategy.md`).

```
FORÇAS (internas, hoje)          FRAQUEZAS (internas, hoje)
- [Específico e comprovável]     - [Específico e comprovável]

OPORTUNIDADES (externas, futuro) AMEAÇAS (externas, futuro)
- [Tendência de mercado/         - [Movimento de concorrente/
   tecnologia/regulação]           mudança regulatória/tecnologia]

Decisão que este SWOT embasa: [Se não há uma, o exercício não valeu a pena]
```

---

## 6. Win/Loss Analysis (para produtos com ciclo de vendas)

```
DEAL: [Nome do cliente/oportunidade] — Resultado: Ganho / Perdido

Concorrente envolvido: [Nome, se houve]
Motivo principal declarado pelo cliente: [Na palavra dele, não interpretado]
Motivo real (se diferente do declarado): [Hipótese do time de vendas/CS]

Se ganho: O que pesou a favor? [...]
Se perdido: O que teria mudado o resultado? [...]

Padrão observado nos últimos N deals: [Atualizar trimestralmente — 1 deal isolado não é padrão]
```

---

## Checklist — Antes de tomar decisão de produto baseada em concorrência
- [ ] A informação sobre o concorrente tem fonte (review real, teste próprio, win/loss) — não é suposição
- [ ] A decisão resolve uma necessidade real do **nosso** usuário, não apenas "paridade de feature"
- [ ] Foi considerado o custo de manter essa feature/decisão no longo prazo, não só de lançar
- [ ] Existe uma métrica que vai indicar se a aposta de diferenciação está funcionando
