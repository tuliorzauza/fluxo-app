/**
 * categorias.js — Sistema unificado de categorias com cores
 *
 * Cada item (compromisso ou tarefa) tem uma `categoria` que define sua cor,
 * comportamento de reorganização e local de exibição na interface.
 */

export const CATEGORIAS = {
  fixo: {
    id: 'fixo',
    label: 'Fixo',
    desc: 'Inegociável',
    icon: '🔴',
    cor:           '#ef4444',
    corBg:         'bg-red-500/15',
    corBorda:      'border-red-500/30',
    corTexto:      'text-red-300',
    dot:           'bg-red-400',
    bgRgba:        'rgba(239,68,68,0.15)',
    bordaRgba:     'rgba(239,68,68,0.3)',
    bgSolido:      '#7f1d1d',
    bordaSolida:   '#991b1b',
    corTextoSolido:'#fca5a5',
  },
  rotina: {
    id: 'rotina',
    label: 'Rotina',
    desc: 'Flexível mas importante',
    icon: '🟡',
    cor:           '#f59e0b',
    corBg:         'bg-amber-500/15',
    corBorda:      'border-amber-500/30',
    corTexto:      'text-amber-300',
    dot:           'bg-amber-400',
    bgRgba:        'rgba(245,158,11,0.15)',
    bordaRgba:     'rgba(245,158,11,0.3)',
    bgSolido:      '#78350f',
    bordaSolida:   '#92400e',
    corTextoSolido:'#fcd34d',
  },
  compromisso: {
    id: 'compromisso',
    label: 'Compromisso',
    desc: 'Pontual com data e hora',
    icon: '🟣',
    cor:           '#a855f7',
    corBg:         'bg-purple-500/15',
    corBorda:      'border-purple-500/30',
    corTexto:      'text-purple-300',
    dot:           'bg-purple-400',
    bgRgba:        'rgba(168,85,247,0.15)',
    bordaRgba:     'rgba(168,85,247,0.3)',
    bgSolido:      '#4c1d95',
    bordaSolida:   '#5b21b6',
    corTextoSolido:'#c4b5fd',
  },
  lembrete: {
    id: 'lembrete',
    label: 'Lembrete',
    desc: 'Pendência sem horário',
    icon: '🔵',
    cor:           '#3b82f6',
    corBg:         'bg-blue-500/15',
    corBorda:      'border-blue-500/30',
    corTexto:      'text-blue-300',
    dot:           'bg-blue-400',
    bgRgba:        'rgba(59,130,246,0.15)',
    bordaRgba:     'rgba(59,130,246,0.3)',
    bgSolido:      '#1e3a5f',
    bordaSolida:   '#1e40af',
    corTextoSolido:'#93c5fd',
  },
  tarefa: {
    id: 'tarefa',
    label: 'Tarefa',
    desc: 'Ação pontual com prazo',
    icon: '🟢',
    cor:           '#22c55e',
    corBg:         'bg-green-500/15',
    corBorda:      'border-green-500/30',
    corTexto:      'text-green-300',
    dot:           'bg-green-400',
    bgRgba:        'rgba(34,197,94,0.15)',
    bordaRgba:     'rgba(34,197,94,0.3)',
    bgSolido:      '#14532d',
    bordaSolida:   '#166534',
    corTextoSolido:'#86efac',
  },
};

// Inferência de categoria a partir de campos antigos (retrocompatibilidade)
export function inferirCategoria(item) {
  if (item.categoria && CATEGORIAS[item.categoria]) return item.categoria;

  // Compromisso com tipo: mapear pra categoria
  if (item.tipo) {
    if (item.tipo === 'reuniao' || item.tipo === 'consulta' || item.tipo === 'evento') {
      return 'compromisso';
    }
  }
  // Tarefa com prazo e blocoSugerido → tarefa específica
  if (item.prazo || item.blocoSugerido) return 'tarefa';
  // Tarefa sem prazo nem horário → lembrete
  if (item._tipo === 'tarefa' || item.prioridade) return 'lembrete';
  return 'compromisso';
}

export function getCategoria(item) {
  const id = typeof item === 'string' ? item : inferirCategoria(item);
  return CATEGORIAS[id] || CATEGORIAS.compromisso;
}
