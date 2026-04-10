import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ActionMenu({ options }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const handleClick = (e) => {
      // close if click is outside the button AND outside the dropdown
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        !e.target.closest('.action-menu-dropdown')
      ) {
        setOpen(false)
      }
    }
    
    const updatePosition = () => {
      if (open && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        })
      }
    }

    if (open) {
      updatePosition()
      document.addEventListener('mousedown', handleClick)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true) // true to capture scroll in any scrollable parent
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="action-menu" onClick={e => e.stopPropagation()}>
      <button 
        ref={buttonRef}
        className={`action-menu-btn ${open ? 'active' : ''}`} 
        onClick={() => setOpen(!open)}
        title="خيارات"
      >
        &#8942;
      </button>
      {open && createPortal(
        <div 
          className="action-menu-dropdown" 
          style={{ 
            position: 'absolute', 
            top: coords.top, 
            left: coords.left, 
            margin: 0, 
            zIndex: 99999 
          }}
          onClick={e => e.stopPropagation()}
        >
          {options.filter(Boolean).map((opt, i) => (
            <button
              key={i}
              className={`action-menu-item ${opt.danger ? 'danger' : ''}`}
              onClick={() => {
                setOpen(false)
                opt.onClick()
              }}
            >
              {opt.icon && <span className="action-menu-icon">{opt.icon}</span>}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
