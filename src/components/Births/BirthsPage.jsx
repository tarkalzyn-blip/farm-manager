import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useFarm } from '../../context/FarmContext'
import ActionMenu from '../Layout/ActionMenu'

const formatAge = (date) => {
  if (!date) return '—'
  const diff = new Date() - new Date(date)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days} يوم`
  if (days < 365) return `${Math.floor(days / 30)} شهر`
  return `${(days / 365).toFixed(1)} سنة`
}

export default function BirthsPage({ search }) {
  const { cows, births, saveBirthRecord, deleteBirthRecord, inseminations } = useFarm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Birth Wizard State
  const [birthOpen, setBirthOpen] = useState(false)
  const [birthCow, setBirthCow] = useState(null)
  const [bStep, setBStep] = useState(1)
  const [bForm, setBForm] = useState({
    birthDate: new Date().toISOString().split('T')[0],
    birthType: 'طبيعية',
    momStatusAfter: 'سليمة',
    momMilkAfter: '',
    calfGender: 'أنثى',
    calfId: '',
    calfTagColor: 'أصفر',
    calfStatus: 'سليم',
    calfPlan: 'للقطيع',
    count: 1,
    careNotes: '',
    momSearchTerm: '',
    momId: '',
    insemFirestoreId: '',
  })

  useEffect(() => {
    if (births) setLoading(false)
  }, [births])

  const filteredBirths = useMemo(() => {
    if (!search) return births
    const s = search.toLowerCase()
    return births.filter(b => 
      b.momId?.toLowerCase().includes(s) || 
      b.calfId?.toLowerCase().includes(s) ||
      b.plan?.toLowerCase().includes(s)
    )
  }, [births, search])

  const openBirth = (cow = null) => {
    setBirthCow(cow)
    setBStep(1)
    setBForm({
      birthDate: new Date().toISOString().split('T')[0],
      birthType: 'طبيعية',
      momStatusAfter: 'سليمة',
      momMilkAfter: cow ? cow.milk : '',
      calfGender: 'أنثى',
      calfId: '',
      calfTagColor: 'أصفر',
      calfStatus: 'سليم',
      calfPlan: 'للقطيع',
      count: 1,
      careNotes: '',
      momSearchTerm: cow ? `${cow.tagColor === 'أزرق' ? '🟦' : '🟨'} ${cow.id}` : '',
      momId: cow ? cow.firestoreId : '',
      insemFirestoreId: '',
    })
    setBirthOpen(true)
  }

  const closeBirth = () => {
    setBirthOpen(false)
    setBirthCow(null)
    setBStep(1)
  }

  const saveBirth = async () => {
    setSaving(true)
    try {
      const payload = {
        ...bForm,
        momId: birthCow ? birthCow.id : cows.find(c => c.firestoreId === bForm.momId)?.id,
        momFirestoreId: birthCow ? birthCow.firestoreId : bForm.momId,
      }
      await saveBirthRecord(payload)
      closeBirth()
    } catch (e) {
      console.error(e)
      alert('خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (b) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟ لن يتم حذف البقرة المولودة تلقائياً.')) {
      await deleteBirthRecord(b.firestoreId)
    }
  }

  const daysLeft = (d) => {
    if (!d) return 0
    const diff = new Date(d) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 283
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title">
          <h1>🐣 سجلات الولادة</h1>
          <p>إدارة المواليد الجدد ومتابعة صحة الأمهات</p>
        </div>
        <button className="btn btn-primary" onClick={() => openBirth()}>
          <span>➕ تسجيل ولادة جيدة</span>
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>⏳ جاري التحميل...</div>
          ) : filteredBirths.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>
              📭 لا توجد سجلات ولادة حالياً
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>الأم</th>
                    <th>التاريخ</th>
                    <th>العمر الحالي</th>
                    <th>الجنس</th>
                    <th>نوع الولادة</th>
                    <th>حالة المولود</th>
                    <th>المقرر</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBirths.map(b => {
                    const mom = cows.find(c => c.firestoreId === b.momFirestoreId)
                    const momColor = mom?.tagColor || 'أصفر'
                    return (
                    <tr key={b.firestoreId}>
                      <td style={{ fontWeight: 700 }}>
                        {b.momFirestoreId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16 }}>{momColor === 'أزرق' ? '🟦' : '🟨'}</span>
                            <span>{b.momId}</span>
                          </div>
                        ) : (
                          <strong style={{
                            background: momColor === 'أزرق' ? 'var(--blue-light)' : 'var(--accent-light)',
                            padding: '2px 6px', borderRadius: 4,
                            fontWeight: 800
                          }}>{momColor === 'أزرق' ? '🟦' : '🟨'} {b.momId}</strong>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{b.birthDate}</td>
                      <td style={{ fontSize: 12, color: 'var(--subtext)' }}>{formatAge(b.birthDate)}</td>
                      <td>
                        <span className={`badge ${b.calfGender === 'أنثى' ? 'badge-green' : 'badge-blue'}`}>
                          {b.calfGender} {b.calfGender === 'أنثى' ? '🐄' : '🐂'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${b.birthType === 'طبيعية' ? 'badge-gray' : b.birthType === 'قيصرية' ? 'badge-orange' : 'badge-red'}`}>
                          {b.birthType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${b.calfStatus === 'سليم' || b.calfStatus === 'سليمة' ? 'badge-green' : b.calfStatus === 'رعاية خاصة' || b.calfStatus === 'يحتاج رعاية' ? 'badge-orange' : 'badge-red'}`}>
                          {b.calfStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${b.plan === 'للقطيع' || b.plan === 'أضيفت للقطيع' ? 'badge-blue' : b.plan === 'بيع' || b.plan === 'مباع' ? 'badge-red' : 'badge-orange'}`}>
                          {b.plan}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <ActionMenu
                          options={[
                            { label: 'حذف السجل', icon: '🗑', danger: true, onClick: () => handleDelete(b) }
                          ]}
                        />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ Birth Wizard Modal ══ */}
      {birthOpen && createPortal(
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) closeBirth() }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">🐣 تسجيل ولادة</span>
              <button className="modal-close" onClick={closeBirth}>✕</button>
            </div>
            <div className="modal-body">

              {/* Overdue alert inside modal */}
              {birthCow && daysLeft(birthCow.insemDate) < 0 && (
                <div style={{
                  background: '#fde8e8', border: '1px solid var(--red)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: 'var(--red)', fontWeight: 700
                }}>
                  ⚠️ ولادة متأخرة {Math.abs(daysLeft(birthCow.insemDate))} يوم — البقرة رقم: #{birthCow.cowId || cows.find(c => c.firestoreId === birthCow.cowFirestoreId)?.id || '—'}
                </div>
              )}

              {/* Step indicator */}
              <div className="step-bar">
                {[{ n: 1, l: '① بيانات الأم' }, { n: 2, l: '② بيانات المولود' }, { n: 3, l: '③ تأكيد' }].map(s => (
                  <div key={s.n} className={`step ${bStep > s.n ? 'done' : bStep === s.n ? 'active' : ''}`}>{s.l}</div>
                ))}
              </div>

              {/* ── Step 1: Mother info ── */}
              {bStep === 1 && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الأم *</label>
                      {birthCow ? (
                        <input className="form-control" value={`${birthCow.cowId}`} disabled />
                      ) : (
                        <>
                          <input 
                            className="form-control" 
                            list="cows-list-birth" 
                            placeholder="اكتب رقم الأم..."
                            value={bForm.momSearchTerm || ''} 
                            onChange={e => {
                              const val = e.target.value;
                              const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                              
                              let matchInsem = null;
                              if (found) {
                                matchInsem = inseminations.find(i =>
                                  (i.status === 'confirmed' || i.status === 'pending') &&
                                  (i.cowFirestoreId ? i.cowFirestoreId === found.firestoreId : i.cowId === found.id)
                                )
                              }
                              
                              setBForm(f => ({
                                ...f,
                                momSearchTerm: val,
                                momId: found ? found.firestoreId : '',
                                momMilkAfter: found ? found.milk : '',
                                insemFirestoreId: matchInsem?.firestoreId || '',
                              }))
                            }}
                          />
                          <datalist id="cows-list-birth">
                            {cows.filter(c => c.status === 'حامل' || c.status === 'pending_insem').map(c => (
                              <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`} />
                            ))}
                          </datalist>
                        </>
                      )}
                    </div>
                    <div className="form-group">
                      <label>تاريخ الولادة</label>
                      <input className="form-control" type="date" value={bForm.birthDate}
                        onChange={e => setBForm(f => ({ ...f, birthDate: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>نوع الولادة</label>
                      <select className="form-control" value={bForm.birthType}
                        onChange={e => setBForm(f => ({ ...f, birthType: e.target.value }))}>
                        <option>طبيعية</option>
                        <option>قيصرية</option>
                        <option>صعبة بمساعدة</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>حالة الأم بعد الولادة</label>
                      <select className="form-control" value={bForm.momStatusAfter}
                        onChange={e => setBForm(f => ({ ...f, momStatusAfter: e.target.value }))}>
                        <option value="سليمة">سليمة — تعود للحلب</option>
                        <option value="جافة">جافة — راحة</option>
                        <option value="مريضة">مريضة — علاج</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الإنتاج المتوقع (لتر/يوم)</label>
                      <input className="form-control" type="number" placeholder="20"
                        value={bForm.momMilkAfter}
                        onChange={e => setBForm(f => ({ ...f, momMilkAfter: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', marginTop: 16 }}>
                    <button className="btn btn-primary"
                      onClick={() => { if (!bForm.momId && !birthCow) { alert('اختر الأم'); return }; setBStep(2) }}>
                      التالي ←
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Calf info ── */}
              {bStep === 2 && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الجنس</label>
                      <select className="form-control" value={bForm.calfGender}
                        onChange={e => setBForm(f => ({ ...f, calfGender: e.target.value, calfPlan: e.target.value === 'أنثى' ? 'للقطيع' : 'تسمين' }))}>
                        <option value="أنثى">أنثى 🐄</option>
                        <option value="ذكر">ذكر 🐂</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>رقم العجل ولون الكرت</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="form-control" placeholder="تلقائي" value={bForm.calfId || ''}
                          onChange={e => setBForm(f => ({ ...f, calfId: e.target.value }))} style={{ flex: 1 }} />
                        <select className="form-control" style={{ width: 80 }} value={bForm.calfTagColor}
                          onChange={e => setBForm(f => ({ ...f, calfTagColor: e.target.value }))}>
                          <option value="أصفر">أصفر</option>
                          <option value="أزرق">أزرق</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>حالة المولود</label>
                      <select className="form-control" value={bForm.calfStatus}
                        onChange={e => setBForm(f => ({ ...f, calfStatus: e.target.value }))}>
                        <option value="سليم">سليم ✅</option>
                        <option value="يحتاج رعاية">يحتاج رعاية ⚠️</option>
                        <option value="متوفى">متوفى ❌</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>المقرر</label>
                      <select className="form-control" value={bForm.calfPlan}
                        onChange={e => setBForm(f => ({ ...f, calfPlan: e.target.value }))}>
                        {bForm.calfGender === 'أنثى'
                          ? [<option key="q" value="للقطيع">للقطيع 🐄</option>, <option key="b" value="بيع">بيع 💰</option>]
                          : [<option key="t" value="تسمين">تسمين 🌾</option>, <option key="b" value="بيع">بيع 💰</option>, <option key="z" value="تزاوج">تزاوج 🐂</option>]
                        }
                      </select>
                    </div>
                    <div className="form-group">
                      <label>عدد المواليد</label>
                      <select className="form-control" value={bForm.count}
                        onChange={e => setBForm(f => ({ ...f, count: parseInt(e.target.value) }))}>
                        <option value={1}>مولود واحد</option>
                        <option value={2}>توأم</option>
                        <option value={3}>ثلاثة توائم</option>
                      </select>
                    </div>
                  </div>
                  {bForm.calfStatus === 'يحتاج رعاية' && (
                    <div className="warn-box" style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#856404' }}>⚠️ ملاحظات الرعاية</label>
                      <input className="form-control" placeholder="تغذية بالزجاجة، رعاية بيطرية..."
                        value={bForm.careNotes} onChange={e => setBForm(f => ({ ...f, careNotes: e.target.value }))} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <button className="btn btn-outline" onClick={() => setBStep(1)}>← السابق</button>
                    <button className="btn btn-primary"
                      onClick={() => setBStep(3)}>
                      التالي ←
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Confirm ── */}
              {bStep === 3 && (
                <div>
                  <div className="ok-box" style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 ملخص ولادة</div>
                    <div className="detail-grid">
                      {[
                        ['الأم', `بقرة رقم ${birthCow?.cowId || cows.find(c => c.firestoreId === bForm.momId)?.id || 'غير معروف'}`],
                        ['التاريخ', bForm.birthDate],
                        ['نوع الولادة', bForm.birthType],
                        ['حالة الأم', bForm.momStatusAfter],
                        ['الجنس', bForm.calfGender],
                        ['رقم العجل', bForm.calfId ? `${bForm.calfId} (${bForm.calfTagColor})` : `(تلقائي - ${bForm.calfTagColor})`],
                        ['المقرر', bForm.calfPlan],
                      ].map(([l, v]) => (
                        <div key={l} className="detail-box">
                          <div className="detail-label">{l}</div>
                          <div className="detail-value" style={{ fontSize: 13 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button className="btn btn-outline" onClick={() => setBStep(2)}>← السابق</button>
                    <button className="btn btn-success btn-lg" onClick={saveBirth} disabled={saving}>
                      {saving ? '⏳ جاري الحفظ...' : '🐣 تأكيد الولادة'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>,
        document.getElementById('modal-root')
      )}
    </div>
  )
}
