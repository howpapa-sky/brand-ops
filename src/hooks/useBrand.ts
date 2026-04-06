import { create } from 'zustand'
import type { BrandFilter } from '@/types'

interface BrandState {
  selectedBrand: BrandFilter
  setSelectedBrand: (brand: BrandFilter) => void
}

export const useBrand = create<BrandState>((set) => ({
  selectedBrand: 'all',
  setSelectedBrand: (brand) => set({ selectedBrand: brand }),
}))
