'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDisplayCode, generateToken } from '@/lib/utils'
import { Loader2, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import type { Tenant, QueueTicket } from '@/types'

interface Props { tenant: Tenant }

type Stage = 'form' | 'loading' | 'ticket'

export default function CustomerPortalClient({ tenant }: Props) {
  const supabase = createClient()

  const [stage, setStage]         = useState<Stage>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [ticket, setTicket]       = useState<QueueTicket | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [position, setPosition]   = useState<number | null>(null)

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0

  async function handleGetNumber() {
    setStage('loading')
    setError(null)

    try {
      // 1. Get or create today's session
      const today = new Date().toISOString().split('T')[0]
      let { data: session } = await supabase
        .from('queue_sessions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('session_date', today)
        .eq('status', 'active')
        .single()

      if (!session) {
        const { data: newSession, error: sessionError } = await supabase
          .from('queue_sessions')
          .insert({ tenant_id: tenant.id, session_date: today })
          .select()
          .single()
        if (sessionError) throw sessionError
        session = newSession
      }

      // 2. Increment ticket number
      const nextNumber = (session.last_number_issued ?? 0) + 1
      const displayCode = formatDisplayCode(tenant.queue_prefix, nextNumber)
      const customerToken = generateToken(32)

      // 3. Create ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from('queue_tickets')
        .insert({
          session_id:      session.id,
          tenant_id:       tenant.id,
          ticket_number:   nextNumber,
          display_code:    displayCode,
          first_name:      firstName.trim(),
          last_name:       lastName.trim(),
          status:          'waiting',
          customer_token:  customerToken,
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // 4. Update session counter
      await supabase
        .from('queue_sessions')
        .update({ last_number_issued: nextNumber })
        .eq('id', session.id)

      // 5. Save token in localStorage
      localStorage.setItem(`qf_token_${tenant.slug}`, customerToken)

      setTicket(newTicket as QueueTicket)
      setStage('ticket')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setStage('form')
    }
  }

  // Real-time ticket status subscription
  useEffect(() => {
    if (!ticket) return

    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'queue_tickets',
        filter: `id=eq.${ticket.id}`,
      }, payload => {
        setTicket(payload.new as QueueTicket)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticket?.id])

  // Calculate queue position
  useEffect(() => {
    if (!ticket || ticket.status !== 'waiting') return

    async function fetchPosition() {
      const { count } = await supabase
        .from('queue_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', ticket!.session_id)
        .eq('status', 'waiting')
        .lt('ticket_number', ticket!.ticket_number)

      setPosition((count ?? 0) + 1)
    }

    fetchPosition()
    const interval = setInterval(fetchPosition, 10000)
    return () => clearInterval(interval)
  }, [ticket?.status])

  // Branding style
  const brandStyle = {
    '--primary': tenant.primary_color,
    '--secondary': tenant.secondary_color,
    '--accent': tenant.accent_color,
  } as React.CSSProperties

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ ...brandStyle, backgroundColor: tenant.secondary_color, fontFamily: tenant.font_family }}
    >
      {/* Header */}
      <div className="w-full max-w-sm mb-6 text-center animate-fade-in">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt={tenant.business_name} className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="font-display font-bold text-2xl" style={{ color: tenant.primary_color }}>
          {tenant.business_name}
        </h1>
        {tenant.welcome_message && (
          <p className="text-slate-500 text-sm mt-1">{tenant.welcome_message}</p>
        )}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-slide-up">

        {/* ── FORM STAGE ── */}
        {(stage === 'form' || stage === 'loading') && (
          <div className="p-6">
            <h2 className="font-display font-bold text-xl text-slate-800 mb-1">Get your number</h2>
            <p className="text-slate-400 text-sm mb-6">Enter your name to join the queue</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Juan"
                  disabled={stage === 'loading'}
                  className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-800 text-base outline-none transition-colors disabled:opacity-50"
                  style={{ '--tw-ring-color': tenant.primary_color } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="dela Cruz"
                  disabled={stage === 'loading'}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && handleGetNumber()}
                  className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-slate-800 text-base outline-none transition-colors disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleGetNumber}
                disabled={!canSubmit || stage === 'loading'}
                className="w-full py-4 rounded-2xl font-display font-bold text-white text-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{
                  backgroundColor: canSubmit && stage !== 'loading' ? tenant.primary_color : '#94a3b8',
                  boxShadow: canSubmit ? `0 8px 24px ${tenant.primary_color}40` : 'none'
                }}
              >
                {stage === 'loading'
                  ? <><Loader2 size={20} className="animate-spin" /> Getting your number…</>
                  : <>Get My Number <ChevronRight size={20} /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── TICKET STAGE ── */}
        {stage === 'ticket' && ticket && (
          <div className="p-6 text-center">
            <div className="mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Your Queue Number
              </span>
            </div>

            {/* Big number */}
            <div
              className="relative mx-auto mb-4 w-44 h-44 rounded-3xl flex items-center justify-center shadow-2xl animate-number-pop"
              style={{ backgroundColor: tenant.primary_color }}
            >
              <div
                className="absolute inset-0 rounded-3xl animate-pulse-ring"
                style={{ backgroundColor: tenant.primary_color, opacity: 0.4 }}
              />
              <span className="font-display font-black text-5xl text-white relative z-10 tracking-tight">
                {ticket.display_code}
              </span>
            </div>

            <p className="font-semibold text-slate-700 text-lg">
              {ticket.first_name} {ticket.last_name}
            </p>

            {/* Status */}
            <div className="mt-4 mb-6">
              {ticket.status === 'waiting' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-center justify-center gap-2 text-yellow-700 font-semibold mb-1">
                    <Clock size={16} />
                    Waiting in queue
                  </div>
                  {position !== null && (
                    <p className="text-yellow-600 text-sm">
                      {position === 1 ? "You're next!" : `${position - 1} ${position - 1 === 1 ? 'person' : 'people'} ahead of you`}
                    </p>
                  )}
                </div>
              )}

              {ticket.status === 'called' && (
                <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-blue-700 font-bold text-lg mb-1">
                    📢 Your number is being called!
                  </div>
                  {ticket.served_by_counter && (
                    <p className="text-blue-600 text-sm font-semibold">
                      Please proceed to Window {ticket.counter?.counter_number ?? ''}
                    </p>
                  )}
                </div>
              )}

              {ticket.status === 'serving' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <p className="text-indigo-700 font-semibold">Currently being served ✨</p>
                </div>
              )}

              {ticket.status === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                    <CheckCircle2 size={18} />
                    All done! Thank you for waiting.
                  </div>
                </div>
              )}

              {(ticket.status === 'skipped' || ticket.status === 'noshow') && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-orange-700 font-semibold">Your number was skipped.</p>
                  <p className="text-orange-500 text-sm mt-1">Please approach the nearest counter.</p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Keep this page open to track your status in real-time.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">Powered by QueueFlow</p>
    </div>
  )
}
