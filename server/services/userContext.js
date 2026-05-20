/**
 * userContext.js — Gerencia e formata o perfil expandido do usuário
 *
 * Estrutura completa do perfil:
 * {
 *   basico:   { nome, ocupacao, energia, estilo }
 *   rotina:   { semanaAtual, desafios, objetivos }
 *   profundo: { areasImportantes, objetivoUmAno, sonhoGrande, maiorMedo, estadoAtual, respostasProfundas }
 *   historicoEmocional: { notasFlora }
 *   dataInicio, contadorInteracoes, perguntasProfundasFeitas
 * }
 */

// ─── Labels legíveis ──────────────────────────────────────────────────────────
const L = {
  ocupacao: { estudante:'estudante', profissional:'profissional CLT', freelancer:'freelancer', empreendedor:'empreendedor', outro:'outra ocupação' },
  semana:   { tranquila:'tranquila', corrida:'corrida mas administrável', caotica:'caótica', imprevisivel:'imprevisível' },
  energia:  { manha_cedo:'manhã cedo (antes das 9h)', meio_manha:'meio da manhã (9h-12h)', tarde:'tarde (13h-17h)', final_tarde:'final da tarde (17h-19h)', noite:'noite (após 19h)' },
  desafio:  { procrastinacao:'procrastinação', muitas_tarefas:'muitas tarefas acumuladas', foco:'falta de foco', imprevistos:'imprevistos constantes', esquecimentos:'esqueço compromissos', ansiedade:'ansiedade', sobrecarga:'sobrecarga mental', dificuldade_comecar:'dificuldade de começar' },
  objetivo: { produtividade:'produtividade no trabalho', estudos:'consistência nos estudos', saude:'saúde e exercícios', equilibrio:'equilíbrio pessoal/trabalho', reducao_ansiedade:'reduzir ansiedade', tempo_livre:'ter mais tempo livre', habitos:'construir hábitos novos' },
  area:     { carreira:'Carreira', estudos:'Estudos', saude_fisica:'Saúde física', saude_mental:'Saúde mental', financas:'Finanças', relacionamentos:'Relacionamentos', familia:'Família', espiritualidade:'Espiritualidade', hobbies:'Hobbies e lazer', crescimento:'Crescimento pessoal' },
  estado:   { bem:'Bem, quer otimizar mais', ok:'Ok, mas sente que poderia mais', cansado:'Cansado, precisa reorganizar', perdido:'Perdido, não sabe por onde começar', ansioso:'Ansioso, com muita coisa na cabeça' },
  estilo:   { direta:'direta e objetiva', acolhedora:'acolhedora e próxima', equilibrada:'equilibrada' },
};

const mapArr = (arr, dict) => (Array.isArray(arr) ? arr.map(v => dict[v] || v).join(', ') : dict[arr] || arr || '—');
const mapVal  = (val, dict)  => dict[val] || val || '—';

// ─── Formata perfil completo para o prompt ────────────────────────────────────
function buildPerfilContexto(perfil) {
  if (!perfil) return 'Perfil ainda não disponível.';

  const p = perfil.profundo || {};
  const he = perfil.historicoEmocional || {};

  const linhas = [
    `NOME: ${perfil.nome || '—'}`,
    `OCUPAÇÃO: ${mapVal(perfil.ocupacao, L.ocupacao)}`,
    `ENERGIA (pico de produtividade): ${mapVal(perfil.energia, L.energia)}`,
    `ESTILO DE COMUNICAÇÃO PREFERIDO: ${mapVal(perfil.estilo, L.estilo)}`,
    ``,
    `ROTINA:`,
    `  Semana atual: ${mapVal(perfil.semana, L.semana)}`,
    `  Desafios: ${mapArr(perfil.desafios, L.desafio)}`,
    `  Objetivos com o Fluxo: ${mapArr(perfil.objetivos, L.objetivo)}`,
    ``,
    `MAPEAMENTO PROFUNDO:`,
    `  Áreas da vida prioritárias: ${mapArr(p.areasImportantes, L.area)}`,
    `  Objetivo em 1 ano: ${p.objetivoUmAno || '(não respondeu)'}`,
    `  Sonho grande: ${p.sonhoGrande || '(não compartilhou)'}`,
    `  Maior preocupação: ${p.maiorMedo || '(não compartilhou)'}`,
    `  Estado emocional atual: ${mapVal(p.estadoAtual, L.estado)}`,
  ];

  // Respostas às perguntas profundas da Flora
  if (p.respostasProfundas?.length > 0) {
    linhas.push(``, `RESPOSTAS A PERGUNTAS PROFUNDAS:`);
    p.respostasProfundas.forEach(r => {
      linhas.push(`  [${r.tema}] P: "${r.pergunta}" → R: "${r.resposta}"`);
    });
  }

  // Notas emocionais detectadas pela Flora
  if (he.notasFlora?.length > 0) {
    linhas.push(``, `PADRÕES EMOCIONAIS DETECTADOS PELA FLORA:`);
    he.notasFlora.slice(-5).forEach(n => linhas.push(`  • ${n.nota} (${new Date(n.timestamp).toLocaleDateString('pt-BR')})`));
  }

  // Dias usando o app
  if (perfil.dataInicio) {
    const dias = Math.floor((Date.now() - new Date(perfil.dataInicio)) / 86400000);
    linhas.push(``, `TEMPO DE USO: ${dias} dia(s)`);
  }

  return linhas.join('\n');
}

// ─── Identifica temas relevantes para seleção de perguntas ───────────────────
function extrairTemasRelevantes(perfil) {
  const areas = perfil?.profundo?.areasImportantes || [];
  const temaMap = {
    carreira: 'carreira', estudos: 'crescimento', saude_fisica: 'saude',
    saude_mental: 'saude_mental', financas: 'financas',
    relacionamentos: 'relacionamentos', familia: 'familia',
    espiritualidade: 'proposito', hobbies: 'habitos', crescimento: 'crescimento',
  };
  return areas.map(a => temaMap[a]).filter(Boolean);
}

// ─── Preserva estados de conclusão de tarefas ────────────────────────────────
function preservarEstadosTarefas(tarefasAntigas, tarefasNovas) {
  // Mapa das antigas preservando estado (concluida, etc)
  const mapaAntigas = new Map();
  (tarefasAntigas || []).forEach(t => mapaAntigas.set(t.id, t));

  // Mapa das novas
  const mapaNovas = new Map();
  (tarefasNovas || []).forEach(t => mapaNovas.set(t.id, t));

  // Resultado: antigas + novas, sem duplicar
  const resultado = new Map();

  // Começa com todas as antigas
  mapaAntigas.forEach((t, id) => resultado.set(id, t));

  // Novas sobrescrevem campos mas preservam estado do usuário
  mapaNovas.forEach((t, id) => {
    if (resultado.has(id)) {
      // Preserva concluida e outros estados do usuário
      resultado.set(id, {
        ...t,
        concluida: resultado.get(id).concluida,
      });
    } else {
      resultado.set(id, t);
    }
  });

  return Array.from(resultado.values());
}

// ─── Calcula score com bônus de conclusões ────────────────────────────────────
function calcularScore(plano) {
  if (!plano?.tarefas || plano.tarefas.length === 0) return plano;
  const total = plano.tarefas.length;
  const concluidas = plano.tarefas.filter(t => t.concluida).length;
  const bonus = Math.round((concluidas / total) * 20);
  const base = plano.diagnostico?.scoreTempoLivre || 50;
  return { ...plano, diagnostico: { ...plano.diagnostico, scoreTempoLivre: Math.min(100, base + bonus) } };
}

function limitarHistorico(historico, max = 20) { return historico.slice(-max); }

module.exports = {
  buildPerfilContexto, extrairTemasRelevantes,
  preservarEstadosTarefas, calcularScore, limitarHistorico, L,
};
