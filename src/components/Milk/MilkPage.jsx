import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useFarm } from '../../context/FarmContext'
import ActionMenu from '../Layout/ActionMenu'

const CowDisplay = ({ cow, fallbackName }) => {
  if (!cow) return <strong>{fallbackName}</strong>
  const bg = cow.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'
  return (
    <strong style={{
      border: `2px solid ${bg}`, color: bg, padding: '2px 8px',
      borderRadius: 6, display: 'inline-block', fontSize: 12,
      fontWeight: 800, letterSpacing: '0.3px'
    }}>{cow.tagColor === 'أزرق' ? '🟦' : '🟨'} {cow.id}</strong>
  )
}

export default function MilkPage({ search = '' }) {
  const { milkRecords, addMilkRecord, deleteMilkRecord, cows, loading, showConfirm, classifyCow } = useFarm()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({ cowSearchTerm: '', date: today, session: 'صباح', amount: '', cowId: '', notes: '' })
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Progressive Rendering ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    if (!loading.milk) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.milk])

  const { morning, evening, total } = useMemo(() => {
    const todayMilk = milkRecords.filter(m => m.date === today)
    const m = todayMilk.filter(m => m.session === 'صباح').reduce((s, rec) => s + (rec.amount||0), 0)
    const e = todayMilk.filter(m => m.session === 'مساء').reduce((s, rec) => s + (rec.amount||0), 0)
    return { morning: m, evening: e, total: m + e }
  }, [milkRecords, today])

  const weekMilk = useMemo(() => {
    const map = {}
    milkRecords.forEach(m => { map[m.date] = (map[m.date]||0) + (m.amount||0) })
    return Object.values(map).slice(0, 7).reduce((s, v) => s + v, 0)
  }, [milkRecords])

  const q = search.toLowerCase()
  const filteredRecords = useMemo(() => {
    if (!q) return milkRecords
    return milkRecords.filter(m => {
      const cow = cows.find(c => c.firestoreId === m.cowFirestoreId || c.id === m.cowId)
      return (
        m.cowId.toString().includes(q) ||
        (cow?.name && cow.name.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      )
    })
  }, [milkRecords, q, cows])

  const milkingCows = useMemo(() => {
    const list = cows.filter(c => classifyCow(c).includes('milk'))
    if (!q) return list
    return list.filter(c => 
      c.id.toString().includes(q) || 
      (c.name && c.name.toLowerCase().includes(q))
    )
  }, [cows, classifyCow, q])

  const save = async () => {
    if (!form.amount || parseInt(form.amount) <= 0) { alert('يرجى إدخال كمية صحيحة'); return }
    
    showConfirm({
      title: 'تسجيل حلب',
      message: `هل تريد متابعة تسجيل ${form.amount} لتر لفترة ${form.session}؟`,
      type: 'primary',
      icon: '🥛',
      confirmLabel: 'تأكيد الحفظ',
      onConfirm: async () => {
        setSaving(true)
        const cowObj = cows.find(c => c.id === form.cowId || c.firestoreId === form.cowId)
        await addMilkRecord({
          date: form.date || today,
          session: form.session,
          amount: parseInt(form.amount),
          cowId: form.cowId || 'جميع',
          cowFirestoreId: form.cowId || null,
          notes: form.notes,
        })
        setForm({ cowSearchTerm: '', date: today, session: 'صباح', amount: '', cowId: '', notes: '' })
        setOpen(false)
        setSaving(false)
      }
    })
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">🥛 إنتاج الحليب</div>
          <div className="topbar-sub">تسجيل ومتابعة الحلب اليومي</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>➕ تسجيل حلب</button>
        </div>
      </div>

      <div className="content">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon">🌅</div><div className="stat-value" style={{ color:'var(--orange)' }}>{morning} لتر</div><div className="stat-label">حلبة الصباح</div></div>
          <div className="stat-card"><div className="stat-icon">🌆</div><div className="stat-value" style={{ color:'var(--blue)' }}>{evening} لتر</div><div className="stat-label">حلبة المساء</div></div>
          <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-value">{total} لتر</div><div className="stat-label">إجمالي اليوم</div></div>
          <div className="stat-card"><div className="stat-icon">📈</div><div className="stat-value">{weekMilk} لتر</div><div className="stat-label">الأسبوع</div></div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header"><span className="card-title">📝 سجل الحلب</span></div>
            <div style={{ padding:0 }}>
              {loading.milk ? <div className="loading-spinner" style={{ padding:30 }}><div className="loading-icon">🥛</div></div> :
               milkRecords.length === 0 ? <div className="empty-state"><div className="empty-icon">🥛</div><div className="empty-title">لا توجد سجلات</div></div> : (
                <table>
                  <thead><tr><th>التاريخ</th><th>الجلسة</th><th>البقرة</th><th>الكمية</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {filteredRecords.slice(0, renderLimit).map(m => (
                      <tr key={m.firestoreId}>
                        <td>{m.date}</td>
                        <td><span className={`badge ${m.session==='صباح'?'badge-orange':'badge-blue'}`}>{m.session}</span></td>
                        <td>
                          {(() => {
                            if (!m.cowId || m.cowId === 'جميع') return 'جميع الأبقار'
                            const cow = cows.find(c => c.firestoreId === m.cowId || c.id === m.cowId)
                            return cow ? <CowDisplay cow={cow} fallbackName={m.cowId} /> : (m.cowId || 'غير معروف')
                          })()}
                        </td>
                        <td><strong>{m.amount} لتر</strong></td>
                        <td>
                          <ActionMenu
                            options={[
                              { label: 'حذف السجل', icon: '🗑️', danger: true, onClick: () => showConfirm({
                                title: `حذف السجل`,
                                message: `هل أنت متأكد من حذف سجل الحليب (كمية: ${m.amount} لتر)؟`,
                                icon: '🗑',
                                confirmLabel: '🗑 نعم، احذف',
                                onConfirm: () => deleteMilkRecord(m.firestoreId),
                              })}
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">🐄 إنتاج كل بقرة</span></div>
            <div style={{ padding:0 }}>
              <table>
                <thead><tr><th>البقرة</th><th>الإنتاج/يوم</th><th>الحالة</th></tr></thead>
                <tbody>
                  {milkingCows.slice(0, renderLimit).map(c => {
                    const tags = classifyCow(c)
                    const isPregnantMilking = tags.includes('pregnant') && tags.includes('milk')
                    return (
                      <tr key={c.firestoreId}>
                        <td><CowDisplay cow={c} fallbackName={c.id} /></td>
                        <td><strong>{c.milk} لتر</strong></td>
                        <td>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {isPregnantMilking && (
                              <span className="badge badge-orange" style={{ fontSize:10 }}>🤰 حامل</span>
                            )}
                            <span className="badge badge-green" style={{ fontSize:10 }}>🥛 منتجة</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {milkingCows.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--subtext)', padding:20 }}>لا توجد أبقار منتجة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && createPortal(
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">🥛 تسجيل حلب</span>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>التاريخ</label>
                  <input className="form-control" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الجلسة</label>
                  <select className="form-control" value={form.session} onChange={e => setForm(f=>({...f,session:e.target.value}))}>
                    <option>صباح</option><option>مساء</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>البقرة (اختياري)</label>
                  <input 
                    className="form-control" 
                    list="cows-list-milk" 
                    placeholder="بحث برقم أو اسم... (فارغ = الكل)"
                    value={form.cowSearchTerm || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      let fId = '';
                      const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                      if(found) fId = found.firestoreId;
                      setForm(f=>({...f, cowSearchTerm: val, cowId: fId}));
                    }}
                  />
                  <datalist id="cows-list-milk">
                    {cows.map(c => <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>الكمية (لتر) *</label>
                  <input className="form-control" type="number" placeholder="420" min="1" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop:12 }}>
                <label>ملاحظات</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setOpen(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳...' : '💾 حفظ'}</button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}
    </div>
  )
}
