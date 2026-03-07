import type { CreateLeadPayload } from '@/lib/types'

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        if (!text || text.trim().length === 0) {
          reject(new Error('Arquivo vazio'))
          return
        }

        // Detect delimiter (comma or semicolon)
        const firstLine = text.split('\n')[0]
        const commaCount = (firstLine.match(/,/g) || []).length
        const semicolonCount = (firstLine.match(/;/g) || []).length
        const delimiter = semicolonCount > commaCount ? ';' : ','

        const lines = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)

        if (lines.length < 2) {
          reject(new Error('O arquivo deve conter pelo menos um cabecalho e uma linha de dados'))
          return
        }

        const headers = parseCsvLine(lines[0], delimiter)
        const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))

        resolve({ headers, rows })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'))
    }

    reader.readAsText(file, 'UTF-8')
  })
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === delimiter) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  result.push(current.trim())
  return result
}

export type ColumnMapping = Record<number, string>

export function mapCsvRows(
  rows: string[][],
  headers: string[],
  columnMapping: ColumnMapping
): CreateLeadPayload[] {
  const leads: CreateLeadPayload[] = []

  for (const row of rows) {
    const lead: Record<string, string | number> = {}

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const field = columnMapping[colIndex]
      if (!field || field === 'ignore') continue

      const value = row[colIndex] || ''
      if (field === 'score') {
        const parsed = parseInt(value, 10)
        lead[field] = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed))
      } else {
        lead[field] = value
      }
    }

    if (lead.email) {
      leads.push(lead as unknown as CreateLeadPayload)
    }
  }

  return leads
}
