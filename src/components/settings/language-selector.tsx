'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/contexts/locale-context'
import { getAvailableLocales, Locale } from '@/lib/i18n/translations'
import { useToast } from '@/components/ui/use-toast'

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale()
  const { toast } = useToast()
  const locales = getAvailableLocales()

  const handleChange = (value: string) => {
    setLocale(value as Locale)
    toast({ title: 'Idioma alterado', description: `Idioma alterado para ${locales.find(l => l.value === value)?.label}` })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Idioma da Interface</CardTitle>
        <CardDescription>
          Escolha o idioma de exibicao da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Idioma</Label>
          <Select value={locale} onValueChange={handleChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          A alteracao sera aplicada imediatamente. Algumas paginas podem precisar ser recarregadas.
        </p>
      </CardContent>
    </Card>
  )
}
