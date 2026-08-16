# Especificação de Features com IA Generativa / LLM — Guia do Product Manager

> Features com IA generativa têm uma diferença fundamental em relação a features determinísticas: o mesmo input pode gerar outputs diferentes, e "está funcionando" não é binário — é uma questão de taxa de qualidade aceitável. Um PRD tradicional (fluxo → regra → resultado exato) não é suficiente sozinho.

---

## 1. Quando esta referência se aplica

Use além do PRD normal quando a feature envolve: geração de texto/imagem/código por LLM, chat/assistente conversacional, classificação ou extração automática via modelo, recomendação generativa, ou qualquer decisão automatizada que use IA para produzir output não-determinístico.

---

## 2. Seções adicionais a incluir na especificação

### 2.1 Caso de uso e nível de autonomia

```
Nome da feature: [...]

Nível de autonomia do modelo:
[ ] Sugestão — modelo sugere, humano decide e confirma toda ação
[ ] Automação com revisão — modelo age, humano pode revisar/desfazer depois
[ ] Automação total — modelo age sem revisão humana (reservar para baixo risco)

Justificativa do nível escolhido: [Por que esse nível de autonomia é adequado
ao risco da tarefa — errar em "sugerir um resumo" é bem diferente de errar em
"aprovar automaticamente um reembolso"]
```

### 2.2 Guardrails (o que o modelo NÃO pode fazer)

```
Guardrails de conteúdo:
- [Ex: Nunca fornecer aconselhamento médico/jurídico/financeiro definitivo]
- [Ex: Nunca revelar dados de outro usuário, mesmo se solicitado]
- [Ex: Recusar educadamente pedidos fora do escopo do produto]

Guardrails de ação (para agentes que executam ações):
- [Ex: Nunca enviar e-mail/mensagem sem confirmação explícita do usuário]
- [Ex: Nunca excluir dados permanentemente sem segunda confirmação]
- [Ex: Limite de valor/escopo de ações automatizadas — ex: só aprova reembolsos até R$X]

Como o guardrail é aplicado: [Prompt/system instruction / camada de validação
separada (classificador) / regra determinística após o modelo / combinação]
```

### 2.3 Tratamento de erro e "alucinação"

```
Cenário: Modelo gera informação incorreta ou inventada
Detecção: [Como saberemos que aconteceu — validação automática, feedback do
usuário, revisão amostral humana]
Mitigação: [Ex: grounding em fonte de dados verificada (RAG), citar fonte,
disclaimer visível, permitir fácil correção/feedback do usuário]

Cenário: Modelo se recusa a responder algo legítimo (falso positivo de guardrail)
Como o usuário reporta: [Botão de feedback, canal de suporte]
Como o time monitora a taxa de recusas indevidas: [...]

Cenário: Modelo/API está indisponível ou lento
Fallback: [Ex: resposta em cache, modo degradado sem IA, mensagem clara de
indisponibilidade — nunca travar a experiência sem explicação]
```

### 2.4 Avaliação de qualidade (Eval)

```
Eval set: [Conjunto de casos de teste representativos — quantos, como foram
selecionados: casos reais de produção, casos adversariais, edge cases conhecidos]

Métricas de qualidade:
- [Ex: Taxa de respostas corretas/úteis segundo revisão humana — meta: >90%]
- [Ex: Taxa de alucinação detectada — meta: <2%]
- [Ex: Taxa de recusa indevida (falso positivo de guardrail) — meta: <1%]
- [Ex: Satisfação do usuário com a resposta (thumbs up/down) — meta: >X%]

Processo de avaliação:
[ ] Antes do lançamento: eval set rodado manualmente ou com LLM-as-judge
[ ] Amostragem contínua em produção: [% de interações revisadas por humano]
[ ] Cadência de re-avaliação: [Toda mudança de prompt/modelo, mensal, etc.]

Critério de "pronto para lançar": [Ex: eval set passa em >90% dos casos E
zero casos críticos de segurança/guardrail falhando]
```

### 2.5 Versionamento e mudança de prompt/modelo

```
Prompt/system instruction versionado: [Onde vive — repositório, ferramenta de
prompt management]
Processo de mudança: [Mudança de prompt passa por review como código? Precisa
rodar eval set antes de ir para produção?]
Rollback: [Como reverter uma mudança de prompt/modelo que piorou qualidade]
Mudança de modelo subjacente (ex: trocar de versão do LLM): [Requer nova
rodada de eval — nunca trocar silenciosamente]
```

### 2.6 Transparência e experiência do usuário

```
Disclosure: [O usuário sabe que está interagindo com IA? Como isso é sinalizado
na interface — obrigatório em várias jurisdições para determinados usos]
Confiança calibrada: [A interface comunica incerteza quando relevante? Ex:
"gerado por IA, revise antes de usar" em outputs sensíveis]
Controle do usuário: [Usuário pode editar, regenerar, desfazer ou dar feedback
sobre o output?]
Histórico e auditoria: [Interações ficam registradas para auditoria/suporte,
respeitando privacidade?]
```

### 2.7 Dados, privacidade e custo

```
Dados enviados ao modelo: [Quais dados do usuário entram no prompt/contexto —
minimizar ao necessário]
Dados sensíveis: [PII é enviada ao modelo? Precisa de mascaramento antes?]
Retenção: [Prompts/outputs são usados para treinar modelos de terceiros?
Confirmar contrato com o provedor de IA]
Compliance: [LGPD/GDPR aplicável a decisões automatizadas — usuário tem direito
a explicação/contestação de decisão automatizada relevante?]

Custo de inferência:
- Custo estimado por interação: [R$/uso]
- Volume esperado: [interações/mês]
- Custo mensal estimado: [Total]
- O que acontece se o volume for muito maior que o esperado: [Rate limit? Cache?]

Latência:
- Tempo de resposta esperado (p50/p95): [Ex: p50 < 2s, p95 < 5s]
- Comportamento durante espera: [Streaming de resposta? Loading state? Ver
  seção de estados de tela no `prd-template.md`]
```

---

## 3. Checklist resumido — Feature com IA pronta para especificar

- [ ] Nível de autonomia definido e justificado pelo risco da tarefa
- [ ] Guardrails de conteúdo e de ação explícitos, não implícitos
- [ ] Plano de detecção e mitigação de alucinação/erro definido
- [ ] Eval set existe com meta de qualidade mínima antes do lançamento
- [ ] Processo de versionamento de prompt/modelo com rollback definido
- [ ] Disclosure de IA e controle do usuário (editar/regenerar/feedback) resolvidos
- [ ] Dados sensíveis enviados ao modelo foram revisados (privacidade/compliance)
- [ ] Custo de inferência estimado e sustentável no volume esperado
- [ ] Fallback definido para quando o modelo/API estiver indisponível

---

## 4. Nota sobre honestidade de expectativa

Ao comunicar a feature para stakeholders, evite prometer 100% de precisão —
isso é tecnicamente enganoso para a maioria dos sistemas de IA generativa atuais.
Comunique em termos de taxa de qualidade e plano de melhoria contínua:
"a feature acerta em ~X% dos casos testados, com plano de revisão trimestral
do eval set" é uma expectativa honesta; "a IA vai resolver isso perfeitamente"
não é.
