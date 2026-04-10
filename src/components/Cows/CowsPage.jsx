import { useState, useEffect, useMemo } from 'react'
import { useFarm } from '../../context/FarmContext'
import CowProfile from './CowProfile'
import CowForm from './CowForm'
import ActionMenu from '../Layout/ActionMenu'

// ─── Tag display config ───────────────────────────────────────────
const TAG_CONFIG = {
  maleCalf: { label: '🐂 عجل ذكر', cls: 'badge-blue', bg: '#dbeafe', color: '#1565c0' },
  calf: { label: '🐣 عجلة', cls: 'badge-purple', bg: '#f3e8ff', color: '#7c3aed' },
  sick: { label: '🤒 مريضة', cls: 'badge-red', bg: '#fde8e8', color: '#b83232' },
  check: { label: '🔍 تحت الفحص', cls: 'badge-gold', bg: '#fff7e6', color: '#b8860b' },
  failed: { label: '❌ فشل تلقيح', cls: 'badge-red', bg: '#fde8e8', color: '#b83232' },
  dry: { label: '🌿 جافة', cls: 'badge-brown', bg: '#f3ece6', color: '#795548' },
  pregnant: { label: '🤰 حامل', cls: 'badge-orange', bg: '#fde9d9', color: '#c95a00' },
  milk: { label: '🥛 إنتاج', cls: 'badge-green', bg: '#d5f5e3', color: '#1a7a42' },
  noInsemination: { label: '⬜ بدون تلقيح', cls: 'badge-gray', bg: '#f4f4f4', color: '#888' },
}

const PregnancyProgress = ({ days }) => {
  if (days <= 0) return <span style={{ color: 'var(--subtext)' }}>—</span>
  const totalMonths = Math.min(9, Math.ceil(days / 30.44))
  const elapsedM = Math.floor(days / 30.44)
  const remD = Math.floor(days % 30.44)
  const progress = Math.min(100, Math.round((days / 280) * 100))
  return (
    <div style={{ width: 100, textAlign: 'center', display: 'inline-block' }}>
      <div style={{ fontSize: 11, marginBottom: 1, color: 'var(--accent)', fontWeight: 700 }}>الشهر {totalMonths}/9</div>
      <div style={{ fontSize: 9, marginBottom: 3, color: 'var(--subtext)', fontWeight: 600 }}>{elapsedM} شهر و {remD} يوم</div>
      <div style={{ height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orange)', borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--subtext)', marginTop: 2 }}>باقي {Math.max(0, 280 - days)} يوم</div>
    </div>
  )
}

// ─── Multi-tag badge strip ────────────────────────────────────────
function TagStrip({ tags, small }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map(tag => {
        const cfg = TAG_CONFIG[tag] || TAG_CONFIG.noInsemination
        return (
          <span key={tag} style={{
            padding: small ? '1px 6px' : '2px 8px',
            borderRadius: 6,
            fontSize: small ? 10 : 11,
            fontWeight: 700,
            backgroundColor: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.color}30`,
            whiteSpace: 'nowrap',
          }}>
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}

export default function CowsPage({ search: globalSearch }) {
  const {
    cows, inseminations, deleteCow, loading, formatAge,
    showConfirm, daysBetween, daysLeft, classifyCow, dryPeriodDays, stats
  } = useFarm()

  const [view, setView] = useState(() => localStorage.getItem('cowsView') || 'table')
  const [internalSearch, setInternalSearch] = useState('')
  const search = globalSearch !== undefined ? globalSearch : internalSearch
  const [filterTag, setFilterTag] = useState(() => localStorage.getItem('cowsFilterTag') || '')
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('cowsSortBy') || 'default')

  useEffect(() => { localStorage.setItem('cowsView', view) }, [view])
  useEffect(() => { localStorage.setItem('cowsFilterTag', filterTag) }, [filterTag])
  useEffect(() => { localStorage.setItem('cowsSortBy', sortBy) }, [sortBy])
  const [addOpen, setAddOpen] = useState(false)
  const [editCow, setEditCow] = useState(null)
  const [profileCow, setProfileCow] = useState(null)

  // ── Progressive Rendering for smooth Page Transitions ──
  const [renderLimit, setRenderLimit] = useState(0)

  useEffect(() => {
    if (!loading.cows) {
      // 1. Paint empty layout immediately (0 lag)
      // 2. Then paint first 10 items to give impression of speed
      // 3. Paint everything after animation completes
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.cows])

  const today = new Date().toISOString().split('T')[0]

  // ── filtered list — multi-tag aware ──
  const filtered = useMemo(() => {
    return cows.filter(c => {
      const q = search.toLowerCase()
      const matchQ = !q || c.id?.toLowerCase().includes(q) || c.breed?.toLowerCase().includes(q)
      const tags = classifyCow(c)
      const matchTag = !filterTag || tags.includes(filterTag)
      return matchQ && matchTag
    })
  }, [cows, search, filterTag, classifyCow])

  const getCowInsemDays = (c) => {
    const activeInsem = inseminations.find(i =>
      (i.cowFirestoreId === c.firestoreId) &&
      (i.status === 'pending' || i.status === 'confirmed')
    )
    return activeInsem ? daysBetween(activeInsem.insemDate, today) : -1
  }

  const getCowBirthDays = (c) => c.lastBirthDate ? daysBetween(c.lastBirthDate, today) : -1

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'insem-desc') return getCowInsemDays(b) - getCowInsemDays(a)
      if (sortBy === 'insem-asc') {
        const dA = getCowInsemDays(a), dB = getCowInsemDays(b)
        if (dA === -1 && dB === -1) return 0
        if (dA === -1) return 1; if (dB === -1) return -1
        return dA - dB
      }
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'milk-desc') return (b.milk || 0) - (a.milk || 0)
      if (sortBy === 'birth-desc') {
        const dA = getCowBirthDays(a), dB = getCowBirthDays(b)
        if (dA === -1 && dB === -1) return 0
        if (dA === -1) return 1; if (dB === -1) return -1
        return dB - dA
      }
      if (sortBy === 'birth-asc') {
        const dA = getCowBirthDays(a), dB = getCowBirthDays(b)
        if (dA === -1 && dB === -1) return 0
        if (dA === -1) return 1; if (dB === -1) return -1
        return dA - dB
      }
      return 0
    })
  }, [filtered, sortBy, inseminations, daysBetween, today])

  // ── Enrich tags with detail for display ──
  const getDetailedTags = (c) => {
    const rawTags = classifyCow(c)
    return rawTags.map(tag => {
      const cfg = TAG_CONFIG[tag] || TAG_CONFIG.noInsemination
      // Add count detail for check/pregnant/dry tags
      if (tag === 'check') {
        const ins = inseminations.find(i =>
          (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id) && i.status === 'pending'
        )
        if (ins) {
          const d = daysBetween(ins.insemDate, today)
          return { ...cfg, tag, label: `🔍 فحص — يوم ${d}` }
        }
      }
      if (tag === 'pregnant') {
        const ins = inseminations.find(i =>
          (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id) && i.status === 'confirmed'
        )
        if (ins) {
          const d = daysBetween(ins.insemDate, today)
          const rem = daysLeft(ins.insemDate)
          const labelText = rem < 0 ? `متأخرة: ${Math.abs(rem)} يوم` : `باقي ${rem}`
          return { ...cfg, tag, label: `🤰 حامل — يوم ${d} | ${labelText}` }
        }
      }
      if (tag === 'dry') {
        const ins = inseminations.find(i =>
          (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id) && i.status === 'confirmed'
        )
        if (ins) {
          const rem = daysLeft(ins.insemDate)
          const labelText = rem < 0 ? `متأخرة: ${Math.abs(rem)} يوم` : `باقي ${rem} يوم`
          return { ...cfg, tag, label: `🌿 جافة — ${labelText}` }
        }
      }
      return { ...cfg, tag }
    })
  }

  if (profileCow) return (
    <CowProfile
      cow={profileCow}
      onBack={() => setProfileCow(null)}
      onEdit={c => { setProfileCow(null); setEditCow(c) }}
      onViewCow={setProfileCow}
    />
  )

  // ── stat cards config ──
  const statCards = [
    { key: '', icon: '🐄', val: cows.length, label: 'الإجمالي', color: 'var(--accent)' },
    { key: 'milk', icon: '🥛', val: stats.milkingCows || 0, label: 'إنتاج حليب', color: 'var(--green)' },
    { key: 'pregnant', icon: '🤰', val: stats.pregnantCows || 0, label: 'حوامل', color: 'var(--orange)' },
    {
      key: 'dry', icon: '🌿', val: stats.dryCows || 0, label: 'جافة', color: '#795548',
      tooltip: `تلقائياً عند باقي ≤ ${dryPeriodDays} يوم`
    },
    { key: 'check', icon: '🔍', val: stats.checkCows || 0, label: 'تحت الفحص', color: 'var(--gold, #b8860b)' },
    { key: 'failed', icon: '❌', val: stats.failedCows || 0, label: 'فشل تلقيح', color: '#c0392b' },
    { key: 'maleCalf', icon: '🐂', val: stats.maleCalves || 0, label: 'عجول ذكور', color: '#1565c0' },
    { key: 'calf', icon: '🐣', val: stats.femaleCalves || 0, label: 'عجول إناث', color: '#7c3aed' },
    { key: 'sick', icon: '🤒', val: stats.sickCows || 0, label: 'مريضة', color: 'var(--red)' },
  ]

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">🐄 إدارة الأبقار</div>
          <div className="topbar-sub">سجل كامل للقطيع — نظام الوسوم المتعددة</div>
        </div>
        <div className="topbar-actions">
          <input className="search-input" placeholder="🔍 بحث بالرقم أو السلالة..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width: 175 }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="milk">🥛 إنتاج حليب</option>
            <option value="pregnant">🤰 حوامل</option>
            <option value="dry">🌿 جافة</option>
            <option value="check">🔍 تحت الفحص</option>
            <option value="failed">❌ فشل تلقيح</option>
            <option value="maleCalf">🐂 عجول ذكور</option>
            <option value="calf">🐣 عجول إناث</option>
            <option value="sick">🤒 مريضة</option>
            <option value="noInsemination">⬜ بدون تلقيح</option>
          </select>
          <select className="form-control" style={{ width: 180 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="default">▼ الترتيب الافتراضي</option>
            <option value="insem-desc">📉 من أكبر لقاح لأصغر</option>
            <option value="insem-asc">📈 من أصغر لقاح لأكبر</option>
            <option value="birth-desc">📉 من أقدم ولادة لأحدث</option>
            <option value="birth-asc">📈 من أحدث ولادة لأقدم</option>
            <option value="status">📋 حسب الحالة</option>
            <option value="milk-desc">🥛 إنتاج الحليب (أعلى)</option>
          </select>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>☰</button>
            <button className={`view-btn ${view === 'cards' ? 'active' : ''}`} onClick={() => setView('cards')}>⊞</button>
          </div>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>➕ إضافة بقرة</button>
        </div>
      </div>

      <div className="content">

        {/* ── Stat Cards ── */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
          {statCards.map(s => (
            <div
              key={s.key}
              className="stat-card"
              title={s.tooltip || ''}
              onClick={() => setFilterTag(s.key)}
              style={{
                cursor: 'pointer',
                outline: filterTag === s.key ? `2px solid ${s.color}` : 'none',
                outlineOffset: 2,
              }}
            >
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table / Cards ── */}
        {loading.cows ? (
          <div className="loading-spinner">
            <div className="loading-icon">🐄</div>
            <div className="loading-text">جاري التحميل...</div>
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🐄</div>
              <div className="empty-title">لا توجد أبقار</div>
              <div className="empty-sub">أضف أول بقرة للبدء</div>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>➕ إضافة بقرة</button>
            </div>
          </div>
        ) : view === 'table' ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">قائمة الأبقار ({sortedFiltered.length})</span>
              {filterTag && (
                <span style={{ fontSize: 12, color: 'var(--subtext)' }}>
                  يعرض: <strong>{TAG_CONFIG[filterTag]?.label || filterTag}</strong>
                  {' '}— البقرة قد تظهر في فئتين (نظام الوسوم المتعددة)
                </span>
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الرقم</th>
                    <th>المصدر</th>
                    <th>الحالة (متعددة)</th>
                    <th>الحمل / ما بعد الولادة</th>
                    <th>إنتاج/يوم</th>
                    <th>ولادات</th>
                    <th>العمر</th>
                    <th>السلالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.slice(0, renderLimit).map(c => {
                    const detailedTags = getDetailedTags(c)
                    const insemDays = getCowInsemDays(c)
                    const hasHeatWatch = inseminations.some(i => i.status === 'pending' && i.type === 'مراقبة صراف' && (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id))
                    return (
                      <tr key={c.firestoreId}>
                        {/* 1. الرقم */}
                        <td title={hasHeatWatch ? 'بحاجة لمراقبة صراف' : ''}>
                          <strong
                            style={{
                              border: hasHeatWatch ? '3px solid #ff0000' : `2px solid ${c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                              color: c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                              padding: '2px 8px', borderRadius: 6,
                              display: 'inline-block', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            }}
                            onClick={() => setProfileCow(c)}
                          >
                            {c.tagColor === 'أزرق' ? '🟦' : '🟨'} {c.id}
                          </strong>
                        </td>

                        {/* 2. المصدر */}
                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {c.source === 'من المزرعة' && c.momId ? (
                            /* من المزرعة — يعرض رقم الأم مع لون كرتها */
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>بنت رقم</span>
                              <strong style={{
                                border: `2px solid ${c.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                                color: c.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                                padding: '1px 7px', borderRadius: 6,
                                fontSize: 12, fontWeight: 800, display: 'inline-block',
                                background: c.momTagColor === 'أزرق' ? '#1e88e510' : '#eab30810',
                              }}>
                                {c.momTagColor === 'أزرق' ? '🟦' : '🟨'} {c.momId}
                              </strong>
                            </span>
                          ) : c.source && c.source !== 'من المزرعة' ? (
                            /* شراء أو مصدر خارجي */
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: '#e8f5e9', color: '#2e7d32',
                              border: '1px solid #a5d6a7',
                            }}>
                              🛒 {c.source}
                            </span>
                          ) : (
                            /* من المزرعة بدون رقم أم */
                            <span style={{ color: 'var(--subtext)', fontSize: 12 }}>من المزرعة</span>
                          )}
                        </td>

                        {/* 3. الحالة */}
                        <td style={{ minWidth: 180 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {detailedTags.map(cfg => (
                              <span key={cfg.tag} style={{
                                padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                backgroundColor: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap',
                              }}>
                                {cfg.label}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 4. الحمل / أيام ما بعد الولادة */}
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {insemDays > 0
                            ? <PregnancyProgress days={insemDays} />
                            : c.lastBirthDate
                              ? (
                                <div style={{ width: 100, textAlign: 'center', display: 'inline-block' }}>
                                  <div style={{ fontSize: 11, marginBottom: 1, color: 'var(--orange)', fontWeight: 700 }}>منذ الولادة</div>
                                  <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--orange)', margin: '2px 0' }}>
                                    {getCowBirthDays(c)} يوم
                                  </div>
                                  <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>بدون تلقيح</div>
                                </div>
                              )
                              : <span style={{ color: 'var(--subtext)' }}>—</span>
                          }
                        </td>

                        {/* 5. إنتاج/يوم */}
                        <td>{c.milk > 0 ? `${c.milk} لتر` : <span style={{ color: 'var(--subtext)' }}>—</span>}</td>

                        {/* 6. ولادات */}
                        <td>{c.births || 0}</td>

                        {/* 7. العمر */}
                        <td>{formatAge(c.birthDate, c.age)}</td>

                        {/* 8. السلالة */}
                        <td>{c.breed}</td>

                        {/* 9. إجراءات */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>
                          <ActionMenu
                            options={[
                              { label: 'عرض الملف', icon: '👁️', onClick: () => setProfileCow(c) },
                              { label: 'تعديل', icon: '✏️', onClick: () => setEditCow(c) },
                              {
                                label: 'حذف البيانات', icon: '🗑', danger: true,
                                onClick: () => showConfirm({
                                  title: `حذف البقرة رقم — ${c.id}`,
                                  message: `هل أنت متأكد من حذف البقرة رقم ${c.id}؟`,
                                  detail: 'سيتم حذف جميع بياناتها نهائياً ولا يمكن التراجع.',
                                  icon: '🗑', confirmLabel: '🗑 نعم، احذف',
                                  onConfirm: () => deleteCow(c.firestoreId, c.id),
                                }),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Cards view — Rich design ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedFiltered.slice(0, renderLimit).map(c => {
              const detailedTags = getDetailedTags(c)
              const rawTags = classifyCow(c)
              const insemDays = getCowInsemDays(c)
              const birthDays = getCowBirthDays(c)
              const hasHeatWatch = inseminations.some(i =>
                i.status === 'pending' && i.type === 'مراقبة صراف' &&
                (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id)
              )

              const primaryTag = rawTags[0]
              const accentMap = {
                maleCalf: '#1565c0', calf: '#7c3aed', sick: '#b83232',
                check: '#b8860b', failed: '#c0392b', dry: '#795548',
                pregnant: '#c95a00', milk: '#1a7a42', noInsemination: '#888',
              }
              const bgMap = {
                maleCalf: '#dbeafe', calf: '#f3e8ff', sick: '#fde8e8',
                check: '#fffbea', failed: '#fde8e8', dry: '#f3ece6',
                pregnant: '#fff3e8', milk: '#edfbf3', noInsemination: '#f8f8f8',
              }
              const accent = accentMap[primaryTag] || 'var(--accent)'
              const bgLight = bgMap[primaryTag] || '#f9fafb'

              const isPregn = rawTags.includes('pregnant') || rawTags.includes('dry')
              const isCheck = rawTags.includes('check')
              const isCalf = rawTags.includes('calf') || rawTags.includes('maleCalf')
              const isSick = rawTags.includes('sick')

              /* active insemination record */
              const activeInsem = inseminations.find(i =>
                (i.cowFirestoreId === c.firestoreId) &&
                (i.status === 'confirmed' || i.status === 'pending')
              )
              const daysRemaining = activeInsem ? daysLeft(activeInsem.insemDate) : null
              const progress = insemDays > 0 ? Math.min(100, Math.round((insemDays / 280) * 100)) : 0

              /* alert badge */
              let alertBadge = null
              if (isCheck && insemDays >= 0) {
                const daysToConfirm = 23 - insemDays
                if (daysToConfirm >= 0 && daysToConfirm <= 7)
                  alertBadge = { num: daysToConfirm, text: 'الفحص بعد يوم', bg: '#fffbea', color: '#b8860b' }
              }
              if (isPregn && daysRemaining !== null && daysRemaining <= 14 && daysRemaining >= 0)
                alertBadge = { num: daysRemaining, text: 'تنبيه ولادة', bg: '#fff3e8', color: '#c95a00' }
              if (isSick)
                alertBadge = { num: '!', text: 'مريضة — تحتاج عناية', bg: '#fde8e8', color: '#b83232' }

              /* ID colors */
              const idColor = c.tagColor === 'أزرق' ? '#1e88e5' : '#d4a017'
              const idBorderColor = hasHeatWatch ? '#ff0000' : idColor

              /* Cow label */
              const cowLabel = isCalf
                ? (rawTags.includes('maleCalf') ? `عجلٌ رقم ${c.id}` : `عجلّة رقم ${c.id}`)
                : `البقرة رقم ${c.id}`

              const cowIconMap = {
                maleCalf: '🐂', calf: '🐣', dry: '🌿', pregnant: '🤰',
                milk: '🐄', sick: '🤒', check: '🔍', failed: '❌', noInsemination: '🐄',
              }
              const cowIcon = cowIconMap[primaryTag] || '🐄'

              return (
                <div key={c.firestoreId} style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #eaeaea',
                  borderRight: `5px solid ${accent}`,
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  direction: 'rtl',
                }}>

                  {/* ── Header ── */}
                  <div style={{
                    background: bgLight,
                    padding: '10px 14px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${accent}25`,
                  }}>
                    {/* Right: alert + cow name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {alertBadge && (
                        <div style={{
                          background: alertBadge.bg, color: alertBadge.color,
                          borderRadius: 8, padding: '3px 9px',
                          fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', gap: 4,
                          border: `1px solid ${alertBadge.color}40`,
                        }}>
                          ⚠️
                          <span style={{ fontSize: 14, fontWeight: 900 }}>{alertBadge.num}</span>
                          <span style={{ fontSize: 10 }}>{alertBadge.text}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 22 }}>{cowIcon}</span>
                        <strong
                          style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', cursor: 'pointer' }}
                          onClick={() => setProfileCow(c)}
                        >
                          {cowLabel}
                        </strong>
                      </div>
                    </div>

                    {/* Left: ID badge + profile btn */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        border: `2.5px solid ${idBorderColor}`,
                        color: idColor,
                        background: hasHeatWatch ? '#fff0f0' : `${idColor}18`,
                        padding: '3px 10px', borderRadius: 8,
                        fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                      }}>
                        {c.tagColor === 'أزرق' ? '🟦' : '🟨'} {c.id}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setProfileCow(c) }}
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          border: '1.5px solid var(--border)',
                          background: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, flexShrink: 0,
                        }}
                        title="عرض الملف الكامل"
                      >🔍</button>
                    </div>
                  </div>

                  {/* ── Status tags strip ── */}
                  <div style={{ padding: '6px 14px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {detailedTags.map(cfg => (
                      <span key={cfg.tag} style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        backgroundColor: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap',
                      }}>
                        {cfg.label}
                      </span>
                    ))}
                  </div>

                  {/* ── Body ── */}
                  <div style={{ padding: '8px 14px 10px' }}>

                    {/* Row: Age + Milk */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 5, fontSize: 13 }}>
                      <span>🐄 العمر: <strong>{formatAge(c.birthDate, c.age)}</strong></span>
                      <span>🥛 إنتاج الحليب: <strong>{c.milk > 0 ? `${c.milk} لتر` : '0 لتر'}</strong></span>
                    </div>

                    {/* Row: Breed + Births */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 5, fontSize: 12, color: 'var(--subtext)' }}>
                      <span>🐮 السلالة: <strong style={{ color: 'var(--text)' }}>{c.breed || '—'}</strong></span>
                      <span>🐣 الولادات: <strong style={{ color: 'var(--text)' }}>{c.births || 0}</strong></span>
                    </div>

                    {/* Row: Source / Mom */}
                    {c.source === 'من المزرعة' && c.momId ? (
                      <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 5 }}>
                        🐄 النسب: <strong>ابنة رقم </strong>
                        <span style={{
                          border: `2px solid ${c.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                          color: c.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                          padding: '1px 7px', borderRadius: 5,
                          fontSize: 11, fontWeight: 800,
                          background: c.momTagColor === 'أزرق' ? '#1e88e510' : '#eab30810',
                        }}>
                          {c.momTagColor === 'أزرق' ? '🟦' : '🟨'} {c.momId}
                        </span>
                      </div>
                    ) : c.source && c.source !== 'من المزرعة' ? (
                      <div style={{ fontSize: 12, color: '#2e7d32', marginBottom: 5 }}>
                        🛒 المصدر: <strong>{c.source}</strong>
                      </div>
                    ) : null}

                    {/* Pregnancy Progress Bar */}
                    {isPregn && insemDays > 0 && (
                      <div style={{ marginTop: 6, marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          <span style={{ color: accent }}>مدة الحمل: ({insemDays}) يوم</span>
                          <span style={{ color: accent, fontWeight: 900, fontSize: 13 }}>{progress}%</span>
                        </div>
                        <div style={{ height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${progress}%`,
                            background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                            borderRadius: 5, transition: 'width 0.5s ease',
                          }} />
                        </div>
                        {daysRemaining !== null && (
                          <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 4, textAlign: 'left', fontWeight: 700 }}>
                            {daysRemaining < 0
                              ? `⚠️ متأخرة ${Math.abs(daysRemaining)} يوم`
                              : `متبقي ${daysRemaining} أيام للولادة`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Check insem days */}
                    {isCheck && insemDays > 0 && (
                      <div style={{ fontSize: 12, color: '#b8860b', marginTop: 4, fontWeight: 700 }}>
                        ⏱ يوم التلقيح: <strong>{insemDays}</strong> — الفحص خلال {Math.max(0, 23 - insemDays)} يوم
                      </div>
                    )}

                    {/* Post-birth days */}
                    {!isPregn && !isCheck && birthDays > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
                        📅 منذ آخر ولادة: <strong style={{ color: 'var(--orange)' }}>{birthDays} يوم</strong>
                      </div>
                    )}

                    {/* Notes */}
                    {c.notes && (
                      <div style={{
                        fontSize: 11, color: 'var(--subtext)', marginTop: 5,
                        background: 'var(--hbg)', borderRadius: 6, padding: '4px 8px'
                      }}>
                        📝 الملاحظات: {c.notes.length > 50 ? c.notes.slice(0, 50) + '...' : c.notes}
                      </div>
                    )}
                  </div>

                  {/* ── Footer: Action Buttons ── */}
                  <div style={{
                    borderTop: '1px solid #f0f0f0',
                    padding: '8px 12px',
                    display: 'flex', gap: 8, justifyContent: 'flex-end',
                    background: '#fafafa',
                  }}>
                    {isPregn ? (
                      <>
                        <button className="btn btn-outline btn-sm"
                          onClick={e => { e.stopPropagation(); setEditCow(c) }}>
                          تعديل البيانات
                        </button>
                        <button className="btn btn-primary btn-sm"
                          onClick={e => { e.stopPropagation(); setProfileCow(c) }}>
                          التاريخ الطبي
                        </button>
                      </>
                    ) : isCalf ? (
                      <>
                        <button className="btn btn-outline btn-sm"
                          onClick={e => { e.stopPropagation(); setEditCow(c) }}>
                          تسجيل ملاحظات
                        </button>
                        <button className="btn btn-primary btn-sm"
                          onClick={e => { e.stopPropagation(); setProfileCow(c) }}>
                          عرض التفاصيل
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-outline btn-sm"
                          onClick={e => { e.stopPropagation(); setEditCow(c) }}>
                          ✏️ تعديل
                        </button>
                        <button className="btn btn-primary btn-sm"
                          onClick={e => { e.stopPropagation(); setProfileCow(c) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          🔍 افحص الآن
                        </button>
                      </>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen && <CowForm onClose={() => setAddOpen(false)} />}
      {editCow && <CowForm cow={editCow} onClose={() => setEditCow(null)} />}
    </div>
  )
}
