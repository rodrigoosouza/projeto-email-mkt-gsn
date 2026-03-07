'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { parseCsvFile, mapCsvRows, type ParsedCsv, type ColumnMapping } from '@/lib/csv'
import { bulkCreateLeads } from '@/lib/supabase/leads'

const DB_FIELDS = [
  { value: 'ignore', label: '-- Ignorar --' },
  { value: 'email', label: 'Email' },
  { value: 'first_name', label: 'Nome' },
  { value: 'last_name', label: 'Sobrenome' },
  { value: 'phone', label: 'Telefone' },
  { value: 'company', label: 'Empresa' },
  { value: 'position', label: 'Cargo' },
  { value: 'score', label: 'Score' },
]

type Step = 'upload' | 'mapping' | 'preview' | 'result'

const STEP_ORDER: Step[] = ['upload', 'mapping', 'preview', 'result']

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  mapping: 'Mapeamento',
  preview: 'Preview',
  result: 'Resultado',
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
}

export function CsvImportWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentOrg } = useOrganizationContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const currentStepIndex = STEP_ORDER.indexOf(step)

  const handleFileSelect = async (selectedFile: File) => {
    try {
      const data = await parseCsvFile(selectedFile)
      setFile(selectedFile)
      setParsed(data)

      // Auto-map columns based on header names
      const autoMapping: ColumnMapping = {}
      data.headers.forEach((header, index) => {
        const normalized = header.toLowerCase().trim()
        if (normalized.includes('email') || normalized.includes('e-mail')) {
          autoMapping[index] = 'email'
        } else if (
          normalized === 'nome' ||
          normalized === 'first_name' ||
          normalized === 'primeiro nome'
        ) {
          autoMapping[index] = 'first_name'
        } else if (
          normalized === 'sobrenome' ||
          normalized === 'last_name' ||
          normalized === 'ultimo nome'
        ) {
          autoMapping[index] = 'last_name'
        } else if (
          normalized.includes('telefone') ||
          normalized.includes('phone') ||
          normalized.includes('celular')
        ) {
          autoMapping[index] = 'phone'
        } else if (
          normalized.includes('empresa') ||
          normalized.includes('company') ||
          normalized.includes('organizacao')
        ) {
          autoMapping[index] = 'company'
        } else if (
          normalized.includes('cargo') ||
          normalized.includes('position') ||
          normalized.includes('funcao')
        ) {
          autoMapping[index] = 'position'
        } else if (normalized.includes('score') || normalized.includes('pontuacao')) {
          autoMapping[index] = 'score'
        } else {
          autoMapping[index] = 'ignore'
        }
      })
      setColumnMapping(autoMapping)

      toast({
        title: 'Arquivo carregado',
        description: `${data.rows.length} linhas encontradas.`,
      })
    } catch (error) {
      console.error('Erro ao processar CSV:', error)
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelect(droppedFile)
    } else {
      toast({
        title: 'Arquivo invalido',
        description: 'Selecione um arquivo .csv',
        variant: 'destructive',
      })
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const hasEmailMapping = Object.values(columnMapping).includes('email')

  const getMappedLeads = () => {
    if (!parsed) return []
    return mapCsvRows(parsed.rows, parsed.headers, columnMapping)
  }

  const handleImport = async () => {
    if (!currentOrg || !parsed) return

    setImporting(true)
    try {
      const leads = getMappedLeads()
      const importResult = await bulkCreateLeads(currentOrg.id, leads)
      setResult(importResult)
      setStep('result')
    } catch (error) {
      console.error('Erro ao importar leads:', error)
      toast({
        title: 'Erro na importacao',
        description: 'Ocorreu um erro ao importar os leads.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex])
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 'upload':
        return parsed !== null
      case 'mapping':
        return hasEmailMapping
      case 'preview':
        return true
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEP_ORDER.map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                index <= currentStepIndex ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {index < STEP_ORDER.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-3 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  Arraste um arquivo CSV aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aceita arquivos .csv com delimitador virgula ou ponto-e-virgula
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {file && parsed && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsed.headers.length} colunas, {parsed.rows.length} linhas
                    </p>
                  </div>
                  <Badge variant="secondary">Carregado</Badge>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && parsed && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mapeie cada coluna do CSV para o campo correspondente. O campo Email e obrigatorio.
              </p>

              {!hasEmailMapping && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Mapeie pelo menos uma coluna como &quot;Email&quot; para continuar.
                </div>
              )}

              <div className="space-y-3">
                {parsed.headers.map((header, index) => {
                  const sampleValues = parsed.rows
                    .slice(0, 3)
                    .map((row) => row[index] || '')
                    .filter(Boolean)

                  return (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{header}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Ex: {sampleValues.join(', ') || '-'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={columnMapping[index] || 'ignore'}
                        onValueChange={(value) =>
                          setColumnMapping((prev) => ({ ...prev, [index]: value }))
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DB_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confira os primeiros registros antes de importar.
              </p>

              {(() => {
                const mappedLeads = getMappedLeads()
                const previewLeads = mappedLeads.slice(0, 5)
                const mappedFields = Object.entries(columnMapping)
                  .filter(([, value]) => value !== 'ignore')
                  .map(([, value]) => value)

                const fieldLabels: Record<string, string> = {
                  email: 'Email',
                  first_name: 'Nome',
                  last_name: 'Sobrenome',
                  phone: 'Telefone',
                  company: 'Empresa',
                  position: 'Cargo',
                  score: 'Score',
                }

                return (
                  <>
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {mappedFields.map((field) => (
                              <TableHead key={field}>{fieldLabels[field] || field}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewLeads.map((lead, i) => (
                            <TableRow key={i}>
                              {mappedFields.map((field) => (
                                <TableCell key={field}>
                                  {String((lead as unknown as Record<string, unknown>)[field] ?? '-')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de {mappedLeads.length} leads validos para importacao.
                    </p>
                  </>
                )
              })()}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && result && (
            <div className="space-y-6 text-center py-6">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h3 className="text-xl font-semibold">Importacao concluida</h3>
                <p className="text-muted-foreground mt-1">
                  Confira o resumo abaixo.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  <p className="text-sm text-green-700">Criados</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                  <p className="text-sm text-yellow-700">Ignorados</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-sm text-red-700">Erros</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="text-left max-w-md mx-auto">
                  <p className="text-sm font-medium mb-2">Detalhes dos erros:</p>
                  <div className="max-h-40 overflow-y-auto bg-muted/50 rounded-lg p-3 space-y-1">
                    {result.errors.map((error, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => router.push('/leads')}>Ver Leads</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step !== 'result' && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {step === 'preview' ? (
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? 'Importando...'
                : `Importar ${getMappedLeads().length} leads`}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Proximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
