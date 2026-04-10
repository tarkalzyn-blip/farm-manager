import { useState, useEffect, useRef, memo } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebaseConfig'
import { useFarm } from '../../context/FarmContext'

// ── SVG Icons (Lucide-style inline) ──────────────────────────────
const Icon = ({ d, size = 18, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
)

const ICONS = {
  dashboard: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  cows:      ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z','M8 12h8M12 8v8'],
  milk:      ['M8 2h8l1 8H7L8 2z', 'M7 10c0 6 10 6 10 0', 'M10 2v8M14 2v8'],
  health:    ['M22 12h-4l-3 9L9 3l-3 9H2'],
  feed:      ['M12 2a10 10 0 0 1 10 10', 'M12 2v10l4.5 4.5', 'M2 12a10 10 0 0 0 10 10'],
  breeding:  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  births:    ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  finance:   ['M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  workers:   ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  reports:   ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8M16 17H8M10 9H8'],
  settings:  ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  search:    ['M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z'],
  bell:      ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  logout:    ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
}

// ── Navigation groups ─────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { page: 'dashboard', icon: 'dashboard', label: 'لوحة التحكم' },
    ]
  },
  {
    label: 'إدارة الأبقار',
    items: [
      { page: 'cows',     icon: 'cows',    label: 'الأبقار' },
      { page: 'births',   icon: 'births',  label: 'الولادات' },
    ]
  },
  {
    label: 'الرعاية والإنتاج',
    items: [
      { page: 'milk',     icon: 'milk',     label: 'الحليب' },
      { page: 'health',   icon: 'health',   label: 'الصحة والتطعيم' },
      { page: 'breeding', icon: 'breeding', label: 'التلقيح والحمل' },
      { page: 'feed',     icon: 'feed',     label: 'التغذية والعلف' },
    ]
  },
  {
    label: 'الإدارة',
    items: [
      { page: 'finance',  icon: 'finance',  label: 'المالية' },
      { page: 'workers',  icon: 'workers',  label: 'العمال' },
    ]
  },
  {
    label: 'التحليل',
    items: [
      { page: 'reports',  icon: 'reports',  label: 'التقارير' },
      { page: 'settings', icon: 'settings', label: 'الإعدادات' },
    ]
  },
]

const Sidebar = ({ currentPage, onNav, isOpen, onClose }) => {
  const { user, farmName, stats, showToast, setSearchOpen, notifOpen, setNotifOpen, notifications } = useFarm()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null)
  const scrollAreaRef = useRef(null)

  // Reset scroll to top when sidebar is opened
  useEffect(() => {
    if (isOpen && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0
    }
  }, [isOpen])

  const name    = user?.displayName || user?.email?.split('@')[0] || 'مستخدم'
  const email   = user?.email || ''
  const initial = name.charAt(0).toUpperCase()

  // Flatten items for the grid
  const gridItems = [
    { page: 'dashboard', icon: 'dashboard', label: 'لوحة التحكم' },
    { page: 'cows',     icon: 'cows',    label: 'الأبقار' },
    { page: 'milk',     icon: 'milk',     label: 'الحليب' },
    { page: 'health',   icon: 'health',   label: 'الصحة' },
    { page: 'breeding', icon: 'breeding', label: 'التلقيح' },
    { page: 'births',   icon: 'births',  label: 'الولادات' },
    { page: 'finance',  icon: 'finance',  label: 'المالية' },
    { page: 'workers',  icon: 'workers',  label: 'العمال' },
    { page: 'feed',     icon: 'feed',     label: 'الأعلاف' },
    { page: 'reports',  icon: 'reports',  label: 'التقارير' },
  ]

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut(auth)
    } catch (err) {
      showToast('حدث خطأ: ' + (err?.message || ''), 'error')
      setLoggingOut(false)
    }
  }

  const toggleSection = (sec) => {
    setExpandedSection(prev => prev === sec ? null : sec)
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`mobile-sidebar-overlay${isOpen ? ' open' : ''}`} onClick={onClose} />

      <div className={`sidebar-v2${isOpen ? ' mobile-open' : ''}`}>
        
        {/* Header with Logo & Close Icon */}
        <div className="menu-v2-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <img src="/logo.png" alt="Logo" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--accent)' }} />
             <h2 style={{ fontSize: 20 }}>مزرعة الأمل</h2>
           </div>
           <button className="menu-v2-header-close" onClick={onClose} aria-label="إغلاق">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
               <line x1="18" y1="6" x2="6" y2="18" />
               <line x1="6" y1="6" x2="18" y2="18" />
             </svg>
           </button>
        </div>

        <div className="menu-v2-scroll-area" ref={scrollAreaRef}>
          {/* 1. Profile Card */}
          <div className="menu-v2-card">
            <div className="menu-v2-profile">
              <div className="menu-v2-avatar">{initial}</div>
              <div className="menu-v2-info">
                <div className="menu-v2-name">{name}</div>
                <div className="menu-v2-email">{email}</div>
              </div>
              <button className="menu-v2-switch-btn" onClick={() => showToast('🔔 تم تبديل وضع المزرعة')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>
            <div className="menu-v2-divider" />
            <button className="menu-v2-action-row" onClick={() => showToast('➕ خاصية إضافة ملف تعريف قريباً')}>
               <div className="menu-v2-plus-circle">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               </div>
               <span>إنشاء ملف مزرعة جديد</span>
            </button>
          </div>

          {/* 2. Shortcuts Label */}
          <div className="menu-v2-section-title">اختصاراتك</div>
          <div className="menu-v2-shortcuts-row">
            <div className="menu-v2-shortcut-item">
              <div className="menu-v2-shortcut-avatar">🐄</div>
              <span>مزرعتي</span>
            </div>
          </div>

          {/* 3. Grid of Items */}
          <div className="menu-v2-grid">
            {gridItems.map((item) => (
              <button 
                key={item.page} 
                className={`menu-v2-grid-item${currentPage === item.page ? ' active' : ''}`}
                onClick={() => { onNav(item.page); onClose?.() }}
              >
                <div className="menu-v2-grid-icon">
                  <Icon d={ICONS[item.icon]} size={24} />
                </div>
                <span className="menu-v2-grid-label">{item.label}</span>
              </button>
            ))}
          </div>

          <button className="menu-v2-btn-secondary" style={{ marginTop: 12 }}>
            عرض المزيد
          </button>

          <div className="menu-v2-divider" style={{ margin: '16px 0' }} />

          {/* 4. Bottom Collapsible Sections */}
          <div className="menu-v2-accordion">
            <button className="menu-v2-accordion-header" onClick={() => toggleSection('help')}>
               <div className="menu-v2-accordion-icon">❔</div>
               <span className="menu-v2-accordion-label">المساعدة والدعم</span>
               <svg className={`menu-v2-chevron ${expandedSection === 'help' ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {expandedSection === 'help' && (
              <div className="menu-v2-accordion-content">
                <div className="menu-v2-sub-item">مركز المساعدة</div>
                <div className="menu-v2-sub-item">الإبلاغ عن مشكلة</div>
              </div>
            )}

            <button className="menu-v2-accordion-header" onClick={() => toggleSection('settings')}>
               <div className="menu-v2-accordion-icon">⚙️</div>
               <span className="menu-v2-accordion-label">الإعدادات والخصوصية</span>
               <svg className={`menu-v2-chevron ${expandedSection === 'settings' ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {expandedSection === 'settings' && (
              <div className="menu-v2-accordion-content">
                <button className="menu-v2-sub-item" onClick={() => { onNav('settings'); onClose?.() }}>الإعدادات</button>
                <div className="menu-v2-sub-item">سجل النشاطات</div>
              </div>
            )}

            <button className="menu-v2-accordion-header" onClick={() => setConfirmOpen(true)}>
               <div className="menu-v2-accordion-icon">🚪</div>
               <span className="menu-v2-accordion-label">تسجيل الخروج</span>
            </button>
          </div>
          
          <div className="sidebar-footer">
            <div className="sidebar-version">رقم الاصدار 3.0.0</div>
            <div className="sidebar-designer">تصميم طارق زوين</div>
          </div>
          
          <div style={{ height: 20 }} />
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {confirmOpen && (
        <div className="modal-overlay open" style={{ zIndex: 10000 }} onClick={e => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
             <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>👋🏼</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>هل تريد المغادرة؟</div>
                <div style={{ fontSize: 13, color: 'var(--subtext)' }}>ستحتاج لتسجيل الدخول مرة أخرى للوصول إلى بيانات المزرعة.</div>
             </div>
             <div className="modal-footer" style={{ border: 'none', paddingTop: 0 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmOpen(false)} disabled={loggingOut}>إلغاء</button>
                <button className="btn btn-danger" style={{ flex: 1.5 }} onClick={doLogout} disabled={loggingOut}>خروج</button>
             </div>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(Sidebar)
