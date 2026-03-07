'use client'

import { useState } from 'react'
import { Globe, CheckCircle2, XCircle, Info, Copy, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { updateOrganization } from '@/lib/supabase/organizations'

export function DomainVerification() {
  const { currentOrg, refetch } = useOrganizationContext()
  const { toast } = useToast()
  const [domainInput, setDomainInput] = useState(currentOrg?.custom_domain || '')
  const [saving, setSaving] = useState(false)

  const domain = currentOrg?.custom_domain

  const handleSaveDomain = async () => {
    if (!currentOrg || !domainInput.trim()) return
    setSaving(true)
    try {
      await updateOrganization(currentOrg.id, { custom_domain: domainInput.trim() })
      await refetch()
      toast({ title: 'Dominio salvo', description: `Dominio ${domainInput.trim()} configurado com sucesso.` })
    } catch (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel salvar o dominio.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast({ title: 'Copiado', description: 'Valor copiado para a area de transferencia.' })
  }

  const handleVerifyDns = () => {
    toast({
      title: 'Em breve',
      description: 'Verificacao automatica em breve. Verifique manualmente no MailerSend.',
    })
  }

  const dnsRecords = domain
    ? [
        {
          type: 'TXT',
          name: domain,
          value: 'v=spf1 include:mailersend.net ~all',
          purpose: 'SPF',
        },
        {
          type: 'CNAME',
          name: `msXXXXXX._domainkey.${domain}`,
          value: 'dkim.mailersend.net',
          purpose: 'DKIM',
        },
        {
          type: 'TXT',
          name: `_dmarc.${domain}`,
          value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
          purpose: 'DMARC',
        },
        {
          type: 'CNAME',
          name: `bounces.${domain}`,
          value: 'bounces.mailersend.net',
          purpose: 'Return-Path',
        },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dominio de Email</CardTitle>
        <CardDescription>
          Configure o dominio de envio de emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Dominio Personalizado</p>
              {currentOrg?.custom_domain ? (
                <p className="text-sm text-muted-foreground">
                  {currentOrg.custom_domain}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum dominio configurado
                </p>
              )}
            </div>
            <div>
              {currentOrg?.domain_verified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verificado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Nao verificado
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="seudominio.com.br"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleSaveDomain} disabled={saving || !domainInput.trim()}>
              {saving ? 'Salvando...' : 'Salvar Dominio'}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Configuracao de DNS
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Para enviar emails com seu dominio personalizado, voce precisara
                configurar os seguintes registros DNS:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-400">
                <li>
                  <strong>SPF</strong> — Autoriza nossos servidores a enviar
                  emails em nome do seu dominio
                </li>
                <li>
                  <strong>DKIM</strong> — Assina digitalmente os emails para
                  garantir autenticidade
                </li>
                <li>
                  <strong>DMARC</strong> — Define a politica de autenticacao de
                  emails do seu dominio
                </li>
              </ul>
            </div>
          </div>
        </div>

        {domain && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Registros DNS Necessarios</h4>
              <Button variant="outline" size="sm" onClick={handleVerifyDns}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar DNS
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead>Nome / Host</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-[80px]">Finalidade</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dnsRecords.map((record) => (
                    <TableRow key={record.purpose}>
                      <TableCell className="font-mono text-xs">{record.type}</TableCell>
                      <TableCell className="font-mono text-xs break-all">{record.name}</TableCell>
                      <TableCell className="font-mono text-xs break-all">{record.value}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{record.purpose}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(record.value)}
                          title="Copiar valor"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
