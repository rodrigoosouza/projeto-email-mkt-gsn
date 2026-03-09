'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

export default function NewVideoProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [scriptInput, setScriptInput] = useState('')
  const [adIdea, setAdIdea] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [referencesNotes, setReferencesNotes] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!currentOrg || !user || !scriptInput.trim()) return

    setGenerating(true)
    try {
      const supabase = createClient()

      // 1. Create project
      const projectName = name.trim() || `Video ${new Date().toLocaleDateString('pt-BR')}`
      const { data: project, error: createErr } = await supabase
        .from('video_projects')
        .insert({
          org_id: currentOrg.id,
          name: projectName,
          script_input: scriptInput,
          ad_idea: adIdea || null,
          target_audience: targetAudience || null,
          references_notes: referencesNotes || null,
          status: 'generating',
          created_by: user.id,
        })
        .select()
        .single()

      if (createErr) throw createErr

      // 2. Generate scenes via API
      const res = await fetch('/api/videos/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          scriptInput,
          adIdea,
          targetAudience,
          referencesNotes,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Erro ao gerar cenas')
      }

      const result = await res.json()
      toast({
        title: 'Cenas geradas!',
        description: `${result.sceneCount} cenas criadas automaticamente.`,
      })

      router.push(`/videos/${project.id}`)
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: 'Erro ao gerar projeto',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Novo Projeto de Video</h2>
          <p className="text-muted-foreground">
            Cole o roteiro e a IA gera todas as cenas automaticamente.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roteiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Projeto (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Anuncio Servico de Consultoria"
              disabled={generating}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Roteiro / Script / Conceito <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder="Cole aqui o roteiro completo do anuncio, script narrativo, ou descreva o conceito do video..."
              rows={10}
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              A IA vai analisar o roteiro e criar automaticamente 8-12 cenas com prompts
              otimizados para Veo 3 e Nano Banana.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ideia do Anuncio</Label>
              <Input
                value={adIdea}
                onChange={(e) => setAdIdea(e.target.value)}
                placeholder="Ex: Vender servico de consultoria"
                disabled={generating}
              />
            </div>
            <div className="space-y-2">
              <Label>Publico-Alvo</Label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Empreendedores e gestores"
                disabled={generating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Referencias e Tom</Label>
            <Input
              value={referencesNotes}
              onChange={(e) => setReferencesNotes(e.target.value)}
              placeholder="Ex: Tom premium, cinematografico, profissional"
              disabled={generating}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={generating || !scriptInput.trim()}
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Gerando cenas com IA...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Gerar Cenas Automaticamente
          </>
        )}
      </Button>
    </div>
  )
}
