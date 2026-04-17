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

export default function HealthPage({ search = '' }) {
  const { cows, healthRecords, vaccinations, addHealthRecord, markCowRecovered, addVaccination, markVaccinationDone, deleteHealthRecord, deleteVaccination, loading, showConfirm } = useFarm()
  const today = new Date().toISOString().split('T')[0]

  const [hOpen, setHOpen] = useState(false)
  const [vOpen, setVOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Progressive Rendering ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    if (!loading.health) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.health])

  const [hForm, setHForm] = useState({ cowSearchTerm: '', cowId:'', disease:'', treatment:'', dose:'', date: today, vet:'' })
  const [vForm, setVForm] = useState({ type:'', targetCows:'جميع الأبقار', scheduledDate: today, executor:'طبيب بيطري' })

  const saveHealth = async () => {
    if (!hForm.cowId) { alert('يرجى اختيار البقرة'); return }
    if (!hForm.disease.trim()) { alert('يرجى إدخال المرض'); return }
    
    showConfirm({
      title: 'تسجيل حالة صحية',
      message: `تأكيد تسجيل حالة "${hForm.disease}"؟`,
      type: 'primary',
      icon: '🏥',
      confirmLabel: 'تأكيد التسجيل',
      onConfirm: async () => {
        setSaving(true)
        await addHealthRecord({ ...hForm, cowFirestoreId: hForm.cowId })
        setHForm({ cowSearchTerm: '', cowId:'', disease:'', treatment:'', dose:'', date:today, vet:'' })
        setHOpen(false)
        setSaving(false)
      }
    })
  }

  const saveVax = async () => {
    if (!vForm.type.trim()) { alert('يرجى إدخال نوع التطعيم'); return }
    
    showConfirm({
      title: 'جدولة تطعيم',
      message: `تأكيد جدولة تطعيم "${vForm.type}" لـ ${vForm.targetCows}؟`,
      type: 'primary',
      icon: '💉',
      confirmLabel: 'تأكيد الجدولة',
      onConfirm: async () => {
        setSaving(true)
        await addVaccination({ ...vForm })
        setVForm({ type:'', targetCows:'جميع الأبقار', scheduledDate:today, executor:'طبيب بيطري' })
        setVOpen(false)
        setSaving(false)
      }
    })
  }

  const q = search.toLowerCase()
  const filteredHealth = useMemo(() => {
    if (!q) return healthRecords
    return healthRecords.filter(h => {
      const cow = cows.find(c => c.firestoreId === h.cowId)
      return (
        h.cowId.toString().includes(q) ||
        (h.disease && h.disease.toLowerCase().includes(q)) ||
        (h.treatment && h.treatment.toLowerCase().includes(q)) ||
        (cow?.name && cow.name.toLowerCase().includes(q))
      )
    })
  }, [healthRecords, q, cows])

  const filteredVax = useMemo(() => {
    if (!q) return vaccinations
    return vaccinations.filter(v => 
      (v.type && v.type.toLowerCase().includes(q)) ||
      (v.targetCows && v.targetCows.toLowerCase().includes(q))
    )
  }, [vaccinations, q])

  const sickCows = cows.filter(c => c.status === 'مريضة')

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">💉 الصحة والتطعيمات</div>
          <div className="topbar-sub">متابعة الحالة الصحية للقطيع</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setHOpen(true)}>➕ تسجيل حالة</button>
          <button className="btn btn-info" onClick={() => setVOpen(true)}>💉 جدولة تطعيم</button>
        </div>
      </div>

      <div className="content">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon">🏥</div><div className="stat-value" style={{ color:'var(--red)' }}>{sickCows.length}</div><div className="stat-label">حالات مرضية</div></div>
          <div className="stat-card"><div className="stat-icon">💉</div><div className="stat-value" style={{ color:'var(--blue)' }}>{vaccinations.filter(v=>!v.done).length}</div><div className="stat-label">تطعيمات قادمة</div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-value" style={{ color:'var(--green)' }}>{healthRecords.filter(h=>h.status==='recovered').length}</div><div className="stat-label">تعافت</div></div>
          <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-value">{healthRecords.length}</div><div className="stat-label">إجمالي السجلات</div></div>
        </div>

        <div className="two-col">
          {/* Health Records */}
          <div className="card">
            <div className="card-header"><span className="card-title">🏥 السجل الصحي</span></div>
            <div style={{ padding:0 }}>
              {loading.health ? <div className="loading-spinner" style={{ padding:30 }}><div className="loading-icon">💉</div></div> :
               healthRecords.length === 0 ? <div className="empty-state"><div className="empty-icon">🏥</div><div className="empty-title">لا توجد حالات مرضية</div></div> : (
                <table>
                  <thead><tr><th>البقرة</th><th>المرض</th><th>العلاج</th><th>التاريخ</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {filteredHealth.slice(0, renderLimit).map(h => {
                      const cow = cows.find(c => c.firestoreId === h.cowId)
                      return (
                        <tr key={h.firestoreId}>
                          <td><CowDisplay cow={cow} fallbackName={h.cowId} /></td>
                          <td>{h.disease}</td>
                          <td>{h.treatment || '—'}</td>
                          <td style={{ fontSize:12 }}>{h.date || '—'}</td>
                          <td>
                            <span className={`badge ${h.status==='recovered'?'badge-green':'badge-orange'}`}>
                              {h.status==='recovered' ? 'تعافت ✅' : 'تحت العلاج'}
                            </span>
                          </td>
                          <td style={{ textAlign:'left' }}>
                            <ActionMenu
                              options={[
                                h.status !== 'recovered' && cow ? { label: 'تعافت', icon: '✅', onClick: () => markCowRecovered(h.firestoreId, cow.firestoreId) } : null,
                                { label: 'حذف', icon: '🗑️', danger: true, onClick: () => showConfirm({
                                  title: 'حذف السجل الصحي',
                                  message: `هل أنت متأكد من حذف السجل الطبي للمرض "${h.disease}"؟`,
                                  icon: '🗑',
                                  confirmLabel: '🗑 نعم، احذف',
                                  onConfirm: () => deleteHealthRecord(h.firestoreId),
                                })}
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

          {/* Vaccinations */}
          <div className="card">
            <div className="card-header"><span className="card-title">💉 جدول التطعيمات</span></div>
            <div style={{ padding:0 }}>
              {vaccinations.length === 0 ? <div className="empty-state"><div className="empty-icon">💉</div><div className="empty-title">لا توجد تطعيمات مجدولة</div><button className="btn btn-sm btn-info" onClick={() => setVOpen(true)}>جدولة تطعيم</button></div> : (
                <table>
                  <thead><tr><th>التطعيم</th><th>الأبقار</th><th>الموعد</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {filteredVax.slice(0, renderLimit).map(v => (
                      <tr key={v.firestoreId}>
                        <td>{v.type}</td>
                        <td>{v.targetCows}</td>
                        <td>{v.scheduledDate}</td>
                        <td><span className={`badge ${v.done?'badge-green':'badge-orange'}`}>{v.done?'تم ✅':'قادم'}</span></td>
                        <td style={{ textAlign:'left' }}>
                          <ActionMenu
                            options={[
                              !v.done ? { label: 'تمت الجدولة', icon: '✅', onClick: () => markVaccinationDone(v.firestoreId) } : null,
                              { label: 'حذف', icon: '🗑️', danger: true, onClick: () => showConfirm({
                                title: 'حذف التطعيم',
                                message: `هل أنت متأكد من حذف تطعيم "${v.type}" المجدول؟`,
                                icon: '🗑',
                                confirmLabel: '🗑 نعم، احذف',
                                onConfirm: () => deleteVaccination(v.firestoreId),
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
        </div>
      </div>

      {/* Health Modal */}
      {hOpen && createPortal(
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setHOpen(false) }}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">🏥 تسجيل حالة صحية</span><button className="modal-close" onClick={() => setHOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>البقرة *</label>
                  <input 
                    className="form-control" 
                    list="cows-list-health" 
                    placeholder="ابحث بالرقم أو الاسم..."
                    value={hForm.cowSearchTerm || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      let fId = '';
                      const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                      if(found) fId = found.firestoreId;
                      setHForm(f=>({...f, cowSearchTerm: val, cowId: fId}));
                    }}
                  />
                  <datalist id="cows-list-health">
                    {cows.map(c => <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>المرض *</label>
                  <input className="form-control" placeholder="التهاب الضرع" value={hForm.disease} onChange={e => setHForm(f=>({...f,disease:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>العلاج</label>
                  <input className="form-control" placeholder="مضادات حيوية" value={hForm.treatment} onChange={e => setHForm(f=>({...f,treatment:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الجرعة</label>
                  <input className="form-control" placeholder="10مل مرتين يومياً" value={hForm.dose} onChange={e => setHForm(f=>({...f,dose:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>التاريخ</label>
                  <input className="form-control" type="date" value={hForm.date} onChange={e => setHForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الطبيب البيطري</label>
                  <input className="form-control" placeholder="د. محمد" value={hForm.vet} onChange={e => setHForm(f=>({...f,vet:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setHOpen(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={saveHealth} disabled={saving}>{saving?'⏳...':'💾 حفظ'}</button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}

      {/* Vax Modal */}
      {vOpen && createPortal(
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setVOpen(false) }}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">💉 جدولة تطعيم</span><button className="modal-close" onClick={() => setVOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>نوع التطعيم *</label>
                  <input className="form-control" placeholder="حمى قلاعية" value={vForm.type} onChange={e => setVForm(f=>({...f,type:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>أبقار المستهدفة</label>
                  <input className="form-control" value={vForm.targetCows} onChange={e => setVForm(f=>({...f,targetCows:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>تاريخ الموعد</label>
                  <input className="form-control" type="date" value={vForm.scheduledDate} onChange={e => setVForm(f=>({...f,scheduledDate:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الجهة المنفذة</label>
                  <input className="form-control" value={vForm.executor} onChange={e => setVForm(f=>({...f,executor:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setVOpen(false)}>إلغاء</button>
              <button className="btn btn-info" onClick={saveVax} disabled={saving}>{saving?'⏳...':'💉 جدولة'}</button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}
    </div>
  )
}
