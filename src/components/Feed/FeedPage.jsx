import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useFarm } from '../../context/FarmContext'

// ── أنواع العلف الأساسية ──────────────────────────
const DEFAULT_FEED_TYPES = [
  { id: 'hay',     name: 'تبن',      unit: 'كغ', icon: '🌾', color: '#f39c12', dailyPerCow: 5  },
  { id: 'silage',  name: 'سيلاج',    unit: 'كغ', icon: '🌿', color: '#27ae60', dailyPerCow: 20 },
  { id: 'conc',    name: 'مركز',     unit: 'كغ', icon: '🌽', color: '#e67e22', dailyPerCow: 4  },
  { id: 'mineral', name: 'معدنيات',  unit: 'كغ', icon: '💊', color: '#9b59b6', dailyPerCow: 0.3 },
  { id: 'straw',   name: 'قش',       unit: 'كغ', icon: '🍂', color: '#d4a017', dailyPerCow: 3  },
  { id: 'water',   name: 'ماء',      unit: 'لتر', icon: '💧', color: '#3498db', dailyPerCow: 60 },
]

function loadLocal(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def }
  catch { return def }
}
function saveLocal(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

export default function FeedPage({ search = '' }) {
  const { showToast, showConfirm, addExpense, stats, currency }  = useFarm()
  const today = new Date().toISOString().split('T')[0]
  const cowCount = stats.totalCows || 1

  // ── الحالة المحلية ──
  const [feedTypes, setFeedTypes] = useState(() => loadLocal('feedTypes', DEFAULT_FEED_TYPES))
  const [history, setHistory]   = useState(() => loadLocal('feedHistory', []))
  const [prices, setPrices]     = useState(() => loadLocal('feedPrices', { hay:0.5, silage:0.3, conc:1.2, mineral:8, straw:0.2, water:0 }))
  const [stockBase, setStockBase] = useState(() => loadLocal('feedStockBase', { hay:2500, silage:8000, conc:1200, mineral:50, straw:500, water:5000 }))

  // ── Modal states ──
  const [modal, setModal] = useState(null) // 'in' | 'out' | 'edit-price'
  const [form, setForm]   = useState({ feedId:'hay', amount:'', cost:'', date:today, party:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'history' | 'plan'

  const q = search.toLowerCase()
  const filteredHistory = useMemo(() => {
    if (!q) return history
    return history.filter(tx => 
      (tx.feedName && tx.feedName.toLowerCase().includes(q)) ||
      (tx.party && tx.party.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q)) ||
      (tx.date && tx.date.includes(q))
    )
  }, [history, q])

  // ── حساب المخزون الحالي ──
  const currentStock = useMemo(() => {
    const s = { ...stockBase }
    history.forEach(tx => {
      if (tx.type === 'in')  s[tx.feedId] = (s[tx.feedId] || 0) + tx.amount
      if (tx.type === 'out') s[tx.feedId] = Math.max(0, (s[tx.feedId] || 0) - tx.amount)
    })
    return s
  }, [stockBase, history])

  // ── إحصاءات الشهر الحالي ──
  const monthlyStats = useMemo(() => {
    const m = today.slice(0,7)
    const monthTx = history.filter(tx => tx.date?.startsWith(m))
    const totalCost  = monthTx.filter(t => t.type==='in').reduce((s,t) => s+(t.cost||0), 0)
    const totalIn    = monthTx.filter(t => t.type==='in').length
    const totalOut   = monthTx.filter(t => t.type==='out').length
    return { totalCost, totalIn, totalOut }
  }, [history, today])

  // ── أيام الكفاية لكل علف ──
  const daysLeft = (feedId) => {
    const ft  = feedTypes.find(f => f.id === feedId)
    const daily = (ft?.dailyPerCow || 1) * cowCount
    return daily > 0 ? Math.floor((currentStock[feedId]||0) / daily) : 999
  }

  // ── تسجيل وارد / صرف ──
  const openModal = (type) => {
    setForm({ feedId:'hay', amount:'', cost:'', date:today, party:'', notes:'' })
    setModal(type)
  }

  const saveTransaction = async () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { alert('يرجى إدخال كمية صحيحة'); return }
    setSaving(true)
    const ft = feedTypes.find(f => f.id === form.feedId)
    const tx = {
      id: Date.now(),
      type: modal, // 'in' | 'out'
      feedId: form.feedId,
      feedName: ft?.name || form.feedId,
      amount,
      cost: parseFloat(form.cost) || 0,
      date: form.date || today,
      party: form.party || '',
      notes: form.notes || '',
    }
    const newHistory = [tx, ...history]
    setHistory(newHistory)
    saveLocal('feedHistory', newHistory)

    // إذا وارد بتكلفة → سجل كمصروف
    if (modal === 'in' && tx.cost > 0) {
      await addExpense({
        type: 'شراء علف',
        amount: tx.cost,
        date: tx.date,
        party: tx.party || ft?.name || 'علف',
        notes: `${ft?.name} — ${amount} ${ft?.unit}`,
      })
    }
    showToast(modal === 'in'
      ? `✅ تم تسجيل وارد ${ft?.name}: +${amount} ${ft?.unit}`
      : `📉 تم تسجيل صرف ${ft?.name}: -${amount} ${ft?.unit}`)
    setModal(null)
    setSaving(false)
  }

  const deleteTransaction = (id) => {
    showConfirm({
      title: 'حذف المعاملة',
      message: 'هل أنت متأكد من حذف هذه المعاملة؟ سيؤثر ذلك على المخزون.',
      icon: '🗑',
      confirmLabel: '🗑 نعم، احذف',
      onConfirm: () => {
        const newHistory = history.filter(tx => tx.id !== id)
        setHistory(newHistory)
        saveLocal('feedHistory', newHistory)
        showToast('تم حذف المعاملة')
      }
    })
  }

  // ── تعديل المخزون الأساسي (إعادة جرد) ──
  const doInventory = (feedId, newStock) => {
    const newBase = { ...stockBase, [feedId]: newStock }
    setStockBase(newBase)
    saveLocal('feedStockBase', newBase)
    showToast(`✅ تم تحديث مخزون ${feedTypes.find(f=>f.id===feedId)?.name}`)
  }

  // ── تحديث أنواع العلف الثابتة ──
  const saveFeedTypes = (newTypes) => {
    setFeedTypes(newTypes)
    saveLocal('feedTypes', newTypes)
  }

  // ── خطة التغذية اليومية ──
  const feedPlan = feedTypes.map(f => ({
    ...f,
    dailyTotal: (f.dailyPerCow * cowCount).toFixed(1),
    monthlyTotal: (f.dailyPerCow * cowCount * 30).toFixed(0),
    monthlyCost:  ((f.dailyPerCow * cowCount * 30) * (prices[f.id]||0)).toFixed(0),
    stock: currentStock[f.id] || 0,
    days: daysLeft(f.id),
  }))

  const totalPlanCost = feedPlan.reduce((s,f) => s + parseFloat(f.monthlyCost||0), 0)

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">🌾 التغذية والعلف</div>
          <div className="topbar-sub">إدارة مخزون العلف والتغذية اليومية</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-outline" onClick={() => setModal('manage_types')}>⚙️ إدارة الأنواع</button>
          <button className="btn btn-success" onClick={() => openModal('in')}>📥 وارد علف</button>
          <button className="btn btn-warning" onClick={() => openModal('out')}>📤 صرف علف</button>
        </div>
      </div>

      <div className="content">
        {/* ── إحصاءات ── */}
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <div className="stat-card">
            <div className="stat-icon">🌾</div>
            <div className="stat-value">{feedTypes.length}</div>
            <div className="stat-label">أنواع العلف</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value" style={{ fontSize:16 }}>
              {monthlyStats.totalCost.toLocaleString()} {currency}
            </div>
            <div className="stat-label">تكلفة هذا الشهر</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-value" style={{ color:'var(--green)' }}>{monthlyStats.totalIn}</div>
            <div className="stat-label">واردات الشهر</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📤</div>
            <div className="stat-value" style={{ color:'var(--orange)' }}>{monthlyStats.totalOut}</div>
            <div className="stat-label">صرفيات الشهر</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value" style={{ color:'var(--red)' }}>
              {feedTypes.filter(f => daysLeft(f.id) < 7).length}
            </div>
            <div className="stat-label">مخزون منخفض</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'2px solid var(--border)', paddingBottom:0 }}>
          {[
            { id:'dashboard', label:'📊 المخزون' },
            { id:'history',   label:'📋 السجل' },
            { id:'plan',      label:'📆 خطة التغذية' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:'8px 18px', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
              background:'none',
              borderBottom: activeTab===tab.id ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab===tab.id ? 'var(--accent)' : 'var(--subtext)',
              transition:'all .2s', borderRadius:0,
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ══════════════ تاب المخزون ══════════════ */}
        {activeTab === 'dashboard' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {feedTypes.map(f => {
              const stock = currentStock[f.id] || 0
              const days  = daysLeft(f.id)
              const daily = (f.dailyPerCow * cowCount)
              const maxDays = 60
              const pct   = Math.min(days / maxDays * 100, 100)
              const low   = days < 7
              const warn  = days >= 7 && days < 15
              const color = low ? '#e74c3c' : warn ? '#f39c12' : '#27ae60'
              return (
                <div key={f.id} className="card" style={{
                  border:`2px solid ${low ? '#e74c3c' : 'var(--border)'}`,
                  transition:'border .3s',
                }}>
                  <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {/* Header */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:44, height:44, borderRadius:12,
                          background: f.color + '22', border:`2px solid ${f.color}`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                        }}>{f.icon}</div>
                        <div>
                          <div style={{ fontWeight:900, fontSize:15 }}>{f.name}</div>
                          <div style={{ fontSize:11, color:'var(--subtext)' }}>
                            {daily.toFixed(1)} {f.unit}/يوم للقطيع
                          </div>
                        </div>
                      </div>
                      {low
                        ? <span className="badge badge-red">⚠️ منخفض</span>
                        : warn
                        ? <span className="badge badge-orange">⏳ تنبيه</span>
                        : <span className="badge badge-green">✅ كافٍ</span>
                      }
                    </div>

                    {/* Stock value */}
                    <div style={{ background:'var(--bg)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:11, color:'var(--subtext)' }}>المخزون الحالي</div>
                        <div style={{ fontWeight:900, fontSize:20, color: low ? '#e74c3c' : 'var(--text)' }}>
                          {stock.toLocaleString()} <span style={{ fontSize:13, fontWeight:400 }}>{f.unit}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:11, color:'var(--subtext)' }}>يكفي</div>
                        <div style={{ fontWeight:900, fontSize:22, color }}>
                          {days > 999 ? '∞' : days}
                        </div>
                        <div style={{ fontSize:10, color:'var(--subtext)' }}>يوم</div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5 }}>
                        <span style={{ color:'var(--subtext)' }}>مستوى المخزون</span>
                        <span style={{ color, fontWeight:700 }}>{Math.round(pct)}%</span>
                      </div>
                      <div style={{ background:'var(--border)', borderRadius:4, height:8, overflow:'hidden' }}>
                        <div style={{
                          width:`${pct}%`, height:'100%', borderRadius:4,
                          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                          transition:'width .5s',
                        }} />
                      </div>
                    </div>

                    {/* Price */}
                    {prices[f.id] > 0 && (
                      <div style={{ fontSize:12, color:'var(--subtext)', display:'flex', justifyContent:'space-between' }}>
                        <span>💰 قيمة المخزون</span>
                        <strong style={{ color:'var(--text)' }}>
                          {(stock * prices[f.id]).toLocaleString(undefined, {maximumFractionDigits:0})} {currency}
                        </strong>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-xs btn-success" style={{ flex:1 }}
                        onClick={() => { setForm({ feedId:f.id, amount:'', cost:'', date:today, party:'', notes:'' }); setModal('in') }}>
                        📥 وارد
                      </button>
                      <button className="btn btn-xs btn-warning" style={{ flex:1 }}
                        onClick={() => { setForm({ feedId:f.id, amount:daily.toFixed(0), cost:'', date:today, party:'', notes:'استهلاك يومي' }); setModal('out') }}>
                        📤 صرف يومي
                      </button>
                      <button className="btn btn-xs btn-outline"
                        onClick={() => {
                          const v = prompt(`أدخل المخزون الفعلي الحالي لـ${f.name} (${f.unit}):`, stock)
                          if (v && !isNaN(parseFloat(v))) doInventory(f.id, parseFloat(v))
                        }}
                        title="تعديل المخزون يدوياً (جرد)">
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ تاب السجل ══════════════ */}
        {activeTab === 'history' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 سجل الواردات والصرفيات ({history.length})</span>
              {history.length > 0 && (
                <button className="btn btn-xs btn-danger"
                  onClick={() => showConfirm({
                    title:'مسح كل السجل',
                    message:'هل أنت متأكد من مسح كل سجل العلف؟ لن يمكن التراجع.',
                    icon:'🗑',
                    confirmLabel:'🗑 نعم، امسح الكل',
                    onConfirm:() => { setHistory([]); saveLocal('feedHistory', []); showToast('تم مسح السجل') }
                  })}>
                  🗑 مسح الكل
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">لا توجد معاملات بعد</div>
                <div className="empty-sub">ابدأ بتسجيل وارد أو صرف علف</div>
              </div>
            ) : (
              <div style={{ padding:0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>النوع</th>
                      <th>العلف</th>
                      <th>الكمية</th>
                      <th>التكلفة</th>
                      <th>التاريخ</th>
                      <th>الجهة / ملاحظات</th>
                      <th>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(tx => {
                      const ft = feedTypes.find(f => f.id === tx.feedId)
                      return (
                        <tr key={tx.id}>
                          <td>
                            <span className={`badge ${tx.type==='in' ? 'badge-green' : 'badge-orange'}`}>
                              {tx.type==='in' ? '📥 وارد' : '📤 صرف'}
                            </span>
                          </td>
                          <td>
                            <span style={{ marginLeft:4 }}>{ft?.icon}</span>{tx.feedName}
                          </td>
                          <td style={{ fontWeight:700, color: tx.type==='in' ? 'var(--green)' : 'var(--orange)' }}>
                            {tx.type==='in' ? '+' : '-'}{tx.amount.toLocaleString()} {ft?.unit}
                          </td>
                          <td style={{ fontSize:12 }}>
                            {tx.cost > 0 ? `${tx.cost.toLocaleString()} ${currency}` : '—'}
                          </td>
                          <td style={{ fontSize:12 }}>{tx.date}</td>
                          <td style={{ fontSize:11, color:'var(--subtext)' }}>
                            {[tx.party, tx.notes].filter(Boolean).join(' — ') || '—'}
                          </td>
                          <td>
                            <button className="btn btn-xs btn-danger" onClick={() => deleteTransaction(tx.id)}>🗑</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ تاب خطة التغذية ══════════════ */}
        {activeTab === 'plan' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">📆 خطة التغذية اليومية — القطيع ({cowCount} رأس)</span>
              </div>
              <div style={{ padding:0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>نوع العلف</th>
                      <th>كمية/بقرة/يوم</th>
                      <th>إجمالي القطيع/يوم</th>
                      <th>الشهري (30 يوم)</th>
                      <th>تكلفة الشهر</th>
                      <th>المخزون الحالي</th>
                      <th>يكفي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedPlan.map(f => (
                      <tr key={f.id} style={{ background: f.days < 7 ? '#fff5f5' : undefined }}>
                        <td>
                          <span style={{ marginLeft:6 }}>{f.icon}</span>
                          <strong>{f.name}</strong>
                        </td>
                        <td>{f.dailyPerCow} {f.unit}</td>
                        <td style={{ fontWeight:700 }}>{f.dailyTotal} {f.unit}</td>
                        <td>{parseFloat(f.monthlyTotal).toLocaleString()} {f.unit}</td>
                        <td style={{ color:'var(--green)', fontWeight:700 }}>
                          {parseFloat(f.monthlyCost) > 0
                            ? `${parseFloat(f.monthlyCost).toLocaleString()} ${currency}`
                            : '—'}
                        </td>
                        <td style={{ fontWeight:700 }}>{f.stock.toLocaleString()} {f.unit}</td>
                        <td>
                          <span style={{
                            fontWeight:900, fontSize:15,
                            color: f.days < 7 ? 'var(--red)' : f.days < 15 ? 'var(--orange)' : 'var(--green)'
                          }}>
                            {f.days > 999 ? '∞' : f.days} يوم
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'var(--bg)', fontWeight:700 }}>
                      <td colSpan={4}>التكلفة الشهرية الإجمالية المتوقعة</td>
                      <td style={{ color:'var(--accent)', fontWeight:900 }}>
                        {totalPlanCost.toLocaleString(undefined, {maximumFractionDigits:0})} {currency}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ملاحظات غذائية */}
            <div className="card">
              <div className="card-header"><span className="card-title">💡 إرشادات التغذية</span></div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12 }}>
                  {[
                    { icon:'🐄', title:'أبقار الحلب', tip:`${(4*cowCount).toFixed(0)} كغ مركز + ${(20*cowCount).toFixed(0)} كغ سيلاج يومياً` },
                    { icon:'🤰', title:'الأبقار الحوامل', tip:'زيادة المركز بنسبة 15% في الشهر الأخير' },
                    { icon:'🥛', title:'تحسين الإنتاج', tip:'1 كغ مركز إضافي لكل 2 لتر حليب إضافي' },
                    { icon:'💧', title:'الماء', tip:`${(60*cowCount).toFixed(0)} لتر ماء نظيف يومياً للقطيع كاملاً` },
                  ].map(g => (
                    <div key={g.title} style={{
                      background:'var(--bg)', borderRadius:10, padding:'12px 14px',
                      display:'flex', gap:12, alignItems:'flex-start',
                    }}>
                      <div style={{ fontSize:28, flexShrink:0 }}>{g.icon}</div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:13, marginBottom:4 }}>{g.title}</div>
                        <div style={{ fontSize:12, color:'var(--subtext)', lineHeight:1.6 }}>{g.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ Modal: وارد / صرف ══════════════ */}
      {(modal === 'in' || modal === 'out') && createPortal(
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModal(null) }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                {modal === 'in' ? '📥 تسجيل وارد علف' : '📤 تسجيل صرف علف'}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>نوع العلف *</label>
                  <select className="form-control" value={form.feedId}
                    onChange={e => setForm(f => ({...f, feedId:e.target.value}))}>
                    {feedTypes.map(f => (
                      <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>الكمية ({feedTypes.find(f=>f.id===form.feedId)?.unit}) *</label>
                  <input className="form-control" type="number" placeholder="500" min="1"
                    value={form.amount} onChange={e => setForm(f => ({...f, amount:e.target.value}))} />
                </div>
                {modal === 'in' && (
                  <div className="form-group">
                    <label>التكلفة الإجمالية ({currency}) — اختياري</label>
                    <input className="form-control" type="number" placeholder="250"
                      value={form.cost} onChange={e => setForm(f => ({...f, cost:e.target.value}))} />
                  </div>
                )}
                <div className="form-group">
                  <label>التاريخ</label>
                  <input className="form-control" type="date" value={form.date}
                    onChange={e => setForm(f => ({...f, date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>{modal==='in' ? 'المورد' : 'الهدف'}</label>
                  <input className="form-control"
                    placeholder={modal==='in' ? 'اسم المورد' : 'مثال: استهلاك يومي'}
                    value={form.party} onChange={e => setForm(f => ({...f, party:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>ملاحظات</label>
                  <input className="form-control" placeholder="ملاحظات اختيارية"
                    value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} />
                </div>
              </div>
              {/* معاينة حالة المخزون */}
              {form.feedId && (
                <div style={{
                  background: modal==='in' ? '#f0fff6' : '#fff9f0',
                  borderRadius:8, padding:'10px 14px', marginTop:12,
                  display:'flex', justifyContent:'space-between', fontSize:13,
                  border:`1px solid ${modal==='in' ? 'var(--green)' : 'var(--orange)'}`,
                }}>
                  <span>المخزون الحالي: <strong>{(currentStock[form.feedId]||0).toLocaleString()} {feedTypes.find(f=>f.id===form.feedId)?.unit}</strong></span>
                  {form.amount && (
                    <span>
                      بعد التسجيل: <strong style={{ color: modal==='in' ? 'var(--green)' : 'var(--orange)' }}>
                        {modal==='in'
                          ? ((currentStock[form.feedId]||0) + parseFloat(form.amount||0)).toLocaleString()
                          : Math.max(0, (currentStock[form.feedId]||0) - parseFloat(form.amount||0)).toLocaleString()
                        } {feedTypes.find(f=>f.id===form.feedId)?.unit}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>إلغاء</button>
              <button className={`btn ${modal==='in' ? 'btn-success' : 'btn-warning'}`}
                onClick={saveTransaction} disabled={saving}>
                {saving ? '⏳...' : modal==='in' ? '📥 تسجيل الوارد' : '📤 تسجيل الصرف'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}

      {/* ══════════════ Modal: إدارة أنواع العلف ══════════════ */}
      {modal === 'manage_types' && createPortal(
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModal(null) }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">⚙️ إدارة مفردات خطة العلف</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <table style={{ margin: 0, borderRadius: 0, boxShadow: 'none' }}>
                <thead>
                  <tr>
                    <th>أيقونة</th>
                    <th>النوع</th>
                    <th>الوحدة</th>
                    <th>الكمية للبقرة/يوم</th>
                    <th>السعر (ل.س/{feedTypes?.[0]?.unit||'وحدة'})</th>
                    <th style={{ width: 80 }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {feedTypes.map(ft => (
                    <tr key={ft.id}>
                      <td><input className="form-control" style={{ width:50, textAlign:'center' }} value={ft.icon} onChange={e => {
                        saveFeedTypes(feedTypes.map(f => f.id===ft.id ? {...f, icon:e.target.value} : f))
                      }}/></td>
                      <td><input className="form-control" value={ft.name} onChange={e => {
                        saveFeedTypes(feedTypes.map(f => f.id===ft.id ? {...f, name:e.target.value} : f))
                      }}/></td>
                      <td><input className="form-control" value={ft.unit} onChange={e => {
                        saveFeedTypes(feedTypes.map(f => f.id===ft.id ? {...f, unit:e.target.value} : f))
                      }}/></td>
                      <td><input className="form-control" type="number" step="0.1" value={ft.dailyPerCow} onChange={e => {
                        saveFeedTypes(feedTypes.map(f => f.id===ft.id ? {...f, dailyPerCow:parseFloat(e.target.value)||0} : f))
                      }}/></td>
                      <td><input className="form-control" type="number" step="0.1" value={prices[ft.id]||0} onChange={e => {
                        const newPrices = {...prices, [ft.id]:parseFloat(e.target.value)||0}
                        setPrices(newPrices)
                        saveLocal('feedPrices', newPrices)
                      }}/></td>
                      <td>
                        <button className="btn btn-xs btn-danger" onClick={() => {
                          showConfirm({
                            title: 'حذف مفردة',
                            message: `هل أنت متأكد من حذف "${ft.name}" من خطة العلف تماماً؟`,
                            icon: '🗑',
                            confirmLabel: '🗑 نعم، احذف',
                            onConfirm: () => {
                              saveFeedTypes(feedTypes.filter(f => f.id !== ft.id))
                              showToast('تم الحذف')
                            }
                          })
                        }}>🗑 حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-primary" onClick={() => {
                const newId = 'custom_' + Date.now()
                saveFeedTypes([...feedTypes, { id: newId, name: 'علف جديد', unit: 'كغ', icon: '🌾', color: '#888', dailyPerCow: 1 }])
              }}>➕ إضافة مفردة جديدة لخطة التغذية</button>
              <button className="btn btn-success" onClick={() => setModal(null)}>✅ تم</button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}
    </div>
  )
}
