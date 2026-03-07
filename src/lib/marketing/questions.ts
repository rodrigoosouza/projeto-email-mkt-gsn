// ============================================================
// Briefing Question Mapping (36 questions, 12 sections)
// Ported from grow-automaton/src/utils/questionMapping.ts
// Each question has: key, label, section, icon, order, required flag.
// ============================================================

import type { QuestionMappingItem } from './types'

export const questionMapping: QuestionMappingItem[] = [
  // Secao 1: Dados Base (9 obrigatorias)
  { key: 'segmento', label: 'Qual e o seu segmento de atuacao?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 1, required: true, placeholder: 'Ex: Consultoria empresarial, SaaS, E-commerce...' },
  { key: 'produtoServico', label: 'Qual produto ou servico voce vende?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 2, required: true, placeholder: 'Descreva seu principal produto ou servico' },
  { key: 'publicoB2B', label: 'Seu publico e B2B ou B2C?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 3, required: true, placeholder: 'B2B, B2C ou ambos' },
  { key: 'decisorCompra', label: 'Quem e o decisor da compra?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 4, required: true, placeholder: 'Cargo/perfil de quem decide a compra' },
  { key: 'maiorDor', label: 'Qual e a maior dor que o cliente sente antes de comprar?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 5, required: true, placeholder: 'A principal dor/problema que seu cliente enfrenta' },
  { key: 'resultadoEsperado', label: 'O que ele espera alcancar ao contratar voce?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 6, required: true, placeholder: 'O resultado que o cliente busca' },
  { key: 'precoMedio', label: 'Qual preco medio do seu servico?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 7, required: true, placeholder: 'Ex: R$ 5.000/mes, R$ 50.000/projeto' },
  { key: 'diferenciais', label: 'O que diferencia sua empresa dos concorrentes?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 8, required: true, placeholder: 'Seus principais diferenciais competitivos' },
  { key: 'paginaDestino', label: 'Qual pagina voce pretende mandar o trafego?', section: 'Dados Base', sectionIcon: 'Building2', sectionOrder: 1, questionOrder: 9, required: true, placeholder: 'https://seusite.com.br/pagina' },

  // Secao 2: Contexto e Big Numbers
  { key: 'numerosOperacao', label: 'Quais numeros resumem sua operacao hoje?', section: 'Contexto e Big Numbers', sectionIcon: 'BarChart3', sectionOrder: 2, questionOrder: 1, placeholder: 'Faturamento, numero de clientes, equipe...' },
  { key: 'indicadoresCriticos', label: 'Quais indicadores voce acompanha e considera criticos?', section: 'Contexto e Big Numbers', sectionIcon: 'BarChart3', sectionOrder: 2, questionOrder: 2, placeholder: 'KPIs que voce monitora regularmente' },

  // Secao 3: Objetivos e Urgencia
  { key: 'objetivo90Dias', label: 'Qual e o objetivo real que voce quer atingir nos proximos 90 dias?', section: 'Objetivos e Urgencia', sectionIcon: 'Target', sectionOrder: 3, questionOrder: 1, placeholder: 'Meta concreta para os proximos 3 meses' },
  { key: 'porquePrioridade', label: 'Por que isso se tornou prioridade agora?', section: 'Objetivos e Urgencia', sectionIcon: 'Target', sectionOrder: 3, questionOrder: 2, placeholder: 'O que mudou para isso ser urgente' },
  { key: 'impactoSemMudanca', label: 'Qual e o impacto financeiro/operacional se nada mudar?', section: 'Objetivos e Urgencia', sectionIcon: 'Target', sectionOrder: 3, questionOrder: 3, placeholder: 'O que acontece se voce nao agir' },

  // Secao 4: ICP e Comportamento
  { key: 'doresUrgentes', label: 'Quais dores urgentes fazem o cliente agir?', section: 'ICP e Comportamento', sectionIcon: 'UserSearch', sectionOrder: 4, questionOrder: 1, placeholder: 'Gatilhos que levam o cliente a buscar solucao' },
  { key: 'objecoesFrequentes', label: 'Quais objecoes aparecem com mais frequencia?', section: 'ICP e Comportamento', sectionIcon: 'UserSearch', sectionOrder: 4, questionOrder: 2, placeholder: 'As objecoes mais comuns no processo de venda' },

  // Secao 5: Gargalos e Barreiras
  { key: 'maiorGargalo', label: 'Qual e o maior gargalo que impede seu crescimento hoje?', section: 'Gargalos e Barreiras', sectionIcon: 'AlertTriangle', sectionOrder: 5, questionOrder: 1, placeholder: 'O principal obstáculo ao seu crescimento' },
  { key: 'porqueNaoResolveu', label: 'O que fez voce nao resolver isso antes?', section: 'Gargalos e Barreiras', sectionIcon: 'AlertTriangle', sectionOrder: 5, questionOrder: 2, placeholder: 'Por que esse problema persiste' },
  { key: 'impactoRemocaoBloqueio', label: 'Se esse bloqueio fosse removido, qual seria o impacto imediato?', section: 'Gargalos e Barreiras', sectionIcon: 'AlertTriangle', sectionOrder: 5, questionOrder: 3, placeholder: 'O resultado esperado ao resolver' },

  // Secao 6: Marketing Atual
  { key: 'comoAtraiClientes', label: 'Como voces atraem clientes hoje?', section: 'Marketing Atual', sectionIcon: 'Megaphone', sectionOrder: 6, questionOrder: 1, placeholder: 'Canais e estrategias de aquisicao atuais' },

  // Secao 7: Narrativa e Conteudo
  { key: 'comoComunica', label: 'Como sua marca se comunica hoje?', section: 'Narrativa e Conteudo', sectionIcon: 'MessageSquare', sectionOrder: 7, questionOrder: 1, placeholder: 'Tom de voz, canais, frequencia' },
  { key: 'oquePublicoEntende', label: 'O que seu publico realmente entende sobre voce?', section: 'Narrativa e Conteudo', sectionIcon: 'MessageSquare', sectionOrder: 7, questionOrder: 2, placeholder: 'Percepcao atual do publico sobre sua marca' },
  { key: 'conteudosQuePerformaram', label: 'Quais conteudos ja performaram muito bem e por que?', section: 'Narrativa e Conteudo', sectionIcon: 'MessageSquare', sectionOrder: 7, questionOrder: 3, placeholder: 'Conteudos com melhor resultado e motivos' },

  // Secao 8: Conversao / Site
  { key: 'paginasConversao', label: 'Quais paginas sao usadas para conversao?', section: 'Conversao / Site', sectionIcon: 'Globe', sectionOrder: 8, questionOrder: 1, placeholder: 'URLs das paginas de conversao' },
  { key: 'taxaConversaoAtual', label: 'Qual e a taxa de conversao atual?', section: 'Conversao / Site', sectionIcon: 'Globe', sectionOrder: 8, questionOrder: 2, placeholder: 'Ex: 2%, 5%, nao sei...' },
  { key: 'oqueAtrapalhaDecisao', label: 'O que mais atrapalha a tomada de decisao?', section: 'Conversao / Site', sectionIcon: 'Globe', sectionOrder: 8, questionOrder: 3, placeholder: 'Barreiras na jornada de conversao' },

  // Secao 9: Vendas
  { key: 'processoComercial', label: 'Como funciona seu processo comercial?', section: 'Vendas', sectionIcon: 'Handshake', sectionOrder: 9, questionOrder: 1, placeholder: 'Etapas do processo de vendas' },
  { key: 'ondePerdeoportunidades', label: 'Onde acontecem as maiores perdas de oportunidade?', section: 'Vendas', sectionIcon: 'Handshake', sectionOrder: 9, questionOrder: 2, placeholder: 'Em qual etapa voce mais perde deals' },
  { key: 'clienteEntendeDiferenciais', label: 'Seu cliente entende claramente sua oferta e diferenciais?', section: 'Vendas', sectionIcon: 'Handshake', sectionOrder: 9, questionOrder: 3, placeholder: 'O cliente percebe seu valor?' },

  // Secao 10: Maturidade Operacional
  { key: 'operacaoOrganizada', label: 'Sua operacao e organizada ou caotica?', section: 'Maturidade Operacional', sectionIcon: 'Settings', sectionOrder: 10, questionOrder: 1, placeholder: 'Nivel de organizacao dos processos' },
  { key: 'processosComRetrabalho', label: 'Quais processos geram retrabalho, risco ou lentidao?', section: 'Maturidade Operacional', sectionIcon: 'Settings', sectionOrder: 10, questionOrder: 2, placeholder: 'Processos que precisam de melhoria' },
  { key: 'oqueAutomatizar', label: 'O que voce gostaria de automatizar imediatamente?', section: 'Maturidade Operacional', sectionIcon: 'Settings', sectionOrder: 10, questionOrder: 3, placeholder: 'Tarefas repetitivas que quer eliminar' },

  // Secao 11: Recursos e Limitacoes
  { key: 'limiteOrcamento', label: 'Existe limite de orcamento?', section: 'Recursos e Limitacoes', sectionIcon: 'Wallet', sectionOrder: 11, questionOrder: 1, placeholder: 'Faixa de investimento disponivel' },
  { key: 'restricoesTecnicas', label: 'Quais restricoes tecnicas voce tem hoje?', section: 'Recursos e Limitacoes', sectionIcon: 'Wallet', sectionOrder: 11, questionOrder: 2, placeholder: 'Limitacoes de equipe, ferramentas, etc.' },

  // Secao 12: Prioridades Imediatas
  { key: 'resolver2Semanas', label: 'O que precisa ser resolvido nas proximas 2 semanas?', section: 'Prioridades Imediatas', sectionIcon: 'Clock', sectionOrder: 12, questionOrder: 1, placeholder: 'Acoes mais urgentes' },
  { key: 'resultadoMinimoCurtoPrazo', label: 'Qual resultado minimo voce considera aceitavel ver no curto prazo?', section: 'Prioridades Imediatas', sectionIcon: 'Clock', sectionOrder: 12, questionOrder: 2, placeholder: 'Expectativa minima de resultado' },
]

// Group questions by section
export function getQuestionsBySection() {
  const sections: Record<string, { name: string; icon: string; order: number; questions: QuestionMappingItem[] }> = {}

  for (const q of questionMapping) {
    if (!sections[q.section]) {
      sections[q.section] = {
        name: q.section,
        icon: q.sectionIcon,
        order: q.sectionOrder,
        questions: [],
      }
    }
    sections[q.section].questions.push(q)
  }

  return Object.values(sections).sort((a, b) => a.order - b.order)
}

// Get required question keys
export function getRequiredKeys(): (keyof import('./types').BriefingAnswers)[] {
  return questionMapping.filter((q) => q.required).map((q) => q.key)
}

// Check if briefing has all required fields
export function isBriefingComplete(answers: import('./types').BriefingAnswers): boolean {
  return getRequiredKeys().every((key) => answers[key]?.trim())
}

// Count answered questions
export function countAnswered(answers: import('./types').BriefingAnswers): { answered: number; total: number; required: number; requiredAnswered: number } {
  const total = questionMapping.length
  const answered = questionMapping.filter((q) => answers[q.key]?.trim()).length
  const requiredKeys = getRequiredKeys()
  const requiredAnswered = requiredKeys.filter((key) => answers[key]?.trim()).length
  return { answered, total, required: requiredKeys.length, requiredAnswered }
}
