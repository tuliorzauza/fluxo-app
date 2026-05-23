# FUTURO.md — Features Aprovadas e Roadmap

## Status das features

| Status | Significado |
|--------|-------------|
| ✅ Implementado | No código, em produção |
| 🟡 Aprovado | Decisão de produto tomada, aguarda implementação |
| 💡 Ideia | Em discussão, não aprovado ainda |

---

## ✅ Implementadas

### Chat limpo a cada sessão (Opção A)
**Decisão:** Chat visual limpa a cada login. Flora demonstra memória contextual nas respostas.
**Filosofia:** "A Flora não guarda conversas. Ela guarda entendimento."
**Como funciona:** `historicoApi` é mantido (contexto da Flora), `historicoDisplay` não é carregado.

### Badge de pendências do dia (substituiu ScoreCompact)
**Decisão:** Círculo vermelho com "0" substituído por badge âmbar que mostra pendências do dia.
**Comportamento:** Some quando não há pendências. Conta tarefas com prazo hoje + compromissos de hoje.

### Contexto temporal da Flora (BUG-007)
**Decisão:** Flora classifica compromissos de hoje como [JÁ PASSOU] / [AGORA] / futuro.
**Comportamento:** Flora pergunta "como foi?" para passados, reconhece o que está acontecendo agora, cita normalmente o futuro.

---

## 🟡 Aprovadas — aguardando implementação

### "O que aprendi sobre você"
**Descrição:** Aba ou tela que mostra o perfil do usuário como a Flora o enxerga — uma síntese humanizada do que foi aprendido ao longo das conversas.
**Dados disponíveis:** `memoria.perfil`, `memoria.trabalho`, `memoria.sono`, `memoria.rotina`, `memoria.objetivos`, `perfil.desafios`, `perfil.objetivos`
**UX sugerida:** Cards com categorias (Rotina, Trabalho, Objetivos, Hábitos). Linguagem natural, não técnica.
**Exemplo de conteúdo:**
- "Você acorda às 5h30 e dorme por volta das 23h"
- "Seu maior desafio atual é manter o foco"
- "Você está construindo o hábito de academia 3x por semana"

### "Resumo da Semana"
**Descrição:** Relatório gerado pela Flora ao final de cada semana com o que foi cumprido, o que ficou pra trás e o que aprendeu sobre o usuário.
**Gatilho sugerido:** Automático aos domingos às 20h (notificação), ou via botão na interface.
**Conteúdo sugerido:**
- % de tarefas cumpridas
- Streak atual
- 1-2 observações personalizadas da Flora
- Sugestão para a próxima semana
**Dependência:** Notificações precisam estar ativas; histórico API precisa estar salvo no Supabase.

---

## 💡 Em discussão

### Modo Offline
**Descrição:** App funciona sem internet para visualizar plano e marcar tarefas. Sincroniza quando volta online.
**Bloqueador:** Requer Service Worker com cache de dados + fila de mutations.

### Compartilhar plano
**Descrição:** Exportar semana como imagem ou PDF para compartilhar.

### Múltiplos perfis
**Descrição:** Usuário pode ter perfis diferentes (ex: "modo trabalho" vs "modo pessoal").
