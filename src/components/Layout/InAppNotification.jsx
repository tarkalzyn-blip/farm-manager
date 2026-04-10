import { useFarm } from '../../context/FarmContext'

export default function InAppNotification() {
  const { inAppBanner, setInAppBanner, setNotifOpen } = useFarm()

  if (!inAppBanner) return null

  const handleOpen = () => {
    setInAppBanner(null)
    setNotifOpen(true)
  }

  return (
    <div className="in-app-notif-container" onClick={handleOpen}>
      <div className="in-app-notif-card">
        <div className="in-app-notif-header">
           <span className="in-app-notif-icon">🔔</span>
           <span className="in-app-notif-title">{inAppBanner.title || 'تنبيه المزرعة'}</span>
           <button className="in-app-notif-close" onClick={(e) => { e.stopPropagation(); setInAppBanner(null); }}>✕</button>
        </div>
        <div className="in-app-notif-body">
          {inAppBanner.msg}
        </div>
        <div className="in-app-notif-progress" />
      </div>
    </div>
  )
}
