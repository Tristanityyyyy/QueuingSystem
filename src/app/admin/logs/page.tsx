import { createClient } from '@/lib/supabase/server'
import LogsClient from './LogsClient'

export default async function LogsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session!.user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const { data: sessions } = await supabase
    .from('queue_sessions')
    .select('id, session_date')
    .eq('tenant_id', user.tenant_id)
    .order('session_date', { ascending: false })
    .limit(30)

  // Default: today's tickets
  const todaySession = sessions?.find(s => s.session_date === today)

  let tickets: object[] = []
  if (todaySession) {
    const { data } = await supabase
      .from('queue_tickets')
      .select('*, counter:counters(counter_number, label)')
      .eq('session_id', todaySession.id)
      .order('ticket_number', { ascending: true })

    tickets = data ?? []
  }

  return (
    <LogsClient
      tenantId={user.tenant_id}
      sessions={sessions ?? []}
      initialTickets={tickets}
      initialSessionId={todaySession?.id ?? null}
    />
  )
}
