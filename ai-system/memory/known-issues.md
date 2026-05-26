# Known Issues

## Estrutura

Este arquivo registra:
- bugs recorrentes
- limitações conhecidas
- decisões técnicas importantes
- riscos estruturais
- problemas temporários
- débitos técnicos

---

## Regras

- Sempre documentar problemas recorrentes
- Registrar causa provável quando conhecida
- Registrar impacto
- Registrar solução aplicada
- Registrar riscos futuros

---

## Objetivo

Criar memória técnica contínua para:
- evitar repetição de erros
- acelerar debug
- melhorar estabilidade
- aumentar contexto dos agentes

---

## Issues Registradas

---

### [2026-05-21] BUG-001 — Botão de notificações não disparava prompt de permissão

**Sintoma:** Ícone 🔔 visível no header mas clique não abria prompt de permissão.

**Causa raiz:** `ativarNotificacoes` chamava `pedirPermissaoNotificacao()` (função auxiliar async), que por sua vez chamava `Notification.requestPermission()`. Browsers como iOS Safari exigem que `requestPermission()` seja chamado diretamente do handler de clique do usuário — a cadeia `onClick → useCallback → função auxiliar → requestPermission()` quebra esse requisito. Nenhum erro visível no console.

**Impacto:** Usuário não conseguia ativar notificações manualmente. Botão 🔕 era `disabled`, sem instrução.

**Solução aplicada:** Chamar `Notification.requestPermission()` diretamente dentro do `useCallback`, sem passar por função auxiliar. Botão 🔕 (denied) agora mostra instrução iOS/Android ao clicar.

**Risco futuro:** Em PWAs iOS instalados, o Safari pode não suportar a Notification API — tratar `'unsupported'` sempre.

---

### [2026-05-21] BUG-002 — Compromissos fixos do onboarding não apareciam na aba Rotina

**Sintoma:** Usuário informava "trabalho das 6h às 15h de segunda a sexta" no onboarding, mas a aba Rotina ficava vazia.

**Causa raiz:** `concluirOnboarding` salvava os compromissos fixos apenas na `memoria.rotina.comprometida` como array de strings (texto legível para a Flora), mas não criava objetos estruturados no `plano`. `RoutineView` e `WeekView` leem `plano?.compromissos || []` — com `plano = null`, a rotina fica vazia.

**Impacto:** Funcionalidade core quebrada — o principal valor do onboarding (pré-popular a rotina) não funcionava.

**Solução aplicada:** Ao concluir o onboarding com compromissos fixos preenchidos, salvar uma flag `fluxo_compromissos_fixos_pendentes` no localStorage. Um `useEffect` detecta a flag após o app renderizar e envia automaticamente uma mensagem `[Sistema]` para a Flora criar os compromissos recorrentes no plano usando linguagem natural (mais confiável que regex).

**Risco futuro:** Se o servidor estiver offline no momento do onboarding, a mensagem falha silenciosamente. Considerar retry ou fallback local no futuro.

---

### [2026-05-21] DECISÃO — Preparação para deploy Railway + Vercel

**O que foi feito:**
- `client/.env.production`: `VITE_API_URL=https://fluxo-app-production.up.railway.app`
- `client/.env.development`: `VITE_API_URL=` (vazio → usa proxy do Vite para localhost:3001)
- `API_URL = import.meta.env.VITE_API_URL || ''` adicionado no topo de `App.jsx` e `EstadoSemana.jsx`
- Todos os fetches hardcoded `/api/...` → `` `${API_URL}/api/...` `` (3 no total: processar/stream, plano-acao, estado-semana)
- CORS do servidor atualizado: `cors()` sem restrições → lista explícita (`localhost:5173`, `localhost:3000`, `*.vercel.app`)
- `.gitignore` atualizado: adicionados `client/.env`, `client/.env.local`, `client/.env.production`
- `server/Procfile` criado: `web: node index.js`

**Riscos futuros:**
- Quando a URL exata do Vercel for confirmada, adicionar ela explicitamente em `origensPermitidas` no CORS
- Variáveis do Vercel precisam ser configuradas no painel (não via arquivo — `.env.production` está no .gitignore)
- `client/.env.development` é seguro commitar (valor vazio), mas `.env.production` NÃO vai pro GitHub

---

### [2026-05-21] DECISÃO — Geolocalização removida temporariamente

**Motivo:** Feature adicionada prematuramente sem validação de UX. Adicionava complexidade (3 estados, 2 effects, 1 useCallback), poluía o header e dependia de permissões problemáticas em iOS.

**O que foi removido:** Estados `geoAtivo`, `localAtual`, `geoPermissao`; callbacks `processarLocalizacao`, `toggleGeolocalizacao`; 2 useEffects; botão 📍 do header; função `mostrarInstrucaoLocalizacao`.

**Para reativar:** Implementar como feature dedicada com UX pensada (não apenas um botão no header).

---

### [2026-05-21] DECISÃO — Migração localStorage → Supabase (autenticação Google)

**O que foi implementado:**

**Backend (server/):**
- `server/services/supabase.js` — cliente Supabase com service role key (nunca expor no frontend)
- `server/middleware/auth.js` — middleware `autenticarUsuario` que valida JWT via `supabase.auth.getUser(token)`
- `server/services/dadosUsuario.js` — CRUD completo: `carregarDadosUsuario`, `salvarPlano`, `salvarMemoria`, `salvarHistorico`, `salvarPerfil`, `salvarTarefasConcluidas`
- Todos os endpoints protegidos com `autenticarUsuario` (incluindo SSE streaming)
- Novos endpoints: `GET /api/usuario/dados`, `POST /api/usuario/tarefas-concluidas`, `POST /api/usuario/salvar-plano`, `POST /api/usuario/salvar-memoria`, `POST /api/usuario/salvar-perfil`
- Save no Supabase em background após cada resposta (não bloqueia SSE)
- CORS: adicionado `https://fluxo-app-zeta.vercel.app` explicitamente além do regex `*.vercel.app`

**Frontend (client/):**
- `client/src/lib/supabase.js` — cliente Supabase público (anon key)
- `client/src/components/auth/Login.jsx` — tela de login com Google via `@supabase/auth-ui-react`
- `App.jsx` — sessão Supabase (`sessao`, `carregandoAuth`), auth guard (loading → login → onboarding → app), botão logout, `carregarDadosUsuario`, `getAuthHeaders`, `sincronizarTarefasConcluidas`, migração do localStorage

**Decisões arquiteturais:**
- Estado continua sendo enviado no body de cada request (mantém compatibilidade, evita refatorar `enviarMensagem`)
- localStorage mantido como cache local — Supabase é fonte de verdade multi-dispositivo
- Migração aditiva (upsert): se falhar, pode ser re-executada com segurança
- `carregarDadosUsuario` usa refs para evitar dependência circular com `migrarLocalStorageParaSupabase`

**Riscos futuros:**
- PWA offline com JWT expirado: usuário verá login screen ao reconectar. Não usar `signOut()` automático — deixar o Supabase renegociar o token.
- historico_display não é salvo no carregamento inicial (só via streaming). Verificar se há regressão no histórico cross-device.
- `@supabase/auth-ui-react` pode ter breaking changes — fixar versão se necessário.

**Variáveis de ambiente necessárias (NUNCA commitar):**
- `server/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

### [2026-05-21] BUG-003 — "Token inválido ou expirado" após onboarding

**Sintoma:** Usuário completa onboarding e tenta conversar com a Flora — recebe erro 401 "Token inválido ou expirado".

**Causa raiz:** `getAuthHeaders()` chamava `supabase.auth.getSession()` sem verificar o tempo de expiração do token. Durante o onboarding o token pode estar prestes a vencer (< 60s) ou já ter vencido. Nenhum refresh era feito antes de enviar o token — o backend rejeitava com 401. Sem retry, o erro chegava direto ao usuário.

**Impacto:** Funcionalidade core quebrada — o primeiro uso após login/onboarding falhava silenciosamente ou exibia mensagem de erro técnica.

**Solução aplicada:**
1. `getAuthHeaders()` agora verifica `session.expires_at`: se token expira em < 60s (ou se não há sessão), chama `supabase.auth.refreshSession()` antes de retornar o header.
2. `fetchComAuth()` — nova função que envolve todos os fetch autenticados: se receber 401, tenta refresh + retry automático uma única vez.
3. Todos os fetch que usavam `getAuthHeaders()` diretamente foram migrados para `fetchComAuth()`.
4. `server/middleware/auth.js` agora loga o erro exato do Supabase e retorna códigos de erro (`NO_TOKEN`, `INVALID_TOKEN`, `USER_NOT_FOUND`, `AUTH_ERROR`) para facilitar debug futuro.

**Risco futuro:** O retry é feito apenas uma vez. Se o refresh falhar (sessão completamente inválida), o usuário precisará refazer o login manualmente — comportamento correto e esperado.

---

### [2026-05-21] BUG-004 — Loop infinito de autenticação após login com Google

**Sintoma:** Usuário faz login com Google, começa o onboarding, e é redirecionado de volta à tela de login.

**Causa raiz:** Três problemas sobrepostos:
1. `carregarDadosUsuario` disparado duas vezes em paralelo: `getSession().then()` e `onAuthStateChange` ambos a chamavam sem deduplição. No fluxo OAuth, Supabase dispara `INITIAL_SESSION` → `SIGNED_IN` em sequência. A primeira chamada, se recebia 401 (token ainda processando), chamava `refreshSession()` → disparava `TOKEN_REFRESHED` → terceira chamada → loop.
2. `onAuthStateChange` ignorava o tipo de evento (`_event`). Quando o evento era `SIGNED_OUT` ou `INITIAL_SESSION` com `session = null` (antes do OAuth terminar), `setSessao(null)` era chamado, mandando o usuário de volta ao login no meio do fluxo OAuth.
3. `redirectTo={window.location.origin}` no Login.jsx retornava URL sem barra final, que pode ser rejeitada pelo Supabase dependendo da configuração de Redirect URLs.

**Solução aplicada:**
- `getSession().then()` agora apenas libera `carregandoAuth` — não chama mais `carregarDadosUsuario`
- `onAuthStateChange` filtra por evento: só chama `carregarDadosUsuario` em `SIGNED_IN` e `INITIAL_SESSION` (com sessão presente). Trata `SIGNED_OUT` explicitamente zerando todo o estado.
- `carregarDadosUsuario` protegido com `carregandoDadosRef` — chamadas simultâneas são descartadas (guard in-flight). Erros 401 são logados mas nunca causam logout.
- `redirectTo` corrigido para incluir barra final (`${window.location.origin}/`) com fallback SSR-safe.

**Configuração obrigatória no Supabase (painel → Authentication → URL Configuration):**
- Site URL: `https://fluxo-app-zeta.vercel.app`
- Redirect URLs: `https://fluxo-app-zeta.vercel.app/`, `https://fluxo-app-zeta.vercel.app/**`, `http://localhost:5173`, `http://localhost:5173/**`

**Risco futuro:** Os `console.log` de debug foram mantidos intencionalmente para facilitar diagnóstico em produção. Remover quando o fluxo estiver estável.

---

### [2026-05-22] BUG-005 — Token inválido ao chamar a Flora após login com Google

**Sintoma:** Login funciona, sessão Supabase existe no cliente, mas ao enviar mensagem para a Flora o backend rejeita com 401 "Token inválido ou expirado".

**Causa raiz:** Race condition: imediatamente após o OAuth redirect, `getSession()` pode retornar `null` (sessão ainda propagando). `getAuthHeaders()` interpretava isso como ausência de sessão e tentava `refreshSession()` — que também falhava porque o token ainda não estava disponível localmente. O resultado era uma requisição sem header `Authorization` ou com token inválido.

Problema secundário: o middleware `autenticarUsuario` estava no endpoint SSE (`/api/processar/stream`), mas o timing entre `res.setHeader()`, `res.flushHeaders()` e a validação do token tornava difícil diagnosticar onde exatamente ocorria a falha.

**Solução aplicada:**
1. Validação de token movida para inline no handler SSE — elimina ambiguidade de middleware e garante que a auth ocorre ANTES de `res.flushHeaders()`.
2. Logs de debug adicionados em 3 camadas.
3. Handler SSE agora retorna 401 puro (JSON) se auth falhar — antes de qualquer `res.flushHeaders()`.

**Risco futuro:** Logs de debug foram mantidos intencionalmente. Remover quando o fluxo estiver estável em produção.

---

### [2026-05-22] BUG-007 — Flora citava compromissos passados como futuros

**Sintoma:** Flora às 07h13 dizia "você tem academia às 5h30 e trabalho às 6h30" — ambos já haviam passado e estavam concluídos.

**Causa raiz:** `_formatarAgendaDia` em `server/services/flora.js` formatava todos os compromissos do dia de forma idêntica, sem nenhuma indicação de se já haviam ocorrido.

**Solução aplicada:** Nova função `_classificarCompromisso`; marcadores `[JÁ PASSOU]`/`[AGORA]` adicionados; novo `blocoContextoTemporal` no system prompt.

---

### [2026-05-22] DECISÃO — Chat limpo a cada sessão (Opção A)

**Decisão de produto:** Chat visual limpa a cada login. Flora demonstra memória contextual nas respostas, não pelo histórico visual.

**Filosofia:** "A Flora não guarda conversas. Ela guarda entendimento."

---

### [2026-05-22] DECISÃO — Badge âmbar de pendências (substituiu ScoreCompact)

**Problema:** ScoreCompact mostrava círculo vermelho com "0" quando sem plano cadastrado.

**Solução:** Badge âmbar com `totalPendentesHoje`. Some quando sem pendências. Aparece apenas quando `plano` existe E `totalPendentesHoje > 0`.

---

### [2026-05-22] BUG-006 — Dados não sincronizados entre dispositivos (tabelas Supabase vazias)

**Sintoma:** Usuário faz onboarding em um dispositivo, abre em outro e refaz do zero.

**Causa raiz:** `concluirOnboarding` não salvava no Supabase; shadow variable destruía `userId` no SSE; condição fraca em `carregarDadosUsuario`.

**Solução aplicada:** `concluirOnboarding` chama `fetchComAuth('/api/usuario/salvar-perfil')`; condição usa `dados.perfil?.nome`; logs `[LOAD]`/`[SAVE]` adicionados.

---

### [2026-05-24] BUG-008 — EstadoSemana: análise da IA nunca rodava (401 silencioso)

**Solução:** Removido `autenticarUsuario` do endpoint `/api/estado-semana` — só lê dados do body. Adicionada função `calcularMetricasSemana`.

---

### [2026-05-24] DECISÃO — Tooltip no contador de pendências

Badge convertido para `<button>` com popover React mostrando breakdown tarefas vs compromissos.

---

### [2026-05-24] DECISÃO — Modal de perfil substituiu botão UserCircle direto

`ModalPerfil` com avatar, nome, email, nível, pontos, streak. Logout exclusivo dentro do modal.

---

### [2026-05-24] DECISÃO — Calendário mobile: cores sólidas e texto maior

`bgSolido`, `bordaSolida`, `corTextoSolido` em `categorias.js`. RoutineView usa `style` direto.

---

### [2026-05-24] DECISÃO — Aba Configurações via modal do perfil

`ModalConfiguracoes` com seções: Aparência, Notificações, Flora, Privacidade. Persistência via campo `configuracoes` JSONB no Supabase.

---

### [2026-05-24] DECISÃO — Calendário mobile: spacing e hierarquia (v2)

`ALTURA_HORA`: 48px → 60px. Melhorias de tipografia e separadores.

---

### [2026-05-24] BUG-009 — Flora inventava compromissos baseada em blocoRotina

**Causa raiz:** Ordem errada dos blocos no prompt; ausência de regra SOURCE OF TRUTH; tarefas invisíveis; INICIO hardcoded em 6h.

**Solução:** Reordenação dos blocos; regra SOURCE OF TRUTH obrigatória; tarefas injetadas; INICIO corrigido para 1h.

---

### [2026-05-24] BUG-010 — Compromissos manuais não persistiam no Supabase

**Solução:** `salvarPlanoNoSupabase` fire-and-forget chamada em `adicionarCompromisso`, `editarItem`, `deletarItem`.

---

### [2026-05-24] BUG-011 — Flora presumia duração de compromissos sem perguntar

**Solução:** `REGRA DE DURAÇÃO` adicionada em `flora.js` — obriga perguntar antes de criar compromisso sem duração explícita.

---

### [2026-05-24] BUG-012 — Modal de edição sem campo de horário final

**Solução:** `ModalItem` em `RoutineView.jsx` expandido com `horaFim` e `duracao`. Grid 2 colunas (Início / Fim).

---

### [2026-05-24] BUG-013 — Ritual de fechamento duplicado e tag vazava para UI

**Solução:** Filtro de sistema em `enviarMensagem`; flag checkin persistida no localStorage com chave por data.

---

### [2026-05-26] BUG-014 — Flora reagendando compromissos pontuais automaticamente

**Solução:** `REGRA SOBRE REAGENDAMENTO` adicionada em `flora.js` — proíbe mover compromisso passado sem pedido explícito.

---

### [2026-05-26] BUG-015 — Refazer onboarding não limpava Supabase

**Sintoma:** Usuário clica "Editar perfil" → "Refazer onboarding", confirma. App recarrega e mostra diretamente o app principal (não o onboarding), porque `carregarDadosUsuario` encontra `dados.perfil?.nome` no Supabase em ~500ms e restaura `onboardingFeito=true`.

**Causa raiz:** `resetarPerfil` em `App.jsx` limpava apenas o localStorage e chamava `window.location.reload()`. O Supabase continuava com os dados do perfil, que eram carregados de volta pelo `carregarDadosUsuario` logo após o reload.

**Impacto:** Usuário não conseguia refazer o onboarding em nenhuma circunstância.

**Solução aplicada:** `resetarPerfil` convertido para `async`. Antes de limpar o localStorage e recarregar, faz 3 chamadas ao backend: (1) salva perfil com todos os campos null/vazios via `/api/usuario/salvar-perfil`; (2) salva plano vazio via `/api/usuario/salvar-plano`; (3) salva memória vazia via `/api/usuario/salvar-memoria`. Só então limpa localStorage e recarrega.

**Arquivo:** `client/src/App.jsx`

---

### [2026-05-26] BUG-016 — Logout sem seletor de contas Google

**Sintoma:** Usuário clica "Sair da conta" e faz login novamente — o Google automaticamente reutiliza a sessão existente sem mostrar o seletor de contas. Impossível trocar de conta Google.

**Causa raiz:** Componente `<Auth>` do Supabase em `Login.jsx` não passava `queryParams` para o Google OAuth. Sem `prompt: 'select_account'`, o Google silenciosamente reutiliza a conta já autenticada.

**Solução aplicada:** Adicionado `queryParams={{ prompt: 'select_account', access_type: 'offline' }}` no componente `<Auth>`.

**Arquivo:** `client/src/components/auth/Login.jsx`

---

### [2026-05-26] BUG-017 — Limpar memória da Flora não limpava histApi

**Sintoma:** Usuário clica "Limpar memória da Flora". Na próxima conversa, a Flora ainda "lembra" de contextos anteriores via `histApi` que não foi limpo.

**Causa raiz:** `onLimparMemoria` em `App.jsx` limpava apenas `memoria` (state + localStorage + Supabase), mas não limpava `histApi`. O `histApi` contém o histórico de mensagens que a Flora recebe como contexto em cada chamada. `.catch(() => {})` também swallava erros silenciosamente.

**Solução aplicada:** `onLimparMemoria` convertido para `async`. Limpa `histApi` state + localStorage. Usa `Promise.all` com `await` para salvar memória zerada E histórico vazio no Supabase em paralelo. Erros logados com `[RESET]`.

**Arquivo:** `client/src/App.jsx`

---

### [2026-05-26] BUG-018 — Botão lixeira não persistia limpeza no Supabase

**Sintoma:** Usuário clica no ícone 🗑️ (Trash2) para limpar histórico. App limpa visualmente. Ao fechar e reabrir o app, o plano anterior é restaurado pelo `carregarDadosUsuario`.

**Causa raiz:** Função `limpar()` em `App.jsx` era síncrona e só limpava state + localStorage. Nenhuma chamada aos endpoints do Supabase. Adicionalmente: endpoint `POST /api/usuario/salvar-historico` não existia no backend.

**Solução aplicada:** 
1. `limpar()` convertido para `async`. Após limpar state/localStorage, chama `Promise.all` com `/api/usuario/salvar-plano` (plano vazio) e `/api/usuario/salvar-historico` (arrays vazios).
2. Endpoint `POST /api/usuario/salvar-historico` criado em `server/index.js` — aceita `{ historicoDisplay, historicoApi }` e chama `salvarHistorico` já existente em `dadosUsuario.js`.

**Arquivos:** `client/src/App.jsx`, `server/index.js`

---

### [2026-05-26] BUG-019 — Momentos livres cortando blocos maiores que 2h

**Sintoma:** Card "Momentos livres hoje" não mostrava blocos livres maiores que 120 minutos. Um gap de 16h→19h50 (230min) era descartado completamente.

**Causa raiz:** `calcularLacunas` em `MicrointervalosCard.jsx` tinha condição `gap >= 15 && gap <= 120` — o limite superior de 120min descartava qualquer bloco livre maior que 2 horas.

**Solução aplicada:** Removido limite superior. Lacunas agora recebem campo `tipo`: `'microintervalo'` (15–120min) ou `'bloco_longo'` (>120min). Renderização diferenciada: blocos longos usam cor índigo com destaque maior; sugestão de uso atualizada para blocos longos ("Bloco grande — bom pra projeto, descanso ou o que quiser."). Label também diferenciado: `⚡` para microintervalos, `🕐` para blocos longos.

**Arquivo:** `client/src/components/dashboard/MicrointervalosCard.jsx`

---

### [2026-05-26] BUG-020 — Contador do header ignorando exceções de recorrência

**Sintoma:** Usuário cancela um compromisso recorrente "só hoje" (ex: academia cancelada hoje por lesão). O contador de pendências no header continua contando o compromisso como pendente para hoje.

**Causa raiz:** Filtro `compromissosHoje` em `App.jsx` verificava tipo de recorrência e data, mas não verificava `c.recorrencia?.excecoes` — array de datas em que o compromisso recorrente não ocorre.

**Solução aplicada:** Adicionada verificação `const excecoes = c.recorrencia?.excecoes || []` com `if (excecoes.includes(hoje)) return false` antes das verificações de recorrência.

**Arquivo:** `client/src/App.jsx`

---

### [2026-05-26] BUG-021 — CSS de tema claro não existia

**Sintoma:** Usuário seleciona "Tema claro" nas configurações. `data-theme="claro"` é aplicado no `<html>`, mas o app continua com fundo escuro porque não há CSS que responda ao atributo.

**Causa raiz:** `index.css` usava `background-color: #0f0f13` hardcoded no `body`. Não havia seletores `[data-theme]` com variáveis CSS.

**Solução aplicada:** Adicionadas variáveis CSS em `index.css`:
- `[data-theme="escuro"]` e `:root` com paleta escura
- `[data-theme="claro"]` com paleta clara (fundo `#fafafa`, texto `#09090b`)
- `body` usa `background-color: var(--bg-primary)` e `color: var(--text-primary)` em vez de valores hardcoded
- Container raiz do app (`App.jsx`) usa `style={{ background: 'var(--bg-primary)' }}`

**Nota:** Esta é a estrutura base de variáveis. O redesign completo (Prompt 8) vai expandir o uso dessas variáveis para todos os componentes.

**Arquivos:** `client/src/index.css`, `client/src/App.jsx`

---

### [2026-05-26] BUG-022 — Toggles de notificação eram ignorados

**Sintoma:** Usuário desativa "Lembretes 30min antes" nas configurações. Notificações de lembrete continuam aparecendo normalmente.

**Causa raiz:** `verificarNotificacoes` em `App.jsx` não recebia `config` como parâmetro e não verificava as preferências do usuário antes de enviar cada tipo de notificação. As 3 notificações (lembretes, streak, check-in) eram enviadas incondicionalmente.

**Solução aplicada:** 
1. Assinatura atualizada: `verificarNotificacoes(planoAtual, memoriaAtual, configAtual)`
2. Cada bloco de notificação envolvido em guard: `if (configAtual?.notificacoes?.lembretes !== false)`, `if (configAtual?.notificacoes?.streak !== false)`, `if (configAtual?.notificacoes?.checkin !== false)`. Usa `!== false` para manter comportamento padrão (ativo) quando config não existe.
3. `useEffect` de verificação periódica passa `config` nas chamadas: `verificarNotificacoes(plano, memoria, config)`. Dependency array atualizado com `config`.

**Arquivo:** `client/src/App.jsx`
