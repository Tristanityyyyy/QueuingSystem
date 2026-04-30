import { createClient } from '@/lib/supabase/server'
import TenantsClient from './TenantsClient'

export default async function TenantsPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users').select('*').eq('id', session!.user.id).single()

  if (user.role !== 'superadmin') {
    return (
      <div className="p-8 text-white text-center">
        <p className="text-slate-400">Access denied.</p>
      </div>
    )
  }

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  return <TenantsClient tenants={tenants ?? []} />
}
