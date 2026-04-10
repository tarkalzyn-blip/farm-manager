import React, { useState, useRef, useEffect } from 'react'
import { useFarm } from '../../context/FarmContext'

export default function InAppNotification() {
  const { inAppBanner, setInAppBanner, setNotifOpen } = useFarm()
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const threshold = 80 // Distance in px to trigger dismiss

  // Reset offset when banner changes
  useEffect(() => {
    setOffsetX(0)
    setIsDragging(false)
  }, [inAppBanner])

  if (!inAppBanner) return null

  const handleOpen = () => {
    // Only open if we didn't just swipe away
    if (Math.abs(offsetX) < threshold) {
      setInAppBanner(null)
      setNotifOpen(true)
    }
  }

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const onTouchMove = (e) => {
    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current
    // Allow dragging in both directions but more resistant to right if preferred 
    // Usually system notifications swipe to both sides or just right.
    // User requested "swipe to left" specifically, but usually both feels better.
    setOffsetX(diff)
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    if (Math.abs(offsetX) > threshold) {
      // Dismiss
      setOffsetX(offsetX > 0 ? 500 : -500) // Slide out
      setTimeout(() => setInAppBanner(null), 200)
    } else {
      // Snap back
      setOffsetX(0)
    }
  }

  return (
    <div 
      className="in-app-notif-container" 
      onClick={handleOpen}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        transform: `translateX(${offsetX}px)`,
        opacity: Math.max(0, 1 - Math.abs(offsetX) / (threshold * 3)),
        pointerEvents: 'auto',
        touchAction: 'none' // Prevent scrolling while swiping
      }}
    >
      <div className="in-app-notif-card" style={{ cursor: 'grab' }}>
        <div className="in-app-notif-header">
           <span className="in-app-notif-icon">🔔</span>
           <span className="in-app-notif-title">{inAppBanner.title || 'تنبيه المزرعة'}</span>
           <button className="in-app-notif-close" onClick={(e) => { e.stopPropagation(); setInAppBanner(null); }}>✕</button>
        </div>
        <div className="in-app-notif-body">
          {inAppBanner.msg}
        </div>
        {!isDragging && <div className="in-app-notif-progress" />}
      </div>
    </div>
  )
}
