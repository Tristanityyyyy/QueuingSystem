'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStatusColor, formatWaitTime } from '@/lib/utils'
import { Search, RefreshCw } from 'lucide-react'
import type { QueueTicket } from '@/types'

interface SessionRow { id: string; session_date: string }

interface Props {
  tenantId:         string
  sessions:         SessionRow[]
  initialTickets:   object[]
  initialSessionId: string | null
}

export default function LogsClient({ tenantId, sessions, initialTickets, initialSessionId }: Props) {
  const supabase = createClient()

  const [selectedSession, setSelectedSession] = useState(initialSessionId ?? '')
  const [tickets, setTickets]                 = useState<QueueTicket[]>(initialTickets as QueueTicket[])
  const [search, setSearch]                   = useState('')
  const [loading, setLoading]                 = useState(false)

  async function loadSession(sessionId: string) {
    setSelectedSession(sessionId)
    setLoading(true)
    const { data } = await supabase
      .from('queue_tickets')
      .select('*, counter:counters(counter_number, label)')
      .eq('session_id', sessionId)
      .order('ticket_number', { ascending: true })
    setTickets((data ?? []) as QueueTicket[])
    setLoading(false)
  }

  const filtered = tickets.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.display_code.toLowerCase().includes(q) ||
      t.first_name.toLowerCase().includes(q) ||
      t.last_name.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    )
  })

  const stats = {
    total:   tickets.length,
    done:    tickets.filter(t => t.status === 'done').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    skipped: tickets.filter(t => ['skipped','noshow'].includes(t.status)).length,
  }

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">Queue Logs</h1>
          <p className="text-slate-400 mt-1">View all ticket activity per session</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedSession}
          onChange={e => loadSession(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select a date —</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.session_date}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, or status…"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
          />
        </div>

        <button
          onClick={() => selectedSession && loadSession(selectedSession)}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Mini stats */}
      {selectedSession && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',   value: stats.total,   color: 'slate' },
            { label: 'Done',    value: stats.done,    color: 'green' },
            { label: 'Waiting', value: stats.waiting, color: 'yellow' },
            { label: 'Skipped', value: stats.skipped, color: 'orange' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="font-display font-black text-2xl text-white">{s.value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            Loading tickets…
          </div>
        ) : !selectedSession ? (
          <div className="py-20 text-center text-slate-500">Select a date to view tickets.</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['#', 'Code', 'Name', 'Counter', 'Status', 'Wait', 'Serve Time', 'Issued At'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((ticket, i) => (
                  <tr key={ticket.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-display font-bold text-white">{ticket.display_code}</td>
                    <td className="px-4 py-3 text-slate-300">{ticket.first_name} {ticket.last_name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {ticket.counter
                        ? `Window ${(ticket.counter as { counter_number: number; label?: string }).counter_number}${(ticket.counter as { counter_number: number; label?: string }).label ? ` — ${(ticket.counter as { counter_number: number; label?: string }).label}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {formatWaitTime(ticket.wait_seconds)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {formatWaitTime(ticket.serve_seconds)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {new Date(ticket.issued_at).toLocaleTimeString('en-PH', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
