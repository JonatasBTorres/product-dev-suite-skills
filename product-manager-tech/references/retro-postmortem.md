# Retrospectivas e Postmortem — Guia do Product Manager

> Sem fechar o ciclo de aprendizado, o time repete os mesmos erros a cada sprint/lançamento. Esta referência cobre três formatos: retro de sprint (cadência curta, time), post-launch review (resultado de uma feature específica) e postmortem de incidente (algo deu errado em produção).

---

## 1. Retrospectiva de Sprint

### Formato: Start / Stop / Continue
```
RETRO — Sprint [N] — [Data]
Participantes: [Time]

COMEÇAR A FAZER (Start):
- [O que deveria existir e não existe ainda]

PARAR DE FAZER (Stop):
- [O que está atrapalhando e deveria acabar]

CONTINUAR FAZENDO (Continue):
- [O que está funcionando bem e vale manter]

Ações combinadas para o próximo sprint:
| Ação | Owner | Prazo |
|---|---|---|
| [Ação concreta e pequena] | [Nome] | [Próximo sprint] |
```

### Formato alternativo: 4Ls (Liked / Learned / Lacked / Longed for)
```
GOSTEI (Liked): [O que foi positivo na experiência do time]
APRENDI (Learned): [Novo conhecimento/insight do sprint]
FALTOU (Lacked): [O que estava faltando — ferramenta, informação, tempo]
DESEJEI (Longed for): [O que o time gostaria de ter, mesmo que hoje pareça inatingível]
```

### Regras para retros que geram mudança real
```
- No máximo 3 ações combinadas por retro — mais que isso, nada é implementado de fato
- Toda ação tem owner nomeado — "o time vai fazer" não é um owner
- Revisar as ações da retro anterior no início da próxima (accountability)
- Ambiente psicologicamente seguro: é sobre o processo, não sobre culpar pessoas
```

---

## 2. Post-Launch Review (revisão pós-lançamento de feature)

Use de 2 a 6 semanas após o lançamento de uma feature relevante, comparando a hipótese do PRD com o resultado real.

```
POST-LAUNCH REVIEW — [Nome da feature]
Data do lançamento: [DD/MM] | Data desta revisão: [DD/MM]

## Hipótese original (do PRD)
"Acreditávamos que [X] ia gerar [resultado Y]"

## O que realmente aconteceu
| Métrica | Meta (PRD) | Resultado real | Distância |
|---|---|---|---|
| [Métrica primária] | [Meta] | [Real] | [+/- %] |
| [Métrica guardrail] | [Não piorar] | [Real] | [OK / Piorou] |

## Adoção
- % de usuários elegíveis que usaram a feature: [Valor]
- Motivo de baixa adoção, se houver: [Hipótese com evidência — não suposição]

## O que aprendemos
- [Aprendizado 1 — o que confirma ou refuta a hipótese original]
- [Aprendizado 2]

## Decisão
[ ] Manter como está
[ ] Iterar — o quê: [...]
[ ] Descontinuar — motivo: [...]

## O que faríamos diferente da próxima vez
- [Aprendizado de processo, não só de produto]
```

---

## 3. Postmortem de Incidente (Blameless)

Use após qualquer incidente relevante em produção (indisponibilidade, bug crítico, vazamento de dado, rollback de emergência).

### Princípio central: blameless
```
O objetivo é entender POR QUE o sistema (processo, código, comunicação) permitiu
o erro — não quem cometeu o erro. Qualquer pessoa no mesmo contexto, com a mesma
informação disponível no momento, poderia ter tomado a mesma decisão.
Linguagem proibida no documento: "fulano esqueceu de", "erro de fulano".
Linguagem correta: "o processo não tinha uma verificação que pegasse isso".
```

### Template
```
POSTMORTEM — [Nome/ID do incidente]
Data do incidente: [DD/MM/AAAA HH:MM] | Severidade: Crítico / Alto / Médio
Autor: [Nome] | Revisores: [Nomes]

## Resumo (TL;DR)
[2-3 frases: o que aconteceu, por quanto tempo, quem foi afetado]

## Impacto
- Usuários afetados: [Número/%, ou "todos os usuários de X"]
- Duração: [Tempo total desde início até resolução]
- Impacto de negócio: [Receita perdida, SLA violado, dados afetados]

## Linha do tempo
| Horário | Evento |
|---|---|
| [HH:MM] | [Ex: Deploy da versão X.Y realizado] |
| [HH:MM] | [Ex: Alertas de erro começam a disparar] |
| [HH:MM] | [Ex: Time identifica causa raiz] |
| [HH:MM] | [Ex: Rollback iniciado] |
| [HH:MM] | [Ex: Serviço normalizado] |

## Causa raiz (5 Whys)
1. Por que o incidente aconteceu? [Resposta]
2. Por que isso foi possível? [Resposta]
3. Por que não foi pego antes? [Resposta]
4. Por que o processo/teste não cobria isso? [Resposta]
5. Por que (causa raiz sistêmica)? [Resposta final — geralmente é aqui que mora
   o problema real, não nas primeiras respostas]

## O que funcionou bem
- [O que ajudou a detectar/resolver mais rápido]

## O que não funcionou
- [Gaps no processo, alerta, comunicação]

## Ações de melhoria
| Ação | Tipo | Owner | Prazo |
|---|---|---|---|
| [Ação técnica — ex: adicionar teste de regressão] | Prevenção | [Nome] | [Data] |
| [Ação de processo — ex: checklist de deploy] | Prevenção | [Nome] | [Data] |
| [Ação de detecção — ex: novo alerta] | Detecção | [Nome] | [Data] |

## Comunicação
- Usuários foram informados? [Sim/Não — como]
- Status page atualizada? [Sim/Não]
```

### Checklist de postmortem de qualidade
- [ ] Linguagem é blameless (sistema/processo, não pessoa)
- [ ] Causa raiz vai além do sintoma óbvio (aplicou 5 Whys de verdade)
- [ ] Toda ação de melhoria tem owner e prazo — sem isso, o postmortem não previne recorrência
- [ ] Documento é compartilhado abertamente com o time (esconder postmortem impede aprendizado organizacional)

---

## Checklist geral — Fechamento de ciclo está saudável quando:
- [ ] Toda sprint termina com retro e no máximo 3 ações realistas
- [ ] Toda feature relevante tem revisão pós-lançamento comparando hipótese vs. real
- [ ] Todo incidente crítico gera postmortem blameless com ações rastreáveis
- [ ] Ações de postmortems anteriores são checadas antes de fechar como "resolvido"
