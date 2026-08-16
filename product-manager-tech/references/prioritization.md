# Frameworks de Priorização de Produto

Use quando houver mais demandas do que capacidade e for necessário decidir o que construir primeiro.

---

## 1. Framework RICE

**Quando usar:** Priorizar backlog de features com base em dados e estimativas.

### Fórmula
```
RICE Score = (Reach × Impact × Confidence) / Effort
```

| Dimensão | O que mede | Como estimar |
|---|---|---|
| **Reach** | Quantos usuários são impactados por mês? | Número de usuários (não %) |
| **Impact** | Qual o impacto por usuário? | 0.25 = mínimo / 0.5 = baixo / 1 = médio / 2 = alto / 3 = massivo |
| **Confidence** | Quão confiantes estamos nas estimativas? | 100% = alta / 80% = média / 50% = baixa |
| **Effort** | Quanto esforço do time em "meses-pessoa"? | 0.5 = 2 semanas / 1 = 1 mês / etc. |

### Template RICE

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Prioridade |
|---|---|---|---|---|---|---|
| [Feature A] | 5.000 | 2 | 0.8 | 0.5 | 16.000 | 🔴 Alta |
| [Feature B] | 3.000 | 1 | 0.5 | 2 | 750 | 🟡 Média |
| [Feature C] | 500 | 3 | 1.0 | 0.5 | 3.000 | 🟡 Média |

### Interpretação
- RICE alto = priorizar. RICE baixo = postergar ou descartar.
- Scores só fazem sentido comparando features entre si no mesmo backlog.
- Use como referência, não como verdade absoluta.

---

## 2. Framework MoSCoW

**Quando usar:** Negociar escopo de uma release ou MVP com stakeholders.

| Categoria | Significado | Critério |
|---|---|---|
| **Must have** | Sem isso, o produto não lança | Funcionalidade core, requisito legal, blocker crítico |
| **Should have** | Importante, mas pode aguardar um sprint | Alto valor, mas há workaround |
| **Could have** | Nice to have, se sobrar tempo | Melhoria de UX, feature complementar |
| **Won't have (now)** | Não entra nesta versão | Baixo impacto ou esforço muito alto agora |

### Template MoSCoW

```
Release: [Nome / versão]
Objetivo da release: [O que estamos lançando e por quê?]

MUST HAVE (sem isso, não lançamos):
  ✅ [Feature obrigatória 1]
  ✅ [Feature obrigatória 2]

SHOULD HAVE (lançamos sem, mas queremos logo em seguida):
  🔶 [Feature importante 1]
  🔶 [Feature importante 2]

COULD HAVE (se der tempo no sprint):
  🟡 [Feature desejável 1]

WON'T HAVE (documentado para comunicação):
  ❌ [Feature descartada para esta versão — motivo]
  ❌ [Feature descartada para esta versão — motivo]
```

---

## 3. Framework ICE

**Quando usar:** Priorizar experimentos, hipóteses de growth ou ações rápidas.

### Fórmula
```
ICE Score = (Impact + Confidence + Ease) / 3
```

Cada dimensão: escala de 1 a 10.

| Dimensão | Escala 1-10 |
|---|---|
| **Impact** | 1 = mínimo impacto, 10 = impacto transformacional |
| **Confidence** | 1 = pura suposição, 10 = dado forte ou teste anterior |
| **Ease** | 1 = meses de trabalho, 10 = horas de implementação |

### Template ICE

| Hipótese / Experimento | Impact | Confidence | Ease | ICE Score |
|---|---|---|---|---|
| [Ex: Adicionar social proof na landing page] | 7 | 8 | 9 | 8.0 |
| [Ex: Mudar CTA de "Criar conta" para "Começar grátis"] | 6 | 5 | 10 | 7.0 |
| [Ex: Enviar push 1h após abandono de carrinho] | 8 | 6 | 5 | 6.3 |

---

## 4. Modelo Kano

**Quando usar:** Entender quais features encantam, satisfazem ou são básicas para o usuário.

| Categoria | Descrição | Comportamento do usuário |
|---|---|---|
| **Basic (Must-be)** | Ausência causa insatisfação; presença não entusiasma | "Claro que precisa ter isso" |
| **Performance** | Quanto mais, melhor. Relação linear com satisfação | "Quanto mais rápido, melhor" |
| **Excitement (Delighter)** | Ausência não frustra; presença encanta | "Não sabia que queria, amei!" |
| **Indifferent** | Presença ou ausência não afeta satisfação | "Tanto faz pra mim" |
| **Reverse** | Alguns usuários preferem sem | "Isso me incomoda" |

### Como usar Kano na prática
1. Faça pesquisa com usuários: para cada feature, pergunte "Como se sentiria com isso?" e "Como se sentiria sem isso?"
2. Classifique respostas na tabela Kano
3. Priorize Basic (não negocie), invista em Performance, adicione Excitement para diferenciação
4. Elimine ou deixe como opcional features Reverse ou Indifferent

---

## 5. Matriz Esforço × Impacto (2×2)

**Quando usar:** Decisão rápida em reunião, sem dados precisos disponíveis.

```
         ALTO IMPACTO
              |
   Quick wins |  Grandes apostas
  (Fazer logo)|  (Planejar bem)
              |
BAIXO  -------+------- ALTO
ESFORÇO       |         ESFORÇO
              |
   Reconsiderar| Projetos difíceis
  (Fazer depois|  de justificar)
  ou descartar |
              |
         BAIXO IMPACTO
```

| Quadrante | Decisão |
|---|---|
| Alto impacto + Baixo esforço | **Quick Win**: Priorizar imediatamente |
| Alto impacto + Alto esforço | **Grande aposta**: Planejar, quebrar em partes |
| Baixo impacto + Baixo esforço | **Fill-in**: Fazer quando houver folga |
| Baixo impacto + Alto esforço | **Evitar**: Questionar se deve existir |

---

## 6. Guia para Reunião de Priorização

### Agenda recomendada (60 min)

1. **Contexto** (5 min): Objetivo da sessão, o que precisa ser decidido
2. **Review do backlog** (10 min): Apresentar itens a priorizar
3. **Priorização individual** (10 min): Cada participante prioriza independentemente (evita anchoring)
4. **Comparação e debate** (20 min): Discutir discrepâncias, alinhar critérios
5. **Decisão final** (10 min): PM toma a decisão com base no debate
6. **Documentação** (5 min): Registrar decisões e itens fora do escopo com justificativa

### Regras para boa priorização
- O PM tem a decisão final. Priorização não é democracia.
- Toda feature rejeitada recebe uma justificativa escrita.
- "Fazer tudo" não é resposta. Se tudo é prioridade, nada é.
- Revise as prioridades a cada sprint ou quinzena.
- Evite o "HiPPO effect" (Highest Paid Person's Opinion): dados > opiniões.
