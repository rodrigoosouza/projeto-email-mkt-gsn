'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Key, Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { createClient } from '@/lib/supabase/client'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
}

export function ApiKeysManager() {
  const { currentOrg, isAdmin } = useOrganizationContext()
  const { toast } = useToast()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showGeneratedKeyDialog, setShowGeneratedKeyDialog] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchKeys = useCallback(async () => {
    if (!currentOrg) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at')
      .eq('org_id', currentOrg.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Erro ao carregar chaves',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setKeys(data || [])
    }
    setLoading(false)
  }, [currentOrg, toast])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleGenerateKey() {
    if (!currentOrg || !newKeyName.trim()) return

    setGenerating(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Nao autenticado')

      // Generate a random API key
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const hexString = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const fullKey = `sk_org_${hexString}`
      const keyPrefix = fullKey.substring(0, 12)

      // Hash the key with SHA-256
      const encoder = new TextEncoder()
      const data = encoder.encode(fullKey)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // Store in DB
      const { error } = await supabase.from('api_keys').insert({
        org_id: currentOrg.id,
        name: newKeyName.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        is_active: true,
        created_by: user.id,
      })

      if (error) throw error

      setGeneratedKey(fullKey)
      setShowNewKeyDialog(false)
      setShowGeneratedKeyDialog(true)
      setNewKeyName('')
      await fetchKeys()

      toast({
        title: 'Chave gerada com sucesso',
        description: 'Copie a chave agora. Ela nao sera exibida novamente.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar chave',
        description: error.message || 'Nao foi possivel gerar a chave de API.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteKey(keyId: string) {
    setDeletingId(keyId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)

      if (error) throw error

      setKeys((prev) => prev.filter((k) => k.id !== keyId))
      toast({
        title: 'Chave removida',
        description: 'A chave de API foi desativada.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao remover chave',
        description: error.message || 'Nao foi possivel remover a chave.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCopyKey() {
    if (!generatedKey) return
    try {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Nao foi possivel copiar a chave. Copie manualmente.',
        variant: 'destructive',
      })
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Chaves de API para integracao com sistemas externos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem gerenciar chaves de API.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Chaves de API para integracao com sistemas externos.
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewKeyDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Nova Chave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Carregando chaves...
              </span>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma chave de API criada.
              </p>
              <p className="text-xs text-muted-foreground">
                Gere uma chave para integrar com sistemas externos via webhooks.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Ultimo uso</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {apiKey.key_prefix}...
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(apiKey.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(apiKey.last_used_at)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === apiKey.id}
                          >
                            {deletingId === apiKey.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover chave de API</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja desativar a chave{' '}
                              <strong>{apiKey.name}</strong>? Qualquer integracao
                              que use esta chave deixara de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteKey(apiKey.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Desativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create new key */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Nova Chave de API</DialogTitle>
            <DialogDescription>
              De um nome para identificar esta chave. A chave sera exibida
              apenas uma vez apos a criacao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Nome da chave</Label>
              <Input
                id="key-name"
                placeholder="Ex: Webhook producao, Integracao CRM"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKeyName.trim()) {
                    handleGenerateKey()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewKeyDialog(false)
                setNewKeyName('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateKey}
              disabled={!newKeyName.trim() || generating}
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar Chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Show generated key */}
      <Dialog
        open={showGeneratedKeyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setGeneratedKey(null)
            setCopied(false)
          }
          setShowGeneratedKeyDialog(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chave de API Gerada</DialogTitle>
            <DialogDescription>
              Copie esta chave agora. Por seguranca, ela nao sera exibida
              novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                value={generatedKey || ''}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
                title="Copiar chave"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">Chave copiada!</p>
            )}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Atencao: guarde esta chave em um local seguro. Apos fechar
                esta janela, nao sera possivel visualiza-la novamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowGeneratedKeyDialog(false)
                setGeneratedKey(null)
                setCopied(false)
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
