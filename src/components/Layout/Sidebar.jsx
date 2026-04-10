import { useState, useEffect, memo } from 'react'
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
  const [openGroups, setOpenGroups] = useState(() => {
    const saved = localStorage.getItem('sidebarGroups')
    return saved ? JSON.parse(saved) : ['الرئيسية', 'إدارة الأبقار', 'الرعاية والإنتاج', 'الإدارة', 'التحليل']
  })

  const name    = user?.displayName || user?.email?.split('@')[0] || 'مستخدم'
  const email   = user?.email || ''
  const initial = name.charAt(0).toUpperCase()
  const unreadNotifs = notifications.filter(n => !n.read).length

  useEffect(() => {
    localStorage.setItem('sidebarGroups', JSON.stringify(openGroups))
  }, [openGroups])

  useEffect(() => {
    const handler = (e) => onNav(e.detail)
    window.addEventListener('farm-nav', handler)
    return () => window.removeEventListener('farm-nav', handler)
  }, [onNav])

  const toggleGroup = (label) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Logout error:', err)
      showToast('حدث خطأ في تسجيل الخروج: ' + (err?.message || ''), 'error')
      setLoggingOut(false)
      setConfirmOpen(false)
    }
  }

  const pendingAll = (stats.pendingAlerts?.length || 0) + (stats.soonBirths?.length || 0)
  const badgeMap = {
    dashboard: (stats.sickCows > 0 ? stats.sickCows : 0) + pendingAll > 0
      ? ((stats.sickCows > 0 ? stats.sickCows : 0) + pendingAll) : null,
    cows:     stats.sickCows > 0 ? stats.sickCows : null,
    breeding: pendingAll > 0 ? pendingAll : null,
    health:   stats.sickCows > 0 ? stats.sickCows : null,
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`mobile-sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />

      <div className={`sidebar${isOpen ? ' mobile-open' : ''}`}>
        {/* Mobile close button */}
        <button className="sidebar-mobile-close" onClick={onClose} aria-label="إغلاق القائمة">✕</button>

        {/* Logo Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🐄</div>
          <div className="sidebar-logo-name">{farmName}</div>
          <div className="sidebar-logo-sub">نظام إدارة ذكي</div>
        </div>

        {/* Quick Actions: Search + Bell */}
        <div className="sidebar-quick-actions">
          <button className="sidebar-quick-btn" onClick={() => setSearchOpen(true)} title="بحث سريع (Ctrl+K)">
            <Icon d={ICONS.search} size={15} />
            <span className="sidebar-quick-label">بحث</span>
            <kbd style={{ fontSize: 9, opacity: 0.45, marginRight: 'auto', background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>K</kbd>
          </button>
          <button
            className={`sidebar-quick-btn${notifOpen ? ' active' : ''}`}
            onClick={() => setNotifOpen(o => !o)}
            title="الإشعارات"
            style={{ position: 'relative' }}
          >
            <Icon d={ICONS.bell} size={15} />
            <span className="sidebar-quick-label">الإشعارات</span>
            {unreadNotifs > 0 && (
              <span className="nav-badge" style={{ position: 'absolute', top: 6, left: 8, margin: 0, fontSize: 9, padding: '1px 5px' }}>
                {unreadNotifs > 99 ? '99+' : unreadNotifs}
              </span>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => {
            const isOpen = openGroups.includes(group.label)
            // Check if any item in group is active
            const hasActive = group.items.some(i => i.page === currentPage)
            return (
              <div key={group.label} className="nav-group">
                {/* Group Header */}
                <button
                  className={`nav-group-header${hasActive ? ' has-active' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                >
                  <span className="nav-group-label">{group.label}</span>
                  <span className={`nav-group-arrow${isOpen ? ' open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                {/* Group Items */}
                {isOpen && (
                  <div className="nav-group-items">
                    {group.items.map(({ page, icon, label }) => (
                      <button
                        key={page}
                        className={`nav-item${currentPage === page ? ' active' : ''}`}
                        onClick={() => { onNav(page); onClose?.() }}
                      >
                        <span className="nav-icon">
                          <Icon d={ICONS[icon]} size={17} strokeWidth={currentPage === page ? 2.5 : 2} />
                        </span>
                        <span>{label}</span>
                        {badgeMap[page] && (
                          <span className="nav-badge">{badgeMap[page]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Logout */}
          <button
            className="nav-item nav-item-logout"
            onClick={() => setConfirmOpen(true)}
            style={{ marginTop: 8 }}
          >
            <span className="nav-icon"><Icon d={ICONS.logout} size={17} /></span>
            <span>تسجيل الخروج</span>
          </button>
        </nav>

        {/* User chip */}
        <div className="sidebar-user">
          <div className="user-avatar">{initial}</div>
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-email">{email}</div>
          </div>
          <button className="logout-btn" onClick={() => setConfirmOpen(true)} title="تسجيل الخروج">⏻</button>
        </div>

        <div className="sidebar-version">v2.1 | {farmName}</div>
      </div>

      {/* Logout Confirm Modal */}
      {confirmOpen && (
        <div className="modal-overlay open" style={{ zIndex: 10000 }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false) }}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">تسجيل الخروج</span>
              <button className="modal-close" onClick={() => setConfirmOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 22px' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>👋</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>هل تريد تسجيل الخروج؟</div>
              <div style={{ fontSize: 13, color: 'var(--subtext)' }}>
                سيتم تسجيل خروجك من حساب <strong>{email}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmOpen(false)} disabled={loggingOut}>إلغاء</button>
              <button className="btn btn-danger" onClick={doLogout} disabled={loggingOut}>
                {loggingOut ? '⏳ جاري الخروج...' : '🚪 نعم، سجّل الخروج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(Sidebar)
