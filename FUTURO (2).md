# FLUXO APP — MEMÓRIA DE FUTURO
*Arquivo vivo. Atualizar conforme o app evolui.*
*Lido pelo Claude Code e pelo time.*

---

## 🔐 SEGURANÇA — PENDÊNCIAS TÉCNICAS

### RLS do Supabase (URGENTE após validação)
- RLS foi desativado temporariamente para desbloquear o backend
- Tabelas afetadas: perfis, planos, memorias, historicos, tarefas_concluidas
- **Quando reativar:** após validar que o app funciona em produção
- **Como reativar:** criar políticas que permitem acesso via service_role key
  e acesso do usuário apenas aos próprios dados
- SQL a executar:
```sql
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_concluidas ENABLE ROW LEVEL SECURITY;
```

---

## 📱 APP MOBILE

### React Native — App Store e Google Play
- Quando: após validação com primeiros usuários pagantes
- Por quê: notificações nativas, GPS real, Google Fit/Apple Health
- O que muda: reconstruir frontend em React Native
- Backend e Supabase continuam os mesmos

### Notificações push reais
- Hoje: Web Push via PWA (limitado no iOS com tela bloqueada)
- Futuro: Push notifications nativas via React Native
- Serviço sugerido: Expo Notifications ou Firebase Cloud Messaging

---

## 🔗 INTEGRAÇÕES FUTURAS

### Google Calendar (bidirecional)
- Importar eventos do Google Calendar pro Fluxo
- Exportar tarefas do Fluxo pro Google Calendar
- Estrutura já preparada no código (googleCalendar.js)
- Quando: após deploy estável e primeiros usuários

### Google Fit / Apple Health
- Verificar atividades físicas (academia, corrida) de forma real
- Resolve o problema da gamificação anti-trapaça
- Quando: junto com React Native

### WhatsApp / Telegram
- Flora envia mensagens fora do app
- Telegram: API aberta, mais fácil
- WhatsApp: API oficial Business (custo + aprovação Meta)
- Quando: após validação do produto

---

## 🎮 GAMIFICAÇÃO

### Recompensas reais (Pontos Flora)
- Pontos trocáveis por créditos, descontos ou acesso antecipado
- Parceiros potenciais: Spotify, Audible, Uber, iFood
- Desafio mensal com prêmio (sorteio entre quem fechou 100%)
- Quando: após 500+ usuários ativos

### Anti-trapaça avançada
- Hoje: fricção natural + detecção de padrão
- Futuro: integração Google Fit/Apple Health para verificação real
- Pontos maiores apenas em ações verificáveis pelo sistema

---

## 🗺️ ABA PROJETOS (removida temporariamente)

- Removida porque exigia que usuário escrevesse código Mermaid
- **Solução planejada:** Flora gera o diagrama via linguagem natural
  - Usuário descreve o projeto
  - Flora pergunta detalhes (etapas, prazo, horas disponíveis)
  - Flora gera diagrama visual interativo (React Flow ou Mermaid.js)
  - Nós editáveis, flechas de dependência, marcar como concluído
- Casos de uso: estudante, cientista, freelancer, concurseiro
- Quando: após redesign completo (Prompt 8+)

---

## 🎨 REDESIGN COMPLETO (Prompt 8)

- Referências: Duolingo (leveza) + Calm (respiro)
- Conceito: FLUIDEZ — bordas arredondadas, gradientes, orgânico
- Fundo: branco/off-white #fafafa (sair do preto pesado)
- Manter dourado da Flora #f59e0b
- Avatar visual pra Flora (hoje só letra F)
- Calendário com letras maiores
- Menos "dashboard", mais "clareza"
- Usar skill frontend-design do Claude
- **Quando:** após coletar feedback dos primeiros usuários reais

---

## 💰 MONETIZAÇÃO

### Stripe (pagamentos)
- Plano: Freemium → R$ 29–79/mês
- Ainda não implementado
- Quando: após validar que usuários querem pagar
- Stack: Stripe Checkout + webhooks pro Supabase

### PostHog (analytics)
- Entender como usuários usam o app
- Quais features são mais usadas
- Onde as pessoas abandonam
- Quando: junto com Stripe ou antes

---

## 🤝 ECOSSISTEMA TEMPO

### Tempo Store (dropshipping)
- Produtos físicos de produtividade
- Fluxo identifica gargalos → recomenda produtos
- Público aquecido pelo Fluxo e canal de conteúdo
- Quando: após Fluxo ter 1000+ usuários ativos

### Canal Faceless (conteúdo)
- Nicho: produtividade + finanças pessoais
- 100% com IA (ElevenLabs + Claude + CapCut)
- Funil de aquisição gratuito pro Fluxo
- Monetização: AdSense + afiliados + audiência própria
- Quando: pode começar paralelo ao desenvolvimento

### LaboReport (Vertical SaaS)
- Geração automática de laudos de química analítica
- Mercado desatendido no Brasil
- Ticket: R$ 200–500/mês por laboratório
- Caso 0 do modelo de Consultoria de Automação

### Consultoria de Automação (B2B)
- Especialistas de domínio identificam gargalos
- Tulio constrói solução com IA
- LaboReport é o caso 0

---

## ⏳ CARD "MOMENTOS LIVRES HOJE" — EVOLUÇÃO PLANEJADA

### Problema atual
- Algoritmo não detecta gaps corretamente
- Sugestões sem contexto (ex: sugere "estudo focado" antes de outro estudo)
- Não considera energia do usuário nem perfil pessoal

### Arquitetura planejada (4 camadas)

**Camada 1 — Detecção correta de gaps**
- Ordenar compromissos cronologicamente
- Calcular matematicamente os intervalos livres
- Excluir horários de sono e bloqueios

**Camada 2 — Contexto do gap**
- O que vem antes e depois do gap?
- Tamanho do intervalo
- Horário do dia (manhã, tarde, noite)

**Camada 3 — Classificação de energia por atividade**
```
Pesado: trabalho, estudo, academia, luta
Médio: reunião, curso, inglês
Leve: videogame, séries, leitura por prazer, descanso
```

**Lógica de sugestão:**
- Pesado → Gap → Pesado = sugerir algo LEVE ou descanso
- Pesado → Gap → Leve = sugerir algo médio
- Gap grande (>2h) = pode sugerir algo estruturado
- Gap pequeno (<45min) = sugerir algo rápido e leve
- Gap noturno = lazer, conexão, descanso

**Camada 4 — Personalização pela memória da Flora**
- Flora conhece hobbies, pessoas importantes, objetivos
- Sugestões ficam cada vez mais precisas com o uso
- Ex: "1h livre antes do trabalho — que tal jogar com a namorada?"
- Ex: "40min entre academia e inglês — banho tranquilo e um café"

### Visual esperado do card
```
⏳ Momentos livres hoje

16h–18h (2h) — Entre trabalho e estudo
💆 Você vai de trabalho direto pro estudo.
Que tal usar esse tempo pra descomprimir?
[Videogame] [Descanso] [Outro]

19h–23h (4h) — Noite livre
🌙 Noite tranquila. Flora sugere: tempo com a namorada.
[Ver sugestões] [Planejar algo]
```

### Quando implementar
1. Primeiro: corrigir cálculo dos gaps (bug atual)
2. Depois: adicionar peso energético por tipo de atividade
3. Depois: lógica de sugestão contextual
4. Por último: personalização com memória da Flora

---

## 🔧 MELHORIAS TÉCNICAS FUTURAS

### Otimização de custo da API
- Hoje: Claude Sonnet 4.5 em todas as requisições
- Futuro: híbrido Haiku (conversas simples) + Sonnet (raciocínio complexo)
- Redução estimada: 50% do custo por usuário
- Quando: após 100+ usuários pagantes

### Cache de contexto (Prompt Caching)
- System prompt da Flora tem 400+ linhas — enviado em cada requisição
- Anthropic tem API de prompt caching que reduz custo drasticamente
- Quando: junto com otimização de custo

### Múltiplos agentes em paralelo
- Claude Code sessions separadas: /client e /server
- Viável após Prompt 7 (deploy real)
- Hoje ainda não é gargalo

### Banco de dados — índices e performance
- Adicionar índices nas tabelas do Supabase quando tiver volume
- Monitorar queries lentas via Supabase Dashboard

---

## 📋 BUGS CONHECIDOS / DÍVIDA TÉCNICA

- [ ] RLS do Supabase desativado — reativar após validação
- [ ] Notificações iOS limitadas via PWA — resolver com React Native
- [ ] Geolocalização removida temporariamente — reimplementar com UX melhor
- [ ] Aba Projetos removida — reimplementar com linguagem natural
- [ ] Modo Caos ainda pode deletar tarefas em edge cases — monitorar
- [ ] localStorage ainda usado como cache — garantir que Supabase é sempre fonte de verdade

---

## 🗓️ ROADMAP MACRO

```
AGORA
├── Corrigir bugs críticos de persistência (Supabase)
├── Primeiro usuário real testando (irmão)
└── Coletar feedback

PRÓXIMO MÊS
├── Prompt 8 — Redesign completo
├── Stripe — primeiros pagamentos
└── PostHog — analytics

3 MESES
├── 50-100 usuários pagantes
├── React Native — app nativo
└── Canal de conteúdo no ar

6 MESES
├── 500+ usuários
├── Tempo Store
└── LaboReport MVP

1 ANO
├── R$ 10k MRR
├── Ecossistema Tempo funcionando
└── Consultoria de Automação com 3+ casos
```

---

*Última atualização: 26/05/2026*
*Mantido por: Tulio + Chat 1 (infra) + Chat 2 (código) + Chat 3 (bugs visuais)*
