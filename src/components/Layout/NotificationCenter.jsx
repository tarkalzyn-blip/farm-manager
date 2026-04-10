import { useFarm } from '../../context/FarmContext'

const typeConfig = {
  success: { icon: '✅', color: 'var(--green)',  bg: '#d5f5e3' },
  error:   { icon: '❌', color: 'var(--red)',    bg: '#fde8e8' },
  warning: { icon: '⚠️', color: 'var(--orange)', bg: '#fde9d9' },
  info:    { icon: 'ℹ️', color: 'var(--blue)',   bg: '#dbeafe' },
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `${Math.floor(diff/60)} دقيقة`
  if (diff < 86400) return `${Math.floor(diff/3600)} ساعة`
  return `${Math.floor(diff/86400)} يوم`
}

export default function NotificationCenter() {
  const { notifOpen, setNotifOpen, notifications, markAllNotifsRead, clearNotifications, allCows: cows, births } = useFarm()
  const unread = notifications.filter(n => !n.read).length

  const renderMsg = (msg) => {
    if (typeof msg !== 'string') return msg;
    const parts = msg.split(/(رقم\s[^\s—()!\s]+)/);
    return parts.map((part, i) => {
      const match = part.match(/رقم\s([^\s—()!\s]+)/);
      if (match) {
        const pId = match[1];
        const pCow = cows?.find(c => c.id === pId);
        const pCalf = births?.find(b => b.calfId === pId);
        const color = pCow ? pCow.tagColor : (pCalf ? (pCalf.calfTagColor || pCalf.tagColor) : 'أزرق');
        const bgColor = color === 'أزرق' ? '#1e88e5' : '#eab308';
        return (
          <span key={i}>
            رقم <strong style={{
              backgroundColor: bgColor,
              color: '#fff',
              padding: '1px 5px',
              borderRadius: 4,
              fontWeight: 800,
              display: 'inline-block',
              margin: '0 2px'
            }}>{pId}</strong>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!notifOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1999, background: 'rgba(0,0,0,0.2)' }}
        onClick={() => setNotifOpen(false)}
      />
      {/* Drawer */}
      <div className="notif-drawer">
        {/* Header */}
        <div className="notif-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>الإشعارات</span>
            {unread > 0 && (
              <span className="nav-badge" style={{ position: 'static' }}>{unread}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {unread > 0 && (
              <button className="btn btn-xs btn-outline" onClick={markAllNotifsRead}>
                ✓ قراءة الكل
              </button>
            )}
            {notifications.length > 0 && (
              <button className="btn btn-xs btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={clearNotifications}>
                🗑 مسح
              </button>
            )}
            <button className="btn btn-xs btn-ghost" onClick={() => setNotifOpen(false)}>✕</button>
          </div>
        </div>

        {/* List */}
        <div className="notif-list">
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--subtext)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 13 }}>لا توجد إشعارات</div>
            </div>
          ) : (
            notifications.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.info
              return (
                <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`}>
                  <span style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: cfg.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, flexShrink: 0
                  }}>{cfg.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{renderMsg(n.msg)}</div>
                      <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
                         {!n.read && (
                           <button className="notif-action-btn" onClick={() => markNotificationRead(n.id)} title="قراءة">✓</button>
                         )}
                         <button className="notif-action-btn delete" onClick={() => deleteNotification(n.id)} title="حذف">×</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--subtext)', marginTop: 3 }}>{timeAgo(n.time)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
