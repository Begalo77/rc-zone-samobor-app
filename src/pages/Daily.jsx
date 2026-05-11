import { useEffect, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { hr } from 'date-fns/locale'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

export default function Daily() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [zoneFilter, setZoneFilter] = useState('all')
  const [zones, setZones] = useState([])

  useEffect(() => {
    supabase.from('zone').select('*').order('redoslijed').then(({ data }) => setZones(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    let q = supabase.from('dnevni_unosi')
      .select('*, zona:zona_id(naziv, boja), vrsta:vrsta_rada_id(naziv, sifra, boja), aktivnost:aktivnost_id(naziv, sifra), foto_count:fotografije(count)')
      .eq('datum', dateStr)
      .order('created_at', { ascending: false })
    if (zoneFilter !== 'all') q = q.eq('zona_id', zoneFilter)
    q.then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [selectedDate, zoneFilter])

  // Date strip — 7 dana unatrag + 2 unaprijed
  const dateRange = Array.from({ length: 10 }, (_, i) => subDays(addDays(new Date(), 2), i))

  return (
    <div>
      <h1 className="title-h1">Dnevnik radova</h1>

      <div className="date-strip mt-8">
        {dateRange.map(d => {
          const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          return (
            <button
              key={d.toISOString()}
              className={'date-chip' + (isSelected ? ' selected' : '') + (isToday && !isSelected ? ' today' : '')}
              onClick={() => setSelectedDate(d)}
            >
              <span className="dow">{format(d, 'EEE', { locale: hr })}</span>
              <span className="day">{format(d, 'dd')}</span>
            </button>
          )
        })}
      </div>

      <div className="section-label">
        <span>Filter po zoni</span>
      </div>
      <div className="chip-group chip-grid-3">
        <button className={'chip' + (zoneFilter === 'all' ? ' selected' : '')} onClick={() => setZoneFilter('all')}>Sve</button>
        {zones.slice(0, 5).map(z => (
          <button key={z.id} className={'chip' + (zoneFilter === z.id ? ' selected' : '')} onClick={() => setZoneFilter(z.id)}>
            {z.naziv}
          </button>
        ))}
      </div>

      <div className="section-label">
        <span>{format(selectedDate, 'EEEE, dd.MM.yyyy', { locale: hr })}</span>
        <span className="mono text-xs">{entries.length} unos{entries.length === 1 ? '' : entries.length < 5 ? 'a' : 'a'}</span>
      </div>

      {loading ? (
        <div className="loading"><span className="spin"></span>Učitavanje…</div>
      ) : entries.length === 0 ? (
        <div className="card empty">
          <Icon name="clipboard" size={48} className="empty-icon" />
          <div className="text-sm">Nema unosa za ovaj datum.</div>
        </div>
      ) : (
        entries.map(e => <EntryCard key={e.id} entry={e} />)
      )}
    </div>
  )
}

function EntryCard({ entry }) {
  const fotoCount = entry.foto_count?.[0]?.count || 0
  return (
    <div className="card tappable" style={{marginBottom: 10}}>
      <div className="row-flex between mb-8">
        <div className="row-flex gap-8">
          <div className="zone-bar" style={{background: entry.zona?.boja || '#666', height: 18, width: 3}}/>
          <span className="title-h2">{entry.zona?.naziv || 'Bez zone'}</span>
        </div>
        <span className={'pill ' + statusPill(entry.status)}><span className="dot"/>{statusLabel(entry.status)}</span>
      </div>

      {entry.vrsta && (
        <div className="tag-bar mb-8">
          <span className="tag">{entry.vrsta.sifra}</span>
          <span className="tag" style={{color: entry.vrsta.boja, borderColor: entry.vrsta.boja + '40'}}>{entry.vrsta.naziv}</span>
          {entry.lokacija_osi && <span className="tag">{entry.lokacija_osi}</span>}
        </div>
      )}

      {entry.opis && <div className="text-sm text-muted">{entry.opis}</div>}

      <div className="row-flex between mt-8 text-xs text-dim mono" style={{paddingTop: 8, borderTop: '1px solid var(--border)'}}>
        <span>{entry.broj_radnika ? entry.broj_radnika + ' radnika' : '—'}</span>
        {fotoCount > 0 && (
          <span className="row-flex" style={{gap: 4}}>
            <Icon name="camera" size={12} />
            {fotoCount}
          </span>
        )}
        {entry.unio && <span>{entry.unio}</span>}
      </div>
    </div>
  )
}

function statusPill(s) {
  return { zavrseno: 'ok', u_tijeku: 'accent', pauzirano: 'warn', problem: 'err' }[s] || 'info'
}
function statusLabel(s) {
  return { zavrseno: 'Završeno', u_tijeku: 'U tijeku', pauzirano: 'Pauzirano', problem: 'Problem' }[s] || s
}
