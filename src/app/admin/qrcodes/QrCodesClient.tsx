'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import { Plus, Trash2, Download, X, Check, Loader2 } from 'lucide-react'
import { generateToken } from '@/lib/utils'
import type { QrCode } from '@/types'

interface Props {
  tenantId:   string
  tenantSlug: string
  qrCodes:    QrCode[]
}

export default function QrCodesClient({ tenantId, tenantSlug, qrCodes: initial }: Props) {
  const supabase = createClient()

  const [qrCodes, setQrCodes] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel]       = useState('')
  const [loading, setLoading]   = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function handleCreate() {
    setLoading(true)
    const codeHash = generateToken(16)
    const destinationUrl = `${baseUrl}/q/${tenantSlug}`

    const { error } = await supabase.from('qr_codes').insert({
      tenant_id:       tenantId,
      code_hash:       codeHash,
      label:           label || null,
      destination_url: destinationUrl,
    })

    if (!error) {
      const { data } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setQrCodes(data ?? [])
      setShowForm(false)
      setLabel('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this QR code?')) return
    await supabase.from('qr_codes').update({ is_active: false }).eq('id', id)
    setQrCodes(prev => prev.filter(q => q.id !== id))
  }

  function downloadQR(id: string, label: string) {
    const svg = document.getElementById(`qr-${id}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${label || id}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">QR Codes</h1>
          <p className="text-slate-400 mt-1">Generate QR codes for customer entry points</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> Generate QR
        </button>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg">New QR Code</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Main Entrance, Counter Area"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Grid */}
      {qrCodes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 text-center">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-slate-400">No QR codes yet. Generate your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map(qr => (
            <div key={qr.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{qr.label ?? 'QR Code'}</h3>
                  <p className="font-mono text-xs text-slate-500 mt-0.5">
                    {qr.scan_count} scans
                  </p>
                </div>
                <button onClick={() => handleDelete(qr.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-4">
                <QRCodeSVG
                  id={`qr-${qr.id}`}
                  value={qr.destination_url}
                  size={180}
                  level="H"
                />
              </div>

              <p className="font-mono text-xs text-slate-500 truncate mb-3">{qr.destination_url}</p>

              <button
                onClick={() => downloadQR(qr.id, qr.label ?? qr.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
              >
                <Download size={14} /> Download SVG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
