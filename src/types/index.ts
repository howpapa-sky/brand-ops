import type { LucideIcon } from 'lucide-react'

export type BrandCode = 'howpapa' | 'nucio'
export type BrandFilter = 'all' | BrandCode

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface StatsCardProps {
  label: string
  value: string
  change?: number
  icon?: LucideIcon
}

export interface ChannelInfo {
  channel: string
  channelName: string
  feeRate: number
}

export interface SyncResult {
  success: boolean
  recordsFetched: number
  recordsCreated: number
  recordsUpdated: number
  errorMessage?: string
}

export interface AlertItem {
  id: string
  type: string
  severity: string
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}
