import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DisplayClient from './DisplayClient'

interface Props { params: { token: string } }

export default async function DisplayPage({ params }: Props) {
  const supabase = createClient()

  const { data: screen } = await supabase
    .from('display_screens')
    .select('*, tenant:tenants(*)')
    .eq('access_token', params.token)
    .eq('is_active', true)
    .single()

  if (!screen) notFound()

  // update last_seen_at
  await supabase
    .from('display_screens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', screen.id)

  return <DisplayClient screen={screen} tenant={screen.tenant} />
}
