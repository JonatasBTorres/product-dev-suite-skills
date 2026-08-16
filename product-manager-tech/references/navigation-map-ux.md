# Navigation Map e Fluxos de UX (NAV-XXX)

> Como estruturar e documentar a navegação de um produto: sitemap para web, fluxo de telas para mobile, e a anotação de fluxo de UX que acompanha isso. Use para "mapeie a navegação", "desenhe o fluxo de telas", ou "como o usuário chega do ponto A ao ponto B nesse produto".

Nota de calibração: em produtos pequenos/iniciais, um navigation map cobrindo só os fluxos principais (onboarding, ação central do produto) já basta. Em produtos com múltiplos squads mexendo em áreas diferentes, um navigation map completo e mantido atualizado evita que times dupliquem telas ou criem becos sem saída na navegação sem perceber.

---

## Sitemap (web) vs. Fluxo de telas (mobile) — a diferença que importa

- **Sitemap**: hierarquia de páginas acessíveis, tipicamente por URL/rota — a pergunta central é "que página existe e como se chega nela via menu/link". Estrutura mais em árvore.
- **Fluxo de telas** (mobile ou apps com navegação por estado): sequência de estados/telas conectadas por ações do usuário — a pergunta central é "que ação leva a que próxima tela", incluindo estados modais, overlays e navegação não-linear (voltar, deep links). Estrutura mais em grafo do que em árvore.

Produtos híbridos (web app com navegação por estado, tipo um SPA) geralmente precisam dos dois: o sitemap para SEO/compartilhamento de URL, o fluxo de telas para entender a experiência real dentro de uma sessão.

---

## Mermaid vs. árvore em texto — qual usar em qual escala

Um flowchart Mermaid funciona bem para poucos fluxos críticos específicos (5-15 nós), onde a direção das setas e as condições de transição são o que importa. **Para o sitemap completo de um produto real — frequentemente 40, 60, 100+ telas — um Mermaid flowchart desse tamanho vira um emaranhado ilegível.** Nesse caso, prefira uma árvore em texto simples:

```
/                                    (público) → redirect conforme sessão
├── AUTH (público)
│   ├── /login
│   ├── /register
│   └── /forgot-password
├── /dashboard                       (autenticado)
├── /modulo-x                        (autenticado)
│   ├── /modulo-x/novo
│   └── /modulo-x/[id]
│       ├── /modulo-x/[id]/resumo    ← rota padrão
│       └── /modulo-x/[id]/detalhe
```

Marque o nível de acesso necessário ao lado de cada rota (ex: `(público)`, `(autenticado)`, ou as siglas de papel relevantes ao produto) diretamente na árvore.

**Regra prática:** use a árvore em texto para o inventário completo de rotas/telas (a "planta baixa" do produto); reserve o Mermaid para os 3-5 fluxos de navegação mais críticos.

### Esqueleto Mermaid (fluxos críticos específicos)

```
%% Navigation Map / Fluxo de Telas - [Nome do Produto/Fluxo]
%% Cada nó carrega seu ID NAV-XXX

flowchart TD
    NAV001["NAV-001: Tela inicial<br/>(origem: REQ-XXX)"]
    NAV002["NAV-002: Onboarding<br/>(origem: REQ-XXX)"]
    NAV003["NAV-003: Tela principal / Home<br/>(origem: REQ-XXX)"]
    NAV004["NAV-004: Ação central do produto<br/>(origem: REQ-XXX)"]
    NAV005["NAV-005: Estado de erro<br/>(sem dado / falha)"]
    NAV006["NAV-006: Confirmação de sucesso"]

    %% Nó pertencente a um fluxo crítico documentado:
    %% NAV007["NAV-007: Tela de pagamento<br/>(origem: REQ-XXX | fluxo: FLOW-PAYMENT-001)"]

    NAV001 -->|"novo usuário"| NAV002
    NAV001 -->|"usuário existente"| NAV003
    NAV002 -->|"onboarding completo"| NAV003
    NAV003 -->|"inicia ação central"| NAV004
    NAV004 -->|"falha"| NAV005
    NAV004 -->|"sucesso"| NAV006
    NAV005 -->|"tenta novamente"| NAV004
    NAV006 -->|"volta"| NAV003
```

Sempre que um nó pertencer a um fluxo crítico documentado (`FLOW-XXX`, ver `fluxos-criticos-negocio.md`), inclua "fluxo: FLOW-XXX" no rótulo do nó — sem isso, o navigation map e o documento de fluxo crítico descrevem a mesma tela sem saber que são a mesma coisa.

---

## O que documentar em cada nó (`NAV-XXX`)

- **Nome e propósito** da tela em uma frase.
- **Entradas**: de onde o usuário pode chegar aqui (outras telas, notificação, deep link externo).
- **Saídas**: para onde o usuário pode ir a partir daqui, e a ação que dispara cada saída.
- **Estado de erro/vazio**: o que acontece quando não há dado, ou quando algo falha — frequentemente esquecido no mapa inicial e descoberto tarde no desenvolvimento.
- **Requisito de origem**: qual `REQ-XXX` do PRD justifica essa tela existir — se nenhum requisito justifica, é sinal de escopo crescendo sem controle.

---

## Fluxos críticos como narrativa linear (terceiro formato)

Além do sitemap e do Mermaid, os 3-5 fluxos mais importantes do produto se beneficiam de uma **narrativa linear** que interlaça telas com eventos de sistema/backend na ordem exata em que acontecem — inclusive o que roda fora da UI (webhook, job assíncrono, notificação):

```
/tela-inicial (ação do usuário)
  → Evento de backend (ex: webhook recebido, job enfileirado)
  → Estado atualizado (ex: registro marcado como "pendente")
  → Notificação ao usuário
  → /tela-de-acompanhamento
  → Ação de confirmação
  → Evento de conclusão (ex: webhook de confirmação)
  → /tela-final (estado atualizado em tempo real)
```

Use para fluxos que cruzam sistema e produto de forma não-óbvia (pagamento, aprovação assíncrona, qualquer coisa com retry).

---

## Inventário completo de telas

```
| # | Rota | Título da Tela | Papel/Acesso |
|---|---|---|---|
```

Para produtos com muitas telas, esta tabela também é o lugar mais fácil de auditar consistência.

## Matriz de controle de acesso por rota

Quando o produto tem mais de dois papéis de usuário, uma anotação inline na árvore não é suficiente — vale uma matriz dedicada, papel × rota, especialmente para nomear **exceções deliberadas**:

```
| Rota específica | Papel A | Papel B | Papel C | Observação |
|---|---|---|---|---|
```

**Regra prática:** nunca agrupe rotas numa única linha se qualquer uma delas tiver uma exceção — escreva a linha específica, mesmo que repita "mesma regra" várias vezes.

---

## Framework de decisão: nível de detalhe do mapa

| Situação | Nível de detalhe |
|---|---|
| Fluxo principal do produto (onboarding, ação central) | Detalhado: todo estado, incluindo erro/vazio |
| Fluxos secundários (configurações, telas de suporte) | Nível de sitemap simples — existência e hierarquia |
| Fluxo com implicação de compliance/segurança | Detalhado + ligação direta ao `fluxos-criticos-negocio.md` e ao handoff de arquitetura |

---

## Antipadrões comuns

- **Mapear só o caminho feliz**, sem estados de erro/vazio/loading.
- **Navigation map que nunca é atualizado após o lançamento** — vira artefato histórico enquanto o produto real diverge dele.
- **Tela sem requisito de origem identificável** — sinal de escopo que cresceu sem passar pela disciplina de não-objetivos do PRD.
- **Confundir wireframe (como a tela parece) com navigation map (como as telas se conectam)** — este documento cobre o segundo; detalhamento visual de UI é responsabilidade de design.
- **Tentar caber um sitemap de 60+ telas em um único diagrama Mermaid** — use a árvore em texto para esse volume.
- **Agrupar rotas numa única linha da matriz de acesso quando uma delas tem exceção** — escreva a linha específica mesmo que repita a regra geral.

Sempre que um nó nascer, adicione seu `NAV-XXX` ao índice mestre de rastreabilidade (`indice-mestre-rastreabilidade-template.md`).
