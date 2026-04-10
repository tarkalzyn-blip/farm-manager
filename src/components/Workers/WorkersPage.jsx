import { useState, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'

export default function WorkersPage() {
  const { workers, addWorker, toggleWorkerAttendance, deleteWorker, loading, showConfirm, currency } = useFarm()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', role:'عامل حلب', phone:'', salary:'' })

  const present     = workers.filter(w => w.present).length
  const absent      = workers.filter(w => !w.present).length
  const totalSalary = workers.reduce((s, w) => s + (parseInt(w.salary)||0), 0)

  // ── Progressive Rendering ──
  const [renderLimit, setRenderLimit] = useState(0)
  useEffect(() => {
    if (!loading.workers) {
      const t1 = setTimeout(() => setRenderLimit(10), 50)
      const t2 = setTimeout(() => setRenderLimit(9999), 350)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [loading.workers])

  const save = async () => {
    if (!form.name.trim()) { alert('يرجى إدخال الاسم'); return }
    showConfirm({
      title: 'إضافة عامل',
      message: `هل أنت متأكد من إضافة العامل "${form.name}"؟`,
      type: 'primary',
      icon: '👷',
      confirmLabel: 'نعم، أضف',
      onConfirm: async () => {
        setSaving(true)
        await addWorker({ ...form, salary: parseInt(form.salary)||0 })
        setForm({ name:'', role:'عامل حلب', phone:'', salary:'' })
        setOpen(false); setSaving(false)
      }
    })
  }

  const roleColors = {
    'عامل حلب':      'badge-blue',
    'مشرف قطيع':     'badge-green',
    'مسؤول تغذية':   'badge-orange',
    'سائق':           'badge-purple',
    'عامل نظافة':     'badge-gray',
    'أخرى':           'badge-gray',
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">👷 إدارة العمال</div>
          <div className="topbar-sub">الموظفون والحضور</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>➕ إضافة عامل</button>
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👷</div>
            <div className="stat-value">{workers.length}</div>
            <div className="stat-label">إجمالي العمال</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value" style={{ color:'var(--green)' }}>{present}</div>
            <div className="stat-label">حاضرون</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value" style={{ color:'var(--red)' }}>{absent}</div>
            <div className="stat-label">غائبون</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-value" style={{ fontSize: totalSalary > 9999 ? 16 : 22 }}>
              {totalSalary.toLocaleString()} {currency}
            </div>
            <div className="stat-label">إجمالي الرواتب</div>
          </div>
        </div>

        {/* Workers Grid */}
        {loading.workers ? (
          <div className="loading-spinner" style={{ padding:40 }}><div className="loading-icon">👷</div></div>
        ) : workers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👷</div>
            <div className="empty-title">لا يوجد عمال بعد</div>
            <div className="empty-sub">ابدأ بإضافة أول عامل في مزرعتك</div>
            <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>➕ إضافة عامل</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
            {workers.slice(0, renderLimit).map(w => (
              <div key={w.firestoreId} className="card" style={{
                border: `2px solid ${w.present ? 'var(--green)' : 'var(--border)'}`,
                transition: 'border-color 0.3s',
              }}>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:44, height:44, borderRadius:'50%',
                        background: w.present ? 'var(--green)' : '#e0e0e0',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22, color:'#fff', flexShrink:0,
                        transition:'background 0.3s'
                      }}>
                        👷
                      </div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{w.name}</div>
                        <span className={`badge ${roleColors[w.role] || 'badge-gray'}`} style={{ fontSize:10 }}>
                          {w.role}
                        </span>
                      </div>
                    </div>
                    <span className={`badge ${w.present ? 'badge-green' : 'badge-red'}`}>
                      {w.present ? '✅ حاضر' : '❌ غائب'}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--subtext)', marginBottom:2 }}>الراتب</div>
                      <div style={{ fontWeight:700, fontSize:13 }}>
                        {(parseInt(w.salary)||0).toLocaleString()} {currency}
                      </div>
                    </div>
                    <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ fontSize:10, color:'var(--subtext)', marginBottom:2 }}>الهاتف</div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{w.phone || '—'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      className={`btn btn-sm ${w.present ? 'btn-warning' : 'btn-success'}`}
                      style={{ flex:1 }}
                      onClick={() => toggleWorkerAttendance(w.firestoreId, w.present)}
                    >
                      {w.present ? '❌ تسجيل غياب' : '✅ تسجيل حضور'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => showConfirm({
                        title: `حذف العامل — ${w.name}`,
                        message: `هل أنت متأكد من حذف حساب العامل "${w.name}"؟`,
                        icon: '🗑',
                        confirmLabel: '🗑 نعم، احذف',
                        onConfirm: () => deleteWorker(w.firestoreId, w.name),
                      })}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      {open && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setOpen(false) }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">👷 إضافة عامل جديد</span>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>الاسم الكامل *</label>
                  <input className="form-control" placeholder="محمد أحمد" value={form.name}
                    onChange={e => setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الوظيفة</label>
                  <select className="form-control" value={form.role}
                    onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                    {['عامل حلب','مشرف قطيع','مسؤول تغذية','سائق','عامل نظافة','أخرى'].map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input className="form-control" placeholder="0501234567" value={form.phone}
                    onChange={e => setForm(f=>({...f,phone:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>الراتب الشهري ({currency})</label>
                  <input className="form-control" type="number" placeholder="1200" value={form.salary}
                    onChange={e => setForm(f=>({...f,salary:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setOpen(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? '⏳ جاري الحفظ...' : '➕ إضافة العامل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
