import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { FarmProvider, useFarm } from './context/FarmContext'
import AuthPage from './components/Auth/AuthPage'
import Sidebar from './components/Layout/Sidebar'
import AlertToast from './components/Layout/AlertToast'
import ConfirmDialog from './components/Layout/ConfirmDialog'
import GlobalSearch from './components/Layout/GlobalSearch'
import NotificationCenter from './components/Layout/NotificationCenter'

import DashboardPage from './components/Dashboard/DashboardPage'
import CowsPage from './components/Cows/CowsPage'
import MilkPage from './components/Milk/MilkPage'
import BreedingPage from './components/Breeding/BreedingPage'
import BirthsPage from './components/Births/BirthsPage'
import HealthPage from './components/Health/HealthPage'
import FinancePage from './components/Finance/FinancePage'
import WorkersPage from './components/Workers/WorkersPage'
import FeedPage from './components/Feed/FeedPage'
import ReportsPage from './components/Reports/ReportsPage'
import SettingsPage from './components/Settings/SettingsPage'

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
  const { user, authLoading, setFarmName, appTheme, fontSize, darkMode, compactMode, isOnline, topTabs, ALL_PAGES } = useFarm()
  const [activePage, setActivePage] = useState(() => localStorage.getItem('farmPage') || 'dashboard')
  const [renderedPage, setRenderedPage] = useState(() => localStorage.getItem('farmPage') || 'dashboard')
  const [isNavigating, setIsNavigating] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Back button support ──────────────────────────────────────────
  const navHistory    = useRef([])          // stack of pages visited
  const lastBackPress = useRef(0)           // timestamp of last back press
  const exitToastTimer= useRef(null)        // timer to hide exit toast
  const [showExitToast, setShowExitToast] = useState(false)

  // Memoized handlers to prevent layout re-renders
  const handleMenuOpen = useCallback(() => setMobileMenuOpen(true), [])
  const handleMenuClose = useCallback(() => setMobileMenuOpen(false), [])

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
    if (p === renderedPage) return

    navHistory.current.push(renderedPage)
    window.history.pushState({ page: p }, '', window.location.pathname)

    setActivePage(p)
    localStorage.setItem('farmPage', p)
    setMobileMenuOpen(false)

    setIsNavigating(true)
    setTimeout(() => {
      setRenderedPage(p)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsNavigating(false))
      })
    }, 150)
  }, [renderedPage])

  // ── Handle hardware/browser back button (Android + PWA) ──
  useEffect(() => {

    // المنطق المشترك بين Capacitor/Cordova و browser popstate
    const handleBack = () => {
      if (navHistory.current.length > 0) {
        // يوجد تاريخ → رجوع للصفحة السابقة
        const prevPage = navHistory.current.pop()
        setActivePage(prevPage)
        localStorage.setItem('farmPage', prevPage)
        setMobileMenuOpen(false)
        setIsNavigating(true)
        setTimeout(() => {
          setRenderedPage(prevPage)
          requestAnimationFrame(() => requestAnimationFrame(() => setIsNavigating(false)))
        }, 150)
        // نعيد push حتى يظل popstate يشتغل
        window.history.pushState({ page: prevPage }, '', window.location.pathname)
        return true // منع الخروج في Capacitor
      }

      // لا يوجد تاريخ → ضغطض مزدوج
      const now = Date.now()
      if (now - lastBackPress.current < 2000) {
        clearTimeout(exitToastTimer.current)
        setShowExitToast(false)
        // Capacitor exit
        try {
          if (window.Capacitor?.Plugins?.App) {
            window.Capacitor.Plugins.App.exitApp()
          } else {
            window.history.go(-(window.history.length))
            setTimeout(() => window.close(), 100)
          }
        } catch (_) {}
        return true
      }

      lastBackPress.current = now
      setShowExitToast(true)
      window.history.pushState({}, '', window.location.pathname)
      clearTimeout(exitToastTimer.current)
      exitToastTimer.current = setTimeout(() => {
        setShowExitToast(false)
        lastBackPress.current = 0
      }, 2000)
      return true
    }

    // ─ Capacitor / Cordova ──────────────────────────────────
    // Capacitor v5+ يستخدم document event 'backbutton'
    const cordovaBack = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      handleBack()
    }
    document.addEventListener('backbutton', cordovaBack, false)

    // ─ Browser popstate ─────────────────────────────────
    const handlePopState = (e) => {
      e.preventDefault()
      handleBack()
    }
    window.history.pushState({}, '', window.location.pathname)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('backbutton', cordovaBack, false)
      window.removeEventListener('popstate', handlePopState)
      clearTimeout(exitToastTimer.current)
    }
  }, []) // refs only — no state deps needed

  const currentPage = useMemo(() => {
    switch(renderedPage) {
      case 'cows':      return <CowsPage />
      case 'milk':      return <MilkPage />
      case 'health':    return <HealthPage />
      case 'feed':      return <FeedPage />
      case 'breeding':  return <BreedingPage />
      case 'births':    return <BirthsPage />
      case 'finance':   return <FinancePage />
      case 'workers':   return <WorkersPage />
      case 'reports':   return <ReportsPage />
      case 'settings':  return <SettingsPage />
      default:          return <DashboardPage onNav={handleNav} />
    }
  }, [renderedPage, handleNav])

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
        <MobileTopbar onMenuOpen={handleMenuOpen} activePage={renderedPage} onNav={handleNav} />
        <div className={`page-wrapper ${isNavigating ? 'page-exit' : 'page-enter'}`}>
          {currentPage}
        </div>
      </div>
      <AlertToast />
      <ConfirmDialog />
      <GlobalSearch />
      <NotificationCenter />

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

// ── Unified Mobile Topbar — Facebook-style icon tabs ──
const MobileTopbar = memo(function MobileTopbar({ onMenuOpen, activePage, onNav }) {
  const { topTabs, ALL_PAGES, stats } = useFarm()

  const badgeMap = {
    dashboard: ((stats.sickCows > 0 ? stats.sickCows : 0) + (stats.pendingAlerts?.length || 0) + (stats.soonBirths?.length || 0)) || null,
    cows:     stats.sickCows > 0 ? stats.sickCows : null,
    breeding: (stats.pendingAlerts?.length || 0) > 0 ? stats.pendingAlerts.length : null,
    health:   stats.sickCows > 0 ? stats.sickCows : null,
  }

  // Get page label for tabs
  const getTabInfo = (page) => ALL_PAGES.find(p => p.page === page)

  return (
    <div className="mobile-tab-bar">
      {topTabs.map((page) => {
        const info = getTabInfo(page)
        if (!info) return null
        const isActive = activePage === page
        const badge = badgeMap[page]
        return (
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
            <span className="tab-bar-label">{info.label}</span>
            {isActive && <span className="tab-bar-indicator" />}
          </button>
        )
      })}

      {/* Fixed hamburger menu button */}
      <button
        className="tab-bar-item tab-bar-menu"
        onClick={onMenuOpen}
        aria-label="القائمة"
      >
        <span className="tab-bar-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </span>
        <span className="tab-bar-label">القائمة</span>
      </button>
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
