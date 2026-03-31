'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrganizationContext } from '@/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save, ShieldCheck } from 'lucide-react'

const ROLES = ['admin', 'editor', 'viewer', 'client_admin'] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
  client_admin: 'Admin Cliente',
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  client_admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

const RESOURCES = [
  'leads',
  'campaigns',
  'analytics',
  'blog',
  'settings',
  'billing',
  'members',
  'integrations',
  'site',
] as const
type Resource = (typeof RESOURCES)[number]

const RESOURCE_LABELS: Record<Resource, string> = {
  leads: 'Leads',
  campaigns: 'Campanhas',
  analytics: 'Analytics',
  blog: 'Blog',
  settings: 'Configuracoes',
  billing: 'Faturamento',
  members: 'Membros',
  integrations: 'Integracoes',
  site: 'Site',
}

const ACTIONS = ['can_create', 'can_read', 'can_update', 'can_delete'] as const
type Action = (typeof ACTIONS)[number]

const ACTION_LABELS: Record<Action, string> = {
  can_create: 'C',
  can_read: 'R',
  can_update: 'U',
  can_delete: 'D',
}

const ACTION_TOOLTIPS: Record<Action, string> = {
  can_create: 'Criar',
  can_read: 'Ler',
  can_update: 'Atualizar',
  can_delete: 'Deletar',
}

interface PermissionRow {
  id?: string
  org_id: string
  role: string
  resource: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

type PermissionKey = `${string}:${string}`

function makeKey(role: string, resource: string): PermissionKey {
  return `${role}:${resource}`
}

// Default permissions for roles (used when no DB row exists)
function getDefaultPermission(role: Role, _resource: Resource): Pick<PermissionRow, 'can_create' | 'can_read' | 'can_update' | 'can_delete'> {
  switch (role) {
    case 'admin':
      return { can_create: true, can_read: true, can_update: true, can_delete: true }
    case 'editor':
      return { can_create: true, can_read: true, can_update: true, can_delete: false }
    case 'viewer':
      return { can_create: false, can_read: true, can_update: false, can_delete: false }
    case 'client_admin':
      return { can_create: true, can_read: true, can_update: true, can_delete: false }
    default:
      return { can_create: false, can_read: false, can_update: false, can_delete: false }
  }
}

export function PermissionsManager() {
  const { currentOrg, isAdmin } = useOrganizationContext()
  const { toast } = useToast()
  const supabase = createClient()

  const [permissions, setPermissions] = useState<Map<PermissionKey, PermissionRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const orgId = currentOrg?.id

  // Initialize permissions map with defaults for all role/resource combos
  const initializeDefaults = useCallback((orgId: string): Map<PermissionKey, PermissionRow> => {
    const map = new Map<PermissionKey, PermissionRow>()
    for (const role of ROLES) {
      for (const resource of RESOURCES) {
        const key = makeKey(role, resource)
        const defaults = getDefaultPermission(role, resource)
        map.set(key, {
          org_id: orgId,
          role,
          resource,
          ...defaults,
        })
      }
    }
    return map
  }, [])

  const fetchPermissions = useCallback(async () => {
    if (!orgId) return
    setLoading(true)

    const defaultMap = initializeDefaults(orgId)

    const { data, error } = await supabase
      .from('org_permissions')
      .select('*')
      .eq('org_id', orgId)

    if (error) {
      console.error('Erro ao buscar permissoes:', error)
      // If table doesn't exist, just use defaults
      setPermissions(defaultMap)
      setLoading(false)
      return
    }

    // Override defaults with DB values
    if (data) {
      for (const row of data) {
        const key = makeKey(row.role, row.resource)
        defaultMap.set(key, row as PermissionRow)
      }
    }

    setPermissions(defaultMap)
    setLoading(false)
  }, [orgId, supabase, initializeDefaults])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const togglePermission = (role: Role, resource: Resource, action: Action) => {
    const key = makeKey(role, resource)
    const current = permissions.get(key)
    if (!current) return

    const updated = { ...current, [action]: !current[action] }
    const newMap = new Map(permissions)
    newMap.set(key, updated)
    setPermissions(newMap)
    setDirty(true)
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)

    try {
      const rows = Array.from(permissions.values()).map((p) => ({
        org_id: orgId,
        role: p.role,
        resource: p.resource,
        can_create: p.can_create,
        can_read: p.can_read,
        can_update: p.can_update,
        can_delete: p.can_delete,
      }))

      const { error } = await supabase
        .from('org_permissions')
        .upsert(rows, { onConflict: 'org_id,role,resource' })

      if (error) {
        console.error('Erro ao salvar permissoes:', error)
        toast({
          title: 'Erro',
          description: 'Nao foi possivel salvar as permissoes. Verifique se a tabela org_permissions existe.',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Permissoes salvas', description: 'As permissoes foram atualizadas com sucesso.' })
        setDirty(false)
      }
    } catch (err) {
      console.error('Erro ao salvar permissoes:', err)
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao salvar permissoes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            Apenas administradores podem gerenciar permissoes.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando permissoes...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Matriz de Permissoes</CardTitle>
          <CardDescription>
            Configure as permissoes de cada funcao por recurso. C = Criar, R = Ler, U = Atualizar, D = Deletar.
          </CardDescription>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          size="sm"
          className="shrink-0"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card min-w-[140px]">Funcao</TableHead>
                {RESOURCES.map((resource) => (
                  <TableHead key={resource} className="text-center min-w-[120px]">
                    {RESOURCE_LABELS[resource]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <Badge variant="outline" className={ROLE_COLORS[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                  </TableCell>
                  {RESOURCES.map((resource) => {
                    const key = makeKey(role, resource)
                    const perm = permissions.get(key)
                    if (!perm) return <TableCell key={resource} />

                    return (
                      <TableCell key={resource} className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ACTIONS.map((action) => (
                            <label
                              key={action}
                              className="flex flex-col items-center gap-0.5 cursor-pointer"
                              title={ACTION_TOOLTIPS[action]}
                            >
                              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                                {ACTION_LABELS[action]}
                              </span>
                              <Checkbox
                                checked={perm[action]}
                                onCheckedChange={() => togglePermission(role, resource, action)}
                                className="h-4 w-4"
                              />
                            </label>
                          ))}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
