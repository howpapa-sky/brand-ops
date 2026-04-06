'use client'

import { usePathname } from 'next/navigation'
import { BrandToggle } from '@/components/common/BrandToggle'
import { AlertBell } from '@/components/common/AlertBell'

const PAGE_TITLES: Record<string, string> = {
  '/': '대시보드',
  '/sales': '매출/주문',
  '/products': '상품/재고',
  '/sampling': '샘플링',
  '/tax': '세금',
  '/global': '해외채널',
}

export function Header() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? '대시보드'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-3">
        <BrandToggle />
        <AlertBell />
      </div>
    </header>
  )
}
