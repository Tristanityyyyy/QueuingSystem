'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, X, Check, Loader2, Building2 } from 'lucide-react'
import type { Tenant } from '@/types'

interface Props { tenants: Tenant[] }

const blank = {
  slug: '', business_name: '', logo_url: '', primary_color: '#1d4ed8',
  secondary_color: '#ffffff', accent_color: '#f59e0b', font_family: 'DM Sans',
  welcome_message: '', queue_prefix: 'A', plan: 'free' as const, timezone: 'Asia/Manila',
}

export default function TenantsClient({ tenants: initial }: Props) {
  const supabase = createClient()
  const [tenants, setTenants]   = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<string | null>(null)
  const [form, setForm]         = useState(blank)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function field(key: keyof typeof blank) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function openCreate() {
    setEditing(null); setForm(blank); setShowForm(true)
  }

  function openEdit(t: Tenant) {
    setEditing(t.id)
    setForm({
      slug: t.slug, business_name: t.business_name, logo_url: t.logo_url ?? '',
      primary_color: t.primary_color, secondary_color: t.secondary_color,
      accent_color: t.accent_color, font_family: t.font_family,
      welcome_message: t.welcome_message ?? '', queue_prefix: t.queue_prefix,
      plan: t.plan as 'free' | 'paid', timezone: t.timezone,
    })
    setShowForm(true)
  }

  async function handleSave() {
    setLoading(true); setError(null)
    const payload = { ...form, logo_url: form.logo_url || null, welcome_message: form.welcome_message || null }

    if (editing) {
      const { error } = await supabase.from('tenants').update(payload).eq('id', editing)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('tenants').insert(payload)
      if (error) { setError(error.message); setLoading(false); return }
    }

    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    setTenants(data ?? [])
    setShowForm(false)
    setLoading(false)
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">Tenants</h1>
          <p className="text-slate-400 mt-1">All business clients on QueueFlow</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
          <Plus size={16} /> New Tenant
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 my-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl">{editing ? 'Edit Tenant' : 'New Tenant'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Business Name *</label>
                  <input type="text" value={form.business_name} onChange={field('business_name')} placeholder="Acme Corp" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Slug * (URL)</label>
                  <input type="text" value={form.slug} onChange={field('slug')} placeholder="acme-corp" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Logo URL</label>
                <input type="url" value={form.logo_url} onChange={field('logo_url')} placeholder="https://…/logo.png" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Welcome Message</label>
                <textarea value={form.welcome_message} onChange={field('welcome_message')} placeholder="Welcome! Please take a number." rows={2} className={inputCls + ' resize-none'} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color} onChange={field('primary_color')} className="w-10 h-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer" />
                    <input type="text" value={form.primary_color} onChange={field('primary_color')} className={inputCls + ' flex-1'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Secondary</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.secondary_color} onChange={field('secondary_color')} className="w-10 h-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer" />
                    <input type="text" value={form.secondary_color} onChange={field('secondary_color')} className={inputCls + ' flex-1'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Accent</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.accent_color} onChange={field('accent_color')} className="w-10 h-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer" />
                    <input type="text" value={form.accent_color} onChange={field('accent_color')} className={inputCls + ' flex-1'} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Queue Prefix</label>
                  <input type="text" value={form.queue_prefix} onChange={field('queue_prefix')} maxLength={5} placeholder="A" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Plan</label>
                  <select value={form.plan} onChange={field('plan')} className={inputCls}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Timezone</label>
                  <input type="text" value={form.timezone} onChange={field('timezone')} placeholder="Asia/Manila" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Font Family</label>
                <select value={form.font_family} onChange={field('font_family')} className={inputCls}>
                  {['DM Sans','Inter','Roboto','Poppins','Nunito','Open Sans','Lato','Montserrat'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-800">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm">Cancel</button>
              <button onClick={handleSave} disabled={loading || !form.business_name || !form.slug} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Save Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenants list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {tenants.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No tenants yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tenants.map(tenant => (
              <div key={tenant.id} className="px-6 py-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-display font-bold text-white text-lg"
                  style={{ backgroundColor: tenant.primary_color }}
                >
                  {tenant.queue_prefix}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{tenant.business_name}</div>
                  <div className="font-mono text-xs text-slate-500">/q/{tenant.slug}</div>
                </div>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                  tenant.plan === 'paid'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400'
                }`}>
                  {tenant.plan}
                </span>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                  tenant.is_active
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400'
                }`}>
                  {tenant.is_active ? 'active' : 'inactive'}
                </span>
                <button onClick={() => openEdit(tenant)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
