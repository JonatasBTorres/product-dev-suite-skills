# Discovery e Pesquisa com Usuário — Guia do Product Manager

> Discovery é o trabalho de reduzir incerteza **antes** de escrever um PRD. Se você já sabe exatamente o que construir e por quê, pule para o PRD. Se não sabe, comece aqui.

---

## Quando fazer discovery vs. ir direto para especificação

| Sinal | Ação |
|---|---|
| Problema validado, solução clara, só falta especificar | Ir direto para PRD |
| Problema claro, solução incerta | Discovery focado em solução (protótipos, testes) |
| Problema incerto ("achamos que existe uma dor aqui") | Discovery focado em problema (entrevistas, dados) |
| Aposta estratégica nova, sem dado nenhum | Discovery completo (problema → solução → viabilidade) |

Regra prática: **nunca pule discovery só para "ganhar tempo"**. Um PRD bem escrito de uma solução errada ainda entrega a coisa errada, só que com mais detalhes.

---

## 1. Double Diamond (estrutura macro)

```
DESCOBRIR ──────► DEFINIR ──────► DESENVOLVER ──────► ENTREGAR
(divergir:        (convergir:     (divergir:          (convergir:
explorar o        um problema     explorar             uma solução
espaço do          específico      soluções             testada e pronta)
problema)          e validado)     possíveis)

Perguntas típicas por fase:
Descobrir:  "O que está acontecendo? Para quem? Com que frequência?"
Definir:    "Qual é O problema que vale a pena resolver agora?"
Desenvolver:"Quais formas diferentes existem de resolver isso?"
Entregar:   "Essa solução específica resolve o problema, de forma viável?"
```

---

## 2. Continuous Discovery (modelo de cadência contínua)

Em vez de discovery como projeto pontual, rode em ciclo semanal/quinzenal:

```
Opportunity Solution Tree

                    [Outcome / Objetivo de negócio]
                              |
        ┌─────────────────────┼─────────────────────┐
   [Oportunidade A]      [Oportunidade B]      [Oportunidade C]
   (dor/necessidade      (dor/necessidade      (dor/necessidade
    observada em          observada em          observada em
    pesquisa)             pesquisa)             pesquisa)
        |
   ┌────┴────┐
[Solução 1] [Solução 2]
   |            |
[Teste/         [Teste/
 Experimento]    Experimento]
```

**Como usar:**
1. Toda entrevista/dado novo vira uma "oportunidade" (não uma solução) no galho da árvore.
2. Para cada oportunidade, gere 2-3 soluções possíveis antes de escolher uma.
3. Antes de construir, teste a suposição mais arriscada da solução (ver seção 6).
4. Regra: pelo menos **uma conversa com usuário/cliente por semana**, mesmo sem projeto ativo — mantém o PM calibrado com a realidade.

---

## 3. Roteiro de Entrevista — Jobs to Be Done (JTBD)

**Objetivo:** entender o que o usuário estava tentando realizar quando decidiu buscar (ou trocar de) uma solução — não pedir opinião sobre features.

### Estrutura da entrevista (45-60 min)

```
1. Aquecimento (5 min)
   - Contexto do usuário: papel, rotina, ferramentas atuais

2. Reconstrução da linha do tempo (20 min)
   "Me conta a história de quando você começou a usar/procurar [produto/solução]."
   - "O que estava acontecendo na sua vida/trabalho naquele momento?" (gatilho)
   - "O que te fez procurar uma solução AGORA e não antes?" (evento catalisador)
   - "O que você tentou antes de chegar nessa solução?" (soluções alternativas/improvisadas)
   - "O que quase te fez desistir de trocar?" (ansiedades/hábitos)

3. Aprofundamento no momento de decisão (15 min)
   - "O que passou pela sua cabeça quando viu [produto]?"
   - "O que quase te fez não comprar/adotar?"
   - "Se pudesse voltar no tempo e mudar algo nessa jornada, o que seria?"

4. Fechamento (5 min)
   - "Tem mais alguma coisa que eu deveria ter perguntado?"
   - Perguntar por indicação de mais 1-2 pessoas com experiência parecida
```

### Perguntas a EVITAR (viés / dado não confiável)
- ❌ "Você usaria uma feature que faz X?" (resposta hipotética não prevê comportamento)
- ❌ "Você pagaria por isso?" (as pessoas superestimam disposição a pagar em teoria)
- ❌ "O que você acha que deveríamos construir?" (usuário não tem visão de solução, tem visão de dor)

### Perguntas boas (comportamento passado, específico)
- ✅ "Me conta a última vez que isso aconteceu."
- ✅ "O que você fez logo depois?"
- ✅ "Quanto tempo isso te tomou?"

---

## 4. Síntese de Pesquisa Qualitativa (Affinity Mapping)

```
Passo 1: Cada insight/citação relevante vira um post-it (físico ou Miro/FigJam)
Passo 2: Agrupar post-its por tema similar (sem categorias pré-definidas)
Passo 3: Nomear cada cluster com uma frase de "oportunidade"
         (formato: "Usuários têm dificuldade de [verbo] quando [contexto]")
Passo 4: Priorizar clusters por: frequência (quantos entrevistados mencionaram)
         × intensidade (quão forte foi a emoção/impacto relatado)
```

### Template de registro de entrevista

```
Entrevista #[N] — [Data]
Persona: [Perfil do entrevistado]
Contexto: [Papel, empresa/uso, tempo de uso do produto]

Principais citações:
- "[Citação literal 1]"
- "[Citação literal 2]"

Oportunidades identificadas:
- OP-[N]: [Frase de oportunidade, no formato acima]

Nível de confiança no insight: Alto / Médio / Baixo
(Alto = confirma padrão visto em 3+ entrevistas anteriores)
```

---

## 5. Personas e Jobs-to-be-Done — Template Aprofundado

> Mais completo que a versão resumida usada no PRD (seção 4). Use este quando a persona ainda está sendo construída/validada; depois, resuma para o PRD.

```
PERSONA: [Nome fictício memorável]

Contexto:
- Papel/cargo: [Ex: Gerente de operações em e-commerce médio porte]
- Nível de maturidade digital: [Baixo / Médio / Alto]
- Ferramentas que já usa hoje: [Lista]

Jobs to be Done:
- Job funcional: [O que a pessoa está tentando realizar, na prática]
- Job emocional: [Como quer se sentir — no controle, seguro, competente]
- Job social: [Como quer ser percebido pelos outros — no chefe, no time]

Gatilho de mudança:
- [O que precisa acontecer para essa pessoa procurar uma solução nova?]

Critérios de sucesso (do ponto de vista dela):
- [O que precisa ser verdade para ela dizer "isso resolveu meu problema"?]

Ansiedades de adoção:
- [O que a impede de adotar/trocar mesmo estando insatisfeita?]

Citação representativa:
"[Frase real ou reconstruída que captura a dor]"

Fontes: [N entrevistas, dados de suporte, NPS aberto, etc. — nunca invente sem base]
```

---

## 6. Assumption Mapping e Riskiest Assumption Test (RAT)

Antes de construir, identifique quais suposições, se erradas, quebram todo o projeto.

```
Mapa de Suposições — [Nome da iniciativa]

                ALTA INCERTEZA
                      |
   Testar primeiro    |   Testar primeiro
   (arriscado +       |   (arriscado +
    fácil de testar)  |    difícil de testar
                      |    → buscar proxy)
FÁCIL ----------------+---------------- DIFÍCIL
DE TESTAR             |                DE TESTAR
                      |
   Assumir e seguir   |   Monitorar
   (baixo risco,      |   (baixo risco,
    fácil validar     |    caro validar —
    depois)           |    aceitar e seguir)
                      |
                BAIXA INCERTEZA

Lista de suposições (da mais arriscada para a menos):
1. [Suposição de DESEJABILIDADE: as pessoas querem isso?]
2. [Suposição de VIABILIDADE: conseguimos construir com o time/prazo que temos?]
3. [Suposição de VIABILIDADE DE NEGÓCIO: isso gera resultado que justifica o investimento?]
```

### Riskiest Assumption Test (RAT)
```
Suposição mais arriscada: [Ex: "Usuários vão confiar em uma IA para aprovar crédito automaticamente"]
Teste mínimo: [Ex: Protótipo Wizard-of-Oz — humano decide por trás de uma tela que parece automática]
Sinal de sucesso: [Ex: >70% dos usuários testados aceitam a decisão sem pedir revisão humana]
Sinal de fracasso: [Ex: >30% pedem revisão manual → suposição de confiança está errada]
Timebox: [Ex: 1 semana, 8 usuários]
```

---

## 7. Teste de Usabilidade — Guia Rápido

```
Objetivo do teste: [O que queremos aprender — não "se as pessoas gostam", e sim onde travam]
Protótipo: [Nível de fidelidade — wireframe, clicável, produto real]

Roteiro:
1. Contexto (sem explicar o que fazer): "Imagine que você precisa [tarefa]. Mostra como você faria."
2. Observar sem ajudar — deixar o silêncio acontecer, não corrigir o caminho
3. Perguntar "o que você esperava que acontecesse?" quando o usuário hesitar
4. Nunca perguntar "ficou fácil?" (induz resposta positiva) — perguntar "o que foi mais confuso?"

Quantidade recomendada: 5 usuários já revelam ~85% dos problemas de usabilidade principais
(lei de Nielsen — não precisa de amostra estatística para achar problemas de UX)

Registro por sessão:
- Tarefa: [Nome]
- Completou sem ajuda? Sim / Com dificuldade / Não
- Ponto de confusão: [Onde e por quê]
- Citação relevante: [...]
```

---

## 8. Survey Design — Evitando Viés

| Erro comum | Problema | Correção |
|---|---|---|
| Pergunta dupla: "O app é rápido e fácil de usar?" | Mede duas coisas em uma resposta | Separar em duas perguntas |
| Escala sem ponto neutro (1-4) | Força opinião artificial | Usar escala 1-5 ou 1-7 com ponto central |
| Pergunta de opinião sobre feature futura | Baixa previsibilidade de comportamento real | Perguntar sobre comportamento passado |
| Ordem que sugere resposta esperada | Viés de ancoragem | Randomizar ordem de opções quando possível |

### Template mínimo de NPS + follow-up
```
"De 0 a 10, quão provável você é de recomendar [produto] a um colega?"
[Se 0-6 — Detrator] "O que faria você mudar de nota?"
[Se 7-8 — Neutro]   "O que falta para virar um 9 ou 10?"
[Se 9-10 — Promotor] "Qual foi o principal motivo da nota alta?"
```

---

## 9. Customer Journey Map — Template

```
JORNADA: [Nome da jornada — ex: "Do cadastro até a primeira compra"]
Persona: [Qual persona está mapeada]

Etapa:        [Descoberta]  [Consideração]  [Onboarding]  [Uso ativo]  [Renovação/Churn]
Ação:          [O que faz]   [O que faz]    [O que faz]   [O que faz]   [O que faz]
Pensamento:    ["..."]       ["..."]        ["..."]       ["..."]       ["..."]
Emoção:        😐/😊/😟       😐/😊/😟        😐/😊/😟       😐/😊/😟       😐/😊/😟
Ponto de dor:  [...]         [...]          [...]         [...]         [...]
Oportunidade:  [...]         [...]          [...]         [...]         [...]
Owner interno: [Marketing]   [Vendas]       [Produto]     [Produto/CS]  [CS/Growth]
```

---

## Checklist — Discovery está pronto para virar PRD quando:
- [ ] O problema foi validado com pelo menos 5 fontes (entrevistas, dados, suporte)
- [ ] A oportunidade tem frequência e intensidade suficientes para justificar investimento
- [ ] A(s) suposição(ões) mais arriscada(s) foram testadas (RAT) — não apenas assumidas
- [ ] Existe hipótese de solução (não precisa ser a final) com hipótese de valor escrita
- [ ] O time concorda sobre qual métrica vai indicar sucesso
