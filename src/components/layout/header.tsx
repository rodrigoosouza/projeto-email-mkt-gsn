'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/segments': 'Segmentos',
  '/templates': 'Templates de Email',
  '/campaigns': 'Campanhas',
  '/settings': 'Configuracoes',
  '/ads/dashboard': 'Dashboard Meta Ads',
  '/ads': 'Criar Campanha ADS',
  '/pipedrive': 'CRM Funil',
  '/pipedrive/': 'Deal',
  '/growth': 'Analise de MKT e Vendas',
  '/growth/chat': 'IA Growth Copilot',
}

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const pageTitle =
    Object.entries(pageTitles).find(
      ([path]) => (path === '/' ? pathname === '/' : pathname.startsWith(path))
    )?.[1] || 'Plataforma Email'

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  const userName = user?.user_metadata?.name || user?.email || 'Usuario'

  // Build breadcrumbs from pathname
  const breadcrumbs =
    pathname === '/'
      ? []
      : pathname
          .split('/')
          .filter(Boolean)
          .map((segment, index, arr) => {
            const href = '/' + arr.slice(0, index + 1).join('/')
            const label =
              pageTitles[href] ||
              segment.charAt(0).toUpperCase() + segment.slice(1)
            return { href, label }
          })

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>

        <div>
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                Inicio
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  <span>/</span>
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {user?.user_metadata?.avatar_url && (
                <AvatarImage src={user.user_metadata.avatar_url} alt={userName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline-block">
              {userName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              Perfil
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
    </header>
  )
}
