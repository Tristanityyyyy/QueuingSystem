import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CustomerPortalClient from './CustomerPortalClient'
import type { Tenant } from '@/types'

interface Props {
  params: { slug: string }
}

export default async function CustomerPortalPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!tenant) notFound()

  return <CustomerPortalClient tenant={tenant as Tenant} />
}
