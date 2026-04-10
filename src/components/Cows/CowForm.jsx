import { useState } from 'react'
import { useFarm } from '../../context/FarmContext'

export default function CowForm({ cow, onClose }) {
  const { addCow, updateCow, showConfirm, cows, showToast } = useFarm()
  const isEdit = !!cow

  const [form, setForm] = useState({
    id:           cow?.id          || '',
    breed:        cow?.breed       || 'هولشتاين',
    age:          cow?.age         || '',
    status:       cow?.status      || 'سليمة',
    milk:         cow?.milk        || '',
    source:       cow?.source      || 'من المزرعة',
    purchasePrice: cow?.purchasePrice || '',
    purchaseDate: cow?.purchaseDate || new Date().toISOString().split('T')[0],
    birthDate:    cow?.birthDate   || '',
    births:       cow?.births      || 0,
    notes:        cow?.notes       || '',
    tagColor:     cow?.tagColor    || 'أصفر',
    momId:        cow?.momId       || '',
    momTagColor:  cow?.momTagColor || 'أصفر',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    const trimmedId = form.id.trim()
    if (!trimmedId) { alert('يرجى إدخال رقم البقرة'); return }
    
    // منع تكرار رقم البقرة مع نفس لون الكرت
    const isDuplicate = cows.find(c => c.id === trimmedId && c.tagColor === form.tagColor && c.firestoreId !== cow?.firestoreId)
    if (isDuplicate) {
      showToast(`خطأ: رقم البقرة "${trimmedId}" باللون ${form.tagColor} مسجل مسبقاً!`, 'error')
      return;
    }

    showConfirm({
      title: isEdit ? 'تأكيد التعديلات' : 'تأكيد الإضافة',
      message: isEdit ? `هل أنت متأكد من حفظ التعديلات للبقرة رقم "${form.id}" ؟` : `هل أنت متأكد من إضافة البقرة الجديدة رقم "${form.id}" ؟`,
      type: 'primary',
      icon: isEdit ? '💾' : '➕',
      confirmLabel: isEdit ? 'نعم، احفظ التعديلات' : 'نعم، أضف البقرة',
      onConfirm: async () => {
        setSaving(true)
        try {
          const data = {
            ...form,
            age:    parseFloat(form.age)    || 0,
            births: parseInt(form.births) || 0,
            birthDate: form.source === 'من المزرعة' ? (form.birthDate || null) : null,
            milk:   parseInt(form.milk)   || 0,
            purchasePrice: form.source === 'شراء' ? (parseInt(form.purchasePrice) || 0) : 0,
            purchaseDate: form.source === 'شراء' ? (form.purchaseDate || null) : null,
            id: form.id || `#${String(Date.now()).slice(-4)}`,
            tagColor: form.tagColor,
            momId: form.source === 'من المزرعة' ? form.momId : null,
            momTagColor: form.source === 'من المزرعة' ? form.momTagColor : null,
          }
          if (isEdit) await updateCow(cow.firestoreId, data)
          else        await addCow(data)
          onClose()
        } finally { setSaving(false) }
      }
    })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ تعديل بيانات البقرة' : '🐄 إضافة بقرة جديدة'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>رقم البقرة ولون الكرت</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="form-control" placeholder="#048" value={form.id} onChange={e => set('id', e.target.value)} style={{ flex:1 }} />
                <select className="form-control" style={{ width:80 }} value={form.tagColor} onChange={e => set('tagColor', e.target.value)}>
                  <option value="أصفر">أصفر</option>
                  <option value="أزرق">أزرق</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>المصدر</label>
              <select className="form-control" value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="من المزرعة">من المزرعة (ولادة)</option>
                <option value="شراء">شراء</option>
              </select>
            </div>
            {form.source === 'شراء' && (
              <div className="form-group">
                <label>سعر الشراء (ل.س)</label>
                <input className="form-control" type="number" placeholder="مثال: 5000000" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label>السلالة</label>
              <select className="form-control" value={form.breed} onChange={e => set('breed', e.target.value)}>
                {['هولشتاين','فريزيان','سيمنتال','براهمان','عربي'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            
            {form.source === 'من المزرعة' ? (
              <>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>رقم الأم (إذا كانت مولودة بالمزرعة)</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="form-control" placeholder="مثال: 48" value={form.momId} onChange={e => set('momId', e.target.value)} style={{ flex:1 }} />
                    <select className="form-control" style={{ width:80 }} value={form.momTagColor} onChange={e => set('momTagColor', e.target.value)}>
                      <option value="أصفر">أصفر</option>
                      <option value="أزرق">أزرق</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>تاريخ الميلاد</label>
                  <input className="form-control" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>العمر (بالسنوات)</label>
                <input className="form-control" type="number" placeholder="مثال: 3" min="0" step="0.5" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
            )}

            <div className="form-group">
              <label>الحالة</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                {['سليمة','مريضة','حامل','جافة'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>الإنتاج (لتر/يوم)</label>
              <input className="form-control" type="number" placeholder="20" value={form.milk} onChange={e => set('milk', e.target.value)} />
            </div>
            {form.source === 'شراء' && (
              <div className="form-group">
                <label>تاريخ الشراء</label>
                <input className="form-control" type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginTop:14 }}>
            <label>ملاحظات</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ جاري الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '➕ إضافة'}
          </button>
        </div>
      </div>
    </div>
  )
}
