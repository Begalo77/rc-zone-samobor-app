import { useEffect, useState, useMemo } from 'react'
import { differenceInDays, format, max, min, parseISO } from 'date-fns'
import { hr } from 'date-fns/locale'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

export default function Schedule() {
  const [aktivnosti, setAktivnosti] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState('grupa') // grupa | none

  useEffect(() => {
    supabase.from('aktivnosti')
      .select('*, vrsta:vrsta_rada_id(naziv, sifra, boja, grupa)')
      .order('redoslijed')
      .then(({ data }) => {
        setAktivnosti(data || [])
        setLoading(false)
      })
  }, [])

  const { startDate, endDate, totalDays, today } = useMemo(() => {
    if (aktivnosti.length === 0) return { startDate: new Date(), endDate: new Date(), totalDays: 1, today: new Date() }
    const starts = aktivnosti.filter(a => a.pocetak_plan).map(a => parseISO(a.pocetak_plan))
    const ends = aktivnosti.filter(a => a.kraj_plan).map(a => parseISO(a.kraj_plan))
    const s = min(starts)
    const e = max(ends)
    return {
      startDate: s,
      endDate: e,
      totalDays: differenceInDays(e, s) + 1,
      today: new Date()
    }
  }, [aktivnosti])

  const todayOffset = today >= startDate && today <= endDate
    ? (differenceInDays(today, startDate) / totalDays) * 100
    : null

  // Group
  const grouped = useMemo(() => {
    if (groupBy !== 'grupa') return { 'Sve': aktivnosti }
    return aktivnosti.reduce((acc, a) => {
      const g = a.vrsta?.grupa || 'Ostalo'
      if (!acc[g]) acc[g] = []
      acc[g].push(a)
      return acc
    }, {})
  }, [aktivnosti, groupBy])

  return (
    <div>
      <h1 className="title-h1">Terminski plan</h1>
      <div className="text-sm text-muted mt-8">
        {format(startDate, 'dd.MM.yyyy')} – {format(endDate, 'dd.MM.yyyy')} · {totalDays} dana
      </div>

      <div className="section-label">
        <span>Grupiraj</span>
      </div>
      <div className="chip-group chip-grid-2">
        <button className={'chip' + (groupBy === 'grupa' ? ' selected' : '')} onClick={() => setGroupBy('grupa')}>Po fazi</button>
        <button className={'chip' + (groupBy === 'none' ? ' selected' : '')} onClick={() => setGroupBy('none')}>Sve redom</button>
      </div>

      {loading ? (
        <div className="loading"><span className="spin"></span>Učitavanje…</div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="section-label">
              <span>{group}</span>
              <span className="mono text-xs">{items.length}</span>
            </div>
            <div className="card" style={{padding: 12}}>
              {items.map(a => {
                if (!a.pocetak_plan || !a.kraj_plan) return null
                const start = parseISO(a.pocetak_plan)
                const end = parseISO(a.kraj_plan)
                const leftPct = (differenceInDays(start, startDate) / totalDays) * 100
                const widthPct = Math.max(((differenceInDays(end, start) + 1) / totalDays) * 100, 1)
                const isDone = a.status === 'zavrseno'
                const isLate = a.status === 'kasni'

                return (
                  <div key={a.id} className="gantt-row" style={{borderBottom:'1px solid var(--border)', padding:'10px 0'}}>
                    <div className="row-flex between" style={{gap:8}}>
                      <div className="flex-1" style={{minWidth: 0}}>
                        <div className="text-sm" style={{fontWeight: 600, lineHeight: 1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {a.sifra && <span className="mono text-xs text-dim" style={{marginRight: 8}}>{a.sifra}</span>}
                          {a.naziv}
                        </div>
                        <div className="mono text-xs text-dim mt-8" style={{marginTop: 4}}>
                          {format(start, 'dd.MM.')} – {format(end, 'dd.MM.yy')} · {a.trajanje_dana}d
                        </div>
                      </div>
                      <span className={'pill ' + statusPill(a.status)} style={{flexShrink: 0}}>
                        <span className="dot"/>{statusLabel(a.status)}
                      </span>
                    </div>
                    <div className="gantt-bar-track" style={{marginTop: 8}}>
                      <div
                        className={'gantt-bar' + (isDone ? ' done' : '') + (isLate ? ' late' : '')}
                        style={{
                          left: leftPct + '%',
                          width: widthPct + '%',
                          background: a.vrsta?.boja ? a.vrsta.boja + '40' : 'var(--bg-3)',
                          border: '1px solid ' + (a.vrsta?.boja || 'var(--border)')
                        }}
                      >
                        <div className="gantt-bar-fill" style={{
                          width: (a.napredak || 0) + '%',
                          background: a.vrsta?.boja || 'var(--accent)'
                        }}/>
                      </div>
                      {todayOffset !== null && (
                        <div style={{position:'absolute', top: -2, bottom: -2, left: todayOffset + '%', width: 2, background: 'var(--accent)', boxShadow: '0 0 0 1px #0a0a0a'}} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function statusPill(s) {
  return { zavrseno: 'ok', u_tijeku: 'accent', planirano: 'info', kasni: 'err', pauzirano: 'warn' }[s] || 'info'
}
function statusLabel(s) {
  return { zavrseno: 'Završeno', u_tijeku: 'U tijeku', planirano: 'Planirano', kasni: 'Kasni', pauzirano: 'Pauzirano' }[s] || s
}
