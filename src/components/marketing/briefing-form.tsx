'use client'

import { useState, useEffect } from 'react'
import {
  Building2, BarChart3, Target, UserSearch, AlertTriangle,
  Megaphone, MessageSquare, Globe, Handshake, Settings,
  Wallet, Clock, ChevronLeft, ChevronRight, Save, Check,
  Sparkles, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { getQuestionsBySection, countAnswered, isBriefingComplete } from '@/lib/marketing/questions'
import { getMarketingProfile, saveBriefing, saveStrategy } from '@/lib/marketing/profiles'
import type { BriefingAnswers } from '@/lib/marketing/types'

const iconMap: Record<string, React.ElementType> = {
  Building2, BarChart3, Target, UserSearch, AlertTriangle,
  Megaphone, MessageSquare, Globe, Handshake, Settings,
  Wallet, Clock,
}

const emptyBriefing: BriefingAnswers = {
  segmento: '', produtoServico: '', publicoB2B: '', decisorCompra: '',
  maiorDor: '', resultadoEsperado: '', precoMedio: '', diferenciais: '', paginaDestino: '',
}

interface BriefingFormProps {
  onComplete?: () => void
}

export function BriefingForm({ onComplete }: BriefingFormProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const [answers, setAnswers] = useState<BriefingAnswers>(emptyBriefing)
  const [currentSection, setCurrentSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const sections = getQuestionsBySection()
  const stats = countAnswered(answers)
  const progressPercent = Math.round((stats.answered / stats.total) * 100)
  const isComplete = isBriefingComplete(answers)

  useEffect(() => {
    if (!currentOrg?.id) return
    getMarketingProfile(currentOrg.id).then((profile) => {
      if (profile?.briefing && Object.keys(profile.briefing).length > 0) {
        setAnswers({ ...emptyBriefing, ...profile.briefing })
      }
      setLoaded(true)
    }).catch(console.error)
  }, [currentOrg?.id])

  const handleChange = (key: keyof BriefingAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!currentOrg?.id) return
    setSaving(true)
    try {
      await saveBriefing(currentOrg.id, answers, false)
      toast({
        title: 'Rascunho salvo',
        description: `${stats.answered} de ${stats.total} perguntas respondidas.`,
      })
    } catch (error) {
      console.error('Erro ao salvar briefing:', error)
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!currentOrg?.id || !isComplete) return
    setGenerating(true)
    try {
      // 1. Save briefing as complete
      await saveBriefing(currentOrg.id, answers, true)

      toast({
        title: 'Briefing finalizado! Gerando estrategia...',
        description: 'Isso pode levar ate 30 segundos.',
      })

      // 2. Auto-generate strategy
      const res = await fetch('/api/marketing/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id, answers }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao gerar estrategia')
      }

      const data = await res.json()
      await saveStrategy(currentOrg.id, data.persona, data.icp, data.strategy, data.model)

      toast({ title: 'Estrategia gerada com sucesso!' })
      onComplete?.()
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: 'Erro ao gerar estrategia',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const section = sections[currentSection]

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando diagnostico...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progresso: {stats.answered}/{stats.total} perguntas
              {' '}({stats.requiredAnswered}/{stats.required} obrigatorias)
            </span>
            <span className="text-sm text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sections.map((s, i) => {
          const Icon = iconMap[s.icon] || Building2
          const sectionAnswered = s.questions.filter((q) => answers[q.key]?.trim()).length
          const allDone = sectionAnswered === s.questions.length
          return (
            <Button
              key={s.name}
              variant={i === currentSection ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setCurrentSection(i)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{s.name}</span>
              <span className="sm:hidden">{i + 1}</span>
              {allDone && <Check className="h-3 w-3 text-green-500" />}
            </Button>
          )
        })}
      </div>

      {/* Current section form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = iconMap[section.icon] || Building2
              return <Icon className="h-5 w-5 text-primary" />
            })()}
            <CardTitle className="text-lg">{section.name}</CardTitle>
            <Badge variant="outline" className="ml-auto">
              Secao {currentSection + 1} de {sections.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {section.questions.map((q) => (
            <div key={q.key} className="space-y-2">
              <Label htmlFor={q.key} className="text-sm font-medium">
                {q.label}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Textarea
                id={q.key}
                value={answers[q.key] || ''}
                onChange={(e) => handleChange(q.key, e.target.value)}
                placeholder={q.placeholder}
                rows={3}
                className="resize-none"
                disabled={generating}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
          disabled={currentSection === 0 || generating}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving || generating}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>

          <Button
            onClick={handleFinalize}
            disabled={generating || !isComplete}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Gerando estrategia...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Finalizar e Gerar Estrategia
              </>
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))}
          disabled={currentSection === sections.length - 1 || generating}
        >
          Proxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
