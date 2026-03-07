'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Sparkles, Calculator, Palette, Upload } from 'lucide-react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getMarketingProfile } from '@/lib/marketing/profiles'
import { BriefingForm } from '@/components/marketing/briefing-form'
import { StrategyViewer } from '@/components/marketing/strategy-viewer'
import { BusinessPlanTab } from '@/components/marketing/business-plan-tab'
import { BrandIdentityForm } from '@/components/marketing/brand-identity-form'
import { FileAnalyzer } from '@/components/marketing/file-analyzer'
import type { MarketingProfile } from '@/lib/marketing/types'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  briefing_done: { label: 'Briefing completo', variant: 'outline' },
  strategy_generated: { label: 'Estrategia gerada', variant: 'default' },
  complete: { label: 'Completo', variant: 'default' },
}

export default function MarketingPage() {
  const { currentOrg } = useOrganizationContext()
  const [profile, setProfile] = useState<MarketingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('briefing')

  const loadProfile = useCallback(async () => {
    if (!currentOrg?.id) return
    try {
      const data = await getMarketingProfile(currentOrg.id)
      setProfile(data)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrg?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleBriefingComplete = async () => {
    await loadProfile()
    setActiveTab('strategy')
  }

  const handleFileAnalyzed = async () => {
    await loadProfile()
  }

  const status = profile ? statusLabels[profile.status] : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Perfil de Marketing</h2>
          <p className="text-muted-foreground">
            Diagnostico, estrategia e planejamento do seu negocio.
          </p>
        </div>
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="briefing" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Diagnostico
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Anexos IA
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Estrategia IA
            </TabsTrigger>
            <TabsTrigger value="business-plan" className="gap-1.5">
              <Calculator className="h-4 w-4" />
              Business Plan
            </TabsTrigger>
            <TabsTrigger value="brand" className="gap-1.5">
              <Palette className="h-4 w-4" />
              Identidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="briefing">
            <BriefingForm onComplete={handleBriefingComplete} />
          </TabsContent>

          <TabsContent value="upload">
            <FileAnalyzer profile={profile} onAnalyzed={handleFileAnalyzed} />
          </TabsContent>

          <TabsContent value="strategy">
            {profile ? (
              <StrategyViewer profile={profile} onRefresh={loadProfile} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Preencha o diagnostico ou envie anexos primeiro.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="business-plan">
            <BusinessPlanTab profile={profile} onRefresh={loadProfile} />
          </TabsContent>

          <TabsContent value="brand">
            <BrandIdentityForm profile={profile} onRefresh={loadProfile} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
