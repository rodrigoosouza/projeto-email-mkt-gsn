'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Building2,
  Users,
  MapPin,
  Brain,
  Target,
  Globe,
  Linkedin,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

// ============= Types =============

interface EnrichmentPartner {
  nome: string
  qualificacao: string
}

interface EnrichmentData {
  // Dados da empresa
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  cnae_codigo?: string
  cnae_descricao?: string
  porte?: string
  data_abertura?: string
  situacao?: string
  capital_social?: number
  faturamento_estimado?: string

  // Quadro societario
  socios?: EnrichmentPartner[]

  // Endereco
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string

  // Resumo IA
  resumo_ia?: string
  segmento?: string
  maturidade_digital?: string

  // Analise estrategica
  dores_provaveis?: string[]
  oportunidades_abordagem?: string[]

  // Links
  website?: string
  linkedin?: string

  // Metadata
  enriched_at?: string
}

type EnrichmentStatus = 'pending' | 'enriching' | 'enriched' | 'failed'

interface LeadEnrichmentCardProps {
  leadId: string
  companyName: string | null
  enrichmentData?: EnrichmentData | null
  enrichmentStatus?: EnrichmentStatus | null
  onEnrichmentComplete?: () => void
}

// ============= Status Helpers =============

function getStatusBadge(status: EnrichmentStatus | null | undefined) {
  switch (status) {
    case 'enriched':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Enriquecido
        </Badge>
      )
    case 'enriching':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Enriquecendo...
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">
          <AlertCircle className="mr-1 h-3 w-3" />
          Falhou
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0">
          <Clock className="mr-1 h-3 w-3" />
          Pendente
        </Badge>
      )
  }
}

function getPorteBadge(porte: string | undefined) {
  if (!porte) return null
  const colors: Record<string, string> = {
    ME: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    EPP: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Medio': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Grande': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  }
  const color = colors[porte] || 'bg-gray-100 text-gray-600'
  return <Badge className={`${color} border-0`}>{porte}</Badge>
}

function getSituacaoBadge(situacao: string | undefined) {
  if (!situacao) return null
  const isActive = situacao.toLowerCase() === 'ativa'
  return (
    <Badge
      className={`border-0 ${
        isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {situacao}
    </Badge>
  )
}

function getMaturidadeBadge(maturidade: string | undefined) {
  if (!maturidade) return null
  const colors: Record<string, string> = {
    Baixa: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'Media': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    Alta: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  const color = colors[maturidade] || 'bg-gray-100 text-gray-600'
  return <Badge className={`${color} border-0`}>{maturidade}</Badge>
}

function formatCurrency(value: number | undefined) {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function calculateYearsActive(dataAbertura: string | undefined) {
  if (!dataAbertura) return null
  const opening = new Date(dataAbertura)
  const now = new Date()
  const years = Math.floor((now.getTime() - opening.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return years
}

function formatDate(date: string | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

// ============= Collapsible Section =============

function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 group hover:opacity-80 transition-opacity"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm font-semibold">{title}</span>
      </button>
      {open && <div className="pl-10 pb-2">{children}</div>}
    </div>
  )
}

// ============= Info Row =============

function InfoRow({ label, value, badge }: { label: string; value?: string | null; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? badge : <span className="text-sm font-medium text-right">{value || '-'}</span>}
    </div>
  )
}

// ============= Main Component =============

export function LeadEnrichmentCard({
  leadId,
  companyName,
  enrichmentData,
  enrichmentStatus,
  onEnrichmentComplete,
}: LeadEnrichmentCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<EnrichmentData | null>(enrichmentData || null)
  const [status, setStatus] = useState<EnrichmentStatus | null>(enrichmentStatus || null)
  const autoEnrichTriggered = useRef(false)

  const doEnrich = async () => {
    if (!companyName) {
      toast({
        title: 'Empresa nao informada',
        description: 'Preencha o campo "Empresa" do lead antes de enriquecer.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setStatus('enriching')

    try {
      const response = await fetch('/api/leads/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Erro ao enriquecer lead')
      }

      const result = await response.json()
      setData(result.enrichment_data)
      setStatus('enriched')
      toast({
        title: 'Empresa enriquecida',
        description: `Dossie empresarial de "${companyName}" gerado com sucesso.`,
      })
      onEnrichmentComplete?.()
    } catch (error: any) {
      setStatus('failed')
      toast({
        title: 'Erro no enriquecimento',
        description: error.message || 'Nao foi possivel enriquecer o lead.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Auto-enrich on mount if company exists and not yet enriched
  useEffect(() => {
    if (autoEnrichTriggered.current) return
    if (!companyName) return
    if (enrichmentStatus === 'enriched' || enrichmentStatus === 'enriching') return
    if (enrichmentData && Object.keys(enrichmentData).length > 2) return

    autoEnrichTriggered.current = true
    const timer = setTimeout(() => doEnrich(), 500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnrich = doEnrich

  const isEnriched = status === 'enriched' && data
  const isEnriching = status === 'enriching' || loading

  // Full address
  const fullAddress = data
    ? [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf ? `${data.uf} - ${data.cep || ''}` : '']
        .filter(Boolean)
        .join(', ')
    : null

  const yearsActive = calculateYearsActive(data?.data_abertura)

  return (
    <Card className="border-2 border-dashed border-muted hover:border-primary/20 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {companyName ? `Dossie Empresarial` : 'Enriquecimento de Empresa'}
            </CardTitle>
            {companyName && (
              <p className="text-sm text-muted-foreground">{companyName}</p>
            )}
          </div>
          <div className="ml-2">{getStatusBadge(status)}</div>
        </div>
        <Button
          size="sm"
          variant={isEnriched ? 'outline' : 'default'}
          onClick={handleEnrich}
          disabled={isEnriching || !companyName}
          className={
            !isEnriched && companyName
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0'
              : ''
          }
        >
          {isEnriching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enriquecendo...
            </>
          ) : isEnriched ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enriquecer Empresa
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {/* No company name state */}
        {!companyName && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Preencha o campo <strong>Empresa</strong> no lead para gerar o dossie empresarial.
            </p>
          </div>
        )}

        {/* Pending / No data yet */}
        {companyName && !isEnriched && !isEnriching && status !== 'failed' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Clique em <strong>Enriquecer Empresa</strong> para gerar o dossie completo.
            </p>
            <p className="text-xs text-muted-foreground">
              CNPJ, socios, endereco, faturamento, analise IA e oportunidades de abordagem.
            </p>
          </div>
        )}

        {/* Loading state */}
        {isEnriching && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground">
                Buscando dados da empresa e gerando analise com IA...
              </p>
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Separator className="my-4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Separator className="my-4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {/* Failed state */}
        {status === 'failed' && !isEnriching && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Nao foi possivel enriquecer os dados desta empresa.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique o nome da empresa e tente novamente.
            </p>
          </div>
        )}

        {/* Enriched data */}
        {isEnriched && !isEnriching && (
          <div className="space-y-1">
            {/* Dados da Empresa */}
            <CollapsibleSection title="Dados da Empresa" icon={Building2} iconColor="text-blue-500">
              <div className="space-y-0.5">
                <InfoRow label="CNPJ" value={data.cnpj} />
                <InfoRow label="Razao Social" value={data.razao_social} />
                <InfoRow label="Nome Fantasia" value={data.nome_fantasia} />
                {data.cnae_codigo && (
                  <InfoRow
                    label="CNAE Principal"
                    value={`${data.cnae_codigo} - ${data.cnae_descricao || ''}`}
                  />
                )}
                <InfoRow label="Porte" badge={getPorteBadge(data.porte)} />
                <InfoRow label="Situacao" badge={getSituacaoBadge(data.situacao)} />
                <InfoRow
                  label="Data de Abertura"
                  value={
                    data.data_abertura
                      ? `${formatDate(data.data_abertura)}${yearsActive !== null ? ` (${yearsActive} anos)` : ''}`
                      : '-'
                  }
                />
                <InfoRow label="Capital Social" value={formatCurrency(data.capital_social)} />
                <InfoRow label="Faturamento Estimado" value={data.faturamento_estimado || '-'} />
              </div>
            </CollapsibleSection>

            <Separator />

            {/* Quadro Societario */}
            {data.socios && data.socios.length > 0 && (
              <>
                <CollapsibleSection title="Quadro Societario" icon={Users} iconColor="text-blue-500">
                  <div className="space-y-2">
                    {data.socios.map((socio, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              {socio.nome?.charAt(0) || '?'}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{socio.nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{socio.qualificacao}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Endereco */}
            {fullAddress && fullAddress.length > 2 && (
              <>
                <CollapsibleSection title="Endereco" icon={MapPin} iconColor="text-blue-500">
                  <p className="text-sm">{fullAddress}</p>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Resumo IA */}
            {data.resumo_ia && (
              <>
                <CollapsibleSection title="Resumo IA" icon={Brain} iconColor="text-purple-500">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-4">
                      <p className="text-sm leading-relaxed">{data.resumo_ia}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {data.segmento && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Segmento</p>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                            {data.segmento}
                          </Badge>
                        </div>
                      )}
                      {data.maturidade_digital && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Maturidade Digital</p>
                          {getMaturidadeBadge(data.maturidade_digital)}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Analise Estrategica */}
            {((data.dores_provaveis && data.dores_provaveis.length > 0) ||
              (data.oportunidades_abordagem && data.oportunidades_abordagem.length > 0)) && (
              <>
                <CollapsibleSection title="Analise Estrategica" icon={Target} iconColor="text-green-500">
                  <div className="space-y-4">
                    {data.dores_provaveis && data.dores_provaveis.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                          Dores Provaveis
                        </p>
                        <ul className="space-y-1.5">
                          {data.dores_provaveis.map((dor, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                              {dor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.oportunidades_abordagem && data.oportunidades_abordagem.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                          Oportunidades de Abordagem
                        </p>
                        <ul className="space-y-1.5">
                          {data.oportunidades_abordagem.map((oportunidade, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                              {oportunidade}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Links */}
            {(data.website || data.linkedin) && (
              <CollapsibleSection title="Links" icon={Globe} iconColor="text-blue-500">
                <div className="flex flex-wrap gap-3">
                  {data.website && (
                    <a
                      href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      Website
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  {data.linkedin && (
                    <a
                      href={data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5 text-blue-700" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Enrichment timestamp */}
            {data.enriched_at && (
              <p className="text-xs text-muted-foreground pt-2 text-right">
                Ultima atualizacao: {new Date(data.enriched_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
