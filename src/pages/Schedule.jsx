import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  u_kasnjenju: 'U kašnjenju',
  u_tijeku: 'U tijeku',
  zavrseno: 'Završeno',
  nije_poceo: 'Nije počelo',
}

const STATUS_COLORS = {
  u_kasnjenju: 'var(--status-err)',
  u_tijeku: 'var(--status-info)',
  zavrseno: 'var(--status-ok)',
  nije_poceo: 'var(--text-3)',
}

function formatDate(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`
}

function formatDateLong(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function classifyStatus(a) {
  if (a.status_calc === 'zavrseno') return 'zavrseno'
  if (a.status_calc === 'nije_poceo') return 'nije_poceo'
  if (a.dana_kasnjenja < 0) return 'u_kasnjenju'
  return 'u_tijeku'
}

export default function Schedule() {
  const [aktivnosti, setAktivnosti] = useState([])
  const [zone, setZone] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [filterGrupa, setFilterGrupa] = useState('all')
  const [grouping, setGrouping] = useState('status')
  const [expandedSections, setExpandedSections] = useState({
    u_kasnjenju: true,
    u_tijeku: true,
    zavrseno: false,
    nije_poceo: false,
  })

  const [selectedAktivnost, setSelectedAktivnost] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    const [a, z] = await Promise.all([
      supabase.from('aktivnost_progress').select('*').order('pocetak_plan', { ascending: true }),
      supabase.from('zone').select('*').order('redoslijed', { ascending: true }),
    ])
    if (a.error) { setError(a.error.message); setLoading(false); return }
    if (z.error) { setError(z.error.message); setLoading(false); return }
    setAktivnosti(a.data || [])
    setZone(z.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const enriched = useMemo(
    () => aktivnosti.map(a => ({ ...a, statusKey: classifyStatus(a) })),
    [aktivnosti]
  )

  const filtered = useMemo(() => {
    return enriched.filter(a => {
      if (search && !a.naziv.toLowerCase().includes(search.toLowerCase()) && 
          !a.sifra.toLowerCase().includes(search.toLowerCase())) return false
      if (filterGrupa !== 'all' && a.vrsta_grupa !== filterGrupa) return false
      return true
    })
  }, [enriched, search, filterGrupa])

  const kpi = useMemo(() => {
    const uKasnjenju = enriched.filter(a => a.statusKey === 'u_kasnjenju')
    const uTijeku = enriched.filter(a => a.statusKey === 'u_tijeku')
    const zavrseno = enriched.filter(a => a.statusKey === 'zavrseno')
    const poPlanu = enriched.filter(a => a.statusKey === 'u_tijeku' || a.statusKey === 'zavrseno')
    const avgKasnjenja = uKasnjenju.length 
      ? Math.round(uKasnjenju.reduce((s, a) => s + Number(a.dana_kasnjenja), 0) / uKasnjenju.length)
      : 0
    const totalPlan = enriched.reduce((s, a) => s + Number(a.postotak_plan), 0)
    const totalActual = enriched.reduce((s, a) => s + Number(a.postotak_napretka), 0)
    return {
      uKasnjenju: uKasnjenju.length,
      uTijeku: uTijeku.length,
      zavrseno: zavrseno.length,
      poPlanu: poPlanu.length,
      avgKasnjenja,
      totalAktivnosti: enriched.length,
      avgPlan: enriched.length ? Math.round(totalPlan / enriched.length) : 0,
      avgActual: enriched.length ? Math.round(totalActual / enriched.length) : 0,
    }
  }, [enriched])

  const grupe = useMemo(() => {
    const set = new Set(enriched.map(a => a.vrsta_grupa).filter(Boolean))
    return Array.from(set)
  }, [enriched])

  const sections = useMemo(() => {
    if (grouping === 'status') {
      return [
        { key: 'u_kasnjenju', label: STATUS_LABELS.u_kasnjenju, items: filtered.filter(a => a.statusKey === 'u_kasnjenju').sort((x, y) => Number(x.dana_kasnjenja) - Number(y.dana_kasnjenja)) },
        { key: 'u_tijeku', label: STATUS_LABELS.u_tijeku, items: filtered.filter(a => a.statusKey === 'u_tijeku').sort((x, y) => new Date(x.kraj_plan) - new Date(y.kraj_plan)) },
        { key: 'zavrseno', label: STATUS_LABELS.zavrseno, items: filtered.filter(a => a.statusKey === 'zavrseno').sort((x, y) => new Date(y.zatvoreno_at || 0) - new Date(x.zatvoreno_at || 0)) },
        { key: 'nije_poceo', label: STATUS_LABELS.nije_poceo, items: filtered.filter(a => a.statusKey === 'nije_poceo').sort((x, y) => new Date(x.pocetak_plan) - new Date(y.pocetak_plan)) },
      ].filter(s => s.items.length > 0)
    } else if (grouping === 'faza') {
      const byGrupa = {}
      filtered.forEach(a => {
        const g = a.vrsta_grupa || 'Ostalo'
        if (!byGrupa[g]) byGrupa[g] = []
        byGrupa[g].push(a)
      })
      return Object.entries(byGrupa).map(([k, items]) => ({ key: k, label: k, items: items.sort((x, y) => x.sifra.localeCompare(y.sifra)) }))
    } else {
      return [{ key: 'all', label: 'Sve aktivnosti', items: [...filtered].sort((x, y) => new Date(x.pocetak_plan) - new Date(y.pocetak_plan)) }]
    }
  }, [filtered, grouping])

  function toggleSection(key) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  }

  if (loading) {
    return (
      <main style={{ padding: '16px' }}>
        <h1 className="title-h1">Terminski plan</h1>
        <div className="text-sm text-muted mt-8">UČITAVANJE…</div>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: '16px' }}>
        <h1 className="title-h1">Terminski plan</h1>
        <div className="text-sm" style={{ color: 'var(--status-err)', marginTop: '8px' }}>
          Greška: {error}
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '16px', paddingBottom: '40px' }}>
      <h1 className="title-h1">Terminski plan</h1>
      <div className="text-sm text-muted mt-8">
        04.06.2025 – 15.01.2027 · 591 dana
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
        <KpiCard
          label="U kašnjenju"
          value={kpi.uKasnjenju}
          subtitle={kpi.avgKasnjenja ? `prosj. ${kpi.avgKasnjenja} d` : '–'}
          accent="var(--status-err)"
        />
        <KpiCard
          label="U tijeku"
          value={kpi.uTijeku}
          subtitle="aktivnosti"
          accent="var(--status-info)"
        />
        <KpiCard
          label="Završeno"
          value={kpi.zavrseno}
          subtitle={`od ${kpi.totalAktivnosti} ukupno`}
          accent="var(--status-ok)"
        />
        <KpiCard
          label="Po planu"
          value={kpi.poPlanu}
          subtitle={`plan ${kpi.avgPlan}% / actual ${kpi.avgActual}%`}
          accent="var(--text-1)"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        <input
          type="text"
          placeholder="Pretraži po nazivu ili šifri…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-0)',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <select
            value={filterGrupa}
            onChange={e => setFilterGrupa(e.target.value)}
            style={{
              padding: '8px 10px',
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-0)',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          >
            <option value="all">Sve faze</option>
            {grupe.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Grupiraj
        </span>
        <button
          className={`chip ${grouping === 'status' ? 'selected' : ''}`}
          onClick={() => setGrouping('status')}
        >
          Po statusu
        </button>
        <button
          className={`chip ${grouping === 'faza' ? 'selected' : ''}`}
          onClick={() => setGrouping('faza')}
        >
          Po fazi
        </button>
        <button
          className={`chip ${grouping === 'all' ? 'selected' : ''}`}
          onClick={() => setGrouping('all')}
        >
          Sve redom
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        {sections.length === 0 && (
          <div className="text-sm text-muted" style={{ textAlign: 'center', padding: '40px 0' }}>
            Nema aktivnosti za odabrane filtere
          </div>
        )}
        {sections.map(section => {
          const isExpanded = grouping === 'status' ? (expandedSections[section.key] !== false) : true
          const accent = STATUS_COLORS[section.key] || 'var(--text-2)'
          return (
            <div key={section.key} style={{ marginBottom: '20px' }}>
              <div
                onClick={() => grouping === 'status' && toggleSection(section.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: grouping === 'status' ? 'pointer' : 'default',
                  marginBottom: '10px',
                  userSelect: 'none',
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: accent,
                }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {section.label}
                </span>
                <span className="mono text-xs" style={{ color: 'var(--text-3)' }}>
                  {section.items.length}
                </span>
                {grouping === 'status' && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
              </div>
              {isExpanded && section.items.map(a => (
                <AktivnostRow key={a.id} aktivnost={a} onClick={() => setSelectedAktivnost(a)} />
              ))}
            </div>
          )
        })}
      </div>

      {selectedAktivnost && (
        <AktivnostModal
          aktivnost={selectedAktivnost}
          onClose={() => setSelectedAktivnost(null)}
          onUpdated={() => { setSelectedAktivnost(null); load() }}
        />
      )}
    </main>
  )
}

function KpiCard({ label, value, subtitle, accent }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      padding: '12px',
    }}>
      <div style={{
        fontSize: '10px',
        color: 'var(--text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '26px',
        fontWeight: 500,
        color: accent,
        lineHeight: 1,
        fontFamily: 'var(--font-display)',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '11px',
        color: 'var(--text-3)',
        marginTop: '6px',
      }}>
        {subtitle}
      </div>
    </div>
  )
}

function AktivnostRow({ aktivnost, onClick }) {
  const a = aktivnost
  const accent = STATUS_COLORS[a.statusKey]
  const pct = Math.round(Number(a.postotak_napretka))
  const planPct = Math.round(Number(a.postotak_plan))
  const kasnjenje = Number(a.dana_kasnjenja)

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: '0 var(--r-md) var(--r-md) 0',
        padding: '10px 12px',
        marginBottom: '6px',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-1)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono text-xs" style={{ color: 'var(--text-3)' }}>{a.sifra}</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-0)' }}>{a.naziv}</span>
          </div>
          <div className="mono text-xs text-dim" style={{ marginTop: '4px' }}>
            {formatDate(a.pocetak_plan)} – {formatDate(a.kraj_plan)} · {a.trajanje_dana}d
            {a.vrsta_grupa && <span style={{ marginLeft: '8px', color: 'var(--text-3)' }}>· {a.vrsta_grupa}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: '60px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>plan {planPct}%</div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: accent, fontFamily: 'var(--font-display)' }}>
            {pct}%
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        height: '5px',
        background: 'var(--bg-3)',
        borderRadius: '3px',
        marginTop: '10px',
        overflow: 'visible',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: accent,
          borderRadius: '3px',
        }} />
        {planPct > 0 && planPct < 100 && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            left: `${planPct}%`,
            width: '1px',
            height: '9px',
            background: 'var(--text-1)',
          }} />
        )}
      </div>

      {(kasnjenje !== 0 || a.broj_unosa > 0) && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-3)' }}>
          {kasnjenje < 0 && (
            <span style={{ color: 'var(--status-err)' }}>{kasnjenje} d</span>
          )}
          {kasnjenje > 0 && (
            <span style={{ color: 'var(--status-ok)' }}>+{kasnjenje} d</span>
          )}
          {a.broj_unosa > 0 && (
            <span>{a.broj_unosa} {a.broj_unosa === 1 ? 'unos' : 'unosa'}</span>
          )}
        </div>
      )}
    </div>
  )
}

function AktivnostModal({ aktivnost, onClose, onUpdated }) {
  const a = aktivnost
  const [mode, setMode] = useState('view')
  const [pocetak, setPocetak] = useState(a.pocetak_plan || '')
  const [kraj, setKraj] = useState(a.kraj_plan || '')
  const [napomena, setNapomena] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function spremiDatume() {
    if (!pocetak || !kraj) { setErr('Datumi su obavezni'); return }
    if (new Date(kraj) < new Date(pocetak)) { setErr('Kraj ne može biti prije početka'); return }
    setSaving(true)
    setErr(null)
    const { error: upErr } = await supabase
      .from('aktivnosti')
      .update({ pocetak_plan: pocetak, kraj_plan: kraj })
      .eq('id', a.id)
    if (upErr) { setErr(upErr.message); setSaving(false); return }
    await supabase.from('aktivnost_log').insert({
      aktivnost_id: a.id,
      tip_promjene: 'datum_pomaknut',
      stara_vrijednost: `${a.pocetak_plan} → ${a.kraj_plan}`,
      nova_vrijednost: `${pocetak} → ${kraj}`,
      napomena: napomena || null,
      autor: 'nadzornik',
    })
    setSaving(false)
    onUpdated()
  }

  async function zatvoriAktivnost() {
    setSaving(true)
    setErr(null)
    const { error: upErr } = await supabase
      .from('aktivnosti')
      .update({
        zatvoreno: true,
        zatvoreno_at: new Date().toISOString(),
        zatvoreno_by: 'nadzornik',
      })
      .eq('id', a.id)
    if (upErr) { setErr(upErr.message); setSaving(false); return }
    await supabase.from('aktivnost_log').insert({
      aktivnost_id: a.id,
      tip_promjene: 'zatvoreno',
      nova_vrijednost: 'zavrseno',
      napomena: napomena || null,
      autor: 'nadzornik',
    })
    setSaving(false)
    onUpdated()
  }

  async function otvoriAktivnost() {
    setSaving(true)
    setErr(null)
    const { error: upErr } = await supabase
      .from('aktivnosti')
      .update({ zatvoreno: false, zatvoreno_at: null, zatvoreno_by: null })
      .eq('id', a.id)
    if (upErr) { setErr(upErr.message); setSaving(false); return }
    await supabase.from('aktivnost_log').insert({
      aktivnost_id: a.id,
      tip_promjene: 'otvoreno',
      napomena: napomena || null,
      autor: 'nadzornik',
    })
    setSaving(false)
    onUpdated()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          padding: '16px',
          border: '1px solid var(--border)',
          paddingBottom: 'calc(16px + var(--safe-bottom))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div className="mono text-xs text-dim">{a.sifra} · {a.vrsta_grupa}</div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-0)', marginTop: '4px' }}>
              {a.naziv}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >×</button>
        </div>

        {mode === 'view' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <DetailField label="Početak plana" value={formatDateLong(a.pocetak_plan)} />
              <DetailField label="Kraj plana" value={formatDateLong(a.kraj_plan)} />
              <DetailField label="Trajanje" value={`${a.trajanje_dana} dana`} />
              <DetailField label="Status" value={STATUS_LABELS[a.statusKey] || a.status_calc} />
              <DetailField label="Plan" value={`${Math.round(Number(a.postotak_plan))}%`} />
              <DetailField label="Stvarno" value={`${Math.round(Number(a.postotak_napretka))}%`} />
              <DetailField label="Kašnjenje" value={`${Number(a.dana_kasnjenja)} d`} />
              <DetailField label="Broj unosa" value={a.broj_unosa || 0} />
            </div>

            {a.pocetak_plan_original && (a.pocetak_plan_original !== a.pocetak_plan || a.kraj_plan_original !== a.kraj_plan) && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                padding: '8px 10px',
                marginBottom: '12px',
                fontSize: '11px',
                color: 'var(--text-2)',
              }}>
                <div style={{ color: 'var(--text-3)', marginBottom: '4px' }}>Originalni Gantt datumi:</div>
                <div className="mono">
                  {formatDateLong(a.pocetak_plan_original)} – {formatDateLong(a.kraj_plan_original)}
                </div>
              </div>
            )}

            {a.zatvoreno && a.zatvoreno_at && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--status-ok)',
                borderRadius: '0 var(--r-sm) var(--r-sm) 0',
                padding: '8px 10px',
                marginBottom: '12px',
                fontSize: '11px',
                color: 'var(--text-2)',
              }}>
                Aktivnost zatvorena {formatDateLong(a.zatvoreno_at)}
                {a.zatvoreno_by && <span> · {a.zatvoreno_by}</span>}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setMode('edit_dates')}
                style={btnSecondary}
              >
                Promijeni datume
              </button>
              {!a.zatvoreno ? (
                <button
                  onClick={() => setMode('confirm_close')}
                  style={{ ...btnPrimary, background: 'var(--status-ok)' }}
                >
                  Označi kao završeno
                </button>
              ) : (
                <button
                  onClick={() => setMode('confirm_open')}
                  style={btnSecondary}
                >
                  Otvori ponovno
                </button>
              )}
            </div>
          </>
        )}

        {mode === 'edit_dates' && (
          <>
            <Field label="Početak plana">
              <input
                type="date"
                value={pocetak}
                onChange={e => setPocetak(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Kraj plana">
              <input
                type="date"
                value={kraj}
                onChange={e => setKraj(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Napomena (opcionalno)">
              <input
                type="text"
                placeholder="Zašto se datum pomakao?"
                value={napomena}
                onChange={e => setNapomena(e.target.value)}
                style={inputStyle}
              />
            </Field>

            {err && <div style={errStyle}>{err}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setMode('view')} style={{ ...btnSecondary, flex: 1 }} disabled={saving}>
                Odustani
              </button>
              <button onClick={spremiDatume} style={{ ...btnPrimary, flex: 1 }} disabled={saving}>
                {saving ? 'Spremam…' : 'Spremi'}
              </button>
            </div>
          </>
        )}

        {mode === 'confirm_close' && (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.5 }}>
              Aktivnost <strong>{a.naziv}</strong> bit će označena kao završena.
              Trenutni napredak je {Math.round(Number(a.postotak_napretka))}%.
            </p>
            <Field label="Napomena (opcionalno)">
              <input
                type="text"
                placeholder="Razlog zatvaranja"
                value={napomena}
                onChange={e => setNapomena(e.target.value)}
                style={inputStyle}
              />
            </Field>

            {err && <div style={errStyle}>{err}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setMode('view')} style={{ ...btnSecondary, flex: 1 }} disabled={saving}>
                Odustani
              </button>
              <button onClick={zatvoriAktivnost} style={{ ...btnPrimary, flex: 1, background: 'var(--status-ok)' }} disabled={saving}>
                {saving ? 'Spremam…' : 'Zatvori aktivnost'}
              </button>
            </div>
          </>
        )}

        {mode === 'confirm_open' && (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.5 }}>
              Aktivnost <strong>{a.naziv}</strong> bit će vraćena u stanje "u tijeku".
            </p>
            <Field label="Napomena (opcionalno)">
              <input
                type="text"
                placeholder="Razlog otvaranja"
                value={napomena}
                onChange={e => setNapomena(e.target.value)}
                style={inputStyle}
              />
            </Field>

            {err && <div style={errStyle}>{err}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setMode('view')} style={{ ...btnSecondary, flex: 1 }} disabled={saving}>
                Odustani
              </button>
              <button onClick={otvoriAktivnost} style={{ ...btnPrimary, flex: 1 }} disabled={saving}>
                {saving ? 'Spremam…' : 'Otvori ponovno'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DetailField({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '8px 10px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-0)' }}>{value}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-1)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-0)',
  fontSize: '14px',
  fontFamily: 'inherit',
}

const btnSecondary = {
  width: '100%',
  padding: '10px 16px',
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-0)',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnPrimary = {
  width: '100%',
  padding: '10px 16px',
  background: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--r-md)',
  color: 'white',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const errStyle = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid var(--status-err)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 10px',
  fontSize: '12px',
  color: 'var(--status-err)',
  marginTop: '8px',
}
Iter 3a: Schedule ekran nadogradnja
