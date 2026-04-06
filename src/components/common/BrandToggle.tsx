'use client'

import { cn } from '@/lib/utils'
import { useBrand } from '@/hooks/useBrand'
import type { BrandFilter } from '@/types'

const options: { value: BrandFilter; label: string; activeClass: string }[] = [
  { value: 'all', label: '전체', activeClass: 'bg-primary text-primary-foreground' },
  { value: 'howpapa', label: '하우파파', activeClass: 'bg-orange-500 text-white' },
  { value: 'nucio', label: '누씨오', activeClass: 'bg-green-500 text-white' },
]

export function BrandToggle() {
  const { selectedBrand, setSelectedBrand } = useBrand()

  return (
    <div className="hidden sm:flex items-center rounded-lg border p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setSelectedBrand(opt.value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            selectedBrand === opt.value
              ? opt.activeClass
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
