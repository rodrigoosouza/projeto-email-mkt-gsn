'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const msg = error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : error.message
        setError(msg)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Informe seu email para receber o magic link.')
      return
    }

    setError(null)
    setMagicLinkLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push('/magic-link')
    } catch {
      setError('Ocorreu um erro ao enviar o magic link. Tente novamente.')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Plataforma Email</CardTitle>
        <CardDescription>
          Entre com sua conta para continuar
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
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
              disabled={loading || magicLinkLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || magicLinkLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <div className="flex justify-end">
            <Link href="/reset-password" className="text-xs text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || magicLinkLoading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleMagicLink}
            disabled={loading || magicLinkLoading}
          >
            {magicLinkLoading ? 'Enviando...' : 'Enviar Magic Link'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Ainda nao tem conta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
