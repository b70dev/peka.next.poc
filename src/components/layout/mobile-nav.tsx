'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface NavItem {
  href: string
  label: string
  active: boolean
}

interface MobileNavProps {
  items: NavItem[]
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('navigation')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('menu')}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>peka.next</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 mt-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={
                item.active
                  ? 'flex items-center rounded-md px-3 py-2 text-sm font-medium bg-muted'
                  : 'flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
