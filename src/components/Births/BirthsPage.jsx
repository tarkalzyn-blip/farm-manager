import { useState, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'
import ActionMenu from '../Layout/ActionMenu'

export default function BirthsPage() {
  const {
    births, cows, inseminations,
    registerBirth, deleteBirth, daysLeft, addDays,
    loading, formatAge, showConfirm
  } = useFarm()

  const today = new Date().toISOString().split('T')[0]

  // ── Birth wizard state ──
  const [birthOpen, setBirthOpen] = useState(false)
  const [birthCow, setBirthCow]   = useState(null)
  
  // ── Progressive Rendering for smooth animations ──
  const [renderLimit, setRenderLimit] = useState(0)

  useEffect(() => {
    if (!loading.births) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.births])
  const [bStep, setBStep]         = useState(1)
  const [saving, setSaving]       = useState(false)
  const [bForm, setBForm] = useState({
    momId: '', birthDate: today, birthType: 'طبيعية', momStatusAfter: 'سليمة',
    momMilkAfter: '', calfGender: 'أنثى', 
    calfStatus: 'سليم', calfId: '', calfTagColor: 'أصفر',
    calfPlan: 'للقطيع', careNotes: '', count: 1, insemFirestoreId: ''
  })

  // ── Overdue births (confirmed inseminations past due date) ──
  const overdueInsems = inseminations
    .filter(i => i.status === 'confirmed')
    .map(i => ({ ...i, dl: daysLeft(i.insemDate) }))
    .filter(i => i.dl <= 0)
    .sort((a, b) => a.dl - b.dl)

  // ── Open birth wizard ──
  const openBirth = (insem = null) => {
    setBirthCow(insem)
    if (insem) {
      const cow = cows.find(c => c.id === insem.cowId || c.firestoreId === insem.cowFirestoreId)
      setBForm(f => ({
        ...f,
        momId: cow?.firestoreId || insem.cowId,
        momMilkAfter: cow?.milk || '',
        insemFirestoreId: insem.firestoreId,
        momSearchTerm: cow ? `${cow.tagColor === 'أزرق' ? '🟦' : '🟨'} ${cow.id}` : `${insem.cowId}`
      }))
    } else {
      setBForm({
        momId: '', birthDate: today, birthType: 'طبيعية', momStatusAfter: 'سليمة',
        momMilkAfter: '', calfGender: 'أنثى',
        calfStatus: 'سليم', calfId: '', calfTagColor: 'أصفر',
        calfPlan: 'للقطيع', careNotes: '', count: 1, insemFirestoreId: '', momSearchTerm: ''
      })
    }
    setBirthOpen(true)
    setBStep(1)
  }

  const closeBirth = () => {
    setBirthOpen(false)
    setBirthCow(null)
  }

  const saveBirth = async () => {
    showConfirm({
      title: 'تسجيل ولادة',
      message: `تأكيد تسجيل الولادة؟`,
      type: 'primary',
      icon: '🐣',
      confirmLabel: '🐣 تأكيد',
      onConfirm: async () => {
        setSaving(true)
        const mom = cows.find(c => c.firestoreId === bForm.momId)
        await registerBirth({
          ...bForm,
          momFirestoreId: bForm.momId,
          momId: mom?.id || birthCow?.cowId || '—',
          momMilkAfter: parseInt(bForm.momMilkAfter) || 0,
        })
        closeBirth()
        setSaving(false)
      }
    })
  }

  const handleDelete = (b) => {
    showConfirm({
      title: 'حذف سجل الولادة',
      message: `هل أنت متأكد من حذف سجل ولادة العجل رقم "${b.calfId}"؟`,
      detail: 'ملاحظة: هذا سيحذف السجل فقط، ولن يحذف العجل إذا تمت إضافته كبقرة للقطيع.',
      icon: '🗑',
      confirmLabel: '🗑 نعم، احذف السجل',
      onConfirm: async () => {
        await deleteBirth(b.firestoreId, b.calfId)
      }
    })
  }

  // ── Stats ──
  const females = births.filter(b => b.calfGender === 'أنثى')
  const males   = births.filter(b => b.calfGender === 'ذكر')
  const healthy = births.filter(b => b.calfStatus === 'سليم' || b.calfStatus === 'سليمة')
  const care    = births.filter(b => b.calfStatus === 'رعاية خاصة' || b.calfStatus === 'يحتاج رعاية')

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">🐣 الولادات</div>
          <div className="topbar-sub">سجل كامل للعجول والعجلات</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-success" onClick={() => openBirth()}>
            ➕ تسجيل ولادة
          </button>
        </div>
      </div>

      <div className="content">

        {/* ── Overdue Births Alert ── */}
        {overdueInsems.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fde8e8, #fff5f5)',
            border: '2px solid var(--red)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 800, color: 'var(--red)', fontSize: 15, marginBottom: 10 }}>
              ⚠️ ولادات متأخرة — يرجى التسجيل فوراً ({overdueInsems.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdueInsems.map(i => (
                <div key={i.firestoreId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', borderRadius: 8, padding: '10px 14px',
                  border: '1px solid #fca5a5'
                }}>
                  <span style={{ fontSize: 22 }}>🐄</span>
                  <div style={{ flex: 1 }}>
                    <strong>#{i.cowId || cows.find(c => c.firestoreId === i.cowFirestoreId)?.id || '—'}</strong>
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, marginRight: 10 }}>
                      — متأخرة {Math.abs(i.dl)} يوم
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>
                      تاريخ التلقيح: {i.insemDate} | موعد الولادة المقدر: {addDays(i.insemDate, 280)}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => openBirth(i)}
                  >
                    🐣 سجّل الآن
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="stats-grid-5">
          <div className="stat-card">
            <div className="stat-icon">🐣</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{births.length}</div>
            <div className="stat-label">الإجمالي</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐄</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{females.length}</div>
            <div className="stat-label">عجلات</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐂</div>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{males.length}</div>
            <div className="stat-label">عجول</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{healthy.length}</div>
            <div className="stat-label">سليمة</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value" style={{ color: 'var(--orange)' }}>{care.length}</div>
            <div className="stat-label">رعاية خاصة</div>
          </div>
        </div>

        {/* ── Births Table ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 جميع الولادات ({births.length})</span>
          </div>
          <div style={{ padding: 0, overflowX: 'auto' }}>
            {loading.births
              ? <div className="loading-spinner" style={{ padding: 30 }}><div className="loading-icon">🐣</div></div>
              : births.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-icon">🐣</div>
                  <div className="empty-title">لا توجد ولادات مسجلة</div>
                  <button className="btn btn-success btn-sm" onClick={() => openBirth()}>
                    ➕ تسجيل أول ولادة
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>رقم العجل</th>
                      <th>الأم</th>
                      <th>تاريخ الولادة</th>
                      <th>العمر</th>
                      <th>الجنس</th>
                      <th>نوع الولادة</th>
                      <th>الحالة</th>
                      <th>المقرر</th>
                      <th style={{ width: 50 }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {births.slice(0, renderLimit).map((b, i) => {
                      const mom = cows.find(c => c.firestoreId === b.momFirestoreId || c.id === b.momId)
                      const calfColor = b.tagColor || 'أصفر'
                      const calfBg = calfColor === 'أزرق' ? '#1e88e5' : '#eab308'
                      const momColor = mom?.tagColor || 'أصفر'
                      const momBg = momColor === 'أزرق' ? '#1e88e5' : '#eab308'

                      return (
                        <tr key={b.firestoreId} style={{ opacity: b.calfStatus === 'متوفى' ? 0.55 : 1 }}>
                          <td style={{ color: 'var(--subtext)', fontSize: 12 }}>{i + 1}</td>
                          <td>
                            <strong style={{
                              border: `2px solid ${calfBg}`,
                              color: calfBg,
                              padding: '1px 6px',
                              borderRadius: 4,
                              display: 'inline-block',
                              fontSize: 11,
                              fontWeight: 800
                            }}>{calfColor === 'أزرق' ? '🟦' : '🟨'} {b.calfId}</strong>
                          </td>
                          <td>
                            {b.momId && (
                              <strong style={{
                                border: `2px solid ${momBg}`,
                                color: momBg,
                                padding: '1px 6px',
                                borderRadius: 4,
                                display: 'inline-block',
                                fontSize: 11,
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
              )
            }
          </div>
        </div>
      </div>

      {/* ══ Birth Wizard Modal ══ */}
      {birthOpen && (
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
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 ملخص الولادة</div>
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
        </div>
      )}
    </div>
  )
}
