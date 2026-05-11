import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

export default function NewEntry() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=zona+vrsta, 2=detalji, 3=fotke
  const [saving, setSaving] = useState(false)

  // Reference data
  const [zones, setZones] = useState([])
  const [vrste, setVrste] = useState([])
  const [aktivnosti, setAktivnosti] = useState([])
  const [osiX, setOsiX] = useState([])
  const [osiY, setOsiY] = useState([])

  // Form data
  const [form, setForm] = useState({
    zona_id: '',
    vrsta_rada_id: '',
    aktivnost_id: '',
    os_x: '',
    os_y: '',
    opis: '',
    status: 'u_tijeku',
    broj_radnika: '',
    vrijeme_uvjeti: '',
    unio: ''
  })

  // Photos to upload
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    (async () => {
      const [z, v, a, o] = await Promise.all([
        supabase.from('zone').select('*').order('redoslijed'),
        supabase.from('vrste_radova').select('*').order('redoslijed'),
        supabase.from('aktivnosti').select('id, sifra, naziv, vrsta_rada_id').order('redoslijed'),
        supabase.from('osi').select('*').order('redoslijed')
      ])
      setZones(z.data || [])
      setVrste(v.data || [])
      setAktivnosti(a.data || [])
      setOsiX((o.data || []).filter(x => x.smjer === 'X'))
      setOsiY((o.data || []).filter(x => x.smjer === 'Y'))
    })()
  }, [])

  const aktivnostiZaVrstu = form.vrsta_rada_id
    ? aktivnosti.filter(a => a.vrsta_rada_id === form.vrsta_rada_id)
    : []

  function handlePhotos(e) {
    const files = Array.from(e.target.files)
    setPhotos(prev => [...prev, ...files])
  }

  async function save() {
    if (!form.zona_id || !form.vrsta_rada_id) {
      alert('Odaberi zonu i vrstu rada')
      return
    }
    setSaving(true)
    try {
      const lokacija_osi = [form.os_x, form.os_y].filter(Boolean).join(' / ') || null

      const { data: unos, error } = await supabase
        .from('dnevni_unosi')
        .insert({
          zona_id: form.zona_id,
          vrsta_rada_id: form.vrsta_rada_id,
          aktivnost_id: form.aktivnost_id || null,
          lokacija_osi,
          opis: form.opis || null,
          status: form.status,
          broj_radnika: form.broj_radnika ? parseInt(form.broj_radnika) : null,
          vrijeme_uvjeti: form.vrijeme_uvjeti || null,
          unio: form.unio || null
        })
        .select()
        .single()

      if (error) throw error

      // Upload photos
      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const path = `${unos.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
        const { error: upErr } = await supabase.storage.from('fotografije').upload(path, file)
        if (!upErr) {
          await supabase.from('fotografije').insert({
            dnevni_unos_id: unos.id,
            zona_id: form.zona_id,
            aktivnost_id: form.aktivnost_id || null,
            lokacija_osi,
            storage_path: path
          })
        }
      }

      navigate('/daily')
    } catch (e) {
      alert('Greška kod spremanja: ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="row-flex between mb-8">
        <h1 className="title-h1">Novi unos</h1>
        <button onClick={() => navigate(-1)} className="modal-close">
          <Icon name="close" size={22} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="row-flex gap-8 mb-8 mono text-xs text-dim" style={{textTransform: 'uppercase', letterSpacing: '0.08em'}}>
        <span style={{color: step >= 1 ? 'var(--accent)' : ''}}>1 · Zona</span>
        <span>›</span>
        <span style={{color: step >= 2 ? 'var(--accent)' : ''}}>2 · Detalji</span>
        <span>›</span>
        <span style={{color: step >= 3 ? 'var(--accent)' : ''}}>3 · Foto</span>
      </div>

      {step === 1 && (
        <>
          <div className="field">
            <label className="field-label">Zona / Najmoprimac <span className="req">*</span></label>
            <div className="chip-group chip-grid-2">
              {zones.map(z => (
                <button key={z.id}
                  className={'chip' + (form.zona_id === z.id ? ' selected' : '')}
                  onClick={() => setForm({...form, zona_id: z.id})}
                  style={form.zona_id === z.id ? {borderColor: z.boja, color: z.boja, background: z.boja + '20'} : {}}
                >
                  <span style={{display:'inline-block', width:8, height:8, borderRadius:'50%', background: z.boja, marginRight: 8}}></span>
                  {z.naziv}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Vrsta rada <span className="req">*</span></label>
            <select className="select" value={form.vrsta_rada_id} onChange={e => setForm({...form, vrsta_rada_id: e.target.value, aktivnost_id: ''})}>
              <option value="">— Odaberi —</option>
              {vrste.map(v => (
                <option key={v.id} value={v.id}>{v.sifra} · {v.naziv}</option>
              ))}
            </select>
          </div>

          {aktivnostiZaVrstu.length > 0 && (
            <div className="field">
              <label className="field-label">Aktivnost iz plana (opcionalno)</label>
              <select className="select" value={form.aktivnost_id} onChange={e => setForm({...form, aktivnost_id: e.target.value})}>
                <option value="">— Bez veze —</option>
                {aktivnostiZaVrstu.map(a => (
                  <option key={a.id} value={a.id}>{a.sifra ? a.sifra + ' · ' : ''}{a.naziv}</option>
                ))}
              </select>
            </div>
          )}

          <button className="btn btn-primary btn-lg btn-block mt-16"
            disabled={!form.zona_id || !form.vrsta_rada_id}
            onClick={() => setStep(2)}>
            Dalje →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="field">
            <label className="field-label">Status</label>
            <div className="chip-group chip-grid-2">
              {[
                ['u_tijeku', 'U tijeku'],
                ['zavrseno', 'Završeno'],
                ['pauzirano', 'Pauzirano'],
                ['problem', 'Problem']
              ].map(([v, l]) => (
                <button key={v}
                  className={'chip' + (form.status === v ? ' selected' : '')}
                  onClick={() => setForm({...form, status: v})}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Lokacija – os X (sjever-jug)</label>
            <select className="select" value={form.os_x} onChange={e => setForm({...form, os_x: e.target.value})}>
              <option value="">— Os X —</option>
              {osiX.map(o => <option key={o.id} value={'Os ' + o.oznaka}>Os {o.oznaka}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Lokacija – os Y (istok-zapad)</label>
            <select className="select" value={form.os_y} onChange={e => setForm({...form, os_y: e.target.value})}>
              <option value="">— Os Y —</option>
              {osiY.map(o => <option key={o.id} value={o.oznaka}>{o.oznaka}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Broj radnika</label>
            <select className="select" value={form.broj_radnika} onChange={e => setForm({...form, broj_radnika: e.target.value})}>
              <option value="">— Odaberi —</option>
              {[2,4,6,8,10,12,15,20,25,30].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field-label">Vremenski uvjeti</label>
            <div className="chip-group chip-grid-3">
              {['Sunčano','Oblačno','Kiša','Vjetar','Snijeg','Magla'].map(v => (
                <button key={v}
                  className={'chip' + (form.vrijeme_uvjeti === v ? ' selected' : '')}
                  onClick={() => setForm({...form, vrijeme_uvjeti: v})}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Opis / Bilješka</label>
            <textarea className="textarea" placeholder="Kratki opis radova, problema, napomena…"
              value={form.opis}
              onChange={e => setForm({...form, opis: e.target.value})}
            />
          </div>

          <div className="field">
            <label className="field-label">Unio</label>
            <input className="input" placeholder="Ime supervizora" value={form.unio}
              onChange={e => setForm({...form, unio: e.target.value})}
            />
          </div>

          <div className="row-flex gap-8 mt-16">
            <button className="btn btn-block" onClick={() => setStep(1)}>← Natrag</button>
            <button className="btn btn-primary btn-block" onClick={() => setStep(3)}>Dalje →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="field">
            <label className="field-label">Fotografije</label>

            <label className="photo-capture-btn">
              <Icon name="cameraBig" size={22} />
              <span>{photos.length === 0 ? 'Slikaj ili odaberi' : `${photos.length} odabrano · dodaj još`}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="photo-input"
                onChange={handlePhotos}
              />
            </label>

            {photos.length > 0 && (
              <div className="photo-grid mt-16">
                {photos.map((f, i) => (
                  <div key={i} className="photo-tile">
                    <img src={URL.createObjectURL(f)} alt="" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      style={{position:'absolute', top:4, right:4, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,0.6)', display:'grid', placeItems:'center'}}>
                      <Icon name="close" size={14} stroke="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card mt-16">
            <div className="text-xs mono text-dim mb-8" style={{textTransform: 'uppercase'}}>Sažetak</div>
            <Summary form={form} zones={zones} vrste={vrste} aktivnosti={aktivnosti} photoCount={photos.length} />
          </div>

          <div className="row-flex gap-8 mt-16">
            <button className="btn btn-block" onClick={() => setStep(2)} disabled={saving}>← Natrag</button>
            <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
              {saving ? <><span className="spin"/>Spremam…</> : 'Spremi unos'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ form, zones, vrste, aktivnosti, photoCount }) {
  const zona = zones.find(z => z.id === form.zona_id)
  const vrsta = vrste.find(v => v.id === form.vrsta_rada_id)
  const akt = aktivnosti.find(a => a.id === form.aktivnost_id)
  const lokacija = [form.os_x, form.os_y].filter(Boolean).join(' / ')
  return (
    <div className="text-sm" style={{display:'grid', gap: 6}}>
      <Row label="Zona" value={zona?.naziv || '—'} />
      <Row label="Vrsta" value={vrsta ? vrsta.sifra + ' · ' + vrsta.naziv : '—'} />
      {akt && <Row label="Aktivnost" value={akt.naziv} />}
      {lokacija && <Row label="Lokacija" value={lokacija} />}
      <Row label="Status" value={form.status.replace('_', ' ')} />
      {form.broj_radnika && <Row label="Radnika" value={form.broj_radnika} />}
      {form.vrijeme_uvjeti && <Row label="Vrijeme" value={form.vrijeme_uvjeti} />}
      <Row label="Fotografija" value={photoCount} />
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="row-flex between text-sm">
      <span className="text-dim mono text-xs" style={{textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</span>
      <span style={{textAlign:'right', flex: 1, marginLeft: 12}}>{value}</span>
    </div>
  )
}
