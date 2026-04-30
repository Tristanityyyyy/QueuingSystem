import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDisplayCode(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(3, '0')}`
}

export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function formatWaitTime(seconds: number | null): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    waiting:  'bg-yellow-100 text-yellow-800',
    called:   'bg-blue-100 text-blue-800',
    serving:  'bg-indigo-100 text-indigo-800',
    done:     'bg-green-100 text-green-800',
    skipped:  'bg-orange-100 text-orange-800',
    noshow:   'bg-red-100 text-red-800',
    open:     'bg-emerald-100 text-emerald-800',
    closed:   'bg-gray-100 text-gray-700',
    break:    'bg-amber-100 text-amber-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}
