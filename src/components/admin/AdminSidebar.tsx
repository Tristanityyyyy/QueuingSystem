'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, MonitorPlay,
  ClipboardList, QrCode, LogOut, Users
} from 'lucide-react'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

interface Props { user: User }

const navItems = [
  { href: '/admin',          label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { href: '/admin/counters', label: 'Counters',   icon: Users },
  { href: '/admin/qrcodes',  label: 'QR Codes',   icon: QrCode },
  { href: '/admin/screens',  label: 'Screens',    icon: MonitorPlay },
  { href: '/admin/logs',     label: 'Logs',       icon: ClipboardList },
  { href: '/admin/tenants',  label: 'Tenants',    icon: Building2, superadminOnly: true },
]

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="font-display font-black text-xl text-white tracking-tight">QueueFlow</div>
        <div className="font-mono text-xs text-slate-500 mt-0.5">Admin Panel</div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="bg-slate-800 rounded-xl p-3">
          <p className="font-semibold text-white text-sm truncate">{user.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{user.email}</p>
          <span className="inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">
            {user.role}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter(item => !item.superadminOnly || user.role === 'superadmin')
          .map(item => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            )
          })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </aside>
  )
}
