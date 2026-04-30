import { createClient } from '@/lib/supabase/server'
import QrCodesClient from './QrCodesClient'

export default async function QrCodesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: user } = await supabase
    .from('users').select('*, tenant:tenants(*)').eq('id', session!.user.id).single()

  const { data: qrCodes } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <QrCodesClient
      tenantId={user.tenant_id}
      tenantSlug={user.tenant?.slug ?? ''}
      qrCodes={qrCodes ?? []}
    />
  )
}
