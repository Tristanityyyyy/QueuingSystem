'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tenant, QueueTicket, Counter } from '@/types'

interface ActiveCall {
  ticket: QueueTicket
  counter: Counter
}

interface Props {
  screen: { id: string; tenant_id: string; label?: string | null }
  tenant: Tenant
}

export default function DisplayClient({ screen, tenant }: Props) {
  const supabase = createClient()
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [waitingCount, setWaitingCount] = useState(0)
  const [now, setNow] = useState(new Date())

  async function fetchActiveCalls() {
    const today = new Date().toISOString().split('T')[0]
    const { data: session } = await supabase
      .from('queue_sessions')
      .select('id')
      .eq('tenant_id', screen.tenant_id)
      .eq('session_date', today)
      .eq('status', 'active')
      .single()

    if (!session) return

    const { data: tickets } = await supabase
      .from('queue_tickets')
      .select('*, counter:counters(*)')
      .eq('session_id', session.id)
      .in('status', ['called', 'serving'])
      .order('called_at', { ascending: false })

    const { count } = await supabase
      .from('queue_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id)
      .eq('status', 'waiting')

    const activeCalls: ActiveCall[] = (tickets ?? [])
      .filter(t => t.counter)
      .map(t => ({ ticket: t, counter: t.counter }))

    setCalls(activeCalls)
    setWaitingCount(count ?? 0)
  }

  useEffect(() => {
    fetchActiveCalls()

    const channel = supabase
      .channel(`display-${screen.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_tickets',
        filter: `tenant_id=eq.${screen.tenant_id}`,
      }, () => fetchActiveCalls())
      .subscribe()

    const clockInterval = setInterval(() => setNow(new Date()), 1000)
    const refreshInterval = setInterval(fetchActiveCalls, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(clockInterval)
      clearInterval(refreshInterval)
    }
  }, [])

  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div
      className="display-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: tenant.primary_color, fontFamily: tenant.font_family }}
    >
      {/* Header bar */}
      <header className="flex items-center justify-between px-10 py-5 bg-black/20">
        <div className="flex items-center gap-4">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.business_name} className="h-10 object-contain" />
          )}
          <div>
            <h1 className="font-display font-black text-white text-2xl tracking-tight">
              {tenant.business_name}
            </h1>
            {screen.label && (
              <p className="text-white/60 text-sm font-mono">{screen.label}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-white/90 text-3xl font-bold tracking-widest">{timeStr}</div>
          <div className="font-mono text-white/50 text-xs mt-0.5">{dateStr}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">

        {/* NOW SERVING label */}
        <div className="text-center">
          <span
            className="font-display font-black text-sm uppercase tracking-[0.3em] px-6 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            Now Serving
          </span>
        </div>

        {calls.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl mb-4 opacity-30">🪑</div>
              <p className="font-display font-bold text-white/40 text-2xl">No one being served</p>
            </div>
          </div>
        ) : (
          <div className={`flex-1 grid gap-6 ${calls.length === 1 ? 'grid-cols-1' : calls.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {calls.map(({ ticket, counter }) => (
              <div
                key={ticket.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl flex flex-col items-center justify-center p-6 shadow-2xl animate-fade-in"
              >
                {/* Window label */}
                <div
                  className="font-mono text-xs uppercase tracking-widest mb-3 px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
                >
                  Window {counter.counter_number}
                  {counter.label ? ` — ${counter.label}` : ''}
                </div>

                {/* Big number */}
                <div
                  className="font-display font-black text-white leading-none animate-number-pop"
                  style={{ fontSize: calls.length === 1 ? '10rem' : calls.length <= 4 ? '7rem' : '5rem' }}
                >
                  {ticket.display_code}
                </div>

                {/* Customer name */}
                <div className="mt-3 text-white/70 font-medium text-lg">
                  {ticket.first_name} {ticket.last_name}
                </div>

                {/* Status indicator */}
                <div className={`mt-3 text-xs font-mono px-3 py-1 rounded-full ${
                  ticket.status === 'called'
                    ? 'bg-yellow-400/20 text-yellow-200 animate-pulse'
                    : 'bg-green-400/20 text-green-200'
                }`}>
                  {ticket.status === 'called' ? '📢 CALLED' : '✅ SERVING'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="font-display font-black text-white text-4xl">{waitingCount}</div>
            <div className="font-mono text-white/50 text-xs uppercase tracking-wider">Waiting</div>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="font-display font-black text-white text-4xl">{calls.length}</div>
            <div className="font-mono text-white/50 text-xs uppercase tracking-wider">Being Served</div>
          </div>
        </div>
      </main>
    </div>
  )
}
