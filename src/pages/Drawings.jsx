import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

const PUBLIC_URL = 'https://ssjpacijslnqfdiegaio.supabase.co/storage/v1/object/public/nacrti/'

export default function Drawings() {
  const [nacrti, setNacrti] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nacrti').select('*').order('created_at', { ascending: false })
    setNacrti(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('nacrti').upload(path, file)
      if (upErr) throw upErr
      await supabase.from('nacrti').insert({
        naziv: file.name.replace(/\.[^.]+$/, ''),
        storage_path: path,
        tip: ext.toLowerCase() === 'pdf' ? 'PDF' : 'Slika'
      })
      await load()
    } catch (e) {
      alert('Greška: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="row-flex between">
        <h1 className="title-h1">Nacrti</h1>
      </div>

      <label className="photo-capture-btn mt-16" style={{marginBottom: 14}}>
        <Icon name="cloud" size={22} />
        <span>{uploading ? 'Uploading…' : 'Učitaj nacrt (PDF / slika)'}</span>
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={handleUpload}
          className="photo-input"
          disabled={uploading}
        />
      </label>

      {loading ? (
        <div className="loading"><span className="spin"></span>Učitavanje…</div>
      ) : nacrti.length === 0 ? (
        <div className="card empty">
          <Icon name="layers" size={48} className="empty-icon" />
          <div className="text-sm">Još nema nacrta.</div>
        </div>
      ) : (
        nacrti.map(n => (
          <div key={n.id} className="card tappable mb-8" onClick={() => setViewer(n)} style={{marginBottom: 10}}>
            <div className="row-flex between">
              <div className="flex-1">
                <div className="title-h2">{n.naziv}</div>
                <div className="mono text-xs text-dim mt-8">
                  {n.tip || 'Dokument'} · v{n.verzija || '01'} · {format(new Date(n.uploadano_datum || n.created_at), 'dd.MM.yyyy')}
                </div>
              </div>
              <Icon name="chevronRight" size={20} stroke="var(--text-3)" />
            </div>
          </div>
        ))
      )}

      {viewer && (
        <div className="modal-backdrop" onClick={() => setViewer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-header">
              <span className="modal-title">{viewer.naziv}</span>
              <button className="modal-close" onClick={() => setViewer(null)}><Icon name="close" size={22}/></button>
            </div>
            <div className="modal-body">
              {viewer.tip === 'PDF' ? (
                <iframe src={PUBLIC_URL + viewer.storage_path} style={{width:'100%', height:'70vh', border:'none', borderRadius:'var(--r-md)', background:'#fff'}} />
              ) : (
                <img src={PUBLIC_URL + viewer.storage_path} style={{width:'100%', borderRadius:'var(--r-md)'}} alt="" />
              )}
              <a href={PUBLIC_URL + viewer.storage_path} target="_blank" rel="noopener noreferrer"
                 className="btn btn-block mt-16">Otvori u novom tabu</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
