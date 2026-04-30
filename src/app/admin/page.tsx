import { createClient } from '@/lib/supabase/server'
import { Users, Ticket, CheckCircle2, Clock } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('id', session!.user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  // Get today's session
  const { data: queueSession } = await supabase
    .from('queue_sessions')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('session_date', today)
    .single()

  let stats = { waiting: 0, served: 0, skipped: 0, total: 0 }

  if (queueSession) {
    const { data: tickets } = await supabase
      .from('queue_tickets')
      .select('status')
      .eq('session_id', queueSession.id)

    stats.total    = tickets?.length ?? 0
    stats.waiting  = tickets?.filter(t => t.status === 'waiting').length ?? 0
    stats.served   = tickets?.filter(t => t.status === 'done').length ?? 0
    stats.skipped  = tickets?.filter(t => ['skipped','noshow'].includes(t.status)).length ?? 0
  }

  // Open counters
  const { data: counters } = await supabase
    .from('counters')
    .select('*, assigned_user:users(full_name)')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('counter_number')

  const openCount = counters?.filter(c => c.status === 'open').length ?? 0

  const statCards = [
    { label: 'Total Today',    value: stats.total,   icon: Ticket,       color: 'blue' },
    { label: 'Waiting',        value: stats.waiting,  icon: Clock,        color: 'yellow' },
    { label: 'Served',         value: stats.served,   icon: CheckCircle2, color: 'green' },
    { label: 'Open Windows',   value: openCount,      icon: Users,        color: 'indigo' },
  ]

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    green:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  }

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          {user.tenant?.business_name} ·{' '}
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className={`inline-flex p-2.5 rounded-xl border mb-3 ${colorMap[card.color]}`}>
              <card.icon size={20} />
            </div>
            <div className="font-display font-black text-4xl text-white">{card.value}</div>
            <div className="text-slate-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Counters table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Counter Status</h2>
          <span className="font-mono text-xs text-slate-500">{openCount} open</span>
        </div>
        <div className="divide-y divide-slate-800">
          {!counters || counters.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No counters set up yet.</div>
          ) : counters.map(counter => (
            <div key={counter.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-display font-bold text-white">
                  {counter.counter_number}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {counter.label ?? `Window ${counter.counter_number}`}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {counter.assigned_user?.full_name ?? 'Unassigned'}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-mono px-3 py-1.5 rounded-full border ${
                counter.status === 'open'   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                counter.status === 'break'  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                              'bg-slate-700 border-slate-600 text-slate-400'
              }`}>
                {counter.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
