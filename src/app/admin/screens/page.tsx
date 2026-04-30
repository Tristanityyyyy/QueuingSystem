import { createClient } from '@/lib/supabase/server'
import ScreensClient from './ScreensClient'

export default async function ScreensPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users').select('*').eq('id', session!.user.id).single()

  const { data: screens } = await supabase
    .from('display_screens')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return <ScreensClient tenantId={user.tenant_id} screens={screens ?? []} />
}
