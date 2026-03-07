'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Claro',
    description: 'Tema claro para uso durante o dia',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Escuro',
    description: 'Tema escuro para reduzir cansaco visual',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Sistema',
    description: 'Segue a configuracao do seu dispositivo',
    icon: Monitor,
  },
] as const

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aparencia</CardTitle>
          <CardDescription>Personalize a aparencia da plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((opt) => (
              <div key={opt.value} className="h-32 rounded-lg border bg-muted/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparencia</CardTitle>
        <CardDescription>
          Personalize a aparencia da plataforma. Escolha entre tema claro, escuro ou automatico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-medium mb-3 block">Tema</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = theme === opt.value

              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all text-center',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Theme preview */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Pre-visualizacao</Label>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 p-3 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-muted-foreground ml-2">Plataforma Email</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary" />
                <div className="space-y-1">
                  <div className="h-3 w-32 rounded bg-foreground/20" />
                  <div className="h-2 w-48 rounded bg-muted-foreground/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 rounded bg-card border" />
                <div className="h-16 rounded bg-card border" />
                <div className="h-16 rounded bg-card border" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded bg-primary" />
                <div className="h-8 w-20 rounded bg-secondary" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
