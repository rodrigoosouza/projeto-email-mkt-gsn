'use client'

import { useState, useRef } from 'react'
import {
  Upload, FileText, Image, Loader2, Sparkles, X, Check, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import type { MarketingProfile } from '@/lib/marketing/types'

interface FileAnalyzerProps {
  profile: MarketingProfile | null
  onAnalyzed: () => void
}

interface UploadedFile {
  name: string
  type: string
  size: number
  content: string // base64 or text
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = [
  'text/plain', 'text/csv', 'text/markdown',
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/json',
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileAnalyzer({ profile, onAnalyzed }: FileAnalyzerProps) {
  const { currentOrg } = useOrganizationContext()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [context, setContext] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const newFiles: UploadedFile[] = []

    for (const file of Array.from(selected)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: `${file.name} excede 5MB`, variant: 'destructive' })
        continue
      }

      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
        toast({ title: `Tipo nao suportado: ${file.type || file.name}`, variant: 'destructive' })
        continue
      }

      const content = await readFile(file)
      newFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content,
      })
    }

    setFiles((prev) => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      } else {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsText(file)
      }
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    if (!currentOrg?.id || (files.length === 0 && !context.trim())) return
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await fetch('/api/marketing/analyze-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          files: files.map((f) => ({
            name: f.name,
            type: f.type,
            content: f.content,
          })),
          context,
          existingBriefing: profile?.briefing || {},
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro na analise')
      }

      const data = await res.json()
      setResult(data.summary)
      toast({ title: 'Analise concluida!', description: 'O perfil foi atualizado com os dados extraidos.' })
      onAnalyzed()
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: 'Erro na analise',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Analise de Arquivos com IA
          </CardTitle>
          <CardDescription>
            Envie documentos do seu negocio (apresentacoes, brand guides, pesquisas de mercado,
            tabelas de precos, prints de redes sociais) e a IA vai extrair automaticamente
            informacoes de persona, ICP, identidade da marca e preencher seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Clique para selecionar arquivos</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, TXT, CSV, imagens (PNG/JPG), JSON, Markdown. Max 5MB por arquivo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.csv,.md,.json,.png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Arquivos selecionados ({files.length})</Label>
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                    <Badge variant="outline" className="text-xs">{formatFileSize(file.size)}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Context */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Contexto adicional (opcional)
            </Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Descreva seu negocio, publico, objetivos... quanto mais contexto, melhor a analise. Voce tambem pode colar textos aqui sem precisar subir arquivo."
              rows={4}
              disabled={analyzing}
            />
          </div>

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || (files.length === 0 && !context.trim())}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando com IA... (pode levar 30s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analisar e Extrair Dados
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Resultado da Analise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Como funciona</p>
              <ul className="mt-1 space-y-1 text-amber-700">
                <li>1. Envie arquivos ou cole textos sobre seu negocio</li>
                <li>2. A IA analisa e extrai: persona, ICP, tom de marca, cores, diferenciais</li>
                <li>3. Os dados sao salvos no seu perfil de marketing automaticamente</li>
                <li>4. Voce pode editar tudo depois nas outras abas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
