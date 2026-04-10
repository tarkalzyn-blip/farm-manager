import React, { useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'

export default function NotificationsPage() {
  const { 
    notifications, markAllNotifsRead, markNotificationRead, 
    deleteNotification, clearNotifications 
  } = useFarm()

  // Mark all as read when opening the page
  useEffect(() => {
    markAllNotifsRead()
  }, [markAllNotifsRead])

  const getIcon = (type) => {
    switch(type) {
      case 'vaccine': return '💉'
      case 'birth':   return '🐣'
      case 'finance': return '💰'
      case 'milk':    return '🥛'
      case 'temp':    return '🌡️'
      default:        return '🔔'
    }
  }

  const getTimeLabel = (isoDate) => {
    if (!isoDate) return ''
    const date = new Date(isoDate)
    const now  = new Date()
    const diff = Math.floor((now - date) / 1000) // seconds

    if (diff < 60) return 'الآن'
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="page-content" style={{ padding: '20px 16px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>الإشعارات</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-xs btn-outline"
            onClick={clearNotifications}
            style={{ borderRadius: 20, padding: '4px 12px', border: '1.5px solid var(--border)' }}
          >
            مسح الكل
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          height: '60vh', opacity: 0.5, textAlign: 'center' 
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>لا توجد إشعارات حالياً</div>
          <div style={{ fontSize: 13 }}>سنخطرك بآخر التحديثات فور حدوثها</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              className={`card notif-card ${!notif.read ? 'unread' : ''}`}
              style={{
                display: 'flex', gap: 14, padding: 16, cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
                borderRight: !notif.read ? '5px solid var(--accent)' : '1px solid var(--border)'
              }}
              onClick={() => markNotificationRead(notif.id)}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: 14, 
                background: !notif.read ? 'var(--accent3)' : 'var(--hbg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                flexShrink: 0
              }}>
                {getIcon(notif.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 15, fontWeight: !notif.read ? 900 : 700, color: 'var(--text)' }}>
                    {notif.title || 'تنبیه'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 500 }}>
                    {getTimeLabel(notif.time)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 4, lineHeight: 1.4 }}>
                  {notif.msg}
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                style={{
                  background: 'none', border: 'none', color: 'var(--red)', 
                  opacity: 0.3, cursor: 'pointer', padding: 4, marginLeft: -8
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.3}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .notif-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notif-card:active {
          transform: scale(0.98);
        }
        .notif-card.unread {
           background: var(--card);
           box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  )
}
