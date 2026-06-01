# fluxo-context.md
*Contexto completo do projeto Fluxo para o Claude Code.*
*Lido junto com CLAUDE.md antes de qualquer implementação.*

---

## O produto

**Fluxo** é um organizador de vida inteligente via linguagem natural.

O usuário conversa com a **Flora** — uma IA com personalidade própria —
que organiza compromissos, rotina, tarefas e objetivos de forma natural,
sem exigir que o usuário já seja organizado para usar o app.

**Posicionamento:**
Não é to-do list. Não é agenda. Não é painel de produtividade.
É uma mente organizando a vida do usuário por ele.

**Público-alvo:**
Estudantes, freelancers, profissionais sobrecarregados, pessoas com TDAH —
qualquer um que sente que o tempo escapa.

---

## Quem construiu

**Tulio** — 24 anos, químico analítico, sem experiência em programação.
Constrói com Claude Code + IA. Estuda IA e migra carreira para empreendedorismo com IA.
Meta: R$ 1 milhão de patrimônio aos 30 anos.

---

## Status atual

App em **produção** com usuários reais testando.

- Frontend: https://fluxo-app-zeta.vercel.app
- Backend: https://fluxo-app-production.up.railway.app
- Banco: Supabase (PostgreSQL + Auth Google)

---

## Stack técnica

```
Frontend:  React + Tailwind CSS + Vite → Vercel
Backend:   Node.js + Express → Railway
Banco:     Supabase (PostgreSQL)
Auth:      Supabase Auth (Google OAuth)
IA:        Anthropic Claude API (claude-sonnet-4-5)
PWA:       vite-plugin-pwa (instalável no celular)
```

---

## Arquitetura de dados

### Fluxo de autenticação
```
Usuário abre app
→ Supabase Auth (Google OAuth)
→ JWT token
→ fetchComAuth() injeta Bearer em cada request
→ middleware auth.js valida token
→ backend identifica userId
→ dados lidos/escritos no Supabase por userId
```

### Fonte de verdade
**Supabase é sempre a fonte de verdade.**
localStorage é apenas cache local para performance.
Quando carregarDadosUsuario roda, Supabase sempre sobrescreve localStorage.

### Tabelas Supabase
| Tabela | Campos principais |
|--------|------------------|
| perfis | id, nome, ocupacao, estilo, ritmo, configuracoes (JSONB) |
| planos | user_id, compromissos (JSONB), tarefas (JSONB), diagnostico (JSONB) |
| memorias | user_id, dados (JSONB) |
| historicos | user_id, historico_display (JSONB), historico_api (JSONB) |
| tarefas_concluidas | user_id, tarefa_ids (JSONB) |

**ATENÇÃO:** RLS desativado temporariamente. Reativar após validação.

---

## A Flora

### Personalidade
Amiga extremamente organizada. Calorosa, direta, sem drama.
NÃO parece: terapeuta, namorada virtual, IA carente, mãe controladora.
PARECE: amiga que ajuda a destravar a vida sem pressão.

### Regras absolutas
1. Sempre termina com pergunta
2. Respostas curtas, leves e diretas
3. Confirma ANTES de remover qualquer coisa
4. Agenda estruturada é **SOURCE OF TRUTH** — nunca inventa compromissos
5. NUNCA reagenda compromissos sem pedido explícito
6. Pergunta duração antes de criar compromisso sem horário final
7. Distingue cancelamento pontual vs mudança de rotina
8. Nunca classifica saúde, lesão ou hábito novo como gargalo
9. Tom ajustável via config.tomFlora ("calorosa" | "direta")

### Ordem dos blocos no system prompt
```
1. Identidade e regras
2. Gamificação (contexto de pontos/nível)
3. blocoAgenda (SOURCE OF TRUTH — 7 dias estruturados)
4. Contexto temporal (hora atual, classificação de compromissos)
5. blocoMemoria (o que Flora aprendeu sobre o usuário)
6. blocoRotina (hábitos e preferências — contexto histórico)
7. Pergunta profunda (opcional)
```

**CRÍTICO:** blocoAgenda antes de blocoMemoria e blocoRotina.
blocoRotina é contexto histórico, NUNCA agenda atual.

### Memória permanente
Flora mantém memória estruturada no Supabase (tabela memorias):
- trabalho, moradia, academia, sono, energia
- finanças, objetivos, perda de tempo
- pessoas importantes, hobbies, preferências
- gamificação (pontos, nível, badges, streak)
- checkIns (ritual de fechamento)

**Decisão de produto:** "A Flora não guarda conversas. Ela guarda entendimento."
→ Chat limpa a cada sessão. Memória persiste no Supabase.

---

## Funcionalidades implementadas

### Core
- Login com Google (Supabase Auth)
- Chat com Flora em linguagem natural (streaming SSE)
- Onboarding: nome → ocupação → compromissos fixos → boas-vindas
- Calendário semanal interativo (RoutineView.jsx)
- Aba Tarefas — painel do dia completo
- Dados sincronizados entre dispositivos via Supabase

### Dashboard
- Estado da Semana (heurística contextual de carga mental)
- Card "Momentos livres hoje" (MicrointervalosCard.jsx)
- Card "Próxima ação"
- Card "Onde você está perdendo tempo"
- Botão "Ver plano de ação" (só em estados negativos reais)

### Flora features
- Quick Replies clicáveis nas respostas
- Modo Caos — "Estou perdido" simplifica o dia
- Ritual de fechamento — check-in noturno (20h–23h, máx 2min)
- Rotinas temporárias — pausa por lesão/viagem + retorno automático
- Compromissos fixos do onboarding vão direto pro calendário

### Gamificação
- Pontos, níveis (Semente → Broto → Flora → Flora Lenda)
- Badges normais e secretas
- Streak de uso (sem mensagens punitivas)
- Animações de +pts flutuando
- Tela de celebração ao subir nível

### Sistema e UX
- PWA instalável no celular (vite-plugin-pwa)
- Notificações push (respeitam config do usuário)
- Modal de perfil: nível, pontos, streak, opções
- Configurações: tema claro/escuro, notificações, tom da Flora
- Tarefas concluídas persistem (storage separado)
- Compromissos manuais salvam no Supabase

---

## Categorias de compromissos

| Categoria | Cor | Descrição |
|-----------|-----|-----------|
| Fixo | vermelho | Inegociável — trabalho, aulas fixas |
| Rotina | dourado | Flexível mas importante — academia, estudo |
| Compromisso | roxo | Pontual com data/hora |
| Lembrete | azul | Pendência sem horário definido |
| Tarefa | verde | Ação pontual com prazo |

---

## Design system

```css
/* Tema escuro (padrão) */
--bg-primary:    #0f0f13
--bg-secondary:  #1a1a24
--bg-card:       #16161f
--text-primary:  #ffffff
--text-secondary:#a1a1aa
--border-color:  rgba(255,255,255,0.08)
--accent:        #f59e0b

/* Tema claro */
--bg-primary:    #fafafa
--bg-secondary:  #f4f4f5
--bg-card:       #ffffff
--text-primary:  #09090b
--text-secondary:#52525b
--border-color:  rgba(0,0,0,0.08)
--accent:        #f59e0b
```

Fontes: `font-titulo` → Syne | `font-corpo` → DM Sans
Tema via `data-theme` no `<html>`. Mobile-first sempre.

---

## Endpoints do backend

Todos requerem `Authorization: Bearer <token>` exceto /health.

| Rota | Método | Descrição |
|------|--------|-----------|
| /api/processar/stream | POST | Chat Flora SSE |
| /api/processar | POST | Chat Flora síncrono |
| /api/estado-semana | POST | Análise da semana |
| /api/plano-acao | POST | Plano de ação |
| /api/usuario/dados | GET | Carregar dados do usuário |
| /api/usuario/salvar-perfil | POST | Salvar perfil |
| /api/usuario/salvar-plano | POST | Salvar plano |
| /api/usuario/salvar-memoria | POST | Salvar memória |
| /api/usuario/salvar-historico | POST | Salvar histórico |
| /api/usuario/tarefas-concluidas | POST | Sincronizar tarefas |
| /api/health | GET | Health check |

---

## Funções críticas do App.jsx

| Função | O que faz |
|--------|-----------|
| carregarDadosUsuario | Carrega todos os dados do Supabase ao logar |
| enviarMensagem | Envia mensagem pra Flora via SSE |
| fetchComAuth | Fetch autenticado com token Supabase |
| salvarPlanoNoSupabase | Salva plano após alterações manuais |
| adicionarCompromisso | Adiciona compromisso + salva Supabase |
| editarItem | Edita item + salva Supabase |
| deletarItem | Deleta item + salva Supabase |
| toggleTarefa | Marca tarefa concluída (storage separado) |
| concluirOnboarding | Finaliza onboarding + salva no Supabase |
| resetarPerfil | Limpa tudo no Supabase + localStorage |
| limpar | Limpa plano/histórico no Supabase + state |
| handleLogout | Desloga + limpa estado |

---

## Sistema de agentes (ai-system/)

Sempre ativar antes de implementar. Sempre registrar em known-issues.md.

| Agente | Ativar quando |
|--------|---------------|
| Bug Hunter | Qualquer bug |
| Error Analyst | Stack traces, logs |
| Technical Architect | Mudanças estruturais |
| Code Reviewer | Revisão de qualidade |
| Frontend Reviewer | UI, visual, mobile |
| Backend Reviewer | APIs, banco, auth |
| Performance Monitor | Lentidão |

**Workflow de bug:**
Bug Hunter → Error Analyst → Technical Architect → implementar → Code Reviewer

---

## Regras de desenvolvimento

1. Ler CLAUDE.md e fluxo-context.md antes de qualquer implementação
2. Ativar agentes relevantes do ai-system/
3. Registrar em ai-system/memory/known-issues.md
4. Supabase é fonte de verdade — localStorage é cache
5. fetchComAuth() em todas as chamadas autenticadas
6. Nunca swallow silencioso de erros — logar com [TAG]
7. Confirmar cada etapa antes de avançar
8. Não quebrar funcionalidades existentes
9. Português brasileiro em tudo
10. git push → deploy automático Railway + Vercel

---

## Bugs pendentes (known-issues.md — BUG-015 a BUG-022)

- [ ] BUG-015: Refazer onboarding não limpa Supabase
- [ ] BUG-016: Logout sem seletor de contas Google
- [ ] BUG-017: Limpar memória não limpa histApi
- [ ] BUG-018: Botão lixeira não persiste no Supabase
- [ ] BUG-019: Momentos livres cortando blocos >120min
- [ ] BUG-020: Contador header ignorando exceções
- [ ] BUG-021: CSS tema claro não existe
- [ ] BUG-022: Toggles de notificação ignorados

---

*Última atualização: 26/05/2026*
