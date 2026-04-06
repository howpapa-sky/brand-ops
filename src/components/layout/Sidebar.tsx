'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Gift,
  Receipt,
  Globe,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types'

const navItems: NavItem[] = [
  { label: '대시보드', href: '/', icon: LayoutDashboard },
  { label: '매출/주문', href: '/sales', icon: TrendingUp },
  { label: '상품/재고', href: '/products', icon: Package },
  { label: '샘플링', href: '/sampling', icon: Gift },
  { label: '세금', href: '/tax', icon: Receipt },
  { label: '해외채널', href: '/global', icon: Globe },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex flex-col h-full">
        <div className="flex items-center h-16 px-6 border-b">
          <h1 className="text-lg font-bold">brand-ops</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-4">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
            onClick={() => {
              // TODO: signOut from next-auth
            }}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  )
}
