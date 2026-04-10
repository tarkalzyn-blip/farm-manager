import { useMemo, memo, useState, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

// ── مكوّن عرض رقم البقرة — مُحمي من إعادة الرسم ──
const CowDisplay = memo(({ cow, fallbackId }) => {
  if (!cow) return <strong>#{fallbackId}</strong>
  const bg = cow.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'
  return (
    <strong style={{
      border: `2px solid ${bg}`, color: bg, padding: '2px 8px',
      borderRadius: 6, display: 'inline-block', fontSize: 12,
      fontWeight: 800, letterSpacing: '0.3px', margin: '0 4px'
    }}>
      {cow.tagColor === 'أزرق' ? '🟦' : '🟨'} {cow.id}
    </strong>
  )
})

export default function DashboardPage({ onNav }) {
  const {
    stats, cows, milkRecords, inseminations, births, finances, vaccinations,
    farmName, daysBetween, daysLeft, addDays, currency, classifyCow, dryPeriodDays
  } = useFarm()

  const today = useMemo(() =>
    new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
  [])

  // ── Defer heavy rendering to not block CSS animation (0ms lag) ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setRenderLimit(5), 50)
    const t2 = setTimeout(() => setRenderLimit(9999), 350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])


  // ── آخر 7 أيام — حليب ──
  const { last7, milkByDay, dayLabels } = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6-i))
      return d.toISOString().split('T')[0]
    })
    const milkByDay = last7.map(date =>
      milkRecords.filter(m => m.date === date).reduce((s, m) => s + (m.amount || 0), 0)
    )
    const dayLabels = last7.map(d =>
      new Date(d).toLocaleDateString('ar-SA', { weekday: 'short' })
    )
    return { last7, milkByDay, dayLabels }
  }, [milkRecords])

  const milkChartData = useMemo(() => ({
    labels: dayLabels,
    datasets: [{
      label: 'الحليب (لتر)',
      data: milkByDay,
      backgroundColor: 'rgba(61,122,82,0.15)',
      borderColor: '#3d7a52',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#3d7a52',
      pointRadius: 4,
    }]
  }), [dayLabels, milkByDay])

  // ── رسم بياني القطيع ──
  const herdData = useMemo(() => ({
    labels: ['سليمة', 'مريضة', 'حوامل', 'جافة', 'عجول ذكور'],
    datasets: [{
      data: [stats.healthyCows, stats.sickCows, stats.pregnantCows, stats.dryCows || 0, stats.maleCalves || 0],
      backgroundColor: ['#1a7a42','#b83232','#c95a00','#795548','#1565c0'],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  }), [stats.healthyCows, stats.sickCows, stats.pregnantCows, stats.dryCows, stats.maleCalves])

  // ── ملخص مالي ──
  const { revenue, expenses, profit } = useMemo(() => {
    const revenue  = finances.filter(f => f.kind === 'revenue').reduce((s,f) => s+(f.amount||0), 0)
    const expenses = finances.filter(f => f.kind === 'expense').reduce((s,f) => s+(f.amount||0), 0)
    return { revenue, expenses, profit: revenue - expenses }
  }, [finances])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // ── تنبيهات التلقيح (18-23 يوم) ──
  const insemAlerts = useMemo(() =>
    inseminations.filter(i => {
      if (i.status !== 'pending' || i.type === 'مراقبة صراف') return false
      return daysBetween(i.insemDate, todayStr) >= 18
    }),
  [inseminations, todayStr, daysBetween])

  // ── تنبيهات الصراف (20+ يوم) ──
  const heatAlerts = useMemo(() =>
    inseminations.filter(i => {
      if (i.status !== 'pending' || i.type !== 'مراقبة صراف') return false
      return daysBetween(i.insemDate, todayStr) >= 20
    }),
  [inseminations, todayStr, daysBetween])

  // ── الأبقار تحتاج تلقيح ──
  const needsInsemAlerts = useMemo(() => stats.needsInsemination || [], [stats.needsInsemination])

  // ── ولادات قريبة ──
  const upcomingBirths = useMemo(() =>
    inseminations
      .filter(i => i.status === 'confirmed')
      .map(i => ({ ...i, daysLeft: daysLeft(i.insemDate) }))
      .filter(i => i.daysLeft <= 20)
      .sort((a,b) => a.daysLeft - b.daysLeft),
  [inseminations, daysLeft])

  const overdueCount = useMemo(() => upcomingBirths.filter(i => i.daysLeft < 0).length, [upcomingBirths])

  // ── تطعيمات قريبة ──
  const upcomingVax = useMemo(() =>
    vaccinations.filter(v => !v.done)
      .sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .slice(0, 3),
  [vaccinations])

  // ── تنبيهات التجفيف ──
  const dryCowAlerts = useMemo(() =>
    inseminations.filter(i => {
      if (i.status !== 'confirmed') return false
      const remaining = daysLeft(i.insemDate)
      return remaining <= dryPeriodDays && remaining >= (dryPeriodDays - 3)
    }),
  [inseminations, daysLeft, dryPeriodDays])

  // ── خريطة بحث سريع عن الأبقار (لتجنب .find() في كل render) ──
  const cowByFirestoreId = useMemo(() => {
    const map = {}
    cows.forEach(c => { map[c.firestoreId] = c })
    return map
  }, [cows])

  const getCow = (i) => i.cowFirestoreId ? cowByFirestoreId[i.cowFirestoreId] : cows.find(c => c.id === i.cowId)

  // ── الأبقار المريضة ──
  const sickCows = useMemo(() => cows.filter(c => c.status === 'مريضة'), [cows])

  // ── خيارات الرسوم البيانية — ثابتة لا تتغير ──
  const lineOptions = useMemo(() => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  }), [])

  const doughnutOptions = useMemo(() => ({
    plugins: { legend: { position:'bottom', labels:{ font:{ family:'Cairo' }, boxWidth:12 } } },
    cutout:'65%'
  }), [])

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">📊 لوحة التحكم</div>
          <div className="topbar-sub">{today}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>🔄 تحديث</button>
          <button className="btn btn-primary btn-sm" onClick={() => onNav('reports')}>📋 تقرير اليوم</button>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon="🐄" value={stats.totalCows} label="إجمالي الأبقار"
            note={`${stats.sickCows} مريضة، ${stats.pregnantCows} حوامل`}
            color="var(--accent)" onClick={() => onNav('cows')} />
          <StatCard icon="🥛" value={`${stats.todayMilk} لتر`} label="حليب اليوم"
            note={`${stats.milkingCows || 0} بقرة منتجة`}
            color="var(--blue)" onClick={() => onNav('milk')} />
          <StatCard icon="💰" value={`${profit.toLocaleString()} ${currency}`} label="صافي الربح"
            note={`إيرادات ${revenue.toLocaleString()} | مصروفات ${expenses.toLocaleString()}`}
            color={profit >= 0 ? 'var(--green)' : 'var(--red)'} onClick={() => onNav('finance')} />
          <StatCard icon="🐣" value={births.length} label="ولادات العام"
            note={`${inseminations.filter(i=>i.status==='confirmed').length} حوامل مؤكدة`}
            color="var(--orange)" onClick={() => onNav('births')} />
          <StatCard icon="🌿" value={stats.dryCows} label="الأبقار الجافة"
            note={`قرب الولادة ≤ ${dryPeriodDays} يوم`}
            color="#795548" onClick={() => onNav('cows')} />
          <StatCard icon="🐂" value={stats.maleCalves || 0} label="عجول ذكور"
            note="أقل من 6 أشهر"
            color="#1565c0" onClick={() => onNav('cows')} />
        </div>

        <div className="two-col">
          {/* Milk Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 إنتاج الحليب — آخر 7 أيام</span>
              <button className="btn btn-outline btn-sm" onClick={() => onNav('milk')}>التفاصيل</button>
            </div>
            <div className="card-body">
              {renderLimit > 5 ? (
                <div style={{ height: 260, position: 'relative' }}>
                  <Line data={milkChartData} options={lineOptions} />
                </div>
              ) : (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtext)' }}>
                  جاري تجهيز الرسم البياني...
                </div>
              )}
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">⚠️ التنبيهات والإشعارات</span>
              {insemAlerts.length + heatAlerts.length + upcomingBirths.length + needsInsemAlerts.length + dryCowAlerts.length > 0 && (
                <span className="badge badge-red">{insemAlerts.length + heatAlerts.length + upcomingBirths.length + needsInsemAlerts.length + dryCowAlerts.length}</span>
              )}
            </div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {sickCows.slice(0, renderLimit).map(c => (
                <AlertItem key={c.firestoreId} color="red" icon="🏥"
                  msg={<><CowDisplay cow={c} fallbackId={c.id} /> — {c.notes||'تحتاج رعاية'}</>}
                  action={() => onNav('health')} actionLabel="عرض" />
              ))}
              {dryCowAlerts.slice(0, renderLimit).map(i => (
                <AlertItem key={`dry-${i.firestoreId}`} color="brown" icon="🌿"
                  msg={<>بقرة <CowDisplay cow={getCow(i)} fallbackId={i.cowId} /> — دخلت مرحلة الجفاف — متبقي {daysLeft(i.insemDate)} يوم للولادة</>}
                  action={() => onNav('cows')} actionLabel="عرض" />
              ))}
              {insemAlerts.slice(0, renderLimit).map(i => (
                <AlertItem key={i.firestoreId} color="orange" icon="🔔"
                  msg={<><CowDisplay cow={getCow(i)} fallbackId={i.cowId} /> — يوم {daysBetween(i.insemDate, todayStr)} من التلقيح — راقب الحرارة!</>}
                  action={() => onNav('breeding')} actionLabel="متابعة" />
              ))}
              {heatAlerts.slice(0, renderLimit).map(i => (
                <AlertItem key={`heat-${i.firestoreId}`} color="red" icon="🔥"
                  msg={<>حان موعد التلقيح! بقرة <CowDisplay cow={getCow(i)} fallbackId={i.cowId} /> — تم تسجيل صراف منذ {daysBetween(i.insemDate, todayStr)} يوم</>}
                  action={() => onNav('breeding')} actionLabel="متابعة" />
              ))}
              {upcomingBirths.slice(0, renderLimit).map(i => (
                <AlertItem key={i.firestoreId} color={i.daysLeft <= 0 ? 'red' : i.daysLeft <= 7 ? 'red' : 'orange'} icon="🐣"
                  msg={i.daysLeft < 0
                    ? <>متأخرة {Math.abs(i.daysLeft)} يوم ⚠️: بقرة <CowDisplay cow={getCow(i)} fallbackId={i.cowId} /> — تحتاج تسجيل الولادة!</>
                    : i.daysLeft === 0
                    ? <>اليوم هو موعد الولادة! بقرة <CowDisplay cow={getCow(i)} fallbackId={i.cowId} /></>
                    : <>ولادة قريبة: بقرة <CowDisplay cow={getCow(i)} fallbackId={i.cowId} /> — متبقي {i.daysLeft} يوم</>
                  }
                  action={() => i.daysLeft < 0 ? onNav('births') : onNav('breeding')}
                  actionLabel={i.daysLeft < 0 ? '🐣 تسجيل الولادة' : 'متابعة'} />
              ))}
              {upcomingVax.slice(0, renderLimit).map(v => (
                <AlertItem key={v.firestoreId} color="blue" icon="💉"
                  msg={`تطعيم: ${v.type} — ${v.scheduledDate}`}
                  action={() => onNav('health')} actionLabel="التفاصيل" />
              ))}
              {needsInsemAlerts.slice(0, renderLimit).map(c => {
                const daysSince = daysBetween(c.lastBirthDate, todayStr)
                return (
                  <AlertItem key={c.firestoreId} color="green" icon="🐄"
                    msg={<><CowDisplay cow={c} fallbackId={c.id} /> — ولدت منذ {daysSince} يوم — لم يسجل تلقيح بعد</>}
                    action={() => onNav('breeding')} actionLabel="👂 تلقيح" />
                )
              })}
              {sickCows.length === 0 &&
               insemAlerts.length === 0 && heatAlerts.length === 0 && upcomingBirths.length === 0 &&
               upcomingVax.length === 0 && needsInsemAlerts.length === 0 && dryCowAlerts.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--subtext)', padding:'20px', fontSize:13 }}>
                  ✅ لا توجد تنبيهات عاجلة
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="two-col">
          {/* Herd Status */}
          <div className="card">
            <div className="card-header"><span className="card-title">📊 حالة القطيع</span></div>
            <div className="card-body">
              {stats.totalCows > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:20, alignItems:'center' }}>
                  {renderLimit > 5 ? (
                    <Doughnut data={herdData} options={doughnutOptions} />
                  ) : (
                    <div style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid var(--hbg)', margin: '0 auto' }} />
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[
                      { label:'سليمة',     count:stats.healthyCows,  color:'var(--green)' },
                      { label:'مريضة',     count:stats.sickCows,     color:'var(--red)' },
                      { label:'حوامل',     count:stats.pregnantCows, color:'var(--orange)' },
                      { label:'جافة',      count:stats.dryCows || 0, color:'#795548' },
                      { label:'عجول ذكور', count:stats.maleCalves || 0, color:'#1565c0' },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex-row" style={{ marginBottom:3 }}>
                          <span style={{ fontSize:12 }}>{s.label}</span>
                          <span className="spacer"/>
                          <strong style={{ color:s.color }}>{s.count}</strong>
                        </div>
                        <div className="progress">
                          <div className="progress-bar" style={{ width:`${stats.totalCows?s.count/stats.totalCows*100:0}%`, background:s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🐄</div>
                  <div className="empty-title">لا توجد أبقار بعد</div>
                  <button className="btn btn-primary btn-sm" onClick={() => onNav('cows')}>إضافة بقرة</button>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">💰 الملخص المالي للشهر</span>
              <button className="btn btn-outline btn-sm" onClick={() => onNav('finance')}>التفاصيل</button>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              <table>
                <tbody>
                  {[
                    { label:'إيرادات الحليب', val: finances.filter(f=>f.kind==='revenue'&&f.type==='بيع حليب').reduce((s,f)=>s+f.amount,0), green:true },
                    { label:'مبيعات أبقار/عجول', val: finances.filter(f=>f.kind==='revenue'&&f.type!=='بيع حليب').reduce((s,f)=>s+f.amount,0), green:true },
                    { label:'مصاريف العلف', val: finances.filter(f=>f.kind==='expense'&&f.type==='شراء علف').reduce((s,f)=>s+f.amount,0), green:false },
                    { label:'مصاريف بيطرية', val: finances.filter(f=>f.kind==='expense'&&f.type==='دواء بيطري').reduce((s,f)=>s+f.amount,0), green:false },
                    { label:'رواتب العمال', val: finances.filter(f=>f.kind==='expense'&&f.type==='رواتب').reduce((s,f)=>s+f.amount,0), green:false },
                  ].map(r => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td style={{ color:r.green?'var(--green)':'var(--red)', fontWeight:700, textAlign:'left' }}>
                        {r.green?'+':'-'}{(r.val||0).toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop:'2px solid var(--border)' }}>
                    <td><strong>صافي الربح</strong></td>
                    <td style={{ color:profit>=0?'var(--accent)':'var(--red)', fontWeight:900, fontSize:16, textAlign:'left' }}>
                      {profit.toLocaleString()} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── مكونات محمية من إعادة الرندر ──
const StatCard = memo(function StatCard({ icon, value, label, note, color, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </div>
  )
})

const AlertItem = memo(function AlertItem({ color, icon, msg, action, actionLabel }) {
  const bg = { red:'#fde8e8', orange:'#fde9d9', green:'#d5f5e3', blue:'#dbeafe', brown:'#f3ece6' }[color] || '#f5f5f5'
  const bc = { red:'var(--red)', orange:'var(--orange)', green:'var(--green)', blue:'var(--blue)', brown:'#795548' }[color] || '#999'
  return (
    <div style={{ padding:'10px 12px', background:bg, borderRight:`3px solid ${bc}`, borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, fontSize:12, fontWeight:600, color:bc }}>{icon} {msg}</div>
      {action && <button className="btn btn-xs btn-outline" onClick={action}>{actionLabel}</button>}
    </div>
  )
})
