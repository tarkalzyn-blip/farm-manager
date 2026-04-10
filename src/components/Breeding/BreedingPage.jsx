import { useState, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'
import ActionMenu from '../Layout/ActionMenu'

// Helper: cow is under 1 year old
const isHeifer = (cow) => {
  if (!cow?.birthDate) return false
  const days = Math.ceil((new Date() - new Date(cow.birthDate)) / 86400000)
  return days < 365
}
const heiferAge = (cow) => {
  if (!cow?.birthDate) return ''
  const days = Math.ceil((new Date() - new Date(cow.birthDate)) / 86400000)
  const months = Math.floor(days / 30)
  return months > 0 ? `${months} شهر` : `${days} يوم`
}
// Helper: format cow name with color pill
const CowDisplay = ({ cow, fallbackId }) => {
  if (!cow) return <strong>{fallbackId}</strong>
  const bg = cow.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'
  return (
    <strong style={{
      border: `2px solid ${bg}`, color: bg, padding: '2px 8px',
      borderRadius: 6, display: 'inline-block', fontSize: 12,
      fontWeight: 800, letterSpacing: '0.3px'
    }}>{cow.tagColor === 'أزرق' ? '🟦' : '🟨'} {cow.id}</strong>
  )
}

const PregnancyProgress = ({ days }) => {
  if (days <= 0) return <span>—</span>
  const totalMonths = Math.min(9, Math.ceil(days / 30.44))
  const elapsedM = Math.floor(days / 30.44)
  const remD = Math.floor(days % 30.44)
  const progress = Math.min(100, Math.round((days / 280) * 100))
  return (
    <div style={{ width: 95, textAlign: 'center', display: 'inline-block' }}>
      <div style={{ fontSize: 11, marginBottom: 1, color: 'var(--accent)', fontWeight: 700 }}>الشهر {totalMonths}/9</div>
      <div style={{ fontSize: 9, marginBottom: 3, color: 'var(--subtext)', fontWeight: 600 }}>{elapsedM} شهر و {remD} يوم</div>
      <div style={{ height: 6, background: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--orange)' }}></div>
      </div>
    </div>
  )
}

export default function BreedingPage() {
  const {
    cows, inseminations, addInsemination, confirmPregnancy, markInsemFailed,
    updateInsemination, deleteInsemination, registerBirth,
    daysBetween, daysLeft, addDays, loading, showConfirm, showToast
  } = useFarm()

  const today = new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState(() => localStorage.getItem('breedingTab') || 'active')
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('breedingSortBy') || 'days-desc')

  useEffect(() => { localStorage.setItem('breedingTab', tab) }, [tab])
  useEffect(() => { localStorage.setItem('breedingSortBy', sortBy) }, [sortBy])

  // ── Progressive Rendering ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    setRenderLimit(0) // Reset when tab changes for smooth transitions
    if (!loading.breeds) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.breeds, tab])


  // ── Insem form ──
  const [insemOpen, setInsemOpen] = useState(false)
  const [editInsem, setEditInsem] = useState(null) // null = add mode, object = edit mode
  const [iForm, setIForm] = useState({ cowSearchTerm: '', cowId: '', insemDate: today, type: 'صناعي', bullId: '' })
  const [saving, setSaving] = useState(false)

  // ── Birth wizard ──
  const [birthOpen, setBirthOpen] = useState(false)
  const [birthCow, setBirthCow] = useState(null)
  const [bStep, setBStep] = useState(1)
  const [bForm, setBForm] = useState({
    momId: '', birthDate: today, birthType: 'طبيعية', momStatusAfter: 'سليمة',
    calfGender: 'أنثى', calfWeight: 30, calfStatus: 'سليم', calfName: '', calfId: '', calfTagColor: 'أصفر', calfPlan: 'للقطيع',
    careNotes: '', count: 1, insemFirestoreId: '', momSearchTerm: ''
  })

  const activeInsems  = inseminations.filter(i => i.status === 'pending' || i.status === 'confirmed')
  const historyInsems = inseminations.filter(i => i.status === 'failed' || i.status === 'completed')

  const sortInsems = (list) => {
    return [...list].sort((a, b) => {
      const daysA = daysBetween(a.insemDate, today)
      const daysB = daysBetween(b.insemDate, today)
      if (sortBy === 'days-desc') return daysB - daysA // من أكبر لقاح لأصغر
      if (sortBy === 'days-asc') return daysA - daysB  // من أصغر لقاح لأكبر
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return 0
    })
  }

  const sortedActive = sortInsems(activeInsems)
  const sortedHistory = sortInsems(historyInsems)

  // ── Open edit modal ──
  const openEdit = (insem) => {
    setEditInsem(insem)
    setIForm({ cowId: insem.cowFirestoreId || insem.cowId, insemDate: insem.insemDate, type: insem.type || 'صناعي', bullId: insem.bullId || '' })
    setInsemOpen(true)
  }

  const openAdd = () => {
    setEditInsem(null)
    setIForm({ cowSearchTerm: '', cowId: '', insemDate: today, type: 'صناعي', bullId: '' })
    setInsemOpen(true)
  }

  const saveInsem = async () => {
    if (!iForm.cowId)     { alert('يرجى اختيار البقرة'); return }
    if (!iForm.insemDate) { alert('يرجى تحديد التاريخ'); return }

    // Block insemination of heifers (under 1 year)
    if (!editInsem) {
      const selectedCow = cows.find(c => c.firestoreId === iForm.cowId)
      if (isHeifer(selectedCow)) {
        showConfirm({
          title: '⚠️ لا يمكن تلقيح البكيرة',
          message: `البقرة "${selectedCow.name}" عمرها ${heiferAge(selectedCow)} فقط.\nيجب أن يكون عمر البقرة سنة كاملة على الأقل قبل التلقيح.`,
          icon: '🌱',
          type: 'warning',
          confirmLabel: 'حسناً، فهمت',
          cancelLabel: '',
          onConfirm: () => {},
        })
        return
      }
    }

    showConfirm({
      title: editInsem ? 'تعديل التلقيح' : 'تسجيل تلقيح جديد',
      message: `تأكيد ${editInsem ? 'تعديل' : 'تسجيل'} تلقيح لهذه البقرة؟`,
      type: 'primary',
      icon: '🐂',
      confirmLabel: 'تأكيد التسجيل',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editInsem) {
            // Edit mode — only update date/type/bull
            await updateInsemination(editInsem.firestoreId, {
              insemDate: iForm.insemDate,
              type: iForm.type,
              bullId: iForm.bullId || '—',
              expectedBirth: addDays(iForm.insemDate, 280),
              confirmDate: addDays(iForm.insemDate, 23),
              alertDate: addDays(iForm.insemDate, 20),
            })
          } else {
            // Add mode
            const cow = cows.find(c => c.firestoreId === iForm.cowId)
            await addInsemination({
              cowId: cow ? cow.id : '—',
              cowFirestoreId: iForm.cowId,
              insemDate: iForm.insemDate,
              type: iForm.type,
              bullId: iForm.bullId,
            })
          }
          setInsemOpen(false)
        } finally { setSaving(false) }
      }
    })
  }

  const doDelete = async (insem) => {
    showConfirm({
      title: 'حذف التلقيح',
      message: `هل تريد حذف تلقيح البقرة رقم ${insem.cowId} نهائياً؟`,
      icon: '🗑',
      confirmLabel: '🗑 نعم، احذف',
      onConfirm: async () => {
        try {
          await deleteInsemination(insem.firestoreId, insem.cowFirestoreId)
        } catch (err) {
          alert(`خطأ في الحذف: ${err?.message || err}`)
        }
      }
    })
  }

  const doConfirm = async (insem) => {
    showConfirm({
      title: 'تأكيد الحمل',
      message: `هل أنت متأكد من تثبيت حمل البقرة رقم ${insem.cowId}؟`,
      icon: '✅',
      type: 'primary',
      confirmLabel: '✅ تأكيد الحمل',
      onConfirm: async () => {
        const cow = cows.find(c => c.id === insem.cowId || c.firestoreId === insem.cowFirestoreId)
        if (cow) await confirmPregnancy(insem.firestoreId, cow.firestoreId)
      }
    })
  }

  const doFail = async (insem) => {
    showConfirm({
      title: 'فشل التلقيح',
      message: `هل تريد تسجيل فشل تلقيح البقرة رقم ${insem.cowId}؟`,
      icon: '❌',
      type: 'warning',
      confirmLabel: '❌ نعم، فاشل',
      onConfirm: async () => {
        const cow = cows.find(c => c.id === insem.cowId || c.firestoreId === insem.cowFirestoreId)
        if (cow) await markInsemFailed(insem.firestoreId, cow.firestoreId)
      }
    })
  }

  // ── Birth ──
  const openBirth = (insem) => {
    const cow = cows.find(c => c.id === insem.cowId || c.firestoreId === insem.cowFirestoreId)
    setBirthCow(insem)
    setBForm(f => ({
      ...f, momId: cow?.firestoreId || insem.cowId,
      momMilkAfter: cow?.milk || '',
      momWeightAfter: cow?.weight ? Math.round(cow.weight * 0.92) : '',
      insemFirestoreId: insem.firestoreId,
      momSearchTerm: cow ? `${cow.tagColor === 'أزرق' ? '🟦' : '🟨'} ${cow.id}` : ''
    }))
    setBirthOpen(true)
    setBStep(1)
  }

  const saveBirth = async () => {
    // منع تكرار رقم العجل إذا كان مدخلاً يدوياً بنفس اللون
    if (bForm.calfId && bForm.calfId.trim() !== '') {
      const trimmedId = bForm.calfId.trim()
      const isDuplicate = cows.find(c => c.id === trimmedId && c.tagColor === bForm.calfTagColor)
      if (isDuplicate) {
        showToast(`خطأ: الرقم "${trimmedId}" باللون ${bForm.calfTagColor} مسجل مسبقاً! يرجى اختيار رقم أو لون آخر.`, 'error')
        return
      }
    }

    showConfirm({
      title: 'تسجيل ولادة',
      message: `تأكيد تسجيل ولادة جديدة؟`,
      type: 'primary',
      icon: '🐣',
      confirmLabel: 'تأكيد التسجيل',
      onConfirm: async () => {
        setSaving(true)
        try {
          const mom = cows.find(c => c.firestoreId === bForm.momId)
          await registerBirth({
            ...bForm,
            momFirestoreId: bForm.momId,
            momId: mom?.id || bForm.momId,
            // Removed momName completely or keep it backwards compatible internally but not shown
            calfWeight: parseInt(bForm.calfWeight),
            momMilkAfter: parseInt(bForm.momMilkAfter) || 0,
            momWeightAfter: parseInt(bForm.momWeightAfter) || 0,
          })
          setBirthOpen(false)
        } catch (error) {
          console.error("Error saving birth:", error)
          showToast('حدث خطأ أثناء حفظ الولادة، حاول مجدداً', 'error')
        } finally {
          setSaving(false)
        }
      }
    })
  }

  // ── Badge helpers ──
  const statusBadge = (status, insemDate) => {
    if (status === 'failed')    return <span className="badge badge-red">فاشل ❌</span>
    if (status === 'completed') return <span className="badge badge-gray">مكتمل (ولد) 🐣</span>
    if (status === 'confirmed') return <span className="badge badge-green">حمل مؤكد ✅</span>
    const days = daysBetween(insemDate, today)
    if (days >= 20) return <span className="badge badge-orange">مراقبة ({days} يوم) 🔔</span>
    return <span className="badge badge-blue">انتظار ({days} يوم)</span>
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">🐂 التلقيح والحمل</div>
          <div className="topbar-sub">نظام ذكي — مراقبة 23 يوم</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAdd}>➕ تسجيل تلقيح</button>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon">⏳</div><div className="stat-value" style={{ color:'var(--orange)' }}>{inseminations.filter(i=>i.status==='pending').length}</div><div className="stat-label">تحت المراقبة</div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-value" style={{ color:'var(--green)' }}>{inseminations.filter(i=>i.status==='confirmed').length}</div><div className="stat-label">حمل مؤكد</div></div>
          <div className="stat-card"><div className="stat-icon">⏰</div><div className="stat-value" style={{ color:'var(--red)' }}>{inseminations.filter(i=>i.status==='confirmed'&&daysLeft(i.insemDate)<=20).length}</div><div className="stat-label">ولادة قريبة / متأخرة</div></div>
          <div className="stat-card"><div className="stat-icon">❌</div><div className="stat-value" style={{ color:'var(--subtext)' }}>{inseminations.filter(i=>i.status==='failed').length}</div><div className="stat-label">فاشلة</div></div>
        </div>

        {/* Smart Alert */}
        {inseminations.filter(i => i.status==='pending' && daysBetween(i.insemDate, today) >= 20).length > 0 && (
          <div className="warn-box" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:800, color:'#856404', marginBottom:6 }}>🔔 تنبيه — راقب الحرارة</div>
            {inseminations.filter(i => i.status==='pending' && daysBetween(i.insemDate, today) >= 20).map(i => (
              <div key={i.firestoreId} style={{ fontSize:13, marginBottom:4 }}>
                • <strong>#{i.cowId}</strong> — يوم {daysBetween(i.insemDate, today)} — إذا لم ترجع للحرارة → أكد الحمل
              </div>
            ))}
          </div>
        )}

        {/* Tabs and Sort */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', borderBottom:'2px solid var(--border)', marginBottom:16 }}>
          <div style={{ display:'flex', gap:0 }}>
            {[{ k:'active', l:`النشطة (${activeInsems.length})` }, { k:'history', l:`السجل (${historyInsems.length})` }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                style={{ padding:'10px 20px', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit',
                  fontWeight:700, fontSize:13, color: tab===t.k ? 'var(--accent)' : 'var(--subtext)',
                  borderBottom: tab===t.k ? '2px solid var(--accent)' : '2px solid transparent', marginBottom:-2 }}>
                {t.l}
              </button>
            ))}
          </div>
          <select className="form-control" style={{ width:200, padding:'4px 8px', height:32, fontSize:13, marginBottom:4 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="days-desc">📉 من أكبر لقاح لأصغر</option>
            <option value="days-asc">📈 من أصغر لقاح لأكبر</option>
            <option value="status">📋 الترتيب حسب الحالة</option>
          </select>
        </div>

        {/* ── Active tab ── */}
        {tab === 'active' && (
          <div className="card">
            <div className="card-header"><span className="card-title">🐂 التلقيحات النشطة</span></div>
            <div style={{ padding:0 }}>
              {loading.breeds
                ? <div className="loading-spinner" style={{ padding:30 }}><div className="loading-icon">🐂</div></div>
                : activeInsems.length === 0
                  ? <div className="empty-state"><div className="empty-icon">🐂</div><div className="empty-title">لا توجد تلقيحات نشطة</div><button className="btn btn-primary btn-sm" onClick={openAdd}>تسجيل تلقيح</button></div>
                  : (
                    <table>
                      <thead>
                        <tr>
                          <th>البقرة</th><th>تاريخ اللقاح</th><th>النوع</th><th>الثور</th>
                          <th>الحالة</th><th>الأيام</th><th>مرحلة الحمل</th><th>الولادة المتوقعة</th><th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedActive.slice(0, renderLimit).map(i => {
                          const days  = daysBetween(i.insemDate, today)
                          const dl    = daysLeft(i.insemDate)
                          const cow = cows.find(c => c.firestoreId === i.cowFirestoreId || c.id === i.cowId)

                          return (
                            <tr key={i.firestoreId}
                              style={{ background: days>=20&&i.status==='pending'?'#fff9f0' : i.status==='confirmed'?'#f0fff6' : '#fff' }}>
                              <td><CowDisplay cow={cow} fallbackName={i.cowId} /></td>
                              <td style={{ fontSize:12 }}>{i.insemDate}</td>
                              <td><span className="badge badge-purple">{i.type}</span></td>
                              <td style={{ fontSize:12, color:'var(--subtext)' }}>{i.bullId && i.bullId!=='—' ? i.bullId : '—'}</td>
                              <td>{statusBadge(i.status, i.insemDate)}</td>
                              <td><strong style={{ color:days>=23?'var(--green)':days>=20?'var(--orange)':'inherit' }}>{days}</strong> يوم</td>
                              <td>{i.status === 'confirmed' ? <PregnancyProgress days={days} /> : '—'}</td>
                              <td style={{ fontSize:12 }}>{i.status==='confirmed' ? <><strong>{addDays(i.insemDate, 280)}</strong><br/><span style={{ color:dl<=30?'var(--orange)':'var(--subtext)', fontSize:11 }}>{dl < 0 ? `متأخرة: ${Math.abs(dl)} يوم` : `باقي ${dl} يوم`}</span></> : '—'}</td>
                              <td style={{ textAlign:'left' }}>
                                <ActionMenu
                                  options={[
                                    { label: 'تعديل', icon: '✏️', onClick: () => openEdit(i) },
                                    i.status === 'pending' ? { label: 'تأكيد الحمل', icon: '✅', onClick: () => doConfirm(i) } : null,
                                    i.status === 'pending' ? { label: 'فشل التلقيح', icon: '❌', danger: true, onClick: () => doFail(i) } : null,
                                    (i.status === 'confirmed' && dl <= 20) ? { label: dl < 0 ? `متأخرة ${Math.abs(dl)} يوم - ولادة` : 'تسجيل ولادة', icon: '🐣', onClick: () => openBirth(i) } : null,
                                    { label: 'حذف', icon: '🗑️', danger: true, onClick: () => doDelete(i) }
                                  ]}
                                />
                                {/* Show countdown when far from birth */}
                                {i.status === 'confirmed' && dl > 20 && (
                                  <div style={{ fontSize:10, color:'var(--subtext)', marginTop:4 }}>⏳ {dl < 0 ? `متأخرة: ${Math.abs(dl)} يوم` : `باقي ${dl} يوم`}</div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
              }
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div className="card">
            <div className="card-header"><span className="card-title">📋 السجل التاريخي</span></div>
            <div style={{ padding:0 }}>
              {historyInsems.length === 0
                ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">لا يوجد سجل</div></div>
                : (
                  <table>
                    <thead><tr><th>البقرة</th><th>تاريخ اللقاح</th><th>النوع</th><th>الثور</th><th>الحالة</th><th>مرحلة الحمل</th><th>إجراء</th></tr></thead>
                    <tbody>
                      {sortedHistory.slice(0, renderLimit).map(i => {
                        const days  = daysBetween(i.insemDate, today)
                        const cow = cows.find(c => c.firestoreId === i.cowFirestoreId || c.id === i.cowId)

                        return (
                          <tr key={i.firestoreId} style={{ opacity: i.status==='failed' ? 0.6 : 1 }}>
                            <td><CowDisplay cow={cow} fallbackName={i.cowId} /></td>
                            <td style={{ fontSize:12 }}>{i.insemDate}</td>
                            <td>{i.type}</td>
                            <td style={{ fontSize:12, color:'var(--subtext)' }}>{i.bullId && i.bullId!=='—' ? i.bullId : '—'}</td>
                            <td>{statusBadge(i.status, i.insemDate)}</td>
                            <td>{i.status === 'completed' || (days > 0 && i.status !== 'failed') ? <PregnancyProgress days={i.status === 'completed' ? 280 : days} /> : '—'}</td>
                            <td style={{ textAlign:'left' }}>
                              <ActionMenu
                                options={[
                                  { label: 'حذف', icon: '🗑️', danger: true, onClick: () => doDelete(i) }
                                ]}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )}
      </div>

      {/* ══ Add/Edit Insemination Modal ══ */}
      {insemOpen && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setInsemOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editInsem ? '✏️ تعديل بيانات التلقيح' : '🐂 تسجيل تلقيح جديد'}</span>
              <button className="modal-close" onClick={() => setInsemOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!editInsem && (
                <div className="blue-box" style={{ marginBottom:14, fontSize:12 }}>
                  <strong>🔔 نظام ذكي:</strong> إذا كان للبقرة تلقيح سابق pending خلال 23 يوم — سيُسجَّل كفاشل تلقائياً.
                </div>
              )}
              <div className="form-grid">
                <div className="form-group">
                  <label>البقرة *</label>
                  {editInsem ? (
                    <input className="form-control" value={editInsem.cowId} disabled />
                  ) : (
                    <>
                        <input 
                          className="form-control" 
                          list="cows-list-insem" 
                          placeholder="ابحث بالرقم أو الاسم..."
                          value={iForm.cowSearchTerm || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            let fId = '';
                            const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                            if(found) fId = found.firestoreId;
                            setIForm(f=>({...f, cowSearchTerm: val, cowId: fId}));
                          }}
                        />
                        <datalist id="cows-list-insem">
                          {cows.filter(c => c.status !== 'مريضة').map(c => {
                            const heifer = isHeifer(c)
                            return (
                              <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`}>
                                {heifer ? 'بكيرة 🌱' : c.status}
                              </option>
                            )
                          })}
                        </datalist>
                    </>
                  )}
                </div>
                <div className="form-group">
                  <label>تاريخ التلقيح *</label>
                  <input className="form-control" type="date" value={iForm.insemDate}
                    onChange={e => setIForm(f=>({...f,insemDate:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>نوع التلقيح</label>
                  <select className="form-control" value={iForm.type} onChange={e => setIForm(f=>({...f,type:e.target.value}))}>
                    <option>صناعي</option>
                    <option>طبيعي</option>
                    <option>مراقبة صراف</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الثور</label>
                  <input className="form-control" placeholder="Bull-007" value={iForm.bullId}
                    onChange={e => setIForm(f=>({...f,bullId:e.target.value}))} />
                </div>
              </div>
              {editInsem && (
                <div className="warn-box" style={{ marginTop:14, fontSize:12 }}>
                  ⚠️ لا يمكن تغيير البقرة عند التعديل — فقط التاريخ والنوع والثور.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setInsemOpen(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={saveInsem} disabled={saving}>
                {saving ? '⏳...' : editInsem ? '💾 حفظ التعديلات' : '💾 تسجيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Birth Wizard ══ */}
      {birthOpen && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setBirthOpen(false) }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">🐣 تسجيل ولادة</span>
              <button className="modal-close" onClick={() => setBirthOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="step-bar">
                {[{n:1,l:'① بيانات الأم'},{n:2,l:'② بيانات المولود'},{n:3,l:'③ تأكيد'}].map(s => (
                  <div key={s.n} className={`step ${bStep>s.n?'done':bStep===s.n?'active':''}`}>{s.l}</div>
                ))}
              </div>

              {bStep === 1 && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الأم *</label>
                        <input 
                          className="form-control" 
                          list="cows-list-birth" 
                          placeholder="ابحث بالرقم أو الاسم..."
                          value={bForm.momSearchTerm || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            const found = cows.find(c => `${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}` === val);
                            setBForm(f => ({ 
                              ...f, 
                              momSearchTerm: val, 
                              momId: found ? found.firestoreId : '', 
                              momMilkAfter: found ? found.milk : '' 
                            }))
                          }}
                        />
                        <datalist id="cows-list-birth">
                          {cows.filter(c => c.status==='حامل' || c.status==='pending_insem').map(c => (
                            <option key={c.firestoreId} value={`${c.tagColor === 'أزرق' ? '🟦' : '🟨'} ${c.id}`} />
                          ))}
                        </datalist>
                    </div>
                    <div className="form-group">
                      <label>تاريخ الولادة</label>
                      <input className="form-control" type="date" value={bForm.birthDate}
                        onChange={e => setBForm(f=>({...f,birthDate:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label>نوع الولادة</label>
                      <select className="form-control" value={bForm.birthType} onChange={e => setBForm(f=>({...f,birthType:e.target.value}))}>
                        <option>طبيعية</option><option>قيصرية</option><option>صعبة بمساعدة</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>حالة الأم بعد الولادة</label>
                      <select className="form-control" value={bForm.momStatusAfter} onChange={e => setBForm(f=>({...f,momStatusAfter:e.target.value}))}>
                        <option value="سليمة">سليمة — تعود للحلب</option>
                        <option value="جافة">جافة — راحة</option>
                        <option value="مريضة">مريضة — علاج</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الإنتاج المتوقع (لتر/يوم)</label>
                      <input className="form-control" type="number" placeholder="20" value={bForm.momMilkAfter}
                        onChange={e => setBForm(f=>({...f,momMilkAfter:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ textAlign:'left', marginTop:16 }}>
                    <button className="btn btn-primary" onClick={() => { if(!bForm.momId){alert('اختر الأم');return}; setBStep(2) }}>التالي ←</button>
                  </div>
                </div>
              )}

              {bStep === 2 && (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الجنس</label>
                      <select className="form-control" value={bForm.calfGender}
                        onChange={e => setBForm(f=>({...f,calfGender:e.target.value,calfPlan:e.target.value==='أنثى'?'للقطيع':'تسمين'}))}>
                        <option value="أنثى">أنثى 🐄</option><option value="ذكر">ذكر 🐂</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>رقم العجل ولون الكرت</label>
                      <div style={{ display:'flex', gap:8 }}>
                        <input className="form-control" placeholder="تلقائي" value={bForm.calfId || ''}
                          onChange={e => setBForm(f=>({...f,calfId:e.target.value}))} style={{ flex:1 }} />
                        <select className="form-control" style={{ width:80 }} value={bForm.calfTagColor} onChange={e => setBForm(f=>({...f,calfTagColor:e.target.value}))}>
                          <option value="أصفر">أصفر</option>
                          <option value="أزرق">أزرق</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>حالة المولود</label>
                      <select className="form-control" value={bForm.calfStatus} onChange={e => setBForm(f=>({...f,calfStatus:e.target.value}))}>
                        <option value="سليم">سليم ✅</option>
                        <option value="يحتاج رعاية">يحتاج رعاية ⚠️</option>
                        <option value="متوفى">متوفى ❌</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>المقرر</label>
                      <select className="form-control" value={bForm.calfPlan} onChange={e => setBForm(f=>({...f,calfPlan:e.target.value}))}>
                        {bForm.calfGender === 'أنثى'
                          ? [<option key="q" value="للقطيع">للقطيع 🐄</option>, <option key="b" value="بيع">بيع 💰</option>]
                          : [<option key="t" value="تسمين">تسمين 🌾</option>, <option key="b" value="بيع">بيع 💰</option>, <option key="z" value="تزاوج">تزاوج 🐂</option>]
                        }
                      </select>
                    </div>
                    <div className="form-group">
                      <label>عدد المواليد</label>
                      <select className="form-control" value={bForm.count} onChange={e => setBForm(f=>({...f,count:parseInt(e.target.value)}))}>
                        <option value={1}>مولود واحد</option><option value={2}>توأم</option><option value={3}>ثلاثة توائم</option>
                      </select>
                    </div>
                  </div>
                  {bForm.calfStatus === 'يحتاج رعاية' && (
                    <div className="warn-box" style={{ marginTop:12 }}>
                      <label style={{ display:'block', marginBottom:6, fontWeight:700, color:'#856404' }}>⚠️ ملاحظات الرعاية</label>
                      <input className="form-control" placeholder="تغذية بالزجاجة، رعاية بيطرية..."
                        value={bForm.careNotes} onChange={e => setBForm(f=>({...f,careNotes:e.target.value}))} />
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
                    <button className="btn btn-outline" onClick={() => setBStep(1)}>← السابق</button>
                    <button className="btn btn-primary" onClick={() => setBStep(3)}>التالي ←</button>
                  </div>
                </div>
              )}

              {bStep === 3 && (
                <div>
                  <div className="ok-box" style={{ marginBottom:14 }}>
                    <div style={{ fontWeight:800, marginBottom:8 }}>📋 ملخص الولادة</div>
                    <div className="detail-grid">
                      {[
                        ['الأم', cows.find(c=>c.firestoreId===bForm.momId)?.name || '—'],
                        ['التاريخ', bForm.birthDate],
                        ['نوع الولادة', bForm.birthType],
                        ['حالة الأم', bForm.momStatusAfter],
                        ['الجنس', bForm.calfGender],
                        ['رقم العجل', bForm.calfId ? `${bForm.calfId} (${bForm.calfTagColor})` : `(تلقائي - ${bForm.calfTagColor})`],
                        ['المقرر', bForm.calfPlan],
                      ].map(([l,v]) => (
                        <div key={l} className="detail-box">
                          <div className="detail-label">{l}</div>
                          <div className="detail-value" style={{ fontSize:13 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
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
