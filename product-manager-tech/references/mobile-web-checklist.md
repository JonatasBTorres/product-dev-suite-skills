# Checklist de Produto — Apps Web e Mobile

Use antes de qualquer lançamento (MVP, feature, hotfix relevante).

---

## ✅ Checklist Web (Aplicações Web / SPA / SSR)

### Funcionalidade
- [ ] Todos os critérios de aceite das stories foram validados em staging
- [ ] Fluxos críticos testados em pelo menos 2 browsers (Chrome, Firefox ou Safari)
- [ ] Comportamento responsivo validado: desktop (1280px+), tablet (768px), mobile (375px)
- [ ] Estados de carregamento (skeleton/spinner) implementados
- [ ] Estados de erro implementados com mensagens úteis ao usuário
- [ ] Zero state (tela vazia) implementado e não quebrado
- [ ] Funcionalidades com permissão validadas por perfil de usuário

### Performance
- [ ] Lighthouse score > 80 em Performance, Acessibilidade e SEO
- [ ] Imagens otimizadas (WebP, lazy loading implementado)
- [ ] Fontes carregadas com `font-display: swap`
- [ ] Sem bloqueio de render por scripts desnecessários no `<head>`
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Segurança
- [ ] Nenhuma chave de API ou credencial exposta no frontend
- [ ] Headers de segurança configurados (CSP, HSTS, X-Frame-Options)
- [ ] Inputs de formulário com sanitização e validação server-side
- [ ] HTTPS em todos os ambientes

### Acessibilidade (WCAG 2.1 AA)
- [ ] Contraste de texto ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande
- [ ] Todos os elementos interativos navegáveis por teclado
- [ ] Atributos `alt` em todas as imagens semânticas
- [ ] Formulários com labels associadas (`for` / `aria-labelledby`)
- [ ] Foco visível em elementos interativos
- [ ] Modais com gerenciamento de foco (focus trap)

### Analytics e Monitoramento
- [ ] Eventos de pageview configurados
- [ ] Eventos de ação principais mapeados e disparando corretamente
- [ ] Error tracking ativo (Sentry ou similar)
- [ ] Alertas de disponibilidade configurados
- [ ] Dashboard de métricas atualizado com novos KPIs se necessário

### Comunicação e Go-Live
- [ ] Feature flag configurada para rollout gradual
- [ ] % de rollout inicial definida (ex: 5% → 25% → 100%)
- [ ] Plano de rollback documentado e testado
- [ ] Time de suporte informado sobre a feature e fluxos de escalonamento
- [ ] Release notes preparadas (internas e externas se necessário)

---

## ✅ Checklist Mobile (iOS e Android)

### Funcionalidade
- [ ] Testado nos devices mais comuns do público-alvo (ver analytics)
- [ ] Testado na versão mínima de OS suportada (iOS e Android)
- [ ] Comportamento em modo retrato e paisagem validado
- [ ] Comportamento com teclado aberto testado (campos não ficam ocultos)
- [ ] Funcionamento com notch, Dynamic Island e punch-hole cameras
- [ ] Suporte a Dark Mode testado (se implementado)
- [ ] Acessibilidade com VoiceOver (iOS) e TalkBack (Android) testados

### Performance
- [ ] Tempo de inicialização do app (cold start) < 3s
- [ ] Sem janks de animação (60fps ou 120fps em devices compatíveis)
- [ ] Imagens carregadas com lazy loading e cache correto
- [ ] Consumo de memória monitorado (sem memory leaks visíveis)
- [ ] Comportamento em modo de baixo consumo de energia testado

### Offline e Conectividade
- [ ] Comportamento sem internet definido e implementado
- [ ] Dados críticos cacheados localmente (se aplicável)
- [ ] Sincronização ao reconectar implementada (se aplicável)
- [ ] Mensagem de "sem conexão" exibida adequadamente

### Permissões do dispositivo
- [ ] Permissões solicitadas no momento certo (contextual, não no lançamento)
- [ ] Fluxo quando permissão é negada implementado
- [ ] Fluxo quando permissão é revogada nas configurações implementado
- [ ] Permissões listadas nos manifestos (AndroidManifest.xml / Info.plist)

### Notificações Push
- [ ] Permissão de notificação solicitada com contexto claro de valor
- [ ] Deep links funcionando ao abrir notificação
- [ ] Notificações chegando em foreground, background e app fechado
- [ ] Opt-out de notificações respeitado

### Publicação nas Lojas
- [ ] Screenshots atualizados para as telas novas
- [ ] Descrição do app atualizada (se necessário)
- [ ] What's New (release notes) escritas em linguagem de usuário
- [ ] Metadados revisados (categorias, palavras-chave para ASO)
- [ ] Build testada via TestFlight (iOS) e Internal Testing (Android)
- [ ] Versão/build number incrementados corretamente
- [ ] Política de privacidade atualizada (se novos dados são coletados)
- [ ] Conformidade com diretrizes da App Store e Play Store verificada
- [ ] App Review Information preenchida (App Store)

### Analytics Mobile
- [ ] Eventos de screen view configurados
- [ ] Eventos de ação implementados e testados
- [ ] Crash reporting ativo (Firebase Crashlytics ou similar)
- [ ] Propriedades de usuário relevantes configuradas

---

## ✅ Checklist de Segurança — Dados de Usuário

- [ ] Dados pessoais sensíveis não logados (PII: CPF, telefone, e-mail, senha)
- [ ] Senhas armazenadas com hash seguro (bcrypt / argon2)
- [ ] Tokens JWT com expiração adequada
- [ ] Refresh token rotation implementado
- [ ] Rate limiting configurado em endpoints de autenticação
- [ ] CORS configurado corretamente
- [ ] Validação de entrada no servidor (nunca só no cliente)
- [ ] Proteção contra CSRF em formulários
- [ ] SQL injection: uso de queries parametrizadas verificado
- [ ] Dados de usuário conforme LGPD: consentimento, coleta mínima, direito de exclusão

---

## ✅ Checklist de Lançamento — Comunicação

### Interno
- [ ] Squad informado sobre o lançamento
- [ ] Time de suporte/CS treinado e com FAQ atualizado
- [ ] Time de vendas informado (se relevante para proposta comercial)
- [ ] Release notes internas publicadas (Notion, Confluence, etc.)

### Externo
- [ ] Release notes públicas (changelog público, se aplicável)
- [ ] In-app announcement ou tooltip configurado (se relevante)
- [ ] E-mail para base de usuários preparado (se relevante)
- [ ] Comunicação em redes sociais / blog agendada (se aplicável)
- [ ] Central de ajuda atualizada com novos fluxos
