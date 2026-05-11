import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { hr } from 'date-fns/locale'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

const PUBLIC_URL = 'https://ssjpacijslnqfdiegaio.supabase.co/storage/v1/object/public/fotografije/'

export default function Photos() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all|zone|vrsta
  const [zones, setZones] = useState([])
  const [vrste, setVrste] = useState([])
  const [zoneId, setZoneId] = useState('')
  const [vrstaId, setVrstaId] = useState('')
  const [viewer, setViewer] = useState(null)

  useEffect(() => {
    supabase.from('zone').select('*').order('redoslijed').then(({data}) => setZones(data || []))
    supabase.from('vrste_radova').select('*').order('redoslijed').then(({data}) => setVrste(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('fotografije')
      .select('*, zona:zona_id(naziv, boja), aktivnost:aktivnost_id(naziv), unos:dnevni_unos_id(opis, vrsta:vrsta_rada_id(naziv, sifra, boja))')
      .order('datum', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (filter === 'zone' && zoneId) q = q.eq('zona_id', zoneId)
    if (filter === 'vrsta' && vrstaId) {
      // potrebno preko dnevnog unosa
    }

    q.then(({ data }) => {
      let result = data || []
      if (filter === 'vrsta' && vrstaId) {
        result = result.filter(p => p.unos?.vrsta?.sifra && vrste.find(v => v.id === vrstaId)?.sifra === p.unos.vrsta.sifra)
      }
      setPhotos(result)
      setLoading(false)
    })
  }, [filter, zoneId, vrstaId, vrste])

  const byDay = photos.reduce((acc, p) => {
    const key = p.datum
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div>
      <h1 className="title-h1">Fotografije</h1>

      <div className="section-label">
        <span>Pregled po</span>
      </div>
      <div className="chip-group chip-grid-3">
        <button className={'chip' + (filter === 'all' ? ' selected' : '')} onClick={() => setFilter('all')}>Datum</button>
        <button className={'chip' + (filter === 'zone' ? ' selected' : '')} onClick={() => setFilter('zone')}>Zona</button>
        <button className={'chip' + (filter === 'vrsta' ? ' selected' : '')} onClick={() => setFilter('vrsta')}>Vrsta rada</button>
      </div>

      {filter === 'zone' && (
        <div className="field mt-16">
          <select className="select" value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">— Sve zone —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.naziv}</option>)}
          </select>
        </div>
      )}
      {filter === 'vrsta' && (
        <div className="field mt-16">
          <select className="select" value={vrstaId} onChange={e => setVrstaId(e.target.value)}>
            <option value="">— Sve vrste —</option>
            {vrste.map(v => <option key={v.id} value={v.id}>{v.sifra} · {v.naziv}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading"><span className="spin"></span>Učitavanje…</div>
      ) : photos.length === 0 ? (
        <div className="card empty mt-16">
          <Icon name="camera" size={48} className="empty-icon" />
          <div className="text-sm">Još nema fotografija.</div>
        </div>
      ) : (
        Object.entries(byDay).map(([day, items]) => (
          <div key={day}>
            <div className="section-label">
              <span>{format(new Date(day), 'EEEE, dd.MM.yyyy', { locale: hr })}</span>
              <span className="mono text-xs">{items.length}</span>
            </div>
            <div className="photo-grid">
              {items.map(p => (
                <button key={p.id} className="photo-tile" onClick={() => setViewer(p)}>
                  <img src={PUBLIC_URL + p.storage_path} alt={p.caption || ''} loading="lazy" />
                  {p.zona && (
                    <div style={{position:'absolute', bottom:0, left:0, right:0, padding:'4px 6px', background:'linear-gradient(transparent, rgba(0,0,0,0.85))', fontSize: 9, fontFamily:'var(--font-mono)', textTransform:'uppercase', color:'#fff'}}>
                      {p.zona.naziv}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {viewer && (
        <div className="modal-backdrop" onClick={() => setViewer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-header">
              <span className="modal-title">{viewer.zona?.naziv || 'Foto'}</span>
              <button className="modal-close" onClick={() => setViewer(null)}><Icon name="close" size={22}/></button>
            </div>
            <div className="modal-body">
              <img src={PUBLIC_URL + viewer.storage_path} style={{width:'100%', borderRadius:'var(--r-md)'}} alt="" />
              <div className="mt-16 tag-bar">
                {viewer.unos?.vrsta && <span className="tag">{viewer.unos.vrsta.sifra}</span>}
                {viewer.lokacija_osi && <span className="tag">{viewer.lokacija_osi}</span>}
                <span className="tag">{format(new Date(viewer.datum), 'dd.MM.yyyy')}</span>
              </div>
              {viewer.unos?.opis && <div className="mt-16 text-sm text-muted">{viewer.unos.opis}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
