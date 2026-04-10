import { useState, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'
import CowProfile from '../Cows/CowProfile'
import ActionMenu from '../Layout/ActionMenu'

export default function FinancePage() {
  const { finances, addRevenue, addExpense, deleteFinanceRecord, loading, showConfirm, sellAnimal, cows, births, stats, allCows, showToast, currency } = useFarm()
  const today = new Date().toISOString().split('T')[0]

  const [rvOpen, setRvOpen] = useState(false)
  const [exOpen, setExOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rvForm, setRvForm] = useState({ animalSearchTerm: '', type:'بيع حليب', amount:'', date:today, party:'', animalId:'' })
  const [exForm, setExForm] = useState({ type:'شراء علف', amount:'', date:today, party:'' })
  const [viewCow, setViewCow] = useState(null)

  // ── Progressive Rendering ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    if (!loading.finance) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.finance])

  if (viewCow) return <CowProfile cow={viewCow} onBack={() => setViewCow(null)} />

  const revenues  = finances.filter(f => f.kind === 'revenue')
  const expenses  = finances.filter(f => f.kind === 'expense')
  const totalRev  = revenues.reduce((s, f) => s + (f.amount||0), 0)
  const totalExp  = expenses.reduce((s, f) => s + (f.amount||0), 0)
  const profit    = totalRev - totalExp
  const margin    = totalRev ? Math.round(profit / totalRev * 100) : 0

  const saveRv = async () => {
    if (!rvForm.amount || parseInt(rvForm.amount) <= 0) { alert('يرجى إدخال مبلغ'); return }
    if ((rvForm.type === 'بيع بقرة' || rvForm.type === 'بيع عجل') && !rvForm.animalId) {
      alert('يرجى اختيار الحيوان المباع من القائمة'); return 
    }
    
    showConfirm({
      title: 'إضافة إيراد جديد',
      message: `تأكيد إضافة إيراد بقيمة ${parseInt(rvForm.amount).toLocaleString()} ${currency} لـ "${rvForm.type}"؟`,
      type: 'primary',
      icon: '💵',
      confirmLabel: 'تأكيد التسجيل',
      onConfirm: async () => {
        setSaving(true)
        if (rvForm.type === 'بيع بقرة') {
          const cow = cows.find(c => c.firestoreId === rvForm.animalId)
          if (cow) await sellAnimal('cow', cow.firestoreId, cow.id, `البقرة رقم ${cow.id}`, rvForm.amount, rvForm.party, rvForm.date)
        } else if (rvForm.type === 'بيع عجل') {
          const calf = births.find(b => b.firestoreId === rvForm.animalId)
          if (calf) await sellAnimal('calf', calf.firestoreId, calf.calfId, `العجل رقم ${calf.calfId}`, rvForm.amount, rvForm.party, rvForm.date)
        } else {
          await addRevenue({ type: rvForm.type, amount: parseInt(rvForm.amount), date: rvForm.date || today, party: rvForm.party })
        }
        setRvForm({ animalSearchTerm: '', type:'بيع حليب', amount:'', date:today, party:'', animalId:'' })
        setRvOpen(false); setSaving(false)
      }
    })
  }

  const saveEx = async () => {
    if (!exForm.amount || parseInt(exForm.amount) <= 0) { alert('يرجى إدخال مبلغ'); return }
    
    showConfirm({
      title: 'إضافة مصروف جديد',
      message: `تأكيد تسجيل مصروف بقيمة ${parseInt(exForm.amount).toLocaleString()} ${currency} لـ "${exForm.type}"؟`,
      type: 'warning',
      icon: '💸',
      confirmLabel: 'تأكيد الخصم',
      onConfirm: async () => {
        setSaving(true)
        await addExpense({ type: exForm.type, amount: parseInt(exForm.amount), date: exForm.date || today, party: exForm.party })
        setExForm({ type:'شراء علف', amount:'', date:today, party:'' })
        setExOpen(false); setSaving(false)
      }
    })
  }

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">💰 الإيرادات والمصروفات</div><div className="topbar-sub">إدارة مالية المزرعة</div></div>
        <div className="topbar-actions">
          <button className="btn btn-success" onClick={() => setRvOpen(true)}>➕ إيراد</button>
          <button className="btn btn-danger" onClick={() => setExOpen(true)}>➖ مصروف</button>
        </div>
      </div>

      <div className="content">
        <div className="stats-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card"><div className="stat-icon">💵</div><div className="stat-value" style={{ color:'var(--green)' }}>{totalRev.toLocaleString()} {currency}</div><div className="stat-label">الإيرادات</div></div>
          <div className="stat-card"><div className="stat-icon">💸</div><div className="stat-value" style={{ color:'var(--red)' }}>{totalExp.toLocaleString()} {currency}</div><div className="stat-label">المصروفات</div></div>
          <div className="stat-card"><div className="stat-icon">📈</div><div className="stat-value" style={{ color: profit>=0?'var(--accent)':'var(--red)' }}>{profit.toLocaleString()} {currency}</div><div className="stat-label">صافي الربح</div></div>
          <div className="stat-card"><div className="stat-icon" style={{filter:'grayscale(1)'}}>🐄</div><div className="stat-value">{stats.soldCowsCount}</div><div className="stat-label">أبقار مباعة</div></div>
          <div className="stat-card"><div className="stat-icon" style={{filter:'grayscale(1)'}}>🐂</div><div className="stat-value">{stats.soldCalvesCount}</div><div className="stat-label">عجول مباعة</div></div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header"><span className="card-title">✅ الإيرادات ({revenues.length})</span></div>
            <div style={{ padding:0 }}>
              {revenues.length === 0 ? <div className="empty-state"><div className="empty-icon">💵</div><div className="empty-title">لا توجد إيرادات</div></div> : (
                <table>
                  <thead><tr><th>النوع</th><th>التاريخ</th><th>المبلغ</th><th>الجهة</th><th>تفاصيل</th><th>إجراء</th></tr></thead>
                  <tbody>
                    {revenues.slice(0, renderLimit).map(f => {
                      // ── البحث عن الحيوان المباع (جديد: animalFirestoreId / قديم: animalId أو details) ──
                      const isSale = f.type === 'بيع بقرة' || f.type === 'بيع عجل'
                      const findAnimal = () => {
                        if (!isSale) return null
                        // طريقة 1: مرجع مباشر (السجلات الجديدة)
                        if (f.animalFirestoreId) {
                          return allCows.find(c => c.firestoreId === f.animalFirestoreId)
                        }
                        // طريقة 2: عبر animalId
                        if (f.animalId) {
                          return allCows.find(c => c.id === f.animalId || c.firestoreId === f.animalId)
                        }
                        // طريقة 3: تحليل حقل details — "رقم الحيوان: X | الاسم: Y"
                        if (f.details) {
                          const m = f.details.match(/رقم الحيوان: ([^|]+)/)
                          if (m) {
                            const id = m[1].trim()
                            return allCows.find(c => c.id === id || c.firestoreId === id)
                          }
                        }
                        return null
                      }
                      const animal = findAnimal()
                      return (
                        <tr key={f.firestoreId}>
                          <td>
                            <span className={`badge ${isSale ? 'badge-orange' : 'badge-green'}`} style={{ fontSize:10 }}>{f.type}</span>
                          </td>
                          <td style={{ fontSize:12 }}>{f.date}</td>
                          <td style={{ color:'var(--green)', fontWeight:700 }}>+{(f.amount||0).toLocaleString()} {currency}</td>
                          <td style={{ fontSize:12 }}>{f.party || '—'}</td>
                          <td style={{ fontSize:11, maxWidth:160 }}>
                            {isSale && animal ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{f.type === 'بيع بقرة' ? 'البقرة رقم' : 'العجل رقم'}</span>
                                <strong style={{
                                  backgroundColor: (animal.calfTagColor || animal.tagColor) === 'أزرق' ? '#1e88e5' : '#eab308',
                                  color: '#fff',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontWeight: 800,
                                  fontSize: 12
                                }}>{animal.id || animal.calfId}</strong>
                              </div>
                            ) : (
                              <span style={{ color:'var(--subtext)' }}>
                                {f.animalName || (f.details ? f.details.replace(/رقم الحيوان: [^|]+ \| الاسم: /, '').trim() : '—')}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign:'left' }}>
                            <ActionMenu
                              options={[
                                isSale && animal ? {
                                  label: 'عرض سجل البقرة',
                                  icon: '📋',
                                  onClick: () => setViewCow(animal)
                                } : null,
                                isSale && !animal ? {
                                  label: 'سجل غير متوفر',
                                  icon: '⚠️',
                                  onClick: () => showToast('⚠️ سجل الحيوان غير متوفر أو تم حذفه نهائياً', 'error')
                                } : null,
                                { label: 'حذف الإيراد', icon: '🗑', danger: true, onClick: () => showConfirm({
                                    title: 'حذف الإيراد',
                                    message: `هل أنت متأكد من حذف إيراد بقيمة ${(f.amount||0).toLocaleString()} ${currency}؟`,
                                    icon: '🗑',
                                    confirmLabel: '🗑 نعم، احذف',
                                    onConfirm: () => deleteFinanceRecord(f.firestoreId),
                                  })
                                }
                              ]}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">❌ المصروفات ({expenses.length})</span></div>
            <div style={{ padding:0 }}>
              {expenses.length === 0 ? <div className="empty-state"><div className="empty-icon">💸</div><div className="empty-title">لا توجد مصروفات</div></div> : (
                <table>
                  <thead><tr><th>النوع</th><th>التاريخ</th><th>المبلغ</th><th>الجهة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {expenses.slice(0, renderLimit).map(f => (
                      <tr key={f.firestoreId}>
                        <td>{f.type}</td><td>{f.date}</td>
                        <td style={{ color:'var(--red)', fontWeight:700 }}>-{(f.amount||0).toLocaleString()} {currency}</td>
                        <td>{f.party || '—'}</td>
                        <td style={{ textAlign:'left' }}>
                          <ActionMenu
                            options={[
                              { label: 'حذف المصروف', icon: '🗑️', danger: true, onClick: () => showConfirm({
                                  title: 'حذف المصروف',
                                  message: `هل أنت متأكد من حذف مصروف بقيمة ${(f.amount||0).toLocaleString()} ${currency}؟`,
                                  icon: '🗑',
                                  confirmLabel: '🗑 نعم، احذف',
                                  onConfirm: () => deleteFinanceRecord(f.firestoreId),
                                })
                              }
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
        </div>
      </div>

      {rvOpen && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setRvOpen(false) }}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">💵 إضافة إيراد</span><button className="modal-close" onClick={() => setRvOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>النوع</label>
                  <select className="form-control" value={rvForm.type} onChange={e => setRvForm(f=>({...f,type:e.target.value, animalId:'', animalSearchTerm:''}))}>
                    {['بيع حليب','بيع بقرة','بيع عجل','أخرى'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {rvForm.type === 'بيع بقرة' && (
                  <div className="form-group"><label>اختر البقرة *</label>
                    <input 
                      className="form-control" 
                      list="cows-list-finance" 
                      placeholder="ابحث بالرقم أو الاسم..."
                      value={rvForm.animalSearchTerm || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        let fId = '';
                        const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                        if(found) fId = found.firestoreId;
                        setRvForm(f=>({...f, animalSearchTerm: val, animalId: fId}));
                      }}
                    />
                    <datalist id="cows-list-finance">
                      {cows.map(c => <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`} />)}
                    </datalist>
                  </div>
                )}
                {rvForm.type === 'بيع عجل' && (
                  <div className="form-group"><label>اختر العجل *</label>
                    <input 
                      className="form-control" 
                      list="calves-list-finance" 
                      placeholder="ابحث برقم العجل أو اسم الأم..."
                      value={rvForm.animalSearchTerm || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        let fId = '';
                        const found = births.find(b => `${(b.calfTagColor || b.tagColor) === 'أزرق' ? '🟦' : '🟨'} ${b.calfId}` === val);
                        if(found) fId = found.firestoreId;
                        setRvForm(f=>({...f, animalSearchTerm: val, animalId: fId}));
                      }}
                    />
                    <datalist id="calves-list-finance">
                      {births.map(b => <option key={b.firestoreId} value={`${(b.calfTagColor || b.tagColor) === 'أزرق' ? '🟦' : '🟨'} ${b.calfId}`} />)}
                    </datalist>
                  </div>
                )}
                <div className="form-group"><label>المبلغ ({currency}) *</label><input className="form-control" type="number" placeholder="1200" value={rvForm.amount} onChange={e => setRvForm(f=>({...f,amount:e.target.value}))} /></div>
                <div className="form-group"><label>التاريخ</label><input className="form-control" type="date" value={rvForm.date} onChange={e => setRvForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group"><label>الجهة</label><input className="form-control" placeholder="تعاونية الألبان" value={rvForm.party} onChange={e => setRvForm(f=>({...f,party:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setRvOpen(false)}>إلغاء</button><button className="btn btn-success" onClick={saveRv} disabled={saving}>{saving?'⏳...':'✅ إضافة'}</button></div>
          </div>
        </div>
      )}

      {exOpen && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setExOpen(false) }}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">💸 إضافة مصروف</span><button className="modal-close" onClick={() => setExOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>النوع</label>
                  <select className="form-control" value={exForm.type} onChange={e => setExForm(f=>({...f,type:e.target.value}))}>
                    {['شراء علف','رواتب','دواء بيطري','صيانة','وقود','أخرى'].map(t => <option key={t}>{t}</option>)}
                  </select></div>
                <div className="form-group"><label>المبلغ ({currency}) *</label><input className="form-control" type="number" placeholder="500" value={exForm.amount} onChange={e => setExForm(f=>({...f,amount:e.target.value}))} /></div>
                <div className="form-group"><label>التاريخ</label><input className="form-control" type="date" value={exForm.date} onChange={e => setExForm(f=>({...f,date:e.target.value}))} /></div>
                <div className="form-group"><label>الجهة/المورد</label><input className="form-control" placeholder="اسم المورد" value={exForm.party} onChange={e => setExForm(f=>({...f,party:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setExOpen(false)}>إلغاء</button><button className="btn btn-danger" onClick={saveEx} disabled={saving}>{saving?'⏳...':'➖ إضافة'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
