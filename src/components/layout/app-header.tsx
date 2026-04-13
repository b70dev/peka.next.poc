import { Link } from '@/i18n/routing'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { MobileNav } from './mobile-nav'
import { HeaderRoleBadge } from './header-role-badge'
import { getTranslations } from 'next-intl/server'

interface AppHeaderProps {
  userEmail?: string
  activeRoute: 'dashboard' | 'insured' | 'accounts' | 'payments' | 'settings'
}

export async function AppHeader({ userEmail, activeRoute }: AppHeaderProps) {
  const tNav = await getTranslations('navigation')

  const navItems = [
    { href: '/dashboard' as const, label: tNav('dashboard'), active: activeRoute === 'dashboard' },
    { href: '/insured' as const, label: tNav('insuredPersons'), active: activeRoute === 'insured' },
    { href: '/accounts' as const, label: tNav('accounts'), active: activeRoute === 'accounts' },
    { href: '/payments' as const, label: tNav('payments'), active: activeRoute === 'payments' },
    { href: '/settings' as const, label: tNav('settings'), active: activeRoute === 'settings' },
  ]

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold hover:opacity-80">
            peka.next
          </Link>
          <nav className="hidden md:flex items-center gap-4" aria-label={tNav('mainNavigation')}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? 'text-sm font-medium'
                    : 'text-sm text-muted-foreground hover:text-foreground'
                }
                {...(item.active ? { 'aria-current': 'page' as const } : {})}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <MobileNav items={navItems} />
          <LanguageSwitcher />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {userEmail}
          </span>
          <HeaderRoleBadge />
          <LogoutButton variant="outline" />
        </div>
      </div>
    </header>
  )
}
