import React, { useState, useEffect, useRef, memo, useCallback, useMemo, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { FarmProvider, useFarm } from './context/FarmContext'
import AuthPage from './components/Auth/AuthPage'
import Sidebar from './components/Layout/Sidebar'
import AlertToast from './components/Layout/AlertToast'
import ConfirmDialog from './components/Layout/ConfirmDialog'
import GlobalSearch from './components/Layout/GlobalSearch'
import InAppNotification from './components/Layout/InAppNotification'
import NotificationCenter from './components/Layout/NotificationCenter'

const DashboardPage = lazy(() => import('./components/Dashboard/DashboardPage'))
const CowsPage = lazy(() => import('./components/Cows/CowsPage'))
const MilkPage = lazy(() => import('./components/Milk/MilkPage'))
const BreedingPage = lazy(() => import('./components/Breeding/BreedingPage'))
const BirthsPage = lazy(() => import('./components/Births/BirthsPage'))
const HealthPage = lazy(() => import('./components/Health/HealthPage'))
const FinancePage = lazy(() => import('./components/Finance/FinancePage'))
const WorkersPage = lazy(() => import('./components/Workers/WorkersPage'))
const FeedPage = lazy(() => import('./components/Feed/FeedPage'))
const ReportsPage = lazy(() => import('./components/Reports/ReportsPage'))
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'))
const NotificationsPage = lazy(() => import('./components/Notifications/NotificationsPage'))

// Theme CSS variables map
const THEMES = {
  green:  { '--accent':'#3d7a52','--accent2':'#5aaa78','--accent3':'#e8f5ee','--sidebar':'#1e3a2f','--sidebar2':'#2d4a35','--hbg':'#e8f0e8','--subtext':'#6a8a72','--border':'#c8dac8','--bg':'#f0f4f0','--text':'#1a2e1f' },
  blue:   { '--accent':'#1a6fa8','--accent2':'#3a9fd8','--accent3':'#e8f3fc','--sidebar':'#0f2d4a','--sidebar2':'#1a4060','--hbg':'#e8f0f8','--subtext':'#5a7a9a','--border':'#c0d4e8','--bg':'#f0f4f8','--text':'#0f2040' },
  purple: { '--accent':'#6b3fa0','--accent2':'#9b6fd0','--accent3':'#f0e8fc','--sidebar':'#2d1a4a','--sidebar2':'#3d2a5a','--hbg':'#f0e8f8','--subtext':'#8a6aaa','--border':'#d4c8e8','--bg':'#f4f0f8','--text':'#2a1040' },
  brown:  { '--accent':'#8b5e3c','--accent2':'#b07d58','--accent3':'#f5ede4','--sidebar':'#3a1f0f','--sidebar2':'#4a2d18','--hbg':'#f5ede4','--subtext':'#9a7a5a','--border':'#d8c4a8','--bg':'#f5f0ea','--text':'#2a1a0a' },
  teal:   { '--accent':'#1a8a7a','--accent2':'#3abaa8','--accent3':'#e4f5f3','--sidebar':'#0f3a35','--sidebar2':'#1a4a43','--hbg':'#e4f5f3','--subtext':'#4a8a80','--border':'#b8d8d4','--bg':'#f0f8f7','--text':'#0f2a28' },
  red:    { '--accent':'#b83232','--accent2':'#d85555','--accent3':'#fde8e8','--sidebar':'#3a0f0f','--sidebar2':'#4a1a1a','--hbg':'#fde8e8','--subtext':'#9a5555','--border':'#d8b8b8','--bg':'#f8f0f0','--text':'#2a0f0f' },
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee', color: '#900', minHeight: '100vh', direction: 'ltr', textAlign: 'left' }}>
          <h2>Something went wrong in React:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: 13 }}>
            {this.state.error?.toString()}
          </pre>
          <hr />
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: 11 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { 
    user, authLoading, setFarmName, appTheme, fontSize, darkMode, compactMode, 
    isOnline, topTabs, ALL_PAGES, isHeaderSwapped,
    setNotifOpen, setSearchOpen, closeConfirm, confirmDialog, notifOpen, searchOpen
  } = useFarm()
  const navigate = useNavigate()
  const location = useLocation()
  
  // The active page is derived from the route path (e.g., '/cows' -> 'cows')
  const activePage = location.pathname.length > 1 ? location.pathname.substring(1) : 'dashboard'
  const renderedPage = activePage
  const [isNavigating, setIsNavigating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Flutter-style Navigation State ───────────────────────────────
  const [isSearching, setIsSearching] = useState(false)
  const [isAppBarVisible, setIsAppBarVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const lastScrollOffset = useRef(0)

  // ── Back button support ──────────────────────────────────────────
  const navHistory    = useRef([])          // stack of pages visited
  const lastBackPress = useRef(0)           // timestamp of last back press
  const exitToastTimer= useRef(null)        // timer to hide exit toast
  const [showExitToast, setShowExitToast] = useState(false)

  // Memoized handlers to prevent layout re-renders
  const handleMenuOpen = useCallback(() => setMobileMenuOpen(true), [])
  const handleMenuClose = useCallback(() => setMobileMenuOpen(false), [])

  // ── Handle Scroll (Hide/Show AppBar) ─────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      if (current > lastScrollOffset.current && current > 60) {
        if (isAppBarVisible && !isSearching) setIsAppBarVisible(false)
      } else if (current < lastScrollOffset.current) {
        if (!isAppBarVisible) setIsAppBarVisible(true)
      }
      lastScrollOffset.current = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isAppBarVisible, isSearching])

  // Load farm name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('farmName')
    if (saved) setFarmName(saved)
  }, [])

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement
    const vars = THEMES[appTheme] || THEMES.green
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [appTheme])

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize * 0.14}px`
  }, [fontSize])

  // Apply dark mode to <html> and <body> for full coverage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.style.setProperty('--card', '#1a2a1e')
      document.documentElement.style.setProperty('--hbg',  '#1e301f')
      document.documentElement.style.setProperty('--text', '#d8f0d8')
      document.documentElement.style.setProperty('--border','#2a3e2c')
      document.documentElement.style.setProperty('--bg',   '#121a14')
      document.body.style.background = '#121a14'
      document.body.style.color      = '#d8f0d8'
      document.documentElement.classList.add('dark-mode')
    } else {
      // Restore from current theme
      const vars = THEMES[appTheme] || THEMES.green
      document.documentElement.style.setProperty('--bg',   vars['--bg']   || '#f0f4f0')
      document.documentElement.style.removeProperty('--card')
      document.documentElement.style.removeProperty('--hbg')
      document.documentElement.style.removeProperty('--text')
      document.documentElement.style.removeProperty('--border')
      document.body.style.background = ''
      document.body.style.color      = ''
      document.documentElement.classList.remove('dark-mode')
    }
  }, [darkMode, appTheme])

  // Apply compact mode to <html>
  useEffect(() => {
    if (compactMode) document.documentElement.classList.add('compact-mode')
    else document.documentElement.classList.remove('compact-mode')
  }, [compactMode])

  const handleNav = useCallback((p) => {
    if (p === activePage) return

    setMobileMenuOpen(false)
    setIsSearching(false) // Close search on navigation

    setIsNavigating(true)
    navigate(`/${p}`)
    
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsNavigating(false))
      })
    }, 150)
  }, [activePage, navigate])

  // ── Handle hardware/browser back button (Android Style) ──
  useEffect(() => {

    const handleBack = () => {
      // 1. Priority: Close active overlays first
      
      // Close Search (Global or Local)
      if (isSearching || searchOpen) {
        setIsSearching(false)
        setSearchOpen(false)
        setSearchQuery('')
        // Maintain history state
        window.history.pushState({ page: activePage }, '', window.location.pathname)
        return true
      }

      // Close Mobile Menu (Sidebar)
      if (mobileMenuOpen) {
        setMobileMenuOpen(false)
        window.history.pushState({ page: activePage }, '', window.location.pathname)
        return true
      }

      // Close Notification Drawer
      if (notifOpen) {
        setNotifOpen(false)
        window.history.pushState({ page: activePage }, '', window.location.pathname)
        return true
      }

      // Close Global Confirm Dialog
      if (confirmDialog) {
        closeConfirm()
        window.history.pushState({ page: activePage }, '', window.location.pathname)
        return true
      }

      // 2. Navigation: Pop from history if available
      if (location.pathname !== '/' && location.pathname !== '/dashboard') {
        navigate(-1)
        return true
      }

      // 3. Exit Logic: Home Page double-press
      const now = Date.now()
      if (now - lastBackPress.current < 2000) {
        clearTimeout(exitToastTimer.current)
        setShowExitToast(false)
        try {
          if (window.Capacitor?.Plugins?.App) {
            window.Capacitor.Plugins.App.exitApp()
          } else {
            // Web fallback
            window.history.go(-(window.history.length))
            setTimeout(() => window.close(), 100)
          }
        } catch (_) {}
        return true
      }

      // First press: Show warning
      lastBackPress.current = now
      setShowExitToast(true)
      window.history.pushState({ page: activePage }, '', window.location.pathname)
      clearTimeout(exitToastTimer.current)
      exitToastTimer.current = setTimeout(() => {
        setShowExitToast(false)
        lastBackPress.current = 0
      }, 2000)
      return true
    }

    const cordovaBack = (e) => {
      e?.preventDefault?.()
      e?.stopPropagation?.()
      handleBack()
    }
    document.addEventListener('backbutton', cordovaBack, false)

    const handlePopState = (e) => {
      e.preventDefault()
      handleBack()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('backbutton', cordovaBack, false)
      window.removeEventListener('popstate', handlePopState)
      clearTimeout(exitToastTimer.current)
    }
  }, [isSearching, mobileMenuOpen, renderedPage, activePage]) 



  if (authLoading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:16 }}>
        <div style={{ fontSize:64 }} className="loading-icon">🐄</div>
        <div style={{ fontSize:15, color:'#6a8a72', fontWeight:700 }}>جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return <AuthPage />


  return (
    <div className="app-layout">
      <Sidebar
        currentPage={activePage}
        onNav={handleNav}
        isOpen={mobileMenuOpen}
        onClose={handleMenuClose}
      />
      <div className="main-content">
        {!isOnline && (
          <div style={{ backgroundColor: '#c0392b', color: '#fff', textAlign: 'center', padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 6, margin: '14px 14px 0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>🔴 غير متصل بالإنترنت — وضع التخزين المحلي مفعل</span>
          </div>
        )}
        <MobileTopbar
          onMenuOpen={handleMenuOpen}
          activePage={renderedPage}
          onNav={handleNav}
          isAppBarVisible={isAppBarVisible}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isHeaderSwapped={isHeaderSwapped}
        />
        <div className={`page-wrapper ${isNavigating ? 'page-exit' : 'page-enter'}`}>
          <Suspense fallback={<div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:16 }}><div style={{ fontSize:40 }} className="loading-icon">🐄</div></div>}>
            <Routes>
              <Route path="/cows" element={<CowsPage search={searchQuery} />} />
              <Route path="/milk" element={<MilkPage search={searchQuery} />} />
              <Route path="/health" element={<HealthPage search={searchQuery} />} />
              <Route path="/feed" element={<FeedPage search={searchQuery} />} />
              <Route path="/breeding" element={<BreedingPage search={searchQuery} />} />
              <Route path="/births" element={<BirthsPage search={searchQuery} />} />
              <Route path="/finance" element={<FinancePage search={searchQuery} />} />
              <Route path="/workers" element={<WorkersPage search={searchQuery} />} />
              <Route path="/reports" element={<ReportsPage search={searchQuery} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/dashboard" element={<DashboardPage onNav={handleNav} />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
      <AlertToast />
      <ConfirmDialog />
      <GlobalSearch />
      <NotificationCenter />
      <InAppNotification />

      {/* ── Double-press to exit toast ── */}
      <div className={`exit-toast${showExitToast ? ' exit-toast-show' : ''}`}>
        <span>اضغط مرتين بسرعة للخروج</span>
      </div>
    </div>
  )
}


// ── SVG icon paths for the top tab bar ──

// ── SVG icon paths for the top tab bar ──
const TAB_ICON_PATHS = {
  dashboard: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  cows:      ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z','M8 12h8','M12 8v8'],
  breeding:  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  births:    ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  milk:      ['M8 2h8l1 8H7L8 2z','M7 10c0 6 10 6 10 0'],
  health:    ['M22 12h-4l-3 9L9 3l-3 9H2'],
  feed:      ['M12 2a10 10 0 0 1 10 10','M12 2v10l4.5 4.5'],
  finance:   ['M12 2v20','M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  workers:   ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  reports:   ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
  settings:  ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  notifications: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
}

const TabIcon = ({ page, size = 22, active }) => {
  const paths = TAB_ICON_PATHS[page]
  if (!paths) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {Array.isArray(paths) ? paths.map((d, i) => <path key={i} d={d} />) : <path d={paths} />}
    </svg>
  )
}

// ── Unified Mobile Topbar — Facebook-style two-row header ──
const MobileTopbar = memo(function MobileTopbar({
  onMenuOpen, activePage, onNav,
  isAppBarVisible, isSearching, setIsSearching, searchQuery, setSearchQuery, isHeaderSwapped
}) {
  const { topTabs, ALL_PAGES, stats, unreadCount } = useFarm()

  const badgeMap = {
    dashboard: ((stats.sickCows > 0 ? stats.sickCows : 0) + (stats.pendingAlerts?.length || 0) + (stats.soonBirths?.length || 0)) || null,
    cows:     stats.sickCows > 0 ? stats.sickCows : null,
    breeding: (stats.pendingAlerts?.length || 0) > 0 ? stats.pendingAlerts.length : null,
    health:   stats.sickCows > 0 ? stats.sickCows : null,
    notifications: unreadCount > 0 ? unreadCount : null,
  }

  const getTabInfo = (page) => ALL_PAGES.find(p => p.page === page)
  const activePageInfo = getTabInfo(activePage)

  // Icons for the top row
  const MenuIcon = () => (
    <button className="header-action-btn" onClick={onMenuOpen} aria-label="القائمة">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  )

  const SearchIcon = () => (
    <button className="header-action-btn" onClick={() => setIsSearching(true)} aria-label="بحث">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    </button>
  )

  return (
    <div className={`mobile-tab-bar ${isAppBarVisible ? '' : 'mobile-tab-bar-hidden'}${isSearching ? ' searching' : ''}`}>
      {/* ── ROW 1: HEADER (Title + Actions) ── */}
      <div className="tab-bar-header-row">
        {isSearching ? (
          <div className="tab-bar-search-mode">
            <button className="tab-bar-item active" onClick={() => { setIsSearching(false); setSearchQuery('') }}>
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </button>
            <input
              autoFocus
              className="tab-bar-search-input"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="tab-bar-item" onClick={() => setSearchQuery('')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        ) : (
          <div className={`header-row-layout ${isHeaderSwapped ? 'swapped' : ''}`}>
            <SearchIcon />
            <div className="header-title">{activePageInfo?.label || 'المزرعة'}</div>
            <MenuIcon />
          </div>
        )}
      </div>

      {/* ── ROW 2: NAVIGATION TABS ── */}
      {!isSearching && (
        <div className="tab-bar-nav-row">
          {topTabs.map((page) => {
            const info = getTabInfo(page)
            if (!info) return null
            const isActive = activePage === page
            const badge = badgeMap[page]
            
            // Render basic tab
            const tabEl = (
              <button
                key={page}
                className={`tab-bar-item${isActive ? ' active' : ''}`}
                onClick={() => onNav(page)}
                aria-label={info.label}
              >
                <span className="tab-bar-icon">
                  <TabIcon page={page} active={isActive} />
                  {badge && (
                    <span className="tab-bar-badge">{badge > 99 ? '99+' : badge}</span>
                  )}
                </span>
                {isActive && <span className="tab-bar-indicator" />}
              </button>
            )

            // If this is the "births" (heart) tab, we inject notifications right after it
            if (page === 'births') {
              const notifActive = activePage === 'notifications'
              const notifBadge = badgeMap.notifications
              return (
                <React.Fragment key="births-group">
                  {tabEl}
                  <button
                    key="notifications"
                    className={`tab-bar-item${notifActive ? ' active' : ''}${unreadCount > 0 ? ' has-new-notif' : ''}`}
                    onClick={() => onNav('notifications')}
                    aria-label="الإشعارات"
                  >
                    <span className="tab-bar-icon">
                      <TabIcon page="notifications" active={notifActive} />
                      {notifBadge && (
                        <span className="tab-bar-badge red-badge">{notifBadge > 99 ? '99+' : notifBadge}</span>
                      )}
                    </span>
                    {notifActive && <span className="tab-bar-indicator" />}
                  </button>
                </React.Fragment>
              )
            }

            return tabEl
          })}
        </div>
      )}
    </div>
  )
})

export default function App() {
  return (
    <FarmProvider>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </FarmProvider>
  )
}
