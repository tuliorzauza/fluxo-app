/**
 * floraQuestions.js — Banco de perguntas profundas da Flora
 *
 * Flora puxa 1 pergunta a cada 2-3 interações nas primeiras semanas,
 * de forma natural na conversa — nunca como formulário.
 *
 * Estrutura:
 *   id           → identificador único
 *   tema         → categoria (para evitar repetir o mesmo tema)
 *   pergunta     → texto que Flora usará (adaptável ao contexto)
 *   gatilho      → quando é ideal perguntar (hint pro prompt)
 *   profundidade → 1 (leve), 2 (médio), 3 (profundo)
 *   quickReplies → (opcional) sugestões de resposta rápida pra exibir como botões
 */

const PERGUNTAS_PROFUNDAS = [
  // ── Carreira ──────────────────────────────────────────────────────────
  {
    id: 'carreira_satisfacao',
    tema: 'carreira',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar trabalho, reunião ou tarefa profissional',
    pergunta: 'Te pergunto uma coisa — o que você faz hoje no trabalho é o que você quer estar fazendo daqui a 5 anos? Sem julgamento, só quero entender.',
  },
  {
    id: 'carreira_energia',
    tema: 'carreira',
    profundidade: 2,
    gatilho: 'quando o usuário demonstrar cansaço com trabalho',
    pergunta: 'O seu trabalho te dá energia ou te drena mais do que deveria? Pergunto porque isso muda muito como a gente organiza sua semana.',
  },

  // ── Finanças ──────────────────────────────────────────────────────────
  {
    id: 'financas_controle',
    tema: 'financas',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar dinheiro, gastos ou compras',
    pergunta: 'Como tá sua relação com dinheiro hoje? Você sente que tem controle ou tá mais no modo "apaga incêndio"?',
  },
  {
    id: 'financas_sonho',
    tema: 'financas',
    profundidade: 2,
    gatilho: 'em qualquer momento após a pergunta financas_controle',
    pergunta: 'Tem alguma coisa financeira que você quer muito conquistar — uma reserva, uma viagem, a casa própria — mas que parece distante? Me conta.',
  },

  // ── Relacionamentos ───────────────────────────────────────────────────
  {
    id: 'relacionamentos_suporte',
    tema: 'relacionamentos',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar família, amigos ou parceiro(a)',
    pergunta: 'Tem alguém na sua vida hoje que te empurra pra cima? E tem alguém que te puxa pra baixo? Não precisa dar nome — só quero entender seu entorno.',
  },
  {
    id: 'relacionamentos_qualidade',
    tema: 'relacionamentos',
    profundidade: 2,
    gatilho: 'quando o usuário parecer isolado ou sobrecarregado',
    pergunta: 'Você tem conseguido ter tempo de qualidade com as pessoas que importam pra você? Às vezes a gente se vê tão ocupado que esquece disso.',
  },

  // ── Saúde e bem-estar ─────────────────────────────────────────────────
  {
    id: 'saude_autocuidado',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar exercício, sono, alimentação ou cansaço',
    pergunta: 'Quando foi a última vez que você fez algo só pra você? Tipo, sem cobrar nada em troca — só pra recarregar.',
  },
  {
    id: 'saude_sono',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar cansaço ou falta de energia',
    pergunta: 'Como tá seu sono ultimamente? Pergunto porque o cansaço que a gente sente durante o dia quase sempre começa aí.',
    quickReplies: ['Tô dormindo bem', 'Durmo pouco', 'Durmo muito mas acordo cansado', 'Irregular'],
  },

  // ── Propósito ─────────────────────────────────────────────────────────
  {
    id: 'proposito_sabático',
    tema: 'proposito',
    profundidade: 2,
    gatilho: 'qualquer momento após 5 interações',
    pergunta: 'Se você tivesse 1 ano sabático com tudo pago, o que faria? Não precisa ser produtivo — pode ser descansar, viajar, aprender algo. Isso me diz muito sobre o que você realmente quer.',
  },
  {
    id: 'proposito_legado',
    tema: 'proposito',
    profundidade: 3,
    gatilho: 'quando o usuário parecer reflexivo ou mencionar futuro',
    pergunta: 'Tem algo que você quer ter construído ou realizado antes dos seus 40, 50, 60 anos? Algo que dê orgulho de verdade?',
  },

  // ── Hábitos e rotina ──────────────────────────────────────────────────
  {
    id: 'habitos_resistencia',
    tema: 'habitos',
    profundidade: 1,
    gatilho: 'quando o usuário demonstrar dificuldade de começar ou manter algo',
    pergunta: 'Tem algum hábito que você tentou criar várias vezes mas não conseguiu manter? O que você acha que travou?',
  },
  {
    id: 'habitos_prazer',
    tema: 'habitos',
    profundidade: 1,
    gatilho: 'quando o usuário parecer sobrecarregado ou sem tempo livre',
    pergunta: 'O que você faz hoje só pelo prazer — sem precisar ser produtivo ou gerar resultado? Esse tipo de coisa precisa ter espaço na sua semana.',
  },

  // ── Crescimento pessoal ───────────────────────────────────────────────
  {
    id: 'crescimento_orgulho',
    tema: 'crescimento',
    profundidade: 1,
    gatilho: 'qualquer momento após a primeira semana de uso',
    pergunta: 'Qual foi a conquista que te deu mais orgulho nos últimos 2 anos? Pode ser grande ou pequena — quero entender o que te move.',
  },
  {
    id: 'crescimento_aprendizado',
    tema: 'crescimento',
    profundidade: 2,
    gatilho: 'quando o usuário mencionar estudos ou desenvolvimento',
    pergunta: 'Se você pudesse aprender qualquer coisa — sem limitação de tempo ou dinheiro — o que seria? Às vezes a resposta pra essa pergunta esconde o que a gente realmente quer.',
  },

  // ── Família ───────────────────────────────────────────────────────────
  {
    id: 'familia_presente',
    tema: 'familia',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar família ou compromissos familiares',
    pergunta: 'Como tá sua relação com família hoje? Você sente que tem tempo e presença pra eles, ou que a correria tá te afastando?',
  },

  // ── Mental ────────────────────────────────────────────────────────────
  {
    id: 'mental_valvula',
    tema: 'saude_mental',
    profundidade: 2,
    gatilho: 'quando o usuário demonstrar pressão acumulada ou ansiedade',
    pergunta: 'Quando as coisas ficam pesadas, como você normalmente lida? Tem alguma válvula de escape que funciona pra você?',
  },

  // ── Sono e energia ────────────────────────────────────────────────────
  {
    id: 'sono_horario',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'qualquer momento após a 3ª interação',
    pergunta: 'Falando em rotina — que horas você costuma dormir? Isso me ajuda a montar um plano que respeite seu ritmo real.',
    quickReplies: ['Antes das 22h', '22h–23h', '23h–meia-noite', 'Depois da meia-noite'],
  },
  {
    id: 'energia_periodo',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar cansaço ou querer organizar melhor o dia',
    pergunta: 'Você se sente mais disposto em qual parte do dia?',
    quickReplies: ['Manhã cedo', 'Manhã (9h–12h)', 'Tarde', 'Noite'],
  },

  // ── Hábitos atuais ────────────────────────────────────────────────────
  {
    id: 'habitos_exercicio',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'quando o usuário não mencionou exercício na rotina ainda',
    pergunta: 'Você tá fazendo algum exercício regularmente ou tá num período mais parado? Sem julgamento — só quero entender.',
    quickReplies: ['Sim, regularmente', 'De vez em quando', 'Tô parado agora', 'Nunca tive esse hábito'],
  },
  {
    id: 'habitos_alimentacao',
    tema: 'saude',
    profundidade: 1,
    gatilho: 'após pergunta sobre exercício',
    pergunta: 'E alimentação, como tá? Você cozinha, pede delivery, come fora... qual é a sua realidade no dia a dia?',
    quickReplies: ['Cozinho em casa', 'Misto (casa + fora)', 'Quase sempre delivery', 'Não tenho padrão'],
  },
  {
    id: 'habitos_tela',
    tema: 'habitos',
    profundidade: 1,
    gatilho: 'quando o usuário mencionar sono ruim ou procrastinação',
    pergunta: 'Você costuma usar o celular na cama antes de dormir? Pergunto porque isso impacta muito a qualidade do sono.',
    quickReplies: ['Sim, todo dia', 'Às vezes', 'Raramente', 'Não'],
  },
];

/**
 * Seleciona a próxima pergunta a ser feita pela Flora.
 *
 * @param {string[]} feitas - IDs das perguntas já feitas
 * @param {number} totalInteracoes - número total de interações do usuário
 * @param {string[]} temas - temas relevantes para o usuário (de areasImportantes)
 * @returns {object|null} - a pergunta selecionada ou null
 */
function selecionarProximaPergunta(feitas = [], totalInteracoes = 0, temas = []) {
  // Só começa a fazer perguntas profundas após a 2ª interação
  if (totalInteracoes < 2) return null;

  // Só faz pergunta a cada ~3 interações
  if (totalInteracoes % 3 !== 0) return null;

  const naoFeitas = PERGUNTAS_PROFUNDAS.filter(p => !feitas.includes(p.id));
  if (naoFeitas.length === 0) return null;

  // Prioriza temas do perfil do usuário, depois profundidade crescente
  const comPrioridade = [...naoFeitas].sort((a, b) => {
    const aTema = temas.includes(a.tema) ? 0 : 1;
    const bTema = temas.includes(b.tema) ? 0 : 1;
    if (aTema !== bTema) return aTema - bTema;
    return a.profundidade - b.profundidade;
  });

  return comPrioridade[0];
}

module.exports = { PERGUNTAS_PROFUNDAS, selecionarProximaPergunta };
