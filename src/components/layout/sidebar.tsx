'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Filter,
  FileText,
  Send,
  BarChart3,
  Zap,
  MessageCircle,
  Smartphone,
  FileInput,
  Bot,
  Share2,
  Search,
  AtSign,
  Link as LinkIcon,
  Activity,
  Globe,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Plus,
  X,
  ClipboardList,
  Video,
  Workflow,
  CalendarDays,
  MousePointerClick,
  Megaphone,
  Handshake,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationContext } from '@/contexts/organization-context'
import { useAuth } from '@/hooks/use-auth'
import { createOrganization } from '@/lib/supabase/organizations'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { name: 'Estrategia', href: '/marketing', icon: ClipboardList },
      { name: 'Calendario', href: '/content-calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Leads & Segmentos',
    items: [
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Segmentos', href: '/segments', icon: Filter },
    ],
  },
  {
    label: 'Email Marketing',
    items: [
      { name: 'Campanhas', href: '/campaigns', icon: Send },
      { name: 'Templates', href: '/templates', icon: FileText },
      { name: 'Automacoes', href: '/automations', icon: Zap },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Trafego Pago',
    items: [
      { name: 'Dashboard Meta Ads', href: '/ads/dashboard', icon: BarChart3 },
      { name: 'CRM Funil', href: '/pipedrive', icon: Handshake },
      { name: 'Analise MKT e Vendas', href: '/growth', icon: TrendingUp },
      { name: 'IA Growth Copilot', href: '/growth/chat', icon: Zap },
      { name: 'Criar Campanha ADS', href: '/ads', icon: Megaphone },
      { name: 'Publicos', href: '/audience-exports', icon: Share2 },
    ],
  },
  {
    label: 'Web',
    items: [
      { name: 'Landing Pages', href: '/landing-pages', icon: Globe },
      { name: 'Formularios', href: '/forms', icon: FileInput },
      { name: 'SEO', href: '/seo', icon: Search },
      { name: 'Tracking', href: '/tracking', icon: Activity },
    ],
  },
  {
    label: 'Criativos',
    items: [
      { name: 'Videos', href: '/videos', icon: Video },
    ],
  },
  {
    label: 'Redes Sociais',
    items: [
      { name: 'Posts', href: '/social', icon: AtSign },
      { name: 'Link da Bio', href: '/bio', icon: LinkIcon },
    ],
  },
  {
    label: 'Mensageria',
    items: [
      { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
      { name: 'Fluxos', href: '/whatsapp/flows', icon: Workflow },
      { name: 'SMS', href: '/sms', icon: Smartphone },
      { name: 'Chatbot', href: '/chatbot', icon: Bot },
    ],
  },
  {
    label: '',
    items: [
      { name: 'Configuracoes', href: '/settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { organizations, currentOrg, switchOrganization, refetch } = useOrganizationContext()
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || '??'
  const userName = user?.user_metadata?.name || user?.email || 'Usuario'

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !user?.id) return

    setCreating(true)
    try {
      const org = await createOrganization(newOrgName.trim(), user.id)
      localStorage.setItem('plataforma-email-org-id', org.id)
      await refetch()
      setShowCreateDialog(false)
      setNewOrgName('')
      toast({ title: 'Organizacao criada', description: `"${org.name}" foi criada. Preencha o briefing para comecar.` })
      router.push('/marketing')
    } catch (error) {
      console.error('Erro ao criar organizacao:', error)
      toast({
        title: 'Erro',
        description: 'Nao foi possivel criar a organizacao.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Organization Selector */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between gap-2 px-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
                    {currentOrg?.name?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <span className="truncate text-sm font-semibold">
                    {currentOrg?.name || 'Selecionar Organizacao'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {organizations.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhuma organizacao
                </div>
              )}
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className={cn(
                    'cursor-pointer',
                    currentOrg?.id === org.id && 'bg-accent'
                  )}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {org.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCreateDialog(true)}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Organizacao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Links */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-0.5">
            {navigationGroups.map((group, gi) => (
              <div key={gi} className={group.label ? 'mt-4 first:mt-0' : ''}>
                {group.label && (
                  <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </span>
                )}
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User Info + Logout */}
        <Separator />
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start gap-3 px-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start truncate">
                  <span className="truncate text-sm font-medium">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuracoes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Organizacao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome da Organizacao</Label>
              <Input
                id="org-name"
                placeholder="Minha Empresa"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateOrg()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={!newOrgName.trim() || creating}
            >
              {creating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
