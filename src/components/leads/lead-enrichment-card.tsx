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
  Download,
  Instagram,
  Facebook,
  Package as PackageIcon,
  Cpu,
  Newspaper,
  Swords,
  UserCheck,
  Mail,
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
  linkedin_url?: string
  descricao?: string
  email_provavel?: string
  tipo?: string
}

interface EnrichmentEmployee {
  nome: string
  cargo: string
  linkedin_url?: string
  departamento?: string
}

interface EnrichmentData {
  // Dados da empresa
  cnpj?: string | null
  razao_social?: string | null
  nome_fantasia?: string | null
  // CNAE pode vir como objeto ou flat
  cnae_principal?: { codigo: string; descricao: string } | null
  cnae_codigo?: string
  cnae_descricao?: string
  porte?: string | null
  // Data de abertura: pode vir como "abertura" ou "data_abertura"
  abertura?: string | null
  data_abertura?: string | null
  anos_atividade?: number | null
  ano_fundacao?: string | null
  situacao?: string | null
  capital_social?: number | null
  faturamento_estimado?: string | null
  numero_funcionarios?: string | null

  // Quadro societario
  socios?: EnrichmentPartner[]

  // Funcionarios chave
  funcionarios_chave?: EnrichmentEmployee[]

  // Endereco pode vir como objeto ou flat
  endereco?: { logradouro: string; municipio: string; uf: string; cep: string } | null
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string

  // Resumo IA
  resumo_ia?: string | null
  segmento_ia?: string | null
  segmento?: string | null
  maturidade_digital?: string | null
  presenca_digital?: string | null

  // Analise estrategica
  dores_provaveis?: string[]
  oportunidades_abordagem?: string[]

  // Produtos e mercado
  produtos_servicos?: string[]
  mercado_alvo?: string | null
  concorrentes?: string[]
  tecnologias_usadas?: string[]
  noticias_recentes?: string | null

  // Links
  website?: string | null
  linkedin?: string | null
  linkedin_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null

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

function getPorteBadge(porte: string | undefined | null) {
  if (!porte) return null
  const colors: Record<string, string> = {
    ME: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    MEI: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    EPP: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Medio': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    MEDIO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Grande': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    GRANDE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  }
  const color = colors[porte] || 'bg-gray-100 text-gray-600'
  return <Badge className={`${color} border-0`}>{porte}</Badge>
}

function getSituacaoBadge(situacao: string | undefined | null) {
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

function getMaturidadeBadge(maturidade: string | undefined | null) {
  if (!maturidade) return null
  const lower = maturidade.toLowerCase()
  const colors: Record<string, string> = {
    baixa: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'média': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    alta: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  const color = colors[lower] || 'bg-gray-100 text-gray-600'
  return <Badge className={`${color} border-0`}>{maturidade}</Badge>
}

function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function calculateYearsActive(dataAbertura: string | undefined | null) {
  if (!dataAbertura) return null
  const opening = new Date(dataAbertura)
  if (isNaN(opening.getTime())) return null
  const now = new Date()
  const years = Math.floor((now.getTime() - opening.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return years
}

function formatDate(date: string | undefined | null) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('pt-BR')
}

// ============= Collapsible Section =============

function CollapsibleSection({
  title,
  icon: Icon,
  iconColor,
  defaultOpen = true,
  children,
  count,
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  defaultOpen?: boolean
  children: React.ReactNode
  count?: number
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
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>
        )}
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
      {badge ? badge : <span className="text-sm font-medium text-right max-w-[60%] break-all">{value || '-'}</span>}
    </div>
  )
}

// ============= LinkedIn Link =============

function LinkedInLink({ url, name }: { url: string; name: string }) {
  const href = url.startsWith('http') ? url : `https://${url}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      title={`LinkedIn de ${name}`}
    >
      <Linkedin className="h-3.5 w-3.5 text-blue-700" />
    </a>
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
  const [pipedriveLoading, setPipedriveLoading] = useState(false)
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

  // Auto-enrich on mount: 1) Pipedrive notes -> 2) IA research
  useEffect(() => {
    if (autoEnrichTriggered.current) return
    if (!companyName) return

    const hasValidData = enrichmentData && (enrichmentData as any)?.resumo_ia
    if (enrichmentStatus === 'enriching') return
    if (enrichmentStatus === 'enriched' && hasValidData) return

    autoEnrichTriggered.current = true

    const autoRun = async () => {
      // Step 1: Import from Pipedrive notes first (has real data)
      try {
        setStatus('enriching')
        setPipedriveLoading(true)
        const pipeRes = await fetch('/api/leads/parse-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        })
        if (pipeRes.ok) {
          const pipeData = await pipeRes.json()
          if (pipeData.updated_fields?.length > 0) {
            onEnrichmentComplete?.()
          }
        }
      } catch { /* continue to AI enrich */ }
      finally { setPipedriveLoading(false) }

      // Step 2: Enrich with AI research
      try {
        setLoading(true)
        const enrichRes = await fetch('/api/leads/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        })
        if (enrichRes.ok) {
          const result = await enrichRes.json()
          setData(result.enrichment_data)
          setStatus('enriched')
          onEnrichmentComplete?.()
        } else {
          setStatus('failed')
        }
      } catch {
        setStatus('failed')
      } finally {
        setLoading(false)
      }
    }

    setTimeout(autoRun, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnrich = doEnrich

  const handlePipedriveImport = async () => {
    setPipedriveLoading(true)

    try {
      const response = await fetch('/api/leads/parse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao importar dados do Pipedrive')
      }

      if (result.updated_fields && result.updated_fields.length > 0) {
        toast({
          title: 'Dados importados do Pipedrive',
          description: result.message || `${result.updated_fields.length} campo(s) atualizado(s).`,
        })
        onEnrichmentComplete?.()
      } else {
        toast({
          title: 'Nenhum dado novo encontrado',
          description: result.error || result.message || 'As notas do Pipedrive nao continham dados novos para este lead.',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao importar do Pipedrive',
        description: error.message || 'Nao foi possivel importar dados das notas.',
        variant: 'destructive',
      })
    } finally {
      setPipedriveLoading(false)
    }
  }

  const isEnriched = status === 'enriched' && data
  const isEnriching = status === 'enriching' || loading

  // Normalize data: handle both flat and nested field formats
  const cnaeCode = data?.cnae_principal?.codigo || data?.cnae_codigo || null
  const cnaeDesc = data?.cnae_principal?.descricao || data?.cnae_descricao || null
  const dataAbertura = data?.abertura || data?.data_abertura || null
  const segmento = data?.segmento_ia || data?.segmento || null
  const linkedinUrl = data?.linkedin_url || data?.linkedin || null

  // Address: handle both object and flat formats
  const fullAddress = data?.endereco
    ? [data.endereco.logradouro, data.endereco.municipio, data.endereco.uf ? `${data.endereco.uf} - ${data.endereco.cep || ''}` : '']
        .filter(Boolean)
        .join(', ')
    : data
    ? [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf ? `${data.uf} - ${data.cep || ''}` : '']
        .filter(Boolean)
        .join(', ')
    : null

  const yearsActive = data?.anos_atividade ?? calculateYearsActive(dataAbertura)

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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePipedriveImport}
            disabled={pipedriveLoading || isEnriching}
          >
            {pipedriveLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Importar do Pipedrive
              </>
            )}
          </Button>
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
        </div>
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
              CNPJ, socios, LinkedIn, funcionarios, concorrentes, analise IA e oportunidades.
            </p>
          </div>
        )}

        {/* Loading state */}
        {isEnriching && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground">
                Buscando dados da empresa, LinkedIn dos socios, concorrentes e gerando analise com IA...
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
                {cnaeCode && (
                  <InfoRow
                    label="CNAE Principal"
                    value={`${cnaeCode} - ${cnaeDesc || ''}`}
                  />
                )}
                <InfoRow label="Porte" badge={getPorteBadge(data.porte)} />
                <InfoRow label="Situacao" badge={getSituacaoBadge(data.situacao)} />
                <InfoRow
                  label="Data de Abertura"
                  value={
                    dataAbertura
                      ? `${formatDate(dataAbertura)}${yearsActive !== null ? ` (${yearsActive} anos)` : ''}`
                      : data.ano_fundacao
                      ? `Fundada em ${data.ano_fundacao}`
                      : '-'
                  }
                />
                <InfoRow label="Capital Social" value={formatCurrency(data.capital_social)} />
                <InfoRow label="Faturamento Estimado" value={data.faturamento_estimado || '-'} />
                <InfoRow label="Funcionarios" value={data.numero_funcionarios || '-'} />
              </div>
            </CollapsibleSection>

            <Separator />

            {/* Quadro Societario */}
            {data.socios && data.socios.length > 0 && (
              <>
                <CollapsibleSection title="Socios e Decisores" icon={Users} iconColor="text-blue-500" count={data.socios.length}>
                  <div className="space-y-2">
                    {data.socios.map((socio, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                {socio.nome?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">{socio.nome}</span>
                              {socio.tipo && (
                                <Badge variant="outline" className="ml-2 text-xs">{socio.tipo}</Badge>
                              )}
                            </div>
                            {socio.linkedin_url && (
                              <LinkedInLink url={socio.linkedin_url} name={socio.nome} />
                            )}
                            {socio.email_provavel && (
                              <a
                                href={`mailto:${socio.email_provavel}`}
                                className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title={socio.email_provavel}
                              >
                                <Mail className="h-3.5 w-3.5 text-gray-500" />
                              </a>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{socio.qualificacao}</span>
                        </div>
                        {socio.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 pl-9">{socio.descricao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Funcionarios Chave */}
            {data.funcionarios_chave && data.funcionarios_chave.length > 0 && (
              <>
                <CollapsibleSection title="Funcionarios Chave" icon={UserCheck} iconColor="text-indigo-500" count={data.funcionarios_chave.length}>
                  <div className="space-y-2">
                    {data.funcionarios_chave.map((func, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                {func.nome?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">{func.nome}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {func.cargo}</span>
                            </div>
                            {func.linkedin_url && (
                              <LinkedInLink url={func.linkedin_url} name={func.nome} />
                            )}
                          </div>
                          {func.departamento && (
                            <Badge variant="outline" className="text-xs">{func.departamento}</Badge>
                          )}
                        </div>
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
                      {segmento && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Segmento</p>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                            {segmento}
                          </Badge>
                        </div>
                      )}
                      {data.maturidade_digital && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Maturidade Digital</p>
                          {getMaturidadeBadge(data.maturidade_digital)}
                        </div>
                      )}
                      {data.mercado_alvo && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Mercado Alvo</p>
                          <p className="text-xs font-medium">{data.mercado_alvo}</p>
                        </div>
                      )}
                    </div>
                    {data.presenca_digital && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Presenca Digital</p>
                        <p className="text-xs">{data.presenca_digital}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Produtos e Servicos */}
            {data.produtos_servicos && data.produtos_servicos.length > 0 && (
              <>
                <CollapsibleSection title="Produtos e Servicos" icon={PackageIcon} iconColor="text-orange-500" count={data.produtos_servicos.length} defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {data.produtos_servicos.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Concorrentes */}
            {data.concorrentes && data.concorrentes.length > 0 && (
              <>
                <CollapsibleSection title="Concorrentes" icon={Swords} iconColor="text-red-500" count={data.concorrentes.length} defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {data.concorrentes.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
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

            {/* Tecnologias Usadas */}
            {data.tecnologias_usadas && data.tecnologias_usadas.length > 0 && (
              <>
                <CollapsibleSection title="Tecnologias Usadas" icon={Cpu} iconColor="text-cyan-500" count={data.tecnologias_usadas.length} defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {data.tecnologias_usadas.map((tech, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-cyan-50 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-0">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Noticias Recentes */}
            {data.noticias_recentes && (
              <>
                <CollapsibleSection title="Noticias Recentes" icon={Newspaper} iconColor="text-amber-500" defaultOpen={false}>
                  <p className="text-sm">{data.noticias_recentes}</p>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Links e Redes Sociais */}
            {(data.website || linkedinUrl || data.instagram_url || data.facebook_url) && (
              <CollapsibleSection title="Links e Redes Sociais" icon={Globe} iconColor="text-blue-500">
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
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5 text-blue-700" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  {data.instagram_url && (
                    <a
                      href={data.instagram_url.startsWith('http') ? data.instagram_url : `https://${data.instagram_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Instagram className="h-3.5 w-3.5 text-pink-600" />
                      Instagram
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  {data.facebook_url && (
                    <a
                      href={data.facebook_url.startsWith('http') ? data.facebook_url : `https://${data.facebook_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Facebook className="h-3.5 w-3.5 text-blue-600" />
                      Facebook
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
