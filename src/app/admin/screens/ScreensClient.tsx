'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ExternalLink, Monitor, X, Check, Loader2 } from 'lucide-react'
import { generateToken } from '@/lib/utils'
import type { DisplayScreen } from '@/types'

interface Props { tenantId: string; screens: DisplayScreen[] }

export default function ScreensClient({ tenantId, screens: initial }: Props) {
  const supabase = createClient()
  const [screens, setScreens] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel]       = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading]   = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function handleCreate() {
    setLoading(true)
    const token = generateToken(24)
    const { error } = await supabase.from('display_screens').insert({
      tenant_id:    tenantId,
      access_token: token,
      label:        label || null,
      location:     location || null,
    })
    if (!error) {
      const { data } = await supabase
        .from('display_screens')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setScreens(data ?? [])
      setShowForm(false)
      setLabel('')
      setLocation('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this screen?')) return
    await supabase.from('display_screens').update({ is_active: false }).eq('id', id)
    setScreens(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">Display Screens</h1>
          <p className="text-slate-400 mt-1">Manage TVs and monitors that show queue status</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Add Screen
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg">New Screen</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Label</label>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Main Lobby TV" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ground Floor, near entrance" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screens.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 text-center">
          <Monitor size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">No screens yet. Add your first display monitor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screens.map(screen => {
            const url = `${baseUrl}/display/${screen.access_token}`
            const isOnline = screen.last_seen_at
              ? (Date.now() - new Date(screen.last_seen_at).getTime()) < 2 * 60 * 1000
              : false

            return (
              <div key={screen.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                      <Monitor size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{screen.label ?? 'Display Screen'}</h3>
                      <p className="text-slate-500 text-xs">{screen.location ?? 'No location set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-slate-400 truncate mb-3">
                  {url}
                </div>

                <div className="flex gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-sm font-medium transition-all"
                  >
                    <ExternalLink size={14} /> Open Screen
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(url)}
                    className="px-3 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm transition-all"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleDelete(screen.id)}
                    className="p-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
