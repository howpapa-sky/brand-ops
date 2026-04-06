import { create } from 'zustand'
import type { AlertItem } from '@/types'

interface AlertState {
  alerts: AlertItem[]
  unreadCount: number
  setAlerts: (alerts: AlertItem[]) => void
  markAsRead: (id: string) => void
}

export const useAlerts = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.isRead).length,
    }),
  markAsRead: (id) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, isRead: true } : a
      )
      return {
        alerts,
        unreadCount: alerts.filter((a) => !a.isRead).length,
      }
    }),
}))
