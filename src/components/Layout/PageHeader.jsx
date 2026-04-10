import { memo } from 'react'
import { useFarm } from '../../context/FarmContext'

/* ─── Inline SVG Icons ────────────────────────────────────────── */
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"  />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const BellIcon = ({ active }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

/* ─── PageHeader Component ────────────────────────────────────── */
/**
 * Reusable glass-morphism header for all pages.
 *
 * Props:
 *  - title              {string}    Page title (required)
 *  - subtitle           {string}    Optional subtitle / breadcrumb
 *  - icon               {string}    Emoji or string icon next to title
 *  - sidebarToggle      {Function}  Handler to open mobile sidebar
 *  - showSearch         {boolean}   Show global search button
 *  - showNotifs         {boolean}   Show notifications button
 *  - actions            {ReactNode} Slot for extra buttons/controls (right side)
 *  - filterBar          {ReactNode} Slot for filter chips below the main bar
 *  - className          {string}    Extra css class on wrapper
 */
const PageHeader = ({
  title,
  subtitle,
  icon,
  sidebarToggle,
  showSearch = false,
  showNotifs = false,
  actions,
  filterBar,
  className = '',
}) => {
  const { setSearchOpen, notifOpen, setNotifOpen, notifications } = useFarm()
  const unread = (notifications || []).filter(n => !n.read).length

  return (
    <header className={`page-header ${className}`}>
      {/* ── Main bar ── */}
      <div className="page-header-bar">

        {/* Left: hamburger (mobile) */}
        <button
          className="page-header-menu-btn"
          onClick={sidebarToggle}
          aria-label="فتح القائمة"
          title="القائمة"
        >
          <MenuIcon />
        </button>

        {/* Center: title block */}
        <div className="page-header-title-block">
          {icon && (
            <span className="page-header-icon">{icon}</span>
          )}
          <div>
            <h1 className="page-header-title">{title}</h1>
            {subtitle && (
              <p className="page-header-subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="page-header-actions">
          {showSearch && (
            <button
              className="page-header-action-btn"
              onClick={() => setSearchOpen(true)}
              title="بحث سريع (Ctrl+K)"
            >
              <SearchIcon />
              <span className="page-header-action-label">بحث</span>
              <kbd className="page-header-kbd">K</kbd>
            </button>
          )}

          {showNotifs && (
            <button
              className={`page-header-action-btn page-header-notif-btn${notifOpen ? ' active' : ''}`}
              onClick={() => setNotifOpen(o => !o)}
              title="الإشعارات"
            >
              <BellIcon active={notifOpen} />
              {unread > 0 && (
                <span className="page-header-notif-badge">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          )}

          {/* Page-specific action buttons */}
          {actions}
        </div>
      </div>

      {/* ── Filter bar slot (optional) ── */}
      {filterBar && (
        <div className="page-header-filter-bar">
          {filterBar}
        </div>
      )}
    </header>
  )
}

export default memo(PageHeader)
