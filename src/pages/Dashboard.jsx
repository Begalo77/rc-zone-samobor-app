import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { hr } from 'date-fns/locale'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/Icon.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ today: 0, week: 0, photos: 0 })
  const [recent, setRecent] = useState([])
  const [activeNow, setActiveNow] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const today = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()
      const weekAgo = subDays(new Date(), 7).toISOString()

      const [unosi, foto, ganttToday] = await Promise.all([
        supabase.from('dnevni_unosi').select('id, datum, opis, status, zona:zona_id(naziv, boja), vrsta:vrsta_rada_id(naziv, sifra)').order('created_at', { ascending: false }).limit(10),
        supabase.from('fotografije').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('aktivnosti').select('id, naziv, status, pocetak_plan, kraj_plan, vrsta:vrsta_rada_id(boja, sifra)').lte('pocetak_plan', todayEnd).gte('kraj_plan', today).order('redoslijed')
      ])

      const todayCount = unosi.data?.filter(u => u.datum === format(new Date(), 'yyyy-MM-dd')).length || 0
      const weekCount = unosi.data?.length || 0

      setStats({ today: todayCount, week: weekCount, photos: foto.count || 0 })
      setRecent(unosi.data || [])
      setActiveNow(ganttToday.data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div>
      <div className="row-flex between mb-8">
        <div>
          <div className="text-xs mono text-dim" style={{textTransform:'uppercase', letterSpacing:'0.1em'}}>
            {format(new Date(), 'EEEE · dd.MM.yyyy', { locale: hr })}
          </div>
          <h1 className="title-h1 mt-8">Stanje gradilišta</h1>
        </div>
      </div>

      <div className="stat-row mt-16">
        <div className="stat">
          <div className="stat-value">{stats.today}</div>
          <div className="stat-label">Danas</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.week}</div>
          <div className="stat-label">7 dana</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.photos}</div>
          <div className="stat-label">Foto / 7d</div>
        </div>
      </div>

      <div className="section-label">
        <span>Aktivno u rasporedu</span>
        <button onClick={() => navigate('/schedule')} className="text-xs mono" style={{color:'var(--accent)'}}>Sve →</button>
      </div>
      {loading ? (
        <div className="loading"><span className="spin"></span>Učitavanje…</div>
      ) : activeNow.length === 0 ? (
        <div className="card text-muted text-sm">Nema aktivnih radova danas</div>
      ) : (
        <div className="card">
          {activeNow.slice(0, 5).map(a => (
            <div key={a.id} className="activity-row">
              <div className="activity-marker" style={{background: a.vrsta?.boja || '#666'}} />
              <div className="activity-main">
                <div className="activity-title">{a.naziv}</div>
                <div className="activity-meta">
                  {a.vrsta?.sifra} · {format(new Date(a.pocetak_plan), 'dd.MM.')} – {format(new Date(a.kraj_plan), 'dd.MM.yy')}
                </div>
              </div>
              <span className={'pill ' + statusPill(a.status)}>
                <span className="dot"></span>{statusLabel(a.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="section-label">
        <span>Posljednji unosi</span>
        <button onClick={() => navigate('/daily')} className="text-xs mono" style={{color:'var(--accent)'}}>Sve →</button>
      </div>
      {recent.length === 0 ? (
        <div className="card empty">
          <Icon name="clipboard" size={48} className="empty-icon" />
          <div className="text-sm">Još nema unosa. Tapni + da dodaš prvi.</div>
        </div>
      ) : (
        <div className="card">
          {recent.slice(0, 5).map(u => (
            <div key={u.id} className="activity-row" onClick={() => navigate('/daily')}>
              <div className="zone-bar" style={{background: u.zona?.boja || '#666'}}/>
              <div className="activity-main">
                <div className="activity-title">{u.opis || u.vrsta?.naziv || 'Bez opisa'}</div>
                <div className="activity-meta">
                  {u.zona?.naziv ? u.zona.naziv + ' · ' : ''}
                  {format(new Date(u.datum), 'dd.MM.yyyy')}
                </div>
              </div>
              <Icon name="chevronRight" size={18} stroke="var(--text-3)" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function statusPill(s) {
  return {
    zavrseno: 'ok',
    u_tijeku: 'accent',
    planirano: 'info',
    kasni: 'err',
    pauzirano: 'warn'
  }[s] || 'info'
}
function statusLabel(s) {
  return {
    zavrseno: 'Završeno',
    u_tijeku: 'U tijeku',
    planirano: 'Planirano',
    kasni: 'Kasni',
    pauzirano: 'Pauzirano'
  }[s] || s
}
