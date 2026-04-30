import { createClient } from '@/lib/supabase/server'
import CountersClient from './CountersClient'

export default async function CountersPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session!.user.id)
    .single()

  const { data: counters } = await supabase
    .from('counters')
    .select('*, assigned_user:users(id, full_name, email)')
    .eq('tenant_id', user.tenant_id)
    .order('counter_number')

  const { data: cashiers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('tenant_id', user.tenant_id)
    .eq('role', 'cashier')
    .eq('is_active', true)

  return (
    <CountersClient
      tenantId={user.tenant_id}
      counters={counters ?? []}
      cashiers={cashiers ?? []}
    />
  )
}
