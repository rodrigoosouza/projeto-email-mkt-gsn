'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        const msg = error.message === 'email rate limit exceeded'
          ? 'Limite de envios atingido. Aguarde alguns minutos e tente novamente.'
          : error.message
        setError(msg)
        return
      }

      setSuccess(true)
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email enviado!</CardTitle>
          <CardDescription>
            Verifique sua caixa de entrada (e spam) para o link de redefinicao de senha.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login" className="text-primary hover:underline font-medium text-sm">
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
        <CardDescription>
          Informe seu email para receber o link de redefinicao
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleReset}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Link de Redefinicao'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Lembrou a senha?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Voltar para o login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
