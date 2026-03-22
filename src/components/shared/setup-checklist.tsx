'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  FileText,
  Mail,
  Globe,
  Settings,
  Loader2,
  Wand2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'

interface SetupItem {
  key: string
  label: string
  description: string
  icon: React.ElementType
  href: string
  completed: boolean
}

export function SetupChecklist() {
  const { currentOrg } = useOrganizationContext()
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<SetupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [autoSetting, setAutoSetting] = useState(false)

  useEffect(() => {
    if (!currentOrg?.id) return

    // Check if user dismissed the checklist
    const dismissedKey = `setup-dismissed-${currentOrg.id}`
    if (localStorage.getItem(dismissedKey) === 'true') {
      setDismissed(true)
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function checkSetup() {
      setLoading(true)

      const [profileRes, templatesRes, formsRes, integrationsRes] = await Promise.all([
        supabase
          .from('org_marketing_profiles')
          .select('status, briefing_completed_at, strategy_generated_at')
          .eq('org_id', currentOrg!.id)
          .maybeSingle(),
        supabase
          .from('email_templates')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', currentOrg!.id),
        supabase
          .from('lead_forms')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', currentOrg!.id),
        supabase
          .from('integrations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', currentOrg!.id),
      ])

      const profile = profileRes.data
      const hasBriefing = !!profile?.briefing_completed_at
      const hasStrategy = !!profile?.strategy_generated_at
      const hasTemplates = (templatesRes.count || 0) > 0
      const hasForms = (formsRes.count || 0) > 0
      const hasIntegrations = (integrationsRes.count || 0) > 0
      const hasDomain = !!currentOrg!.domain_verified

      setItems([
        {
          key: 'briefing',
          label: 'Preencher Briefing',
          description: 'Defina seu ICP, persona e objetivos de marketing',
          icon: FileText,
          href: '/marketing',
          completed: hasBriefing,
        },
        {
          key: 'strategy',
          label: 'Gerar Estrategia com IA',
          description: 'A IA cria persona, ICP e estrategia completa',
          icon: Sparkles,
          href: '/marketing',
          completed: hasStrategy,
        },
        {
          key: 'templates',
          label: 'Criar Template de Email',
          description: 'Crie pelo menos um template para suas campanhas',
          icon: Mail,
          href: '/templates/new',
          completed: hasTemplates,
        },
        {
          key: 'forms',
          label: 'Criar Formulario de Captacao',
          description: 'Configure um formulario para captar leads',
          icon: Globe,
          href: '/forms',
          completed: hasForms,
        },
        {
          key: 'domain',
          label: 'Configurar Dominio de Email',
          description: 'Verifique seu dominio para enviar emails',
          icon: Settings,
          href: '/settings',
          completed: hasDomain,
        },
        {
          key: 'integrations',
          label: 'Configurar Integracoes',
          description: 'Conecte MailerSend, Meta Ads, Google Ads',
          icon: Settings,
          href: '/settings',
          completed: hasIntegrations,
        },
      ])

      setLoading(false)
    }

    checkSetup()
  }, [currentOrg?.id])

  if (loading || dismissed) return null

  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // All done - don't show
  if (completedCount === totalCount) return null

  const nextItem = items.find((i) => !i.completed)

  const handleDismiss = () => {
    if (currentOrg?.id) {
      localStorage.setItem(`setup-dismissed-${currentOrg.id}`, 'true')
    }
    setDismissed(true)
  }

  const hasStrategy = items.find((i) => i.key === 'strategy')?.completed
  const hasPendingItems = items.some((i) => !i.completed && i.key !== 'briefing' && i.key !== 'strategy')

  const handleAutoSetup = async () => {
    if (!currentOrg?.id) return
    setAutoSetting(true)
    try {
      const res = await fetch('/api/onboarding/auto-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no auto-setup')

      const c = data.created
      const parts = []
      if (c.form) parts.push(`${c.form} formulario`)
      if (c.templates) parts.push(`${c.templates} templates`)
      if (c.campaigns) parts.push(`${c.campaigns} campanhas email`)
      if (c.adCampaigns) parts.push(`${c.adCampaigns} campanhas ads`)
      if (c.automationFlow) parts.push(`${c.automationFlow} automacao`)
      if (c.calendarPosts) parts.push(`${c.calendarPosts} posts calendario`)

      toast({
        title: 'Setup automatico concluido!',
        description: `Criados: ${parts.join(', ')}. Revise e aprove tudo!`,
      })

      // Re-check setup status
      const supabase = createClient()
      const [templatesRes, formsRes] = await Promise.all([
        supabase.from('email_templates').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id),
        supabase.from('lead_forms').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id),
      ])
      setItems((prev) =>
        prev.map((item) => {
          if (item.key === 'templates' && (templatesRes.count || 0) > 0) return { ...item, completed: true }
          if (item.key === 'forms' && (formsRes.count || 0) > 0) return { ...item, completed: true }
          return item
        })
      )
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro no auto-setup'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setAutoSetting(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configure sua organizacao
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleDismiss}
          >
            Dispensar
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                item.completed
                  ? 'opacity-60'
                  : 'hover:bg-primary/10'
              }`}
              onClick={() => !item.completed && router.push(item.href)}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.completed ? 'line-through' : ''}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {!item.completed && (
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        {hasStrategy && hasPendingItems && (
          <Button
            className="w-full mt-4"
            onClick={handleAutoSetup}
            disabled={autoSetting}
            variant="default"
          >
            {autoSetting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {autoSetting ? 'Configurando tudo com IA...' : 'Configurar tudo automaticamente com IA'}
          </Button>
        )}

        {nextItem && !hasStrategy && (
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => router.push(nextItem.href)}
          >
            <nextItem.icon className="mr-2 h-4 w-4" />
            {nextItem.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
