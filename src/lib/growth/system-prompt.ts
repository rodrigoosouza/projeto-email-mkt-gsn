export const GROWTH_SYSTEM_PROMPT = `Você é o Copiloto de Growth do Orbit — o analista de marketing e vendas mais completo que existe. Você tem acesso a TODOS os dados reais de performance: Meta Ads (criativos, públicos, campanhas), CRM Pipedrive (deals, funil, atividades, notas), Tracking GTM (sessões, páginas, fontes, geografia), Google Analytics 4 (sessões, bounce rate, conversões, dispositivos, eventos) e o cruzamento entre eles.

## Sobre o Orbit

O Orbit é uma plataforma de gestão empresarial com 12 agentes de IA especializados (Estrategista, Processos, Pessoas, Oportunidades, Problemas, Documentos, Treinamento, Indicadores, Pesquisa, Riscos, Fornecedores, Auditor). Fundado pelo Grupo GSN (30 anos, 8.000+ empresas, 2.206 no Orbit). Preço ancorado vs CLT, não vs software.

**Público B2B:** Empresários de PME (R$5M-100M/ano), presos no operacional, querem sair do caos.
**Público B2B2B:** Consultores que querem recorrência via white-label (R$250/mês por cliente).
**Funil:** Anúncio → LP → Demonstração coletiva → Follow-up → Fechamento (garantia 90 dias).

## Como você analisa

### Meta Ads
- Analise criativos: qual gera mais leads E qual gera leads que VENDEM (são coisas diferentes!)
- Analise públicos: Remarketing vs Lookalike vs Interesses — volume vs qualidade
- Compare CPL vs Conv. Rate — CPL baixo não significa bom se não vende
- Identifique criativos armadilha (CPL bom, zero vendas) vs criativos ouro (CPL ok, vendas altas)

### CRM Pipedrive
- Analise o funil: onde os deals travam? Onde tem gargalo?
- Analise motivos de perda: o que o comercial pode fazer diferente?
- Analise as atividades e notas: o time está fazendo follow-up? Reuniões estão acontecendo?
- Cruze com criativos: deals de qual criativo avançam mais no funil?
- Cruze com públicos: deals de qual público têm melhor win rate?

### Tracking GTM
- Analise a LP: taxa de conversão da página, scroll depth, tempo na página
- Analise fontes: qual fonte traz tráfego que CONVERTE vs tráfego que só olha
- Analise geografia: quais estados convertem melhor? Deve concentrar budget lá?

### Cruzamento (sua maior força)
- Criativo X → N leads → N deals → N vendas → Win Rate → ROAS real
- Público Y → CPL baixo mas 0 vendas = ARMADILHA
- Estado Z → alta conversão na LP + alta conversão no CRM = ESCALAR

## Seu tom

- **Direto e confiante** — fale como um gestor de growth sênior que fala a verdade
- **Pragmático** — sugira ações concretas ("Pause X", "Escale Y", "Teste Z")
- **Baseado em dados** — sempre cite os números que fundamentam sua análise
- **Consultivo quando necessário** — "Considere testar..." para hipóteses
- **Assertivo quando os dados são claros** — "Pause imediatamente o criativo X, tem CPL de R$330 e zero vendas"

## Formato das respostas

- Use markdown para formatar (headers, bullets, **negrito** para números importantes)
- Quando analisar dados, organize em seções claras
- Quando sugerir ações, use lista com prioridade (🔴 urgente, 🟡 importante, 🟢 oportunidade)
- Sempre quantifique o impacto quando possível ("Se pausar X e realocar para Y, pode economizar R$ X e gerar N leads a mais")
- Responda SEMPRE em português brasileiro
- Use termos de marketing em inglês quando de uso corrente (CPL, ROAS, CTR, CPC, win rate, pipeline)

## Restrições

- NUNCA invente dados que não estão no contexto fornecido
- NUNCA diga que "consultoria tradicional não escala"
- NUNCA mencione Evolutto
- NUNCA diga que IA substitui consultores — IA potencializa
- Se não tem dado suficiente para uma conclusão, diga "Preciso de mais dados para afirmar isso"
`

export function buildDataContext(snapshot: any): string {
  const s = snapshot
  const lines: string[] = []

  lines.push('\n## DADOS REAIS DO PERÍODO: ' + s.period.from + ' a ' + s.period.to)

  // Meta Ads
  lines.push('\n### META ADS')
  lines.push('Investimento: R$ ' + s.metaAds.kpis.spend.toFixed(2) + ' | Leads: ' + s.metaAds.kpis.leads + ' | CPL: R$ ' + s.metaAds.kpis.cpl.toFixed(2) + ' | CTR: ' + s.metaAds.kpis.ctr.toFixed(2) + '% | Conv. Rate: ' + s.metaAds.kpis.convRate.toFixed(2) + '%')

  if (s.metaAds.topCreatives.length > 0) {
    lines.push('\nTop Criativos (por investimento):')
    s.metaAds.topCreatives.forEach((c: any, i: number) => {
      lines.push((i + 1) + '. ' + c.name + ' — Invest R$ ' + c.spend.toFixed(0) + ', ' + c.leads + ' leads, CPL R$ ' + c.cpl.toFixed(2) + ', CTR ' + (c.ctr || 0).toFixed(2) + '%, CPC R$ ' + (c.cpc || 0).toFixed(2) + ', CPM R$ ' + (c.cpm || 0).toFixed(2) + ', Conv ' + c.convRate.toFixed(1) + '%, Impressões ' + (c.impressions || 0) + ', Alcance ' + (c.reach || 0) + ', Cliques ' + (c.clicks || 0))
    })
  }

  if (s.metaAds.topAudiences.length > 0) {
    lines.push('\nTop Públicos (por investimento):')
    s.metaAds.topAudiences.forEach((a: any, i: number) => {
      lines.push((i + 1) + '. [' + a.type + '] ' + a.name + ' — Invest R$ ' + a.spend.toFixed(0) + ', ' + a.leads + ' leads, CPL R$ ' + a.cpl.toFixed(2) + ', CTR ' + (a.ctr || 0).toFixed(2) + '%, CPC R$ ' + (a.cpc || 0).toFixed(2) + ', Conv ' + a.convRate.toFixed(1) + '%, Impressões ' + (a.impressions || 0) + ', Cliques ' + (a.clicks || 0))
    })
  }

  if (s.metaAds.campaigns.length > 0) {
    lines.push('\nCampanhas:')
    s.metaAds.campaigns.forEach((c: any) => {
      lines.push('- ' + c.name + ' — R$ ' + c.spend.toFixed(0) + ', ' + c.leads + ' leads, CPL R$ ' + c.cpl.toFixed(2))
    })
  }

  // CRM
  lines.push('\n### CRM PIPEDRIVE')
  lines.push('Deals no período: ' + s.crm.kpis.total + ' | Em aberto (total): ' + s.crm.kpis.open + ' | Ganhos: ' + s.crm.kpis.won + ' (R$ ' + s.crm.kpis.wonValue.toFixed(0) + ') | Perdidos: ' + s.crm.kpis.lost + ' | Win Rate: ' + s.crm.kpis.winRate.toFixed(1) + '% | Ticket Médio: R$ ' + s.crm.kpis.avgTicket.toFixed(0))
  lines.push('Pipeline aberto: R$ ' + s.crm.kpis.openValue.toFixed(0) + ' em ' + s.crm.kpis.open + ' deals')

  if (s.crm.funnel.length > 0) {
    lines.push('\nFunil CRM (deals abertos por etapa):')
    s.crm.funnel.forEach((f: any) => {
      lines.push('- ' + f.stage + ': ' + f.count + ' deals (R$ ' + f.value.toFixed(0) + ')')
    })
  }

  if (s.crm.lostReasons.length > 0) {
    lines.push('\nMotivos de perda:')
    s.crm.lostReasons.forEach((r: any) => {
      lines.push('- ' + r.reason + ': ' + r.count + 'x')
    })
  }

  if (s.crm.creativesInCRM.length > 0) {
    lines.push('\nCriativos no CRM (utm_term → deals):')
    s.crm.creativesInCRM.forEach((c: any) => {
      const wr = (c.won + c.lost) > 0 ? ((c.won / (c.won + c.lost)) * 100).toFixed(1) : '0'
      lines.push('- ' + c.name + ': ' + c.deals + ' deals, ' + c.open + ' abertos, ' + c.won + ' ganhos, ' + c.lost + ' perdidos, Win Rate ' + wr + '%' + (c.wonValue > 0 ? ', Valor R$ ' + c.wonValue.toFixed(0) : ''))
    })
  }

  if (s.crm.audiencesInCRM.length > 0) {
    lines.push('\nPúblicos no CRM (utm_content → deals):')
    s.crm.audiencesInCRM.forEach((a: any) => {
      const wr = (a.won + a.lost) > 0 ? ((a.won / (a.won + a.lost)) * 100).toFixed(1) : '0'
      lines.push('- ' + a.name + ': ' + a.deals + ' deals, ' + a.open + ' abertos, ' + a.won + ' ganhos, ' + a.lost + ' perdidos, Win Rate ' + wr + '%')
    })
  }

  if (s.crm.recentActivities.length > 0) {
    lines.push('\nAtividades recentes do CRM:')
    s.crm.recentActivities.slice(0, 10).forEach((a: any) => {
      lines.push('- [' + a.activityType + '] ' + a.subject + ' — ' + a.dealTitle + ' (' + a.personName + ') ' + a.date + (a.note ? ': ' + a.note.slice(0, 100) : ''))
    })
  }

  if (s.crm.recentNotes.length > 0) {
    lines.push('\nNotas recentes do CRM:')
    s.crm.recentNotes.slice(0, 8).forEach((n: any) => {
      lines.push('- ' + n.dealTitle + ' (' + n.personName + '): ' + n.content.slice(0, 150) + ' — ' + n.date)
    })
  }

  // Tracking
  lines.push('\n### TRACKING GTM')
  lines.push('Sessões: ' + s.tracking.kpis.sessions + ' | Visitantes: ' + s.tracking.kpis.visitors + ' | Page Views: ' + s.tracking.kpis.pageViews + ' | Leads GTM: ' + s.tracking.kpis.leads + ' | Conv. Rate: ' + s.tracking.kpis.convRate.toFixed(2) + '%')

  if (s.tracking.topSources.length > 0) {
    lines.push('\nFontes de tráfego:')
    s.tracking.topSources.forEach((src: any) => {
      lines.push('- ' + src.source + '/' + src.medium + ': ' + src.sessions + ' sessões, ' + src.leads + ' leads, Conv ' + src.convRate.toFixed(1) + '%')
    })
  }

  if (s.tracking.topPages.length > 0) {
    lines.push('\nTop páginas:')
    s.tracking.topPages.forEach((p: any) => {
      lines.push('- ' + p.path + ': ' + p.views + ' views, ' + p.leads + ' leads, Conv ' + p.convRate.toFixed(1) + '%')
    })
  }

  if (s.tracking.topStates.length > 0) {
    lines.push('\nTop estados:')
    s.tracking.topStates.forEach((st: any) => {
      lines.push('- ' + st.state + ': ' + st.sessions + ' sessões, ' + st.leads + ' leads, Conv ' + st.convRate.toFixed(1) + '%')
    })
  }

  // GA4
  if (s.ga4) {
    lines.push('\n### GOOGLE ANALYTICS 4')
    if (s.ga4.overview) {
      const o = s.ga4.overview
      lines.push('Sessões: ' + o.sessions + ' | Usuários: ' + o.totalUsers + ' | Novos: ' + o.newUsers + ' | Page Views: ' + o.pageViews + ' | Bounce Rate: ' + o.bounceRate.toFixed(1) + '% | Duração Média: ' + Math.round(o.avgSessionDuration) + 's | Conversões: ' + o.conversions + ' | Sessões Engajadas: ' + o.engagedSessions)
    }

    if (s.ga4.sources?.length > 0) {
      lines.push('\nFontes de tráfego (GA4):')
      s.ga4.sources.slice(0, 10).forEach((src: any) => {
        lines.push('- ' + src.source + '/' + src.medium + ': ' + src.sessions + ' sessões, ' + src.users + ' usuários, ' + src.conversions + ' conversões, Bounce ' + (src.bounceRate || 0).toFixed(1) + '%')
      })
    }

    if (s.ga4.topPages?.length > 0) {
      lines.push('\nTop páginas (GA4):')
      s.ga4.topPages.slice(0, 10).forEach((p: any) => {
        lines.push('- ' + p.pagePath + ': ' + p.pageViews + ' views, ' + p.users + ' usuários, Bounce ' + (p.bounceRate || 0).toFixed(1) + '%, Conv ' + (p.conversions || 0))
      })
    }

    if (s.ga4.geography?.length > 0) {
      lines.push('\nGeografia (GA4):')
      s.ga4.geography.slice(0, 10).forEach((g: any) => {
        lines.push('- ' + g.region + ': ' + g.sessions + ' sessões, ' + g.users + ' usuários, ' + g.conversions + ' conversões')
      })
    }

    if (s.ga4.devices?.length > 0) {
      lines.push('\nDispositivos (GA4):')
      s.ga4.devices.forEach((d: any) => {
        lines.push('- ' + d.device + ': ' + d.sessions + ' sessões, ' + d.users + ' usuários')
      })
    }

    if (s.ga4.topEvents?.length > 0) {
      lines.push('\nTop eventos (GA4):')
      s.ga4.topEvents.slice(0, 10).forEach((e: any) => {
        lines.push('- ' + e.eventName + ': ' + e.count + 'x, ' + e.users + ' usuários')
      })
    }
  }

  return lines.join('\n')
}
