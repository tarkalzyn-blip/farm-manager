import { memo, useEffect, useRef } from 'react'
import { useFarm } from '../../context/FarmContext'

const typeConfig = {
  success: { icon: '✅', bg: '#1a7a42' },
  error:   { icon: '❌', bg: '#b83232' },
  warning: { icon: '⚠️', bg: '#c95a00' },
  info:    { icon: 'ℹ️', bg: '#1a5c8a' },
}

// ── نغمة افتراضية خفيفة (beep WAV مضغوط base64 صالح) ──
const DEFAULT_BEEP = (() => {
  // نبنيها بـ AudioContext بدلاً من base64 لضمان التوافق
  return null // سيتم توليدها برمجياً
})()

function playNotifSound() {
  try {
    const enabled = localStorage.getItem('notifSoundEnabled')
    if (enabled === 'false') return

    const volume  = parseFloat(localStorage.getItem('notifSoundVolume') || '0.7')
    const custom  = localStorage.getItem('notifSoundUrl') || ''

    if (custom) {
      // نغمة مخصصة من الإعدادات
      const audio = new Audio(custom)
      audio.volume = Math.min(1, Math.max(0, volume))
      audio.play().catch(() => {})
      return
    }

    // نغمة مولّدة بـ Web Audio API (تعمل دون ملف خارجي)
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => ctx.close()
  } catch (_) {}
}

const AlertToast = memo(function AlertToast() {
  const { toasts, dismissToast, allCows: cows, births } = useFarm()
  const prevCountRef = useRef(0)

  // تشغيل صوت عند كل toast جديد
  useEffect(() => {
    if (toasts.length > prevCountRef.current) {
      playNotifSound()
    }
    prevCountRef.current = toasts.length
  }, [toasts.length])

  if (!toasts || toasts.length === 0) return null

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

  return (
    <div style={{
      position: 'fixed', top: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const cfg = typeConfig[toast.type] || typeConfig.success
        return (
          <div
            key={toast.id}
            className="alert-toast show"
            style={{ background: cfg.bg, pointerEvents: 'auto', position: 'relative' }}
          >
            <span style={{ fontSize: 16 }}>{cfg.icon}</span>
            <span style={{ flex: 1 }}>{renderMsg(toast.msg)}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                color: '#fff', cursor: 'pointer', fontSize: 13, padding: '1px 6px',
                fontWeight: 700, marginRight: 4, lineHeight: 1.4
              }}
            >✕</button>
          </div>
        )
      })}
    </div>
  )
})

export default AlertToast
