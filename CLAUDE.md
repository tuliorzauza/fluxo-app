# Fluxo — Organizador de Vida Inteligente

## Visão central
"Fluxo organiza sua vida por você e reduz o caos mental."

NÃO é agenda gamificada, sistema de tarefas ou painel de performance.
É uma mente inteligente ajudando o usuário a reorganizar a própria vida.

Toda decisão de produto responde:
"Isso aumenta a sensação de clareza e controle mental do usuário?"

---

## Stack em produção
- Frontend: React + Tailwind CSS + Vite → deploy no **Vercel**
- Backend: Node.js + Express → deploy no **Railway**
- Banco de dados: **Supabase** (PostgreSQL + Auth Google)
- IA: Claude API — modelo **claude-sonnet-4-5**
- Storage: Supabase (fonte de verdade) + localStorage (cache local)

**URLs de produção:**
- Frontend: https://fluxo-app-zeta.vercel.app
- Backend: https://fluxo-app-production.up.railway.app
- Supabase: https://qztbhfcawshaqpgvvnuz.supabase.co

**Desenvolvimento local:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Estrutura de arquivos críticos

```
client/src/
├── App.jsx                        ← estado principal, auth, plano, sessão
├── lib/
│   └── supabase.js                ← cliente Supabase (anon key)
├── components/
│   ├── auth/
│   │   └── Login.jsx              ← tela de login Google OAuth
│   ├── chat/
│   │   ├── ChatArea.jsx
│   │   └── ChatInput.jsx
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── MicrointervalosCard.jsx ← card "Momentos livres hoje"
│   │   ├── EstadoSemana.jsx
│   │   ├── DiagnosticCard.jsx
│   │   └── NextActionCard.jsx
│   ├── gamificacao/
│   │   ├── PontosAnimados.jsx
│   │   └── CelebracaoNivel.jsx
│   ├── onboarding/
│   │   └── Onboarding.jsx
│   ├── routine/
│   │   └── RoutineView.jsx        ← calendário semanal estilo Google Agenda
│   └── shared/
│       └── ScoreCompact.jsx

server/
├── index.js                       ← endpoints Express + auth middleware
├── middleware/
│   └── auth.js                    ← valida JWT Supabase
├── services/
│   ├── flora.js                   ← cérebro da IA (buildFloraPrompt)
│   ├── userMemory.js              ← memória permanente
│   ├── dadosUsuario.js            ← CRUD Supabase (5 tabelas)
│   └── supabase.js                ← cliente Supabase (service_role key)

ai-system/
├── agents/                        ← agentes especializados
├── memory/
│   └── known-issues.md            ← registro de bugs e decisões
├── workflows/
└── brains/
    └── fluxo-brain.md             ← filosofia central do produto
```

---

## Banco de dados — Tabelas Supabase

| Tabela | Conteúdo |
|--------|----------|
| perfis | nome, ocupacao, estilo, ritmo, configuracoes (JSONB) |
| planos | compromissos, tarefas, diagnostico (JSONB por user_id) |
| memorias | dados JSONB da memória permanente da Flora |
| historicos | historico_display, historico_api (JSONB) |
| tarefas_concluidas | tarefa_ids JSONB |

**ATENÇÃO:** RLS está desativado temporariamente. Reativar após validação com usuários reais.

---

## Autenticação

- Login via Google OAuth (Supabase Auth)
- Token JWT validado pelo middleware `auth.js` em todos os endpoints
- Frontend usa `fetchComAuth()` que injeta Bearer token automaticamente
- Logout deve incluir `prompt: 'select_account'` no Login.jsx para forçar seletor de contas

---

## Design
- Tema escuro padrão: fundo #0f0f13 | acento dourado #f59e0b
- Fontes: Syne (títulos, classe `font-titulo`) + DM Sans (corpo, classe `font-corpo`)
- Mobile-first sempre
- Sistema de temas via `data-theme` no `<html>` (variáveis CSS)
- **Redesign completo planejado (Prompt 8):** referência Duolingo + Calm
  (fundo #fafafa, clean, leve, respirável — só após feedback de usuários reais)

---

## A Flora

IA interna do Fluxo. Amiga extremamente organizada, calorosa e direta.

**NÃO parece:** terapeuta, namorada virtual, IA carente, mãe controladora.
**PARECE:** amiga que ajuda a destravar a vida sem drama e sem pressão.

**Regras obrigatórias:**
- Sempre termina com pergunta
- Respostas curtas, leves e diretas
- Confirma ANTES de remover qualquer coisa
- Injeta data/hora real em CADA chamada à API
- Agenda estruturada é SOURCE OF TRUTH — nunca inventa compromissos
- Nunca sugere horário já ocupado
- Distingue cancelamento pontual vs mudança de rotina
- NUNCA reagenda compromissos sem pedido explícito do usuário
- Pergunta duração antes de criar compromisso sem horário final
- blocoAgenda aparece ANTES de blocoRotina e blocoMemoria no prompt
- Tom ajustável via configuracoes.tomFlora ("calorosa" | "direta")

**Decisão de produto confirmada:**
"A Flora não guarda conversas. Ela guarda entendimento."
→ Chat limpa a cada sessão. Memória permanente no Supabase.

---

## Categorias de compromissos

| Emoji | Categoria | Descrição |
|-------|-----------|-----------|
| 🔴 | Fixo | Inegociável (trabalho, aulas fixas) |
| 🟡 | Rotina | Flexível mas importante (academia, estudo) |
| 🟣 | Compromisso | Pontual com data/hora |
| 🔵 | Lembrete | Pendência sem horário |
| 🟢 | Tarefa | Ação pontual com prazo |

---

## Gamificação

Princípio: reforça progresso sem gerar culpa.
Usuário com falha deve querer voltar, não ter vergonha de abrir.

- SEM ranking com usuários fictícios
- SEM mensagens punitivas de streak
- COM celebração de conquistas e subida de nível
- COM badges normais e secretas
- Streak zera ao quebrar (consequência existe) mas sem drama
- Níveis: Semente → Broto → Flora → Flora Lenda

---

## Funcionalidades em produção

- ✅ Login com Google (Supabase Auth)
- ✅ Dados persistidos no Supabase por usuário
- ✅ Chat com Flora em linguagem natural (streaming SSE)
- ✅ Onboarding (nome, ocupação, compromissos fixos, boas-vindas)
- ✅ Calendário semanal interativo (RoutineView)
- ✅ Aba Tarefas — painel do dia
- ✅ Estado da Semana (heurística contextual, não score numérico)
- ✅ Card "Momentos livres hoje" (MicrointervalosCard)
- ✅ Card "Próxima ação"
- ✅ Card "Onde você está perdendo tempo"
- ✅ Quick Replies clicáveis
- ✅ Memória permanente da Flora (Supabase)
- ✅ Modo Caos — botão "Estou perdido" simplifica o dia
- ✅ Ritual de fechamento — check-in noturno (20h–23h)
- ✅ Rotinas temporárias — pausa + retorno automático
- ✅ Gamificação: pontos, níveis, badges, streak, celebração
- ✅ PWA instalável no celular
- ✅ Notificações push (respeita config do usuário)
- ✅ Modal de perfil com nível, pontos, streak
- ✅ Configurações: tema, notificações, tom da Flora, limpar memória
- ✅ Tarefas concluídas persistem (storage separado do plano)
- ✅ Compromissos manuais salvam no Supabase

---

## Endpoints do backend

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/processar/stream | Chat Flora (SSE) |
| POST | /api/processar | Chat Flora (fallback síncrono) |
| POST | /api/estado-semana | Análise da semana |
| POST | /api/plano-acao | Plano de ação do Estado da Semana |
| GET | /api/usuario/dados | Carregar todos os dados do usuário |
| POST | /api/usuario/salvar-perfil | Salvar perfil + configurações |
| POST | /api/usuario/salvar-plano | Salvar plano manualmente |
| POST | /api/usuario/salvar-memoria | Salvar memória da Flora |
| POST | /api/usuario/salvar-historico | Salvar histórico de chat |
| POST | /api/usuario/tarefas-concluidas | Sincronizar tarefas concluídas |
| GET | /api/health | Health check |

---

## Sistema de agentes (ai-system/)

Sempre ativar os agentes relevantes antes de implementar.
Registrar bugs e decisões em `ai-system/memory/known-issues.md`.

| Agente | Quando usar |
|--------|-------------|
| Bug Hunter | Qualquer bug — investigar causa raiz |
| Error Analyst | Stack traces, logs, falhas de API |
| Technical Architect | Mudanças estruturais, arquitetura |
| Code Reviewer | Revisão de qualidade, más práticas |
| Frontend Reviewer | UI, visual, hierarquia, mobile |
| Backend Reviewer | APIs, banco, autenticação, segurança |
| Performance Monitor | Gargalos, renderizações desnecessárias |

**Workflow de bug:**
Bug Hunter → Error Analyst → Technical Architect → implementar → Code Reviewer

---

## Regras de desenvolvimento

1. **Sempre ler fluxo-context.md e CLAUDE.md antes de implementar**
2. **Sempre ativar agentes relevantes do ai-system/**
3. **Sempre registrar em known-issues.md**
4. **Supabase é fonte de verdade** — localStorage é apenas cache
5. **fetchComAuth()** em todas as chamadas autenticadas ao backend
6. **Nunca swallow silencioso de erros** — sempre logar com [TAG]
7. **Confirmar cada etapa antes de avançar** em prompts longos
8. **Não quebrar funcionalidades existentes**
9. **Idioma:** português brasileiro em tudo (interface e IA)
10. **Deploy automático:** git push → Railway (backend) + Vercel (frontend)

---

## Time operacional

- **GPT** → produto, UX, psicologia, marketing, estratégia, análise de bugs
- **Chat 2 (Claude)** → código, prompts, implementação (este chat)
- **Claude Code** → execução final
- **Tulio** → founder, meio campo

**Fluxo:** GPT analisa → Chat 2 monta prompt → Claude Code executa → deploy automático

---

## Próximos passos (não implementar sem instrução)

- [ ] Corrigir bugs identificados (7 bugs — ver known-issues.md)
- [ ] Reativar RLS do Supabase
- [ ] Stripe — pagamentos (R$29–79/mês freemium)
- [ ] PostHog — analytics
- [ ] Prompt 8 — Redesign completo (após feedback de usuários)
- [ ] "O que aprendi sobre você" — tela de padrões da Flora
- [ ] "Resumo da Semana" — síntese inteligente semanal
- [ ] Aba Projetos com linguagem natural (Mermaid.js)
- [ ] React Native — App Store e Google Play
- [ ] Google Calendar (bidirecional)

*Ver FUTURO.md para roadmap completo e detalhado.*
