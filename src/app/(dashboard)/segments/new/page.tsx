'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SegmentForm } from '@/components/segments/segment-form'

export default function NewSegmentPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/segments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Segmentos
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Novo Segmento</h2>
        <p className="text-muted-foreground">
          Preencha as informacoes abaixo para criar um novo segmento.
        </p>
      </div>

      <SegmentForm />
    </div>
  )
}
