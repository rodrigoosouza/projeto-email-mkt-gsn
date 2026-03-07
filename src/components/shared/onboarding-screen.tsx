'use client'

import { useState } from 'react'
import { Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface OnboardingScreenProps {
  onComplete: () => Promise<void>
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      const { error: rpcError } = await supabase.rpc(
        'create_organization_with_member',
        {
          org_name: name.trim(),
          org_slug: `${slug}-${Date.now()}`,
        }
      )

      if (rpcError) throw rpcError

      await onComplete()
    } catch (err) {
      console.error('Erro ao criar organizacao:', err)
      setError('Erro ao criar organizacao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo!</CardTitle>
          <CardDescription>
            Crie sua organizacao para comecar a usar a plataforma.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome da Organizacao</Label>
              <Input
                id="org-name"
                type="text"
                placeholder="Ex: Minha Empresa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Organizacao
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
