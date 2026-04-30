'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStatusColor } from '@/lib/utils'
import {
  PhoneCall, SkipForward, CheckCircle2, UserX,
  Power, Coffee, Loader2, LogOut
} from 'lucide-react'
import type { Counter, QueueTicket, User } from '@/types'

export default function CashierPanel() {
  const supabase = createClient()

  const [user, setUser]           = useState<User | null>(null)
  const [counter, setCounter]     = useState<Counter | null>(null)
  const [queue, setQueue]         = useState<QueueTicket[]>([])
  const [current, setCurrent]     = useState<QueueTicket | null>(null)
  const [loading, setLoading]     = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Load user and their assigned counter
  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(userData)

      const { data: counterData } = await supabase
        .from('counters')
        .select('*')
        .eq('assigned_user_id', authUser.id)
        .eq('is_active', true)
        .single()

      setCounter(counterData)
      setLoading(false)
    }
    init()
  }, [])

  const fetchQueue = useCallback(async () => {
    if (!counter) return

    const today = new Date().toISOString().split('T')[0]
    const { data: session } = await supabase
      .from('queue_sessions')
      .select('id')
      .eq('tenant_id', counter.tenant_id)
      .eq('session_date', today)
      .eq('status', 'active')
      .single()

    if (!session) return

    const { data: tickets } = await supabase
      .from('queue_tickets')
      .select('*, counter:counters(*)')
      .eq('session_id', session.id)
      .in('status', ['waiting', 'called', 'serving'])
      .order('ticket_number', { ascending: true })

    setQueue(tickets ?? [])

    const serving = tickets?.find(t =>
      t.served_by_counter === counter.id && (t.status === 'called' || t.status === 'serving')
    )
    setCurrent(serving ?? null)
  }, [counter])

  useEffect(() => {
    if (!counter) return
    fetchQueue()
  }, [counter, fetchQueue])

  // Real-time subscription
  useEffect(() => {
    if (!counter) return

    const channel = supabase
      .channel('cashier-queue')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_tickets',
        filter: `tenant_id=eq.${counter.tenant_id}`,
      }, () => fetchQueue())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [counter, fetchQueue])

  async function toggleCounterStatus(status: 'open' | 'closed' | 'break') {
    if (!counter) return
    setActionLoading(true)
    await supabase
      .from('counters')
      .update({
        status,
        opened_at: status === 'open' ? new Date().toISOString() : undefined,
        closed_at: status === 'closed' ? new Date().toISOString() : undefined,
      })
      .eq('id', counter.id)

    setCounter(prev => prev ? { ...prev, status } : prev)
    setActionLoading(false)
  }

  async function callNext() {
    if (!counter || counter.status !== 'open') return
    setActionLoading(true)

    const next = queue.find(t => t.status === 'waiting')
    if (!next) { setActionLoading(false); return }

    await supabase
      .from('queue_tickets')
      .update({ status: 'called', served_by_counter: counter.id, called_at: new Date().toISOString() })
      .eq('id', next.id)

    await logEvent(next.id, 'called')
    await fetchQueue()
    setActionLoading(false)
  }

  async function markServing() {
    if (!current) return
    setActionLoading(true)
    await supabase
      .from('queue_tickets')
      .update({ status: 'serving', served_at: new Date().toISOString() })
      .eq('id', current.id)
    await logEvent(current.id, 'serving')
    await fetchQueue()
    setActionLoading(false)
  }

  async function markDone() {
    if (!current) return
    setActionLoading(true)
    const now = new Date().toISOString()
    const waitSec = current.called_at
      ? Math.floor((new Date(current.called_at).getTime() - new Date(current.issued_at).getTime()) / 1000)
      : null
    const serveSec = current.served_at
      ? Math.floor((new Date(now).getTime() - new Date(current.served_at).getTime()) / 1000)
      : null

    await supabase
      .from('queue_tickets')
      .update({ status: 'done', completed_at: now, wait_seconds: waitSec, serve_seconds: serveSec })
      .eq('id', current.id)
    await logEvent(current.id, 'done')
    setCurrent(null)
    await fetchQueue()
    setActionLoading(false)
  }

  async function skipCurrent() {
    if (!current) return
    setActionLoading(true)
    await supabase
      .from('queue_tickets')
      .update({ status: 'skipped' })
      .eq('id', current.id)
    await logEvent(current.id, 'skipped')
    setCurrent(null)
    await fetchQueue()
    setActionLoading(false)
  }

  async function markNoShow() {
    if (!current) return
    setActionLoading(true)
    await supabase
      .from('queue_tickets')
      .update({ status: 'noshow' })
      .eq('id', current.id)
    await logEvent(current.id, 'noshow')
    setCurrent(null)
    await fetchQueue()
    setActionLoading(false)
  }

  async function logEvent(ticketId: string, eventType: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_user_id: authUser?.id,
      event_type: eventType,
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="text-blue-400 animate-spin" size={32} />
    </div>
  )

  if (!counter) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center p-8">
      <div>
        <div className="text-4xl mb-4">🪟</div>
        <h2 className="font-display font-bold text-xl text-white mb-2">No Counter Assigned</h2>
        <p className="text-slate-400 text-sm">Ask your admin to assign you to a counter.</p>
      </div>
    </div>
  )

  const waitingCount = queue.filter(t => t.status === 'waiting').length

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-lg">
            Window {counter.counter_number}
            {counter.label && <span className="text-slate-400 font-normal text-sm ml-2">— {counter.label}</span>}
          </h1>
          <p className="text-slate-400 text-sm">{user?.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span className={`text-xs font-mono px-3 py-1.5 rounded-full border ${
            counter.status === 'open'   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            counter.status === 'break'  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                          'bg-slate-700 border-slate-600 text-slate-400'
          }`}>
            {counter.status.toUpperCase()}
          </span>
          <button onClick={handleLogout} className="text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── LEFT: Controls ── */}
        <div className="space-y-4">

          {/* Window controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-display font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
              Window Controls
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => toggleCounterStatus('open')}
                disabled={counter.status === 'open' || actionLoading}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold"
              >
                <Power size={18} /> Open
              </button>
              <button
                onClick={() => toggleCounterStatus('break')}
                disabled={counter.status === 'break' || actionLoading}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold"
              >
                <Coffee size={18} /> Break
              </button>
              <button
                onClick={() => toggleCounterStatus('closed')}
                disabled={counter.status === 'closed' || actionLoading}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold"
              >
                <Power size={18} /> Close
              </button>
            </div>
          </div>

          {/* Current ticket */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-display font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
              Now Serving
            </h3>

            {current ? (
              <div>
                <div className="text-center mb-4">
                  <div className="text-6xl font-display font-black text-blue-400 tracking-tight animate-number-pop">
                    {current.display_code}
                  </div>
                  <p className="text-slate-300 font-medium mt-1">
                    {current.first_name} {current.last_name}
                  </p>
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getStatusColor(current.status)}`}>
                    {current.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {current.status === 'called' && (
                    <button onClick={markServing} disabled={actionLoading}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
                      <CheckCircle2 size={16} /> Start Serving
                    </button>
                  )}
                  {current.status === 'serving' && (
                    <button onClick={markDone} disabled={actionLoading}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
                      <CheckCircle2 size={16} /> Done
                    </button>
                  )}
                  <button onClick={skipCurrent} disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 font-semibold text-sm transition-all disabled:opacity-50">
                    <SkipForward size={15} /> Skip
                  </button>
                  <button onClick={markNoShow} disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold text-sm transition-all disabled:opacity-50">
                    <UserX size={15} /> No-show
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🪑</div>
                <p className="text-slate-500 text-sm">No one being served</p>
                <button
                  onClick={callNext}
                  disabled={counter.status !== 'open' || waitingCount === 0 || actionLoading}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                  Call Next
                </button>
              </div>
            )}
          </div>

          {/* Call next (when currently serving) */}
          {current && (
            <button
              onClick={callNext}
              disabled={counter.status !== 'open' || waitingCount === 0 || actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              <PhoneCall size={16} /> Call Next ({waitingCount} waiting)
            </button>
          )}
        </div>

        {/* ── RIGHT: Queue list ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-sm text-slate-400 uppercase tracking-wider">
              Queue
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {waitingCount} waiting
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-slate-500 text-sm">Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {queue.map(ticket => (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    current?.id === ticket.id
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-lg text-white w-16">
                      {ticket.display_code}
                    </span>
                    <span className="text-slate-300 text-sm">
                      {ticket.first_name} {ticket.last_name}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
