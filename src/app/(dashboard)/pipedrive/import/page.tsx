'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useOrganizationContext } from '@/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ParseResult {
  rows: Record<string, string>[]
  headers: string[]
}

function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { rows: [], headers: [] }

  // Detector simples de separador
  const sep = (lines[0].match(/,/g)?.length || 0) > (lines[0].match(/;/g)?.length || 0) ? ',' : ';'

  const parseLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === sep && !inQ) {
        out.push(cur); cur = ''
      } else {
        cur += c
      }
    }
    out.push(cur)
    return out
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (cells[idx] || '').trim() })
    rows.push(row)
  }
  return { rows, headers }
}

export default function PipedriveImportPage() {
  const { currentOrg } = useOrganizationContext()
  const orgId = currentOrg?.id

  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [filename, setFilename] = useState('')
  const [source, setSource] = useState('csv-import')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setFilename(file.name)
    setSource(`csv:${file.name.replace(/\.[^.]+$/, '')}`)
    const text = await file.text()
    const p = parseCsv(text)
    setParsed(p)
    setResult(null)
  }, [])

  const handleUpload = async () => {
    if (!orgId || !parsed || parsed.rows.length === 0) return
    setUploading(true)
    setResult(null)
    try {
      const res = await fetch('/api/pipedrive/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, source, rows: parsed.rows }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({
          success: true,
          message: `Importação concluída: ${data.upserted} deals (${data.skipped} ignorados sem data)`,
          details: data,
        })
        setParsed(null); setFilename('')
      } else {
        setResult({ success: false, message: data.error || 'Erro' })
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const previewRows = parsed?.rows.slice(0, 5) || []

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Importar Deals do Pipedrive</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suba um CSV exportado do Pipedrive para preencher a tabela <code>pipedrive_deals</code>.
          Idempotente — pode reenviar o mesmo arquivo sem duplicar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar arquivo</CardTitle>
          <CardDescription>
            Aceita CSV com colunas: Título, Valor, Funil, Status, Adicionado em, UTM source/medium/campaign/content/term, fbclid.
            Detecta automaticamente colunas em português ou inglês.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm mb-3">Arraste o CSV aqui ou clique pra escolher</p>
            <Input
              type="file"
              accept=".csv,.txt"
              className="max-w-xs mx-auto"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {filename && (
              <p className="text-xs text-muted-foreground mt-3">
                <FileText className="inline h-3 w-3 mr-1" /> {filename}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {parsed && parsed.rows.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Preview ({parsed.rows.length} linhas detectadas)</CardTitle>
              <CardDescription>Primeiras 5 linhas — confira se as colunas estão corretas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-md">
                <table className="text-xs w-full">
                  <thead className="bg-muted">
                    <tr>
                      {parsed.headers.map((h) => (
                        <th key={h} className="text-left p-2 font-medium border-r whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        {parsed.headers.map((h) => (
                          <td key={h} className="p-2 border-r whitespace-nowrap max-w-[200px] truncate" title={r[h]}>
                            {r[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Identificador (opcional)</CardTitle>
              <CardDescription>
                Marca esses deals com um label pra você poder deletar depois se necessário (ex: <code>csv:facebook-abril</code>)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="csv-import" />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleUpload} disabled={uploading || !orgId}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? 'Importando...' : `Importar ${parsed.rows.length} deals`}
            </Button>
          </div>
        </>
      )}

      {result && (
        <Card className={result.success ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'}>
          <CardContent className="pt-6 flex items-start gap-3">
            {result.success
              ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              : <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
            <div>
              <p className="font-medium">{result.message}</p>
              {result.details && (
                <pre className="text-xs mt-2 text-muted-foreground">{JSON.stringify(result.details, null, 2)}</pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
