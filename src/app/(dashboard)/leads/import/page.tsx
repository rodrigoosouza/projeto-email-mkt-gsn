'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CsvImportWizard } from '@/components/leads/csv-import-wizard'

export default function ImportLeadsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Leads
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Importar Leads via CSV</h2>
        <p className="text-muted-foreground">
          Faca upload de um arquivo CSV para importar leads em massa.
        </p>
      </div>

      <CsvImportWizard />
    </div>
  )
}
