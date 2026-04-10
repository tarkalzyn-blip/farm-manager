import { useMemo, useState, useRef } from 'react'
import { useFarm } from '../../context/FarmContext'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
)

const REPORT_TABS = [
  { id: 'overview',  icon: '📊', label: 'نظرة عامة' },
  { id: 'milk',      icon: '🥛', label: 'الحليب' },
  { id: 'breeding',  icon: '🐂', label: 'التكاثر' },
  { id: 'health',    icon: '🏥', label: 'الصحة' },
  { id: 'finance',   icon: '💰', label: 'المالية' },
  { id: 'herd',      icon: '🐄', label: 'القطيع' },
]

// ── Helper: get last N months labels ──
function getMonthLabels(n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (n - 1 - i))
    return d.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' })
  })
}
function getMonthKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function getLastNMonthKeys(n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (n - 1 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export default function ReportsPage() {
  const {
    cows, milkRecords, births, inseminations, healthRecords,
    vaccinations, finances, workers, stats, currency,
    daysBetween, daysLeft, addDays,
  } = useFarm()

  const [activeTab, setActiveTab] = useState('overview')
  const [monthRange, setMonthRange] = useState(6)
  const printRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date()

  // ── Financial Calculations ──
  const { revenue, expense, profit, margin } = useMemo(() => {
    const revenue = finances.filter(f => f.kind === 'revenue').reduce((s, f) => s + (f.amount || 0), 0)
    const expense = finances.filter(f => f.kind === 'expense').reduce((s, f) => s + (f.amount || 0), 0)
    const profit = revenue - expense
    const margin = revenue ? Math.round(profit / revenue * 100) : 0
    return { revenue, expense, profit, margin }
  }, [finances])

  // ── Monthly Keys ──
  const monthKeys = useMemo(() => getLastNMonthKeys(monthRange), [monthRange])
  const monthLabels = useMemo(() => getMonthLabels(monthRange), [monthRange])

  // ── Monthly Milk ──
  const milkByMonth = useMemo(() =>
    monthKeys.map(key =>
      milkRecords
        .filter(m => getMonthKey(m.date) === key)
        .reduce((s, m) => s + (m.amount || 0), 0)
    ), [milkRecords, monthKeys])

  // ── Monthly Finance ──
  const revenueByMonth = useMemo(() =>
    monthKeys.map(key =>
      finances.filter(f => f.kind === 'revenue' && getMonthKey(f.date) === key)
        .reduce((s, f) => s + (f.amount || 0), 0)
    ), [finances, monthKeys])

  const expenseByMonth = useMemo(() =>
    monthKeys.map(key =>
      finances.filter(f => f.kind === 'expense' && getMonthKey(f.date) === key)
        .reduce((s, f) => s + (f.amount || 0), 0)
    ), [finances, monthKeys])

  // ── Monthly Births ──
  const birthsByMonth = useMemo(() =>
    monthKeys.map(key =>
      births.filter(b => getMonthKey(b.birthDate) === key).length
    ), [births, monthKeys])

  // ── Monthly Inseminations ──
  const insemByMonth = useMemo(() =>
    monthKeys.map(key =>
      inseminations.filter(i => getMonthKey(i.insemDate) === key).length
    ), [inseminations, monthKeys])

  // ── Herd composition ──
  const herdComp = useMemo(() => ({
    healthy:  cows.filter(c => c.status === 'سليمة').length,
    sick:     cows.filter(c => c.status === 'مريضة').length,
    pregnant: inseminations.filter(i => i.status === 'confirmed').length,
    dry:      cows.filter(c => c.status === 'جافة').length,
    sold:     cows.filter(c => c.isSold).length,
    femaleCalf: cows.filter(c => {
      const age = c.birthDate ? Math.floor((new Date(today) - new Date(c.birthDate)) / (86400000 * 30.44)) : 999
      return age < 6 && c.gender !== 'male'
    }).length,
    maleCalf: cows.filter(c => {
      const age = c.birthDate ? Math.floor((new Date(today) - new Date(c.birthDate)) / (86400000 * 30.44)) : 999
      return age < 6 && c.gender === 'male'
    }).length,
  }), [cows, inseminations, today])

  // ── Insemination success rate ──
  const insemStats = useMemo(() => {
    const total    = inseminations.length
    const success  = inseminations.filter(i => i.status === 'confirmed' || i.status === 'completed').length
    const failed   = inseminations.filter(i => i.status === 'failed').length
    const pending  = inseminations.filter(i => i.status === 'pending').length
    const rate     = total ? Math.round(success / total * 100) : 0
    return { total, success, failed, pending, rate }
  }, [inseminations])

  // ── Health breakdown ──
  const healthStats = useMemo(() => {
    const diseases = {}
    healthRecords.forEach(h => {
      diseases[h.disease] = (diseases[h.disease] || 0) + 1
    })
    const sorted = Object.entries(diseases).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return {
      total:     healthRecords.length,
      active:    healthRecords.filter(h => h.status !== 'recovered').length,
      recovered: healthRecords.filter(h => h.status === 'recovered').length,
      top:       sorted,
      upcoming:  vaccinations.filter(v => !v.done).length,
    }
  }, [healthRecords, vaccinations])

  // ── Milk stats ──
  const milkStats = useMemo(() => {
    const totalLtrs = milkRecords.reduce((s, m) => s + (m.amount || 0), 0)
    const prodCows  = cows.filter(c => c.milk > 0)
    const avgPerCow = prodCows.length ? Math.round(prodCows.reduce((s, c) => s + (c.milk || 0), 0) / prodCows.length) : 0
    const best30    = milkRecords
      .filter(m => daysBetween(m.date, today) <= 30)
      .reduce((s, m) => s + (m.amount || 0), 0)
    return { totalLtrs, avgPerCow, prodCows: prodCows.length, best30, today: stats.todayMilk }
  }, [milkRecords, cows, stats.todayMilk, daysBetween, today])

  // ── Finance breakdown ──
  const financeBreakdown = useMemo(() => {
    const byType = {}
    finances.forEach(f => {
      if (!byType[f.type]) byType[f.type] = { revenue: 0, expense: 0 }
      if (f.kind === 'revenue') byType[f.type].revenue += f.amount || 0
      else byType[f.type].expense += f.amount || 0
    })
    const topRevenue = Object.entries(byType)
      .map(([t, v]) => ({ type: t, amount: v.revenue }))
      .filter(x => x.amount > 0)
      .sort((a, b) => b.amount - a.amount).slice(0, 5)
    const topExpense = Object.entries(byType)
      .map(([t, v]) => ({ type: t, amount: v.expense }))
      .filter(x => x.amount > 0)
      .sort((a, b) => b.amount - a.amount).slice(0, 5)
    return { topRevenue, topExpense }
  }, [finances])

  // ── Chart options ──
  const barOpts = useMemo(() => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } }
    }
  }), [])

  const lineOpts = useMemo(() => ({
    responsive: true,
    plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo' }, boxWidth: 10 } } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } }
    }
  }), [])

  const doughOpts = useMemo(() => ({
    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo' }, boxWidth: 12 } } },
    cutout: '65%'
  }), [])

  const printReport = () => window.print()

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">📋 التقارير والإحصاءات</div>
          <div className="topbar-sub">تحليل شامل لأداء المزرعة</div>
        </div>
        <div className="topbar-actions" style={{ gap: 8 }}>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
            value={monthRange}
            onChange={e => setMonthRange(parseInt(e.target.value))}
          >
            <option value={3}>آخر 3 أشهر</option>
            <option value={6}>آخر 6 أشهر</option>
            <option value={12}>آخر 12 شهر</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={printReport}>🖨️ طباعة</button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: 4, overflowX: 'auto',
        padding: '0 14px', borderBottom: '2px solid var(--border)',
        background: 'var(--card)', scrollbarWidth: 'none',
      }}>
        {REPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 14px', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: activeTab === t.id ? 800 : 500,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--subtext)',
              borderBottom: activeTab === t.id ? '2.5px solid var(--accent)' : '2.5px solid transparent',
              fontSize: 13, whiteSpace: 'nowrap', transition: 'all 0.2s',
              fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="content" ref={printRef}>

        {/* ══════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI Cards */}
            <div className="stats-grid">
              <StatCard icon="🐄" value={cows.filter(c => !c.isSold).length} label="أبقار نشطة"
                note={`${herdComp.sold} مباعة`} color="var(--accent)" />
              <StatCard icon="🥛" value={`${milkStats.today} لتر`} label="إنتاج اليوم"
                note={`معدل ${milkStats.avgPerCow} لتر/بقرة`} color="var(--blue)" />
              <StatCard icon="💰" value={`${profit.toLocaleString()}`} label={`صافي الربح (${currency})`}
                note={`هامش ${margin}%`} color={profit >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatCard icon="🐂" value={`${insemStats.rate}%`} label="معدل نجاح التلقيح"
                note={`${insemStats.success} ناجح من ${insemStats.total}`} color="var(--orange)" />
              <StatCard icon="🏥" value={healthStats.active} label="حالات مرضية نشطة"
                note={`${healthStats.recovered} تعافت`} color="var(--red)" />
              <StatCard icon="🐣" value={births.length} label="إجمالي الولادات"
                note={`${births.filter(b => b.calfGender === 'أنثى').length} أنثى | ${births.filter(b => b.calfGender === 'ذكر').length} ذكر`}
                color="var(--purple)" />
            </div>

            {/* Finance + Milk charts side by side */}
            <div className="two-col">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">💰 الإيرادات والمصروفات</span>
                  <span className="badge badge-green">{monthRange} أشهر</span>
                </div>
                <div className="card-body">
                  <div style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: monthLabels,
                        datasets: [
                          { label: 'إيرادات', data: revenueByMonth, backgroundColor: '#1a7a4288', borderColor: '#1a7a42', borderWidth: 2, borderRadius: 6 },
                          { label: 'مصروفات', data: expenseByMonth, backgroundColor: '#b8323288', borderColor: '#b83232', borderWidth: 2, borderRadius: 6 },
                        ]
                      }}
                      options={{ ...lineOpts }}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">🥛 إنتاج الحليب الشهري</span>
                </div>
                <div className="card-body">
                  <div style={{ height: 240 }}>
                    <Line
                      data={{
                        labels: monthLabels,
                        datasets: [{
                          label: 'الحليب (لتر)',
                          data: milkByMonth,
                          backgroundColor: 'rgba(26,111,168,0.12)',
                          borderColor: '#1a6fa8',
                          borderWidth: 2.5, fill: true, tension: 0.4,
                          pointBackgroundColor: '#1a6fa8', pointRadius: 4,
                        }]
                      }}
                      options={barOpts}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Herd composition donut + births/insem bar */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">🐄 تركيبة القطيع</span></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 20, alignItems: 'center' }}>
                    <Doughnut
                      data={{
                        labels: ['سليمة', 'مريضة', 'حوامل', 'جافة', 'عجول ♂', 'عجول ♀'],
                        datasets: [{
                          data: [herdComp.healthy, herdComp.sick, herdComp.pregnant, herdComp.dry, herdComp.maleCalf, herdComp.femaleCalf],
                          backgroundColor: ['#1a7a42','#b83232','#c95a00','#795548','#1565c0','#6b3fa0'],
                          borderWidth: 2, borderColor: '#fff',
                        }]
                      }}
                      options={doughOpts}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { l: 'سليمة', v: herdComp.healthy, c: '#1a7a42' },
                        { l: 'مريضة', v: herdComp.sick, c: '#b83232' },
                        { l: 'حوامل', v: herdComp.pregnant, c: '#c95a00' },
                        { l: 'جافة', v: herdComp.dry, c: '#795548' },
                        { l: 'عجول ذكور', v: herdComp.maleCalf, c: '#1565c0' },
                        { l: 'عجول إناث', v: herdComp.femaleCalf, c: '#6b3fa0' },
                      ].map(({ l, v, c }) => (
                        <div key={l}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 12 }}>
                            <span>{l}</span>
                            <strong style={{ color: c }}>{v}</strong>
                          </div>
                          <div className="progress">
                            <div className="progress-bar" style={{ width: `${cows.length ? v / cows.length * 100 : 0}%`, background: c }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">📅 الولادات والتلقيح الشهري</span></div>
                <div className="card-body">
                  <div style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: monthLabels,
                        datasets: [
                          { label: 'تلقيحات', data: insemByMonth, backgroundColor: '#c95a0088', borderColor: '#c95a00', borderWidth: 2, borderRadius: 6 },
                          { label: 'ولادات', data: birthsByMonth, backgroundColor: '#6b3fa088', borderColor: '#6b3fa0', borderWidth: 2, borderRadius: 6 },
                        ]
                      }}
                      options={{ ...lineOpts }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            MILK TAB
        ══════════════════════════════════════ */}
        {activeTab === 'milk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stats-grid">
              <StatCard icon="🥛" value={`${milkStats.today} لتر`} label="إنتاج اليوم" color="var(--blue)" />
              <StatCard icon="📅" value={`${milkStats.best30.toLocaleString()} لتر`} label="آخر 30 يوم" color="var(--accent)" />
              <StatCard icon="🐄" value={milkStats.prodCows} label="أبقار منتجة" note={`معدل ${milkStats.avgPerCow} لتر/بقرة`} color="var(--green)" />
              <StatCard icon="📦" value={`${milkStats.totalLtrs.toLocaleString()} لتر`} label="الإجمالي الكلي" color="var(--orange)" />
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">📈 منحنى إنتاج الحليب الشهري</span>
              </div>
              <div className="card-body">
                <div style={{ height: 280 }}>
                  <Line
                    data={{
                      labels: monthLabels,
                      datasets: [{
                        label: 'لتر',
                        data: milkByMonth,
                        backgroundColor: 'rgba(26,111,168,0.12)',
                        borderColor: '#1a6fa8', borderWidth: 2.5,
                        fill: true, tension: 0.4,
                        pointBackgroundColor: '#1a6fa8', pointRadius: 5, pointHoverRadius: 7,
                      }]
                    }}
                    options={barOpts}
                  />
                </div>
              </div>
            </div>

            {/* Top producing cows */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🏆 أعلى الأبقار إنتاجاً (اليوم)</span>
              </div>
              <div style={{ padding: 0 }}>
                {cows.filter(c => c.milk > 0).sort((a, b) => b.milk - a.milk).slice(0, 10).length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <div className="empty-icon">🥛</div>
                    <div className="empty-title">لا توجد بيانات إنتاج يومي</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>#</th><th>رقم البقرة</th><th>اللون</th><th>الإنتاج اليومي</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {cows.filter(c => c.milk > 0).sort((a, b) => b.milk - a.milk).slice(0, 10).map((c, i) => (
                        <tr key={c.firestoreId}>
                          <td><strong style={{ color: 'var(--accent)' }}>#{i + 1}</strong></td>
                          <td>
                            <strong style={{
                              border: `2px solid ${c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                              color: c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                              padding: '2px 8px', borderRadius: 4,
                            }}>
                              {c.tagColor === 'أزرق' ? '🟦' : '🟨'} {c.id}
                            </strong>
                          </td>
                          <td>{c.tagColor}</td>
                          <td><strong style={{ color: 'var(--blue)' }}>{c.milk} لتر</strong></td>
                          <td><span className="badge badge-green" style={{ fontSize: 10 }}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Milk by session */}
            <div className="card">
              <div className="card-header"><span className="card-title">⏰ إنتاج آخر 30 يوم حسب الجلسة</span></div>
              <div style={{ padding: 0 }}>
                {(() => {
                  const last30 = milkRecords.filter(m => daysBetween(m.date, today) <= 30)
                  const morning = last30.filter(m => m.session === 'صباح').reduce((s, m) => s + (m.amount || 0), 0)
                  const evening = last30.filter(m => m.session === 'مساء').reduce((s, m) => s + (m.amount || 0), 0)
                  return (
                    <table>
                      <thead><tr><th>الجلسة</th><th>الكمية</th><th>النسبة</th></tr></thead>
                      <tbody>
                        <tr><td>🌅 صباح</td><td><strong>{morning.toLocaleString()} لتر</strong></td>
                          <td>
                            <div className="progress" style={{ width: 100 }}>
                              <div className="progress-bar" style={{ width: `${morning + evening ? morning / (morning + evening) * 100 : 0}%`, background: 'var(--orange)' }} />
                            </div>
                          </td>
                        </tr>
                        <tr><td>🌙 مساء</td><td><strong>{evening.toLocaleString()} لتر</strong></td>
                          <td>
                            <div className="progress" style={{ width: 100 }}>
                              <div className="progress-bar" style={{ width: `${morning + evening ? evening / (morning + evening) * 100 : 0}%`, background: 'var(--blue)' }} />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BREEDING TAB
        ══════════════════════════════════════ */}
        {activeTab === 'breeding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stats-grid">
              <StatCard icon="🐂" value={insemStats.total} label="إجمالي التلقيحات" color="var(--accent)" />
              <StatCard icon="✅" value={insemStats.success} label="تلقيح ناجح" color="var(--green)" />
              <StatCard icon="❌" value={insemStats.failed} label="تلقيح فاشل" color="var(--red)" />
              <StatCard icon="⏳" value={insemStats.pending} label="تحت المراقبة" color="var(--orange)" />
              <StatCard icon="📊" value={`${insemStats.rate}%`} label="معدل النجاح" color={insemStats.rate >= 60 ? 'var(--green)' : 'var(--red)'} />
              <StatCard icon="🐣" value={births.length} label="ولادات مسجلة" color="var(--purple)" />
            </div>

            {/* Insem success donut */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">📊 نتائج التلقيحات</span></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 20, alignItems: 'center' }}>
                    <Doughnut
                      data={{
                        labels: ['ناجح/مؤكد', 'فاشل', 'تحت المراقبة', 'مكتمل (ولادة)'],
                        datasets: [{
                          data: [
                            insemStats.success,
                            insemStats.failed,
                            insemStats.pending,
                            inseminations.filter(i => i.status === 'completed').length,
                          ],
                          backgroundColor: ['#1a7a42', '#b83232', '#c95a00', '#1565c0'],
                          borderWidth: 2, borderColor: '#fff',
                        }]
                      }}
                      options={doughOpts}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { l: 'ناجح/مؤكد',   v: insemStats.success,   c: '#1a7a42' },
                        { l: 'فاشل',         v: insemStats.failed,    c: '#b83232' },
                        { l: 'تحت المراقبة', v: insemStats.pending,   c: '#c95a00' },
                        { l: 'مكتمل',        v: inseminations.filter(i => i.status === 'completed').length, c: '#1565c0' },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                            {l}
                          </span>
                          <strong style={{ color: c }}>{v}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">📅 التلقيح والولادات الشهرية</span></div>
                <div className="card-body">
                  <div style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: monthLabels,
                        datasets: [
                          { label: 'تلقيحات', data: insemByMonth, backgroundColor: '#c95a0099', borderColor: '#c95a00', borderWidth: 2, borderRadius: 6 },
                          { label: 'ولادات', data: birthsByMonth, backgroundColor: '#6b3fa099', borderColor: '#6b3fa0', borderWidth: 2, borderRadius: 6 },
                        ]
                      }}
                      options={{ ...lineOpts }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming births */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🐣 الولادات القادمة (خلال 30 يوم)</span>
                <span className="badge badge-orange">
                  {inseminations.filter(i => i.status === 'confirmed' && daysLeft(i.insemDate) <= 30 && daysLeft(i.insemDate) >= 0).length}
                </span>
              </div>
              <div style={{ padding: 0 }}>
                {inseminations
                  .filter(i => i.status === 'confirmed')
                  .map(i => ({ ...i, dl: daysLeft(i.insemDate) }))
                  .filter(i => i.dl <= 30)
                  .sort((a, b) => a.dl - b.dl)
                  .slice(0, 10).length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-icon">🐣</div>
                    <div className="empty-title">لا توجد ولادات قادمة خلال 30 يوم</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>البقرة</th><th>تاريخ التلقيح</th><th>الولادة المتوقعة</th><th>الأيام المتبقية</th><th>الشهر</th></tr></thead>
                    <tbody>
                      {inseminations
                        .filter(i => i.status === 'confirmed')
                        .map(i => ({ ...i, dl: daysLeft(i.insemDate) }))
                        .filter(i => i.dl <= 30)
                        .sort((a, b) => a.dl - b.dl)
                        .slice(0, 10)
                        .map(i => (
                          <tr key={i.firestoreId}>
                            <td><strong>🐄 {i.cowId}</strong></td>
                            <td>{i.insemDate}</td>
                            <td>{addDays(i.insemDate, 280)}</td>
                            <td>
                              <span className={`badge ${i.dl <= 0 ? 'badge-red' : i.dl <= 7 ? 'badge-orange' : 'badge-green'}`}>
                                {i.dl <= 0 ? `متأخرة ${Math.abs(i.dl)} يوم` : `${i.dl} يوم`}
                              </span>
                            </td>
                            <td>شهر {Math.min(Math.ceil(daysBetween(i.insemDate, today) / 30.44), 9)}/9</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Births detail */}
            <div className="card">
              <div className="card-header"><span className="card-title">📜 سجل الولادات ({births.length})</span></div>
              <div style={{ padding: 0 }}>
                {births.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-icon">🐣</div>
                    <div className="empty-title">لا توجد ولادات مسجلة بعد</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>الأم</th><th>التاريخ</th><th>الجنس</th><th>رقم العجل</th><th>الوزن</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {births.slice(0, 15).map(b => (
                        <tr key={b.firestoreId}>
                          <td><strong>🐄 {b.momId}</strong></td>
                          <td>{b.birthDate}</td>
                          <td>{b.calfGender === 'أنثى' ? '🐄 أنثى' : '🐂 ذكر'}</td>
                          <td>{b.calfId}</td>
                          <td>{b.calfWeight} كغ</td>
                          <td><span className="badge badge-green" style={{ fontSize: 10 }}>{b.calfStatus}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            HEALTH TAB
        ══════════════════════════════════════ */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stats-grid">
              <StatCard icon="🏥" value={healthStats.total} label="إجمالي السجلات" color="var(--red)" />
              <StatCard icon="🤒" value={healthStats.active} label="تحت العلاج" color="var(--orange)" />
              <StatCard icon="💚" value={healthStats.recovered} label="تعافت" color="var(--green)" />
              <StatCard icon="💉" value={healthStats.upcoming} label="تطعيمات قادمة" color="var(--blue)" />
            </div>

            <div className="two-col">
              {/* Top diseases */}
              <div className="card">
                <div className="card-header"><span className="card-title">🦠 أكثر الأمراض شيوعاً</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {healthStats.top.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--subtext)', padding: 20 }}>✅ لا توجد حالات مرضية</div>
                  ) : healthStats.top.map(([disease, count]) => (
                    <div key={disease}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{disease}</span>
                        <strong style={{ color: 'var(--red)' }}>{count} حالة</strong>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{
                          width: `${healthStats.top[0]?.[1] ? count / healthStats.top[0][1] * 100 : 0}%`,
                          background: 'var(--red)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery rate */}
              <div className="card">
                <div className="card-header"><span className="card-title">💊 معدل التعافي</span></div>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                  {healthStats.total > 0 ? (
                    <>
                      <div style={{ position: 'relative', width: 140, height: 140 }}>
                        <Doughnut
                          data={{
                            labels: ['تعافت', 'تحت العلاج'],
                            datasets: [{
                              data: [healthStats.recovered, healthStats.active],
                              backgroundColor: ['#1a7a42', '#b83232'],
                              borderWidth: 2, borderColor: '#fff',
                            }]
                          }}
                          options={{ ...doughOpts, plugins: { legend: { display: false } } }}
                        />
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center', fontFamily: 'Cairo'
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)' }}>
                            {Math.round(healthStats.recovered / healthStats.total * 100)}%
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--subtext)' }}>تعافي</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, color: 'var(--green)', fontSize: 20 }}>{healthStats.recovered}</div>
                          <div style={{ fontSize: 12, color: 'var(--subtext)' }}>تعافت</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, color: 'var(--red)', fontSize: 20 }}>{healthStats.active}</div>
                          <div style={{ fontSize: 12, color: 'var(--subtext)' }}>تحت العلاج</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--subtext)', fontSize: 40 }}>
                      💚<br /><span style={{ fontSize: 14 }}>لا توجد سجلات صحية</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Health records table */}
            <div className="card">
              <div className="card-header"><span className="card-title">📋 آخر السجلات الصحية</span></div>
              <div style={{ padding: 0 }}>
                {healthRecords.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-icon">💚</div>
                    <div className="empty-title">لا توجد سجلات صحية</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>البقرة</th><th>التشخيص</th><th>العلاج</th><th>التاريخ</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {healthRecords.slice(0, 15).map(h => (
                        <tr key={h.firestoreId}>
                          <td><strong>🐄 {h.cowId}</strong></td>
                          <td>{h.disease}</td>
                          <td style={{ fontSize: 12 }}>{h.treatment || '—'}</td>
                          <td>{h.date || '—'}</td>
                          <td>
                            <span className={`badge ${h.status === 'recovered' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                              {h.status === 'recovered' ? 'تعافت' : 'تحت العلاج'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Upcoming vaccinations */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">💉 التطعيمات القادمة</span>
                <span className="badge badge-blue">{vaccinations.filter(v => !v.done).length}</span>
              </div>
              <div style={{ padding: 0 }}>
                {vaccinations.filter(v => !v.done).length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-icon">💉</div>
                    <div className="empty-title">لا توجد تطعيمات قادمة</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>نوع التطعيم</th><th>تاريخ الجدولة</th><th>الأيام المتبقية</th></tr></thead>
                    <tbody>
                      {vaccinations.filter(v => !v.done).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 10).map(v => {
                        const daysRemaining = daysBetween(today, v.scheduledDate)
                        return (
                          <tr key={v.firestoreId}>
                            <td><strong>{v.type}</strong></td>
                            <td>{v.scheduledDate}</td>
                            <td>
                              <span className={`badge ${daysRemaining < 0 ? 'badge-red' : daysRemaining <= 3 ? 'badge-orange' : 'badge-green'}`}>
                                {daysRemaining < 0 ? `متأخرة ${Math.abs(daysRemaining)} يوم` : daysRemaining === 0 ? 'اليوم!' : `${daysRemaining} يوم`}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            FINANCE TAB
        ══════════════════════════════════════ */}
        {activeTab === 'finance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stats-grid">
              <StatCard icon="💵" value={`${revenue.toLocaleString()}`} label={`إجمالي الإيرادات (${currency})`} color="var(--green)" />
              <StatCard icon="💸" value={`${expense.toLocaleString()}`} label={`إجمالي المصروفات (${currency})`} color="var(--red)" />
              <StatCard icon="💰" value={`${profit.toLocaleString()}`} label={`صافي الربح (${currency})`} color={profit >= 0 ? 'var(--accent)' : 'var(--red)'} />
              <StatCard icon="📊" value={`${margin}%`} label="هامش الربح" color={margin >= 30 ? 'var(--green)' : margin >= 10 ? 'var(--orange)' : 'var(--red)'} />
            </div>

            {/* Monthly chart */}
            <div className="card">
              <div className="card-header"><span className="card-title">📈 الأداء المالي الشهري</span></div>
              <div className="card-body">
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: monthLabels,
                      datasets: [
                        { label: 'إيرادات', data: revenueByMonth, backgroundColor: '#1a7a4288', borderColor: '#1a7a42', borderWidth: 2, borderRadius: 6 },
                        { label: 'مصروفات', data: expenseByMonth, backgroundColor: '#b8323288', borderColor: '#b83232', borderWidth: 2, borderRadius: 6 },
                        {
                          label: 'صافي الربح',
                          data: revenueByMonth.map((r, i) => r - expenseByMonth[i]),
                          type: 'line',
                          backgroundColor: 'transparent',
                          borderColor: '#c95a00', borderWidth: 2.5,
                          pointRadius: 5, tension: 0.4,
                        }
                      ]
                    }}
                    options={{ ...lineOpts }}
                  />
                </div>
              </div>
            </div>

            <div className="two-col">
              {/* Top revenue sources */}
              <div className="card">
                <div className="card-header"><span className="card-title">💵 مصادر الإيرادات</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {financeBreakdown.topRevenue.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--subtext)', padding: 20 }}>لا توجد إيرادات</div>
                  ) : financeBreakdown.topRevenue.map(({ type, amount }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{type}</span>
                        <strong style={{ color: 'var(--green)' }}>{amount.toLocaleString()} {currency}</strong>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{
                          width: `${financeBreakdown.topRevenue[0]?.amount ? amount / financeBreakdown.topRevenue[0].amount * 100 : 0}%`,
                          background: 'var(--green)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top expenses */}
              <div className="card">
                <div className="card-header"><span className="card-title">💸 أبواب المصروفات</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {financeBreakdown.topExpense.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--subtext)', padding: 20 }}>لا توجد مصروفات</div>
                  ) : financeBreakdown.topExpense.map(({ type, amount }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span>{type}</span>
                        <strong style={{ color: 'var(--red)' }}>{amount.toLocaleString()} {currency}</strong>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{
                          width: `${financeBreakdown.topExpense[0]?.amount ? amount / financeBreakdown.topExpense[0].amount * 100 : 0}%`,
                          background: 'var(--red)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Finance detail table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 آخر المعاملات المالية</span>
                <span className="badge badge-gray">{finances.length}</span>
              </div>
              <div style={{ padding: 0 }}>
                {finances.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <div className="empty-icon">💰</div>
                    <div className="empty-title">لا توجد معاملات مالية</div>
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الجهة</th></tr></thead>
                    <tbody>
                      {finances.slice(0, 15).map(f => (
                        <tr key={f.firestoreId}>
                          <td>{f.date}</td>
                          <td>{f.type}</td>
                          <td>
                            <strong style={{ color: f.kind === 'revenue' ? 'var(--green)' : 'var(--red)' }}>
                              {f.kind === 'revenue' ? '+' : '-'}{(f.amount || 0).toLocaleString()} {currency}
                            </strong>
                          </td>
                          <td style={{ fontSize: 12 }}>{f.party || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            HERD TAB
        ══════════════════════════════════════ */}
        {activeTab === 'herd' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stats-grid">
              <StatCard icon="🐄" value={cows.filter(c => !c.isSold).length} label="أبقار نشطة" color="var(--accent)" />
              <StatCard icon="🐣" value={herdComp.femaleCalf + herdComp.maleCalf} label="العجول (أقل 6 أشهر)" color="var(--purple)" />
              <StatCard icon="🏷️" value={cows.filter(c => c.isSold).length} label="مباعة" color="var(--subtext)" />
              <StatCard icon="📅" value={workers.length} label="عمال المزرعة" color="var(--blue)" />
            </div>

            {/* Breed breakdown */}
            <div className="two-col">
              <div className="card">
                <div className="card-header"><span className="card-title">🧬 توزيع السلالات</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(() => {
                    const breeds = {}
                    cows.filter(c => !c.isSold).forEach(c => { breeds[c.breed] = (breeds[c.breed] || 0) + 1 })
                    const total = cows.filter(c => !c.isSold).length
                    return Object.entries(breeds).sort((a, b) => b[1] - a[1]).map(([breed, count]) => (
                      <div key={breed}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                          <span>{breed}</span>
                          <strong style={{ color: 'var(--accent)' }}>{count} ({Math.round(count/total*100)}%)</strong>
                        </div>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${total ? count/total*100 : 0}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><span className="card-title">🏷️ توزيع الأبقار حسب لون الطوق</span></div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center', height: 180 }}>
                    {(() => {
                      const blue   = cows.filter(c => !c.isSold && c.tagColor === 'أزرق').length
                      const yellow = cows.filter(c => !c.isSold && c.tagColor !== 'أزرق').length
                      const total  = blue + yellow
                      return (
                        <>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48 }}>🟦</div>
                            <div style={{ fontWeight: 900, fontSize: 24, color: '#1e88e5' }}>{blue}</div>
                            <div style={{ fontSize: 12, color: 'var(--subtext)' }}>الأزرق</div>
                            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{total ? Math.round(blue/total*100) : 0}%</div>
                          </div>
                          <div style={{ width: 2, height: 80, background: 'var(--border)' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48 }}>🟨</div>
                            <div style={{ fontWeight: 900, fontSize: 24, color: '#eab308' }}>{yellow}</div>
                            <div style={{ fontSize: 12, color: 'var(--subtext)' }}>الأصفر</div>
                            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{total ? Math.round(yellow/total*100) : 0}%</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Age distribution */}
            <div className="card">
              <div className="card-header"><span className="card-title">📊 توزيع الأعمار</span></div>
              <div className="card-body">
                {(() => {
                  const groups = [
                    { label: 'أقل من 6 أشهر', min: 0, max: 6 },
                    { label: '6 - 12 شهر', min: 6, max: 12 },
                    { label: '1 - 2 سنة', min: 12, max: 24 },
                    { label: '2 - 4 سنوات', min: 24, max: 48 },
                    { label: '4 - 7 سنوات', min: 48, max: 84 },
                    { label: 'أكثر من 7 سنوات', min: 84, max: 9999 },
                  ]
                  const activeCows = cows.filter(c => !c.isSold)
                  const total = activeCows.length
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {groups.map(g => {
                        const count = activeCows.filter(c => {
                          const ageM = c.birthDate
                            ? Math.floor((new Date(today) - new Date(c.birthDate)) / (86400000 * 30.44))
                            : (parseFloat(c.age) || 0) * 12
                          return ageM >= g.min && ageM < g.max
                        }).length
                        return (
                          <div key={g.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                              <span>{g.label}</span>
                              <strong style={{ color: 'var(--accent)' }}>{count} بقرة ({total ? Math.round(count / total * 100) : 0}%)</strong>
                            </div>
                            <div className="progress">
                              <div className="progress-bar" style={{ width: `${total ? count/total*100 : 0}%`, background: 'var(--accent)' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Full cows table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 جميع الأبقار النشطة ({cows.filter(c => !c.isSold).length})</span>
              </div>
              <div style={{ padding: 0 }}>
                <table>
                  <thead>
                    <tr><th>الرقم</th><th>السلالة</th><th>العمر</th><th>الحالة</th><th>الإنتاج (لتر)</th><th>الولادات</th></tr>
                  </thead>
                  <tbody>
                    {cows.filter(c => !c.isSold).slice(0, 20).map(c => (
                      <tr key={c.firestoreId}>
                        <td>
                          <strong style={{
                            border: `2px solid ${c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                            color: c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                            padding: '2px 6px', borderRadius: 4,
                          }}>
                            {c.tagColor === 'أزرق' ? '🟦' : '🟨'} {c.id}
                          </strong>
                        </td>
                        <td>{c.breed}</td>
                        <td style={{ fontSize: 12 }}>{c.birthDate ? `${Math.floor((new Date(today) - new Date(c.birthDate)) / (86400000 * 365.25))} سنة` : `${c.age || '—'} سنة`}</td>
                        <td><span className="badge badge-green" style={{ fontSize: 10 }}>{c.status}</span></td>
                        <td>{c.milk > 0 ? `${c.milk} لتر` : '—'}</td>
                        <td>{c.births || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cows.filter(c => !c.isSold).length > 20 && (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: 12, color: 'var(--subtext)' }}>
                    + {cows.filter(c => !c.isSold).length - 20} بقرة أخرى — قم بالطباعة للاطلاع على القائمة الكاملة
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Stat Card ──
function StatCard({ icon, value, label, note, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </div>
  )
}
