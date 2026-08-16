# Estratégia e Visão de Produto — Guia do Product Manager

> Roadmap responde "o que vamos fazer nos próximos meses". Estratégia responde "por que essas apostas e não outras, e o que significa vencer". Sem este documento, o roadmap vira uma lista de pedidos sem fio condutor.

---

## 1. Hierarquia: Visão → Estratégia → Roadmap → Backlog

```
VISÃO (5-10 anos)
  "Por que este produto existe e como o mundo fica melhor com ele"
       │
ESTRATÉGIA (1-2 anos)
  "Onde vamos competir e como vamos vencer aí"
       │
OKRs / TEMAS (trimestre)
  "O que precisa ser verdade em 90 dias para a estratégia avançar"
       │
ROADMAP (trimestre/semestre)
  "Quais apostas concretas perseguem esses OKRs"
       │
BACKLOG / STORIES (sprint)
  "O que o time constrói essa semana"
```

Se um item do backlog não sobe essa cadeia até a visão, pergunte se ele deveria existir.

---

## 2. Product Vision Statement

### Template (formato Geoffrey Moore, adaptado)
```
Para [usuário-alvo]
Que [precisa/quer fazer X],
O [nome do produto] é um/uma [categoria de produto]
Que [principal benefício / razão de existir].

Diferente de [alternativa atual / concorrente / status quo],
Nosso produto [diferencial central e defensável].
```

### Exemplo preenchido
```
Para gestores de operações em e-commerces de médio porte
Que precisam prever ruptura de estoque antes que ela aconteça,
O StockSense é uma plataforma de previsão de demanda
Que reduz ruptura e excesso de estoque usando dados históricos e sazonalidade,
sem exigir um cientista de dados no time.

Diferente de planilhas manuais e sistemas de ERP genéricos,
Nosso produto aprende com os padrões específicos de cada categoria de produto
e avisa com antecedência suficiente para o gestor agir.
```

### Teste de qualidade de uma visão
- Se você tirar o nome do produto e colocar o de um concorrente, a frase ainda faz sentido? → **Está genérica demais, reescreva.**
- A visão sobrevive 3 anos sem precisar mudar? Se não, é roadmap disfarçado de visão.
- Alguém de fora do time de produto consegue repetir a visão de cor depois de ouvir uma vez?

---

## 3. Product Principles (Tenets)

Princípios ajudam o time a decidir sozinho em situações ambíguas, sem escalar tudo para o PM.

```
PRINCÍPIOS DE PRODUTO — [Nome do produto]

1. [Princípio, em forma de decisão]: "Preferimos [A] a [B], mesmo que [trade-off]."
   Exemplo: "Preferimos simplicidade a poder — se uma feature exige tutorial, ela falhou."

2. [Princípio 2]
   Exemplo: "Dados do usuário nunca são vendidos, mesmo que represente receita perdida."

3. [Princípio 3]
   Exemplo: "Automação tem que ser reversível — todo processo automático tem um botão de desfazer visível."
```

Um bom princípio **dói um pouco** — ele deixa explícito algo que a empresa está disposta a sacrificar. Se todos concordam sem hesitar, provavelmente é genérico demais para orientar decisão real.

---

## 4. "Where to Play / How to Win" (adaptado de Playing to Win)

Use para decidir em qual segmento/mercado focar antes de detalhar features.

```
ASPIRAÇÃO VENCEDORA
[Que tipo de sucesso estamos buscando? Ser líder em quê, para quem?]

ONDE VAMOS JOGAR (Where to Play)
- Segmento de cliente: [Ex: PMEs de varejo, 10-200 funcionários]
- Geografia: [Ex: Brasil, depois LatAm]
- Categoria de produto: [Ex: gestão de estoque, não ERP completo]
- Canal: [Ex: self-service + vendas assistidas para contas maiores]

COMO VAMOS VENCER (How to Win)
- Vantagem competitiva central: [O que fazemos melhor/diferente que é difícil de copiar]
- Proposta de valor única: [Em uma frase]

CAPACIDADES NECESSÁRIAS
- [O que precisamos ser excelentes em construir/operar para vencer aqui]

SISTEMAS DE GESTÃO
- [Que métricas e cadências vão nos dizer se a estratégia está funcionando]
```

---

## 5. PR-FAQ (Working Backwards) — Amazon Style

Útil para apostas grandes: escrever o comunicado de lançamento e o FAQ **antes** de construir, forçando clareza sobre o valor real.

### Template de Press Release (interno)
```
[CIDADE, DATA] — [Empresa] lança [nome do produto/feature] para [problema resolvido]

[Parágrafo 1 — o quê e para quem, em linguagem simples, sem jargão]

"[Citação de um executivo sobre por que isso importa]"

O problema: [Descrição do problema do cliente, em termos que ele reconheceria]

A solução: [Como o produto resolve, com um exemplo concreto de uso]

"[Citação de um cliente fictício/beta, descrevendo o benefício em suas palavras]"

Como começar: [Passo simples para experimentar]
```

### FAQ interno (perguntas difíceis que o time vai fazer)
```
P: Por que agora, e não há 2 anos ou daqui a 2 anos?
P: Por que isso e não [alternativa óbvia]?
P: Qual é o maior risco de isso não funcionar?
P: Se desse errado, qual seria o motivo mais provável?
P: Quanto isso custa para construir e manter?
P: O que teria que ser verdade para isso ser 10x maior do que o plano inicial?
```

Se o time não consegue escrever um PR-FAQ convincente, é sinal de que a ideia ainda não está madura para virar um PRD.

---

## 6. Apostas Estratégicas do Trimestre (ligação com roadmap)

```
APOSTAS — [Q_ 20__]

Aposta 1: [Nome da aposta]
Hipótese: "Se fizermos [X], vamos conseguir [resultado], porque [raciocínio]."
Conecta com: [Qual objetivo estratégico / OKR]
Nível de convicção: Alto (dado forte) / Médio (sinal, sem certeza) / Baixo (aposta especulativa)
O que aprendemos se der certo: [...]
O que aprendemos se der errado: [...]
Investimento (aprox.): [X pessoas-mês]
```

Recomendação: limitar a **no máximo 3-4 apostas grandes por trimestre** por squad. Mais que isso não é estratégia, é lista de desejos.

---

## Checklist — Estratégia está pronta para virar roadmap quando:
- [ ] A visão de produto está escrita e não muda de trimestre a trimestre
- [ ] "Onde vamos jogar" está explícito (o que inclui dizer não a segmentos)
- [ ] Há no máximo 3-4 apostas estratégicas para o período, com hipótese escrita
- [ ] Cada aposta tem uma métrica que vai confirmar ou refutar a hipótese
- [ ] O time consegue repetir a estratégia sem reler o documento
