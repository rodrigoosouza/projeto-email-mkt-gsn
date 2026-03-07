'use client'

import { useState } from 'react'
import {
  Sparkles, User, Building2, Clock, Search, Megaphone, Globe, BarChart3,
  Loader2, Copy, Check, ChevronDown, ChevronUp, Eye, EyeOff, Target, TrendingUp,
  ExternalLink, ClipboardCopy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { saveStrategy } from '@/lib/marketing/profiles'
import { GoogleAdsPreview } from './google-ads-preview'
import { CROPagePreview } from './cro-page-preview'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { MarketingProfile, Persona, ICP, Campanha, PaginaCRO } from '@/lib/marketing/types'

interface StrategyViewerProps {
  profile: MarketingProfile
  onRefresh: () => void
}

function ArrayBadges({ items, variant = 'secondary' }: { items: string[]; variant?: 'default' | 'secondary' | 'outline' }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item, i) => (
        <Badge key={i} variant={variant} className="text-xs">{item}</Badge>
      ))}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function CopyableItem({ text, id, copied, onCopy, maxChars }: { text: string; id: string; copied: string | null; onCopy: (text: string, id: string) => void; maxChars?: number }) {
  return (
    <div
      className="flex items-center justify-between p-3 bg-muted rounded-lg group cursor-pointer hover:bg-muted/80 transition-colors"
      onClick={() => onCopy(text, id)}
    >
      <span className="text-sm">{text}</span>
      <div className="flex items-center gap-2">
        {maxChars && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded',
            text.length <= maxChars ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
          )}>
            {text.length}/{maxChars}
          </span>
        )}
        {copied === id ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}

function PersonaSection({ persona }: { persona: Persona }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Perfil da Persona" icon={<User className="w-4 h-4" />}>
        <div className="space-y-4">
          <Field label="Quem e" value={persona.quemE} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Idade" value={persona.idade} />
            <Field label="Cargo" value={persona.cargo} />
          </div>
          <Field label="Rotina diaria" value={persona.rotinaDiaria} />
          <Field label="Jornada de compra" value={persona.jornada} />
          <Field label="Momento de consciencia" value={persona.momentoConsciencia} />
          <Field label="O que determina conversao" value={persona.determinaConversao} />
        </div>
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Dor Principal" icon={<User className="w-4 h-4" />}>
          <p className="font-medium mb-3">{persona.dorPrincipal}</p>
          <span className="text-xs font-medium text-muted-foreground uppercase">Dores Secundarias:</span>
          <ul className="mt-2 space-y-1">
            {persona.doresSecundarias?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Desejo Primario" icon={<User className="w-4 h-4" />}>
          <p className="font-medium mb-3">{persona.desejoPrimario}</p>
          <span className="text-xs font-medium text-muted-foreground uppercase">Desejos Secundarios:</span>
          <ul className="mt-2 space-y-1">
            {persona.desejosSecundarios?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Medos e Objecoes" icon={<User className="w-4 h-4" />}>
        <ul className="space-y-2">
          {persona.medosObjecoes?.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-destructive mt-1">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Gatilhos Mentais Efetivos" icon={<User className="w-4 h-4" />}>
        <ArrayBadges items={persona.gatilhosMentais || []} variant="default" />
      </SectionCard>

      <SectionCard title="Buscas no Google" icon={<Search className="w-4 h-4" />}>
        <ArrayBadges items={persona.buscasGoogle || []} variant="outline" />
      </SectionCard>

      <SectionCard title="Palavras e Expressoes Usadas" icon={<User className="w-4 h-4" />}>
        <ArrayBadges items={persona.palavrasUsadas || []} variant="secondary" />
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Influenciadores da Decisao" icon={<User className="w-4 h-4" />}>
          <ul className="space-y-2">
            {persona.influenciadores?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Onde Consome Conteudo" icon={<User className="w-4 h-4" />}>
          <ul className="space-y-2">
            {persona.ondeConsome?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Prova Necessaria" icon={<Check className="w-4 h-4" />}>
        <ul className="space-y-2">
          {persona.provaNecessaria?.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary mt-1">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function ICPSection({ icp }: { icp: ICP }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Ideal Customer Profile" icon={<Building2 className="w-4 h-4" />}>
        <div className="space-y-4">
          <Field label="Tipo de empresa/cliente" value={icp.tipoEmpresa} />
          <Field label="Segmento de mercado" value={icp.segmentoMercado} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Faturamento anual" value={icp.faturamentoAnual} />
            <Field label="Nr funcionarios" value={icp.numeroFuncionarios} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ticket ideal" value={icp.ticketIdeal} />
            <Field label="Ciclo de venda" value={icp.ciclodeVenda} />
          </div>
          <Field label="Cargo comprador" value={icp.cargoComprador} />
          <Field label="Maturidade do cliente" value={icp.maturidadeCliente} />
          <Field label="Momento de entrada" value={icp.momentoEntrada} />
        </div>
      </SectionCard>

      <SectionCard title="Influenciadores da Decisao" icon={<Building2 className="w-4 h-4" />}>
        <ArrayBadges items={icp.influenciadoresDecisao || []} />
      </SectionCard>

      <SectionCard title="Gatilhos de Compra" icon={<Building2 className="w-4 h-4" />}>
        <ul className="space-y-2">
          {icp.gatilhosCompra?.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary mt-1">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Barreiras" icon={<Building2 className="w-4 h-4" />}>
          <ul className="space-y-2">
            {icp.barreiras?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-destructive mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Sinais de Prontidao" icon={<Check className="w-4 h-4" />}>
          <ul className="space-y-2">
            {icp.sinaisProntidao?.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-500 mt-1">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Canais de Aquisicao" icon={<Building2 className="w-4 h-4" />}>
        <ArrayBadges items={icp.canaisAquisicao || []} variant="default" />
      </SectionCard>

      <SectionCard title="Concorrentes Principais" icon={<Building2 className="w-4 h-4" />}>
        <ul className="space-y-2">
          {icp.concorrentesPrincipais?.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground mt-1">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

const campanhaColors: Record<string, string> = {
  topo: 'bg-blue-500',
  dorContratacao: 'bg-orange-500',
  defesaMarca: 'bg-purple-500',
  remarketing: 'bg-green-500',
}

const campanhaIcons: Record<string, React.ElementType> = {
  topo: Target,
  dorContratacao: TrendingUp,
  defesaMarca: Building2,
  remarketing: Megaphone,
}

function buildCopyText(paginaCRO: PaginaCRO): string {
  const lines: string[] = []
  lines.push(`HEADLINE: ${paginaCRO.headlinePrincipal}`)
  lines.push(`SUBHEADLINE: ${paginaCRO.subheadline}`)
  lines.push(`\nPOR QUE IMPORTA AGORA: ${paginaCRO.porqueImportaAgora}`)
  lines.push(`\nBENEFICIOS:`)
  paginaCRO.beneficiosDiretos?.forEach((b, i) => lines.push(`  ${i + 1}. ${b}`))
  lines.push(`\nPROVA SOCIAL: ${paginaCRO.provaSocial}`)
  lines.push(`URGENCIA: ${paginaCRO.urgencia}`)
  lines.push(`\nQUEBRA DE OBJECOES:`)
  paginaCRO.quebraObjecoes?.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`))
  lines.push(`\nCOMO FUNCIONA:`)
  paginaCRO.comoFunciona?.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  lines.push(`\nCTA PRINCIPAL: ${paginaCRO.ctaPrincipal}`)
  lines.push(`MICROCOPY: ${paginaCRO.microcopyProva}`)
  if (paginaCRO.roteiroVideo) {
    lines.push(`\nROTEIRO DE VIDEO:\n${paginaCRO.roteiroVideo}`)
  }
  return lines.join('\n')
}

export function StrategyViewer({ profile, onRefresh }: StrategyViewerProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>(['topo'])
  const [showAdsPreview, setShowAdsPreview] = useState(false)
  const [showCROPreview, setShowCROPreview] = useState(false)

  const hasStrategy = !!profile.persona && !!profile.icp

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleCampaign = (key: string) => {
    setExpandedCampaigns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleGenerate = async () => {
    if (!currentOrg?.id) return
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id, answers: profile.briefing }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao gerar estrategia')
      }

      const data = await res.json()
      await saveStrategy(currentOrg.id, data.persona, data.icp, data.strategy, data.model)
      toast({ title: 'Estrategia gerada com sucesso!' })
      onRefresh()
    } catch (error) {
      console.error('Erro:', error)
      toast({ title: 'Erro ao gerar estrategia', description: error instanceof Error ? error.message : 'Erro', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  if (!hasStrategy) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg">Gerar Estrategia com IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.status === 'briefing_done'
                ? 'O briefing esta completo. Clique abaixo para gerar persona, ICP e estrategia.'
                : 'Complete o briefing primeiro para gerar a estrategia.'}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={generating || profile.status === 'draft'}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando... (pode levar 30s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Estrategia
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const strategy = profile.strategy

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Estrategia Gerada</h3>
          <p className="text-xs text-muted-foreground">
            Modelo: {profile.strategy_model} | Gerado em: {profile.strategy_generated_at ? new Date(profile.strategy_generated_at).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Regenerar
        </Button>
      </div>

      <Tabs defaultValue="persona">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="persona"><User className="h-3.5 w-3.5 mr-1" />Persona</TabsTrigger>
          <TabsTrigger value="icp"><Building2 className="h-3.5 w-3.5 mr-1" />ICP</TabsTrigger>
          {strategy && (
            <>
              <TabsTrigger value="horarios"><Clock className="h-3.5 w-3.5 mr-1" />Horarios</TabsTrigger>
              <TabsTrigger value="keywords"><Search className="h-3.5 w-3.5 mr-1" />Palavras-chave</TabsTrigger>
              <TabsTrigger value="ads"><Megaphone className="h-3.5 w-3.5 mr-1" />Anuncios</TabsTrigger>
              <TabsTrigger value="cro"><Globe className="h-3.5 w-3.5 mr-1" />Pagina CRO</TabsTrigger>
              <TabsTrigger value="campaigns"><BarChart3 className="h-3.5 w-3.5 mr-1" />Campanhas</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* PERSONA */}
        <TabsContent value="persona">
          {profile.persona && <PersonaSection persona={profile.persona} />}
        </TabsContent>

        {/* ICP */}
        <TabsContent value="icp">
          {profile.icp && <ICPSection icp={profile.icp} />}
        </TabsContent>

        {strategy && (
          <>
            {/* HORARIOS */}
            <TabsContent value="horarios">
              <div className="space-y-6">
                <SectionCard title="Horarios de Intencao Alta" icon={<Clock className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.horarios?.intencaoAlta || []} variant="default" />
                </SectionCard>

                <SectionCard title="Horarios de Pesquisa Emocional" icon={<Clock className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.horarios?.pesquisaEmocional || []} variant="outline" />
                </SectionCard>

                <SectionCard title="Horarios Comerciais B2B" icon={<Clock className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.horarios?.comercialB2B || []} />
                </SectionCard>

                {strategy.horarios?.recomendacaoOtimizacao && (
                  <SectionCard title="Recomendacao de Otimizacao" icon={<Clock className="w-4 h-4" />}>
                    <p className="text-sm">{strategy.horarios.recomendacaoOtimizacao}</p>
                  </SectionCard>
                )}

                {strategy.horarios?.justificativas && Object.keys(strategy.horarios.justificativas).length > 0 && (
                  <SectionCard title="Justificativas" icon={<Clock className="w-4 h-4" />}>
                    <div className="space-y-3">
                      {Object.entries(strategy.horarios.justificativas).map(([horario, justificativa]) => (
                        <div key={horario} className="border-l-2 border-primary/50 pl-4">
                          <span className="text-primary font-semibold text-sm">{horario}</span>
                          <p className="text-muted-foreground text-sm mt-1">{justificativa}</p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </div>
            </TabsContent>

            {/* KEYWORDS */}
            <TabsContent value="keywords">
              <div className="space-y-6">
                <SectionCard title="Topo de Funil (Descoberta)" icon={<Search className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.palavrasChave?.topo || []} variant="outline" />
                </SectionCard>

                <SectionCard title="Dor de Contratacao (Fundo)" icon={<Search className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.palavrasChave?.dorContratacao || []} variant="default" />
                </SectionCard>

                <SectionCard title="Defesa de Marca" icon={<Search className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.palavrasChave?.defesaMarca || []} />
                </SectionCard>

                <SectionCard title="Palavras Negativas" icon={<Search className="w-4 h-4" />}>
                  <ArrayBadges items={strategy.palavrasChave?.negativas || []} variant="outline" />
                </SectionCard>

                {(strategy.palavrasChave?.estrategiaCorrespondencia || strategy.palavrasChave?.regrasSegmentacao || strategy.palavrasChave?.insightsIntencao) && (
                  <SectionCard title="Estrategia de Correspondencia" icon={<Search className="w-4 h-4" />}>
                    <div className="space-y-4">
                      {strategy.palavrasChave.estrategiaCorrespondencia && (
                        <p className="text-sm">{strategy.palavrasChave.estrategiaCorrespondencia}</p>
                      )}
                      {strategy.palavrasChave.regrasSegmentacao && (
                        <Field label="Regras de Segmentacao" value={strategy.palavrasChave.regrasSegmentacao} />
                      )}
                      {strategy.palavrasChave.insightsIntencao && (
                        <Field label="Insights de Intencao" value={strategy.palavrasChave.insightsIntencao} />
                      )}
                    </div>
                  </SectionCard>
                )}
              </div>
            </TabsContent>

            {/* ADS */}
            <TabsContent value="ads">
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    variant={showAdsPreview ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowAdsPreview(!showAdsPreview)}
                  >
                    {showAdsPreview ? (
                      <><EyeOff className="w-4 h-4 mr-1" />Ver Lista</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" />Ver Previa Google Ads</>
                    )}
                  </Button>
                </div>

                {showAdsPreview ? (
                  <GoogleAdsPreview
                    anuncios={strategy.anuncios}
                    url={profile.briefing?.paginaDestino || 'www.seusite.com.br'}
                    businessName={profile.briefing?.segmento || 'Sua Empresa'}
                  />
                ) : (
                  <>
                    <SectionCard
                      title={`Titulos (${strategy.anuncios?.titulos?.length || 0} criados)`}
                      icon={<Megaphone className="w-4 h-4" />}
                    >
                      <div className="space-y-2">
                        {(strategy.anuncios?.titulos || []).map((t: string, i: number) => (
                          <CopyableItem
                            key={i}
                            text={t}
                            id={`titulo-${i}`}
                            copied={copied}
                            onCopy={copyToClipboard}
                            maxChars={30}
                          />
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard
                      title={`Descricoes (${strategy.anuncios?.descricoes?.length || 0} criadas)`}
                      icon={<Megaphone className="w-4 h-4" />}
                    >
                      <div className="space-y-2">
                        {(strategy.anuncios?.descricoes || []).map((d: string, i: number) => (
                          <CopyableItem
                            key={i}
                            text={d}
                            id={`desc-${i}`}
                            copied={copied}
                            onCopy={copyToClipboard}
                            maxChars={90}
                          />
                        ))}
                      </div>
                    </SectionCard>
                  </>
                )}
              </div>
            </TabsContent>

            {/* CRO */}
            <TabsContent value="cro">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {strategy.paginaCRO && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = buildCopyText(strategy.paginaCRO!)
                            navigator.clipboard.writeText(text)
                            setCopied('cro-full')
                            setTimeout(() => setCopied(null), 2000)
                            toast({ title: 'Copy copiada!' })
                          }}
                        >
                          {copied === 'cro-full' ? (
                            <Check className="w-4 h-4 mr-1" />
                          ) : (
                            <ClipboardCopy className="w-4 h-4 mr-1" />
                          )}
                          Copiar toda a Copy
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Save CRO copy + org info to localStorage for LP builder
                            const lpData = {
                              orgId: currentOrg?.id,
                              orgName: currentOrg?.name,
                              paginaCRO: strategy.paginaCRO,
                              briefing: profile.briefing,
                              persona: profile.persona,
                              brandIdentity: profile.brand_identity,
                              timestamp: Date.now(),
                            }
                            localStorage.setItem('lp-builder-strategy-copy', JSON.stringify(lpData))
                            router.push('/landing-pages/new?from=strategy')
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Criar Landing Page
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant={showCROPreview ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowCROPreview(!showCROPreview)}
                  >
                    {showCROPreview ? (
                      <><EyeOff className="w-4 h-4 mr-1" />Ver Componentes</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" />Ver Previa da Pagina</>
                    )}
                  </Button>
                </div>

                {showCROPreview && strategy.paginaCRO ? (
                  <CROPagePreview
                    paginaCRO={strategy.paginaCRO}
                    produtoServico={profile.briefing?.produtoServico}
                  />
                ) : (
                  strategy.paginaCRO && (
                    <>
                      <SectionCard title="Estrutura da Pagina" icon={<Globe className="w-4 h-4" />}>
                        <div className="space-y-6">
                          <div>
                            <span className="text-xs text-muted-foreground font-medium">Headline Principal</span>
                            <p className="text-xl font-bold mt-1">{strategy.paginaCRO.headlinePrincipal}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground font-medium">Subheadline</span>
                            <p className="text-lg mt-1">{strategy.paginaCRO.subheadline}</p>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Por que isso importa agora" icon={<Globe className="w-4 h-4" />}>
                        <p className="text-sm">{strategy.paginaCRO.porqueImportaAgora}</p>
                      </SectionCard>

                      <SectionCard title="Beneficios Diretos" icon={<Check className="w-4 h-4" />}>
                        <ul className="space-y-2">
                          {strategy.paginaCRO.beneficiosDiretos?.map((item: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </SectionCard>

                      <SectionCard title="Prova Social" icon={<User className="w-4 h-4" />}>
                        <p className="text-sm italic">&ldquo;{strategy.paginaCRO.provaSocial}&rdquo;</p>
                      </SectionCard>

                      <SectionCard title="Urgencia" icon={<Clock className="w-4 h-4" />}>
                        <p className="text-sm font-semibold text-primary">{strategy.paginaCRO.urgencia}</p>
                      </SectionCard>

                      <SectionCard title="Quebra de Objecoes" icon={<Globe className="w-4 h-4" />}>
                        <div className="space-y-3">
                          {strategy.paginaCRO.quebraObjecoes?.map((item: string, i: number) => (
                            <div key={i} className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">{item}</p>
                            </div>
                          ))}
                        </div>
                      </SectionCard>

                      <SectionCard title="Como Funciona" icon={<Globe className="w-4 h-4" />}>
                        <div className="space-y-3">
                          {strategy.paginaCRO.comoFunciona?.map((step: string, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                                {i + 1}
                              </div>
                              <span className="text-sm">{step.replace(/^\d+\.\s/, '')}</span>
                            </div>
                          ))}
                        </div>
                      </SectionCard>

                      <SectionCard title="CTA e Microcopy" icon={<Megaphone className="w-4 h-4" />}>
                        <div className="space-y-4">
                          <div className="p-4 bg-primary rounded-xl text-center">
                            <span className="font-bold text-lg text-primary-foreground">{strategy.paginaCRO.ctaPrincipal}</span>
                          </div>
                          <p className="text-sm text-muted-foreground text-center">{strategy.paginaCRO.microcopyProva}</p>
                        </div>
                      </SectionCard>

                      {strategy.paginaCRO.roteiroVideo && (
                        <SectionCard title="Roteiro de Video" icon={<Globe className="w-4 h-4" />}>
                          <div className="bg-muted p-4 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap font-sans">
                              {strategy.paginaCRO.roteiroVideo}
                            </pre>
                          </div>
                        </SectionCard>
                      )}
                    </>
                  )
                )}
              </div>
            </TabsContent>

            {/* CAMPAIGNS */}
            <TabsContent value="campaigns">
              <div className="space-y-4">
                {strategy.campanhas &&
                  (['topo', 'dorContratacao', 'defesaMarca', 'remarketing'] as const).map((key) => {
                    const campanha = strategy.campanhas[key] as Campanha
                    if (!campanha) return null
                    const isExpanded = expandedCampaigns.includes(key)
                    const CampanhaIcon = campanhaIcons[key] || Megaphone

                    return (
                      <Card key={key} className="overflow-hidden">
                        <button
                          onClick={() => toggleCampaign(key)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', campanhaColors[key])}>
                              <CampanhaIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold">{campanha.nome}</h3>
                              <p className="text-sm text-muted-foreground">{campanha.objetivo}</p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4">
                            {/* Strategy */}
                            <div className="p-4 bg-muted/50 rounded-xl">
                              <span className="text-xs uppercase tracking-wider text-primary font-semibold">Estrategia</span>
                              <p className="text-sm mt-2">{campanha.estrategia}</p>
                            </div>

                            {/* Config & Segmentations */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm text-muted-foreground font-medium">Configuracoes</span>
                                <ul className="mt-2 space-y-1">
                                  {campanha.configuracoes?.map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">&#8226;</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground font-medium">Segmentacoes</span>
                                <ul className="mt-2 space-y-1">
                                  {campanha.segmentacoes?.map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">&#8226;</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Keywords */}
                            {campanha.palavrasChave && campanha.palavrasChave.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground font-medium">Palavras-chave</span>
                                <ArrayBadges items={campanha.palavrasChave} variant="default" />
                              </div>
                            )}

                            {/* Ad types */}
                            {campanha.tiposAnuncio && campanha.tiposAnuncio.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground font-medium">Tipos de Anuncio</span>
                                <ArrayBadges items={campanha.tiposAnuncio} />
                              </div>
                            )}

                            {/* Expected metrics */}
                            {campanha.metricasEsperadas && campanha.metricasEsperadas.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground font-medium">Metricas Esperadas</span>
                                <ul className="mt-2 space-y-1">
                                  {campanha.metricasEsperadas.map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">&#8226;</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Budget */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-primary/10 rounded-lg">
                                <span className="text-xs text-muted-foreground">Lance Sugerido</span>
                                <p className="text-primary font-semibold mt-1 text-sm">{campanha.lanceSugerido}</p>
                              </div>
                              <div className="p-3 bg-primary/10 rounded-lg">
                                <span className="text-xs text-muted-foreground">Ajuste de Orcamento</span>
                                <p className="text-primary font-semibold mt-1 text-sm">{campanha.ajusteOrcamento}</p>
                              </div>
                            </div>

                            {/* Notes */}
                            {campanha.observacoes && (
                              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <span className="text-xs text-amber-600 font-semibold">Observacoes Importantes</span>
                                <p className="text-sm mt-1">{campanha.observacoes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
