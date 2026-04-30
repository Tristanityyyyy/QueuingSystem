'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Loader2, Check } from 'lucide-react'
import { getStatusColor } from '@/lib/utils'
import type { Counter } from '@/types'

interface Cashier { id: string; full_name: string; email: string }

interface Props {
  tenantId:  string
  counters:  (Counter & { assigned_user: Cashier | null })[]
  cashiers:  Cashier[]
}

interface FormState {
  counter_number:   string
  label:            string
  assigned_user_id: string
}

const blank: FormState = { counter_number: '', label: '', assigned_user_id: '' }

export default function CountersClient({ tenantId, counters: initial, cashiers }: Props) {
  const supabase = createClient()

  const [counters, setCounters] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>(blank)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(blank)
    setShowForm(true)
  }

  function openEdit(counter: Counter & { assigned_user: Cashier | null }) {
    setEditing(counter.id)
    setForm({
      counter_number:   String(counter.counter_number),
      label:            counter.label ?? '',
      assigned_user_id: counter.assigned_user_id ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    const payload = {
      tenant_id:        tenantId,
      counter_number:   parseInt(form.counter_number),
      label:            form.label || null,
      assigned_user_id: form.assigned_user_id || null,
    }

    if (editing) {
      const { error } = await supabase.from('counters').update(payload).eq('id', editing)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('counters').insert({ ...payload, status: 'closed' })
      if (error) { setError(error.message); setLoading(false); return }
    }

    // Refresh
    const { data } = await supabase
      .from('counters')
      .select('*, assigned_user:users(id, full_name, email)')
      .eq('tenant_id', tenantId)
      .order('counter_number')

    setCounters(data ?? [])
    setShowForm(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this counter?')) return
    await supabase.from('counters').update({ is_active: false }).eq('id', id)
    setCounters(prev => prev.filter(c => c.id !== id))
  }

  async function addCashier() {
    const email = prompt('Cashier email address?')
    if (!email) return
    const name  = prompt('Cashier full name?')
    if (!name)  return
    const pass  = prompt('Temporary password?')
    if (!pass)  return

    // Create auth user then insert into users table
    const res = await fetch('/api/admin/create-cashier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, password: pass, tenant_id: tenantId }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert('Error: ' + (d.error ?? 'Unknown'))
    } else {
      alert('Cashier created successfully!')
    }
  }

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">Counters</h1>
          <p className="text-slate-400 mt-1">Manage cashier windows and assign staff</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={addCashier}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
          >
            <Plus size={16} /> Add Cashier
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> New Counter
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl">
                {editing ? 'Edit Counter' : 'New Counter'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Window Number *
                </label>
                <input
                  type="number"
                  value={form.counter_number}
                  onChange={e => setForm(f => ({ ...f, counter_number: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. VIP Lane"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assign Cashier
                </label>
                <select
                  value={form.assigned_user_id}
                  onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Unassigned —</option>
                  {cashiers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !form.counter_number}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <span className="font-mono text-xs text-slate-500">{counters.length} counters</span>
        </div>
        {counters.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">🪟</div>
            <p className="text-slate-400">No counters yet. Create your first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {counters.map(counter => (
              <div key={counter.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-display font-bold text-xl text-white shrink-0">
                  {counter.counter_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">
                    {counter.label ?? `Window ${counter.counter_number}`}
                  </div>
                  <div className="text-slate-400 text-xs truncate">
                    {counter.assigned_user?.full_name ?? 'Unassigned'}
                    {counter.assigned_user?.email && ` · ${counter.assigned_user.email}`}
                  </div>
                </div>
                <span className={`text-xs font-mono px-3 py-1.5 rounded-full border ${
                  counter.status === 'open'  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  counter.status === 'break' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                               'bg-slate-700 border-slate-600 text-slate-400'
                }`}>
                  {counter.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(counter)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(counter.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
