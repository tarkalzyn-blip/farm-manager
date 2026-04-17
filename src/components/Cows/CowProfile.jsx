import { useState } from 'react'
import { useFarm } from '../../context/FarmContext'

const STATUS_BADGE = { سليمة:'badge-green', مريضة:'badge-red', حامل:'badge-orange', جافة:'badge-blue', pending_insem:'badge-gold' }
const STATUS_LABEL = { pending_insem:'تحت المراقبة' }

const CowDisplay = ({ cow, fallbackId, hasHeatWatch }) => {
  if (!cow) return <span>{fallbackId || 'غير معروف'}</span>
  const color = cow.tagColor === 'أزرق' ? '#1e88e5' : '#eab308'
  const emoji = cow.tagColor === 'أزرق' ? '🟦' : '🟨'
  return (
    <strong title={hasHeatWatch ? 'بحاجة لمراقبة صراف' : ''} style={{
      border: hasHeatWatch ? '3px solid #ff0000' : `2px solid ${color}`,
      color: hasHeatWatch ? '#ff0000' : color,
      padding: '1px 6px',
      borderRadius: 4,
      fontWeight: 800,
      display: 'inline-block'
    }}>
      {emoji} {cow.id}
    </strong>
  )
}

export default function CowProfile({ cow, onBack, onEdit, onViewCow }) {
  const { cows, milkRecords, inseminations, births, healthRecords, daysBetween, daysLeft, addDays, formatAge } = useFarm()
  const [timelineSortOrder, setTimelineSortOrder] = useState('desc')

  // ── بيانات هذه البقرة ──
  const cowMilk   = milkRecords.filter(m => m.cowFirestoreId ? m.cowFirestoreId === cow.firestoreId : m.cowId === cow.id)
  const cowInsem  = inseminations.filter(i => i.cowFirestoreId ? i.cowFirestoreId === cow.firestoreId : i.cowId === cow.id)
  const cowBirths = births.filter(b => b.momFirestoreId ? b.momFirestoreId === cow.firestoreId : b.momId === cow.id)
  const cowHealth = healthRecords.filter(h => h.cowFirestoreId ? h.cowFirestoreId === cow.firestoreId : h.cowId === cow.id)

  const activeInsem = cowInsem.find(i => (i.status === 'pending' || i.status === 'confirmed'))
  const today = new Date().toISOString().split('T')[0]

  // ── إحصاءات ──
  const totalInsem    = cowInsem.length
  const successInsem  = cowInsem.filter(i => i.status === 'confirmed' || i.status === 'completed').length
  const failedInsem   = cowInsem.filter(i => i.status === 'failed').length
  const totalMilkLtrs = cowMilk.reduce((s, m) => s + (m.amount || 0), 0)
  const femaleBirths  = cowBirths.filter(b => b.calfGender === 'أنثى').length
  const maleBirths    = cowBirths.filter(b => b.calfGender === 'ذكر').length
  const hasHeatWatch = inseminations.some(i => i.status === 'pending' && i.type === 'مراقبة صراف' && (i.cowFirestoreId ? i.cowFirestoreId === cow.firestoreId : i.cowId === cow.id))

  const getDynamicStatus = (c) => {
    const activeInsem = inseminations.find(i => (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id) && (i.status === 'pending' || i.status === 'confirmed'))
    
    if (activeInsem) {
      const insemDays = daysBetween(activeInsem.insemDate, today)
      const remDays = daysLeft(activeInsem.insemDate)
      const daysText = remDays < 0 ? `متأخرة: ${Math.abs(remDays)} يوم` : `باقي ${remDays} يوم`
      let baseLabel = activeInsem.status === 'confirmed' ? `حامل منذ ${insemDays} يوم — ${daysText}` : `ملقحة منذ ${insemDays} يوم`
      let baseClass = activeInsem.status === 'confirmed' ? 'badge-green' : 'badge-orange'
      
      if (c.status === 'مريضة') {
        baseLabel += ' (مريضة)'
        baseClass = 'badge-red'
      } else if (c.status === 'جافة' || (activeInsem.status === 'confirmed' && insemDays >= 200)) {
        baseLabel += ' (جافة)'
      }
      return { label: baseLabel, class: baseClass }
    }

    if (c.status === 'مريضة') return { label: 'مريضة', class: 'badge-red' }
    if (c.status === 'جافة') return { label: 'جافة', class: 'badge-blue' }

    if (c.lastBirthDate) {
      const birthDays = daysBetween(c.lastBirthDate, today)
      return { label: `ولدت منذ ${birthDays} يوم`, class: 'badge-gray' }
    }

    if (c.source === 'من المزرعة' && (c.births || 0) === 0) return { label: 'بكيرة', class: 'badge-purple' }

    const ageDays = c.birthDate ? daysBetween(c.birthDate, today) : 999
    if (ageDays < 365) return { label: 'بكيرة', class: 'badge-purple' }

    const label = STATUS_LABEL[c.status] || c.status
    const cls = STATUS_BADGE[c.status] || 'badge-green'
    return { label, class: cls }
  }

  // ── الجدول الزمني الموحد ──
  const timeline = [
    ...cowInsem.map(i => ({
      date: i.insemDate,
      realDate: new Date(i.insemDate).getTime(),
      type: 'insem',
      status: i.status,
      icon: i.status === 'failed' ? '❌' : i.status === 'completed' ? '🐣' : i.status === 'confirmed' ? '✅' : '🐂',
      title: `تلقيح ${i.type === 'صناعي' ? 'صناعي' : 'طبيعي'}`,
      detail: i.status === 'failed'
        ? 'فشل التلقيح'
        : i.status === 'completed'
        ? 'مكتمل — تمت الولادة'
        : i.status === 'confirmed'
        ? `حمل مؤكد — الولادة المتوقعة: ${addDays(i.insemDate, 280)}`
        : `تحت المراقبة — يوم ${daysBetween(i.insemDate, today)} من 23`,
      badgeClass: i.status === 'failed' ? 'badge-red' : i.status === 'completed' ? 'badge-gray' : i.status === 'confirmed' ? 'badge-green' : 'badge-orange',
      badgeLabel: i.status === 'failed' ? 'فاشل' : i.status === 'completed' ? 'مكتمل' : i.status === 'confirmed' ? 'حمل مؤكد' : 'انتظار',
      bullId: i.bullId && i.bullId !== '—' ? i.bullId : null,
    })),
    ...cowHealth.map(h => ({
      date: h.date || h.createdAt,
      realDate: new Date(h.date || h.createdAt).getTime(),
      type: 'health',
      status: h.status,
      icon: h.status === 'recovered' ? '💊' : '🏥',
      title: h.disease,
      detail: h.treatment ? `العلاج: ${h.treatment}${h.dose ? ` — الجرعة: ${h.dose}` : ''}` : 'بدون علاج محدد',
      badgeClass: h.status === 'recovered' ? 'badge-green' : 'badge-red',
      badgeLabel: h.status === 'recovered' ? 'تعافت' : 'تحت العلاج',
      vet: h.vet || null,
    })),
    ...cowBirths.map(b => ({
      date: b.birthDate,
      realDate: new Date(b.birthDate).getTime(),
      type: 'birth',
      status: 'birth',
      icon: '🐣',
      title: `ولادة — ${b.calfGender === 'أنثى' ? 'أنثى 🐄' : 'ذكر 🐂'}`,
      detail: `رقم العجل: ${b.calfId} — ${b.calfStatus}`,
      badgeClass: 'badge-green',
      badgeLabel: b.birthType || 'طبيعية',
      calfId: b.calfId,
      calfGender: b.calfGender,
    })),
  ].filter(e => e.date).sort((a, b) => {
    return timelineSortOrder === 'desc' ? b.realDate - a.realDate : a.realDate - b.realDate
  })

  // ── معلومات الأبناء الذين دخلوا القطيع ──
  const getCalfCow = (calfId) => cows.find(c => c.id === calfId)

  // ── تنسيق الملاحظات لتحويل أرقام الأبقار إلى بطاقات ملونة ──
  const renderNotes = (notesText) => {
    if (!notesText) return null;
    const parts = notesText.split(/(رقم\s[^\s—]+)/);
    return parts.map((part, i) => {
      const match = part.match(/رقم\s([^\s—]+)/);
      if (match) {
        const pId = match[1];
        const pCow = cows.find(c => c.id === pId);
        const color = pCow ? pCow.tagColor : (cow.momId === pId ? cow.momTagColor : 'أزرق'); 
        const borderColor = color === 'أزرق' ? '#1e88e5' : '#eab308';
        return (
          <span key={i}>
            رقم <strong style={{
              border: `2px solid ${borderColor}`,
              color: borderColor,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 800,
              display: 'inline-block'
            }}>{color === 'أزرق' ? '🟦' : '🟨'} {pId}</strong>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>← رجوع</button>
          <div>
            <div className="topbar-title">🐄 {cow.name ? cow.name : 'ملف البقرة'}</div>
            <div className="topbar-sub">
              <CowDisplay cow={cow} fallbackId={cow.id} hasHeatWatch={hasHeatWatch} /> {cow.name && `| رقم ${cow.id}`} | {cow.breed}
            </div>
          </div>
        </div>
        <div className="topbar-actions">
          {!cow.isSold && onEdit && <button className="btn btn-warning" onClick={() => onEdit(cow)}>✏️ تعديل</button>}
        </div>
      </div>

      {/* بانر البقرة المباعة */}
      {cow.isSold && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          borderBottom: '3px solid #e74c3c',
        }}>
          <div style={{ fontSize: 32 }}>🏷️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#e74c3c', marginBottom: 2 }}>
              تم بيع هذه البقرة — سجل تاريخي
            </div>
            <div style={{ fontSize: 13, color: '#aaa', display:'flex', gap:16, flexWrap:'wrap' }}>
              {cow.sellDate && <span>📅 تاريخ البيع: <strong style={{ color:'#fff' }}>{cow.sellDate}</strong></span>}
              {cow.sellPrice && <span>💰 سعر البيع: <strong style={{ color:'#2ecc71' }}>{cow.sellPrice?.toLocaleString()} {' ل.س'}</strong></span>}
              {cow.sellParty && <span>👤 المشتري: <strong style={{ color:'#fff' }}>{cow.sellParty}</strong></span>}
            </div>
          </div>
          <span style={{
            background: '#e74c3c',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 20,
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: 1,
          }}>مباعة ✓</span>
        </div>
      )}



      <div className="content">
        {/* ── Row 1: بيانات أساسية + حالة الحمل ── */}
        <div className="two-col">
          <div className="card">
            <div className="card-header"><span className="card-title">📋 البيانات الأساسية</span></div>
            <div className="card-body">
              <div className="detail-grid">
                <div className="detail-box"><div className="detail-label">الرقم</div><div className="detail-value"><CowDisplay cow={cow} fallbackId={cow.id} hasHeatWatch={hasHeatWatch} /></div></div>
                <div className="detail-box"><div className="detail-label">السلالة</div><div className="detail-value">{cow.breed}</div></div>
                <div className="detail-box"><div className="detail-label">العمر</div><div className="detail-value">{formatAge(cow.birthDate, cow.age)}</div></div>
                {cow.source === 'من المزرعة' && cow.momId && (
                  <div className="detail-box">
                    <div className="detail-label">الأصل</div>
                    <div className="detail-value">
                      بنت الرقم <strong style={{
                        border: `2px solid ${cow.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308'}`,
                        padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4,
                        color: cow.momTagColor === 'أزرق' ? '#1e88e5' : '#eab308'
                      }}>{cow.momTagColor === 'أزرق' ? '🟦' : '🟨'} {cow.momId}</strong>
                    </div>
                  </div>
                )}
                {cow.source === 'شراء' && <div className="detail-box"><div className="detail-label">المصدر</div><div className="detail-value">{cow.source}</div></div>}
                {cow.source === 'شراء' && cow.purchasePrice && <div className="detail-box"><div className="detail-label">سعر الشراء</div><div className="detail-value">{cow.purchasePrice.toLocaleString()} ل.س</div></div>}
                <div className="detail-box">
                  <div className="detail-label">الحالة</div>
                  <div className="detail-value">
                    <span className={`badge ${getDynamicStatus(cow).class}`} style={{ whiteSpace:'nowrap', fontSize:12 }}>
                      {getDynamicStatus(cow).label}
                    </span>
                  </div>
                </div>
                <div className="detail-box"><div className="detail-label">إنتاج اليوم</div><div className="detail-value">{cow.milk > 0 ? `${cow.milk} لتر` : '—'}</div></div>
                <div className="detail-box"><div className="detail-label">عدد الولادات</div><div className="detail-value">{cow.births || 0}</div></div>
                {cow.source !== 'من المزرعة' && cow.purchaseDate && <div className="detail-box"><div className="detail-label">تاريخ الدخول</div><div className="detail-value">{cow.purchaseDate}</div></div>}
                {cow.lastBirthDate && <div className="detail-box"><div className="detail-label">آخر ولادة</div><div className="detail-value">{cow.lastBirthDate}</div></div>}
                {cow.notes && (
                  <div className="detail-box" style={{ gridColumn:'span 2' }}>
                    <div className="detail-label">ملاحظات</div>
                    <div className="detail-value" style={{ fontSize:13 }}>{renderNotes(cow.notes)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* حالة الحمل النشط */}
          <div className="card">
            <div className="card-header"><span className="card-title">🐂 حالة التلقيح والحمل</span></div>
            <div className="card-body">
              {activeInsem ? (
                <div>
                  <div className={`insem-card ${activeInsem.status}`}>
                    <div style={{ fontWeight:800, marginBottom:8, color:'var(--accent)' }}>
                      {activeInsem.status === 'confirmed' ? '✅ حمل مؤكد' : '⏳ تحت المراقبة (23 يوم)'}
                    </div>
                    <div className="detail-grid">
                      <div className="detail-box"><div className="detail-label">تاريخ التلقيح</div><div className="detail-value">{activeInsem.insemDate}</div></div>
                      <div className="detail-box"><div className="detail-label">نوع التلقيح</div><div className="detail-value">{activeInsem.type}</div></div>
                      <div className="detail-box">
                        <div className="detail-label">الأيام المضت</div>
                        <div className="detail-value" style={{ color:'var(--orange)' }}>{daysBetween(activeInsem.insemDate, today)} يوم</div>
                      </div>
                      <div className="detail-box" style={{ gridColumn:'span 2' }}>
                        <div className="detail-label">الحمل والولادة المتوقعة</div>
                        <div>
                          {(() => {
                             const insemDays = daysBetween(activeInsem.insemDate, today);
                             const progressVal = Math.min(100, Math.round((insemDays / 280) * 100));
                             const months = Math.min(9, Math.ceil(insemDays / 30.44));
                             const elapsedM = Math.floor(insemDays / 30.44);
                             const remD = Math.floor(insemDays % 30.44);
                             const remDays = daysLeft(activeInsem.insemDate);
                             const labelText = activeInsem.status === 'confirmed' 
                               ? `حمل مؤكد (شهر ${months}/9)` 
                               : `ملقحة (يوم ${insemDays})`;
                             
                             return (
                               <>
                                 <div className="detail-value" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                   <span>{labelText} — {elapsedM > 0 ? `${elapsedM} شهر و ` : ''}{remD} يوم</span>
                                   <span style={{ color: 'var(--orange)' }}>{progressVal}%</span>
                                 </div>
                                 <div className="progress">
                                   <div className="progress-bar" style={{
                                     width: `${progressVal}%`,
                                     background: activeInsem.status === 'confirmed' ? 'var(--green)' : 'var(--orange)'
                                   }} />
                                 </div>
                                 <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 6, fontWeight: 700 }}>
                                    تاريخ الولادة المتوقع: {addDays(activeInsem.insemDate, 280)} 
                                    {remDays !== null && ` | ${remDays < 0 ? `⚠️ متأخرة ${Math.abs(remDays)} يوم` : `باقي ${remDays} يوم`}`}
                                 </div>
                               </>
                             );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding:'30px 0' }}>
                  <div className="empty-icon">🐂</div>
                  <div className="empty-title">لا يوجد تلقيح نشط</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: إحصاءات الحياة ── */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-icon">🐂</div>
            <div className="stat-value" style={{ color:'var(--accent)' }}>{totalInsem}</div>
            <div className="stat-label">إجمالي التلقيحات</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value" style={{ color:'var(--green)' }}>{successInsem}</div>
            <div className="stat-label">تلقيح ناجح</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value" style={{ color:'var(--red)' }}>{failedInsem}</div>
            <div className="stat-label">تلقيح فاشل</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐣</div>
            <div className="stat-value" style={{ color:'var(--orange)' }}>{cowBirths.length}</div>
            <div className="stat-label">ولادات سجلت</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐄</div>
            <div className="stat-value" style={{ color:'var(--green)' }}>{femaleBirths}</div>
            <div className="stat-label">أبناء إناث</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐂</div>
            <div className="stat-value" style={{ color:'var(--blue)' }}>{maleBirths}</div>
            <div className="stat-label">أبناء ذكور</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🥛</div>
            <div className="stat-value" style={{ color:'var(--accent)' }}>{totalMilkLtrs.toLocaleString()}</div>
            <div className="stat-label">لتر حليب (إجمالي)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏥</div>
            <div className="stat-value" style={{ color:'var(--red)' }}>{cowHealth.length}</div>
            <div className="stat-label">سجلات صحية</div>
          </div>
        </div>

        {/* ── Row 3: قسم الأبناء ── */}
        {cowBirths.length > 0 && (
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header">
              <span className="card-title">👨‍👩‍👧‍👦 الأبناء والبنات ({cowBirths.length})</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                {cowBirths.map(b => {
                  const calfCow = getCalfCow(b.calfId)
                  return (
                    <div key={b.firestoreId} style={{
                      background: 'var(--card-bg)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      minWidth: 200,
                      flex: '1 1 200px',
                      display:'flex',
                      alignItems:'center',
                      gap:12,
                    }}>
                      <div style={{ fontSize:32 }}>
                        {b.calfGender === 'أنثى' ? '🐄' : '🐂'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14 }}>
                          عجل رقم {b.calfId}
                        </div>
                        <div style={{ fontSize:12, color:'var(--subtext)', marginTop:2 }}>
                          {b.calfGender}
                        </div>
                        <div style={{ fontSize:11, color:'var(--subtext)' }}>
                          📅 {b.birthDate} · ⚖️ {b.calfWeight} كغ
                        </div>
                        <div style={{ marginTop:4 }}>
                          <span className={`badge ${b.calfStatus === 'سليم' || b.calfStatus === 'سليمة' ? 'badge-green' : b.calfStatus === 'يحتاج رعاية' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize:10 }}>
                            {b.calfStatus}
                          </span>
                          {' '}
                          <span className="badge badge-gray" style={{ fontSize:10 }}>{b.plan || b.calfPlan || '—'}</span>
                        </div>
                      </div>
                      <div>
                        {calfCow ? (
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => onViewCow && onViewCow(calfCow)}
                            title={`فتح ملف ${calfCow.name}`}
                            style={{ whiteSpace:'nowrap' }}
                          >
                            🔗 فتح ملفه
                          </button>
                        ) : (
                          <span style={{ fontSize:10, color:'var(--subtext)', textAlign:'center', display:'block' }}>
                            {b.calfGender === 'ذكر' ? 'ذكر' : 'غير مسجلة'}
                            <br/>في القطيع
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Row 4: الجدول الزمني الموحد ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 السجل الزمني الشامل ({timeline.length} حدث)</span>
            {timeline.length > 1 && (
              <button 
                className="btn btn-xs btn-outline" 
                onClick={() => setTimelineSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                title="تغيير ترتيب الأحداث"
              >
                {timelineSortOrder === 'desc' ? '⬇️ الأحدث أولاً' : '⬆️ الأقدم أولاً'}
              </button>
            )}
          </div>
          <div style={{ padding: timeline.length === 0 ? undefined : 0 }}>
            {timeline.length === 0 ? (
              <div className="empty-state" style={{ padding:'30px 0' }}>
                <div className="empty-icon">📅</div>
                <div className="empty-title">لا توجد أحداث مسجلة بعد</div>
                <div className="empty-sub">سيظهر هنا كل التلقيحات والمرض والولادات تلقائياً</div>
              </div>
            ) : (
              <div style={{ padding:'8px 16px' }}>
                {timeline.map((event, idx) => (
                  <div key={idx} style={{
                    display:'flex',
                    gap:14,
                    padding:'14px 0',
                    borderBottom: idx < timeline.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems:'flex-start',
                  }}>
                    {/* أيقونة + خط زمني */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:36 }}>
                      <div style={{
                        width:36, height:36, borderRadius:'50%',
                        background: event.type === 'insem'
                          ? (event.status === 'failed' ? '#fff0f0' : event.status === 'confirmed' ? '#f0fff6' : '#fff9f0')
                          : event.type === 'health'
                          ? (event.status === 'recovered' ? '#f0fff6' : '#fff0f0')
                          : '#f0f8ff',
                        border: `2px solid ${event.type === 'insem' ? (event.status === 'failed' ? 'var(--red)' : event.status === 'confirmed' ? 'var(--green)' : 'var(--orange)') : event.type === 'health' ? (event.status === 'recovered' ? 'var(--green)' : 'var(--red)') : 'var(--blue)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16, flexShrink:0,
                      }}>
                        {event.icon}
                      </div>
                      {idx < timeline.length - 1 && (
                        <div style={{ width:2, flex:1, minHeight:16, background:'var(--border)', marginTop:4 }} />
                      )}
                    </div>

                    {/* المحتوى */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:14 }}>{event.title}</span>
                        <span className={`badge ${event.badgeClass}`} style={{ fontSize:10 }}>{event.badgeLabel}</span>
                        {event.type === 'insem' && event.bullId && (
                          <span className="badge badge-purple" style={{ fontSize:10 }}>🐂 {event.bullId}</span>
                        )}
                        {event.type === 'health' && event.vet && (
                          <span className="badge badge-blue" style={{ fontSize:10 }}>👨‍⚕️ {event.vet}</span>
                        )}
                      </div>
                      <div style={{ fontSize:12, color:'var(--subtext)', marginTop:3 }}>
                        {event.detail}
                      </div>
                      {/* زر فتح ملف العجل من الجدول الزمني */}
                      {event.type === 'birth' && event.calfGender === 'أنثى' && getCalfCow(event.calfId) && (
                        <button
                          className="btn btn-xs btn-outline"
                          style={{ marginTop:6 }}
                          onClick={() => onViewCow && onViewCow(getCalfCow(event.calfId))}
                        >
                          🔗 فتح ملف البنت {getCalfCow(event.calfId)?.name}
                        </button>
                      )}
                    </div>

                    {/* التاريخ */}
                    <div style={{
                      fontSize:12, color:'var(--subtext)',
                      whiteSpace:'nowrap', textAlign:'left', minWidth:80,
                    }}>
                      {typeof event.date === 'string' ? event.date : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 5: سجل الحليب الأخير ── */}
        {cowMilk.length > 0 && (
          <div className="card" style={{ marginTop:16 }}>
            <div className="card-header">
              <span className="card-title">🥛 سجل الحليب الأخير ({cowMilk.slice(0,10).length} سجل)</span>
            </div>
            <div style={{ padding:0 }}>
              <table>
                <thead><tr><th>التاريخ</th><th>الكمية</th><th>الجلسة</th></tr></thead>
                <tbody>
                  {cowMilk.slice(0, 10).map(m => (
                    <tr key={m.firestoreId}>
                      <td>{m.date}</td>
                      <td><strong>{m.amount} لتر</strong></td>
                      <td><span className={`badge ${m.session==='صباح'?'badge-orange':'badge-blue'}`}>{m.session}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
