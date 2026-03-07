'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { createChatbotConfig } from '@/lib/supabase/chatbot'

export default function NewChatbotPage() {
  const router = useRouter()
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('Ola! Como posso ajudar?')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiModel, setAiModel] = useState('claude-haiku-4.5')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [widgetColor, setWidgetColor] = useState('#6366f1')
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentOrg) return
    if (!name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do chatbot e obrigatorio.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const config = await createChatbotConfig({
        org_id: currentOrg.id,
        name: name.trim(),
        welcome_message: welcomeMessage.trim() || null,
        ai_enabled: aiEnabled,
        ai_model: aiModel,
        ai_system_prompt: aiEnabled ? aiSystemPrompt.trim() || null : null,
        widget_color: widgetColor,
        widget_position: widgetPosition,
        is_active: true,
      })

      toast({
        title: 'Chatbot criado',
        description: `"${config.name}" foi criado com sucesso.`,
      })

      router.push(`/chatbot/${config.id}`)
    } catch (error) {
      console.error('Erro ao criar chatbot:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar o chatbot.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/chatbot">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Novo Chatbot</h2>
          <p className="text-muted-foreground">
            Configure um novo chatbot para seu site.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuracoes</CardTitle>
            <CardDescription>
              Defina as configuracoes basicas do chatbot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Atendimento ao Cliente"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message">Mensagem de boas-vindas</Label>
              <Textarea
                id="welcome_message"
                placeholder="Mensagem exibida ao abrir o chat..."
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="ai_enabled"
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
              />
              <Label htmlFor="ai_enabled">Habilitar respostas com IA</Label>
            </div>

            {aiEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai_model">Modelo de IA</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger id="ai_model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-4.5">
                        Claude Haiku (rapido)
                      </SelectItem>
                      <SelectItem value="claude-sonnet-4-6">
                        Claude Sonnet (avancado)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_system_prompt">
                    Prompt do sistema (instrucoes para a IA)
                  </Label>
                  <Textarea
                    id="ai_system_prompt"
                    placeholder="Ex: Voce e um assistente da empresa X. Responda de forma educada e objetiva..."
                    value={aiSystemPrompt}
                    onChange={(e) => setAiSystemPrompt(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="widget_color">Cor do widget</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="widget_color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="flex-1"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="widget_position">Posicao do widget</Label>
                <Select
                  value={widgetPosition}
                  onValueChange={(v) =>
                    setWidgetPosition(v as 'bottom-right' | 'bottom-left')
                  }
                >
                  <SelectTrigger id="widget_position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">
                      Inferior direito
                    </SelectItem>
                    <SelectItem value="bottom-left">
                      Inferior esquerdo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Chatbot
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
