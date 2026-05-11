import { useState } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { hr } from 'date-fns/locale'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

export default function Reports() {
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(null)

  async function generate(type) {
    setGenerating(true)
    setPreview(null)
    const today = new Date()
    let datumOd, datumDo, naziv
    if (type === 'dnevni') {
      datumOd = datumDo = today
      naziv = `Dnevni izvještaj · ${format(today, 'dd.MM.yyyy')}`
    } else if (type === 'tjedni') {
      datumOd = startOfWeek(today, { weekStartsOn: 1 })
      datumDo = endOfWeek(today, { weekStartsOn: 1 })
      naziv = `Tjedni izvještaj · ${format(datumOd, 'dd.MM.')} – ${format(datumDo, 'dd.MM.yyyy')}`
    } else {
      datumOd = startOfMonth(today)
      datumDo = endOfMonth(today)
      naziv = `Mjesečni izvještaj · ${format(today, 'LLLL yyyy', { locale: hr })}`
    }

    const { data: unosi } = await supabase
      .from('dnevni_unosi')
      .select('*, zona:zona_id(naziv, boja), vrsta:vrsta_rada_id(naziv, sifra), foto_count:fotografije(count)')
      .gte('datum', format(datumOd, 'yyyy-MM-dd'))
      .lte('datum', format(datumDo, 'yyyy-MM-dd'))
      .order('datum', { ascending: false })

    setPreview({ type, naziv, datumOd, datumDo, unosi: unosi || [] })
    setGenerating(false)
  }

  return (
    <div>
      <h1 className="title-h1">Izvještaji</h1>

      <div className="section-label">
        <span>Generiraj novi</span>
      </div>

      <div className="chip-group">
        <button className="btn btn-lg btn-block" onClick={() => generate('dnevni')} disabled={generating}>
          <Icon name="calendar" size={18} />
          <span style={{flex: 1, textAlign: 'left', marginLeft: 8}}>Dnevni · za današnji dan</span>
          <Icon name="chevronRight" size={18} />
        </button>
        <button className="btn btn-lg btn-block" onClick={() => generate('tjedni')} disabled={generating}>
          <Icon name="calendar" size={18} />
          <span style={{flex: 1, textAlign: 'left', marginLeft: 8}}>Tjedni · ovaj tjedan</span>
          <Icon name="chevronRight" size={18} />
        </button>
        <button className="btn btn-lg btn-block" onClick={() => generate('mjesecni')} disabled={generating}>
          <Icon name="calendar" size={18} />
          <span style={{flex: 1, textAlign: 'left', marginLeft: 8}}>Mjesečni · ovaj mjesec</span>
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      {generating && (
        <div className="loading mt-16"><span className="spin"></span>Generiram…</div>
      )}

      {preview && (
        <>
          <div className="section-label mt-16">
            <span>{preview.naziv}</span>
            <button onClick={() => window.print()} className="text-xs mono" style={{color:'var(--accent)'}}>PRINT / PDF</button>
          </div>

          <div className="card">
            <div className="row-flex between mb-8">
              <span className="title-h2">Pregled</span>
              <span className="pill accent">{preview.unosi.length} unos{preview.unosi.length === 1 ? '' : 'a'}</span>
            </div>

            {preview.unosi.length === 0 ? (
              <div className="text-muted text-sm">Nema unosa za ovo razdoblje.</div>
            ) : (
              <SummaryByZone unosi={preview.unosi}/>
            )}
          </div>

          {preview.unosi.map(u => (
            <div key={u.id} className="card mt-8" style={{marginTop: 10}}>
              <div className="row-flex between mb-8">
                <span className="mono text-xs text-dim">{format(new Date(u.datum), 'dd.MM.yyyy')}</span>
                <span className="pill">{u.zona?.naziv || '—'}</span>
              </div>
              <div className="text-sm" style={{fontWeight: 600}}>
                {u.vrsta?.naziv || 'Bez vrste'} {u.lokacija_osi && <span className="text-dim">· {u.lokacija_osi}</span>}
              </div>
              {u.opis && <div className="text-sm text-muted mt-8">{u.opis}</div>}
              <div className="mono text-xs text-dim mt-8">
                {u.broj_radnika ? u.broj_radnika + ' radnika · ' : ''}
                {u.vrijeme_uvjeti || ''}
                {u.foto_count?.[0]?.count > 0 ? ` · ${u.foto_count[0].count} foto` : ''}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function SummaryByZone({ unosi }) {
  const byZone = unosi.reduce((acc, u) => {
    const k = u.zona?.naziv || '—'
    if (!acc[k]) acc[k] = { count: 0, boja: u.zona?.boja || '#666' }
    acc[k].count++
    return acc
  }, {})
  return (
    <div className="text-sm" style={{display: 'grid', gap: 6}}>
      {Object.entries(byZone).map(([z, v]) => (
        <div key={z} className="row-flex between">
          <span className="row-flex gap-8">
            <span style={{width: 8, height: 8, borderRadius:'50%', background: v.boja}}/>
            {z}
          </span>
          <span className="mono text-xs text-dim">{v.count}</span>
        </div>
      ))}
    </div>
  )
}
