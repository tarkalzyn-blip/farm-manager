import { useState, useEffect, useRef, useCallback } from 'react'
import { useFarm } from '../../context/FarmContext'

export default function GlobalSearch() {
  const { searchOpen, setSearchOpen, cows, births, workers, setPage } = useFarm()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  // Ctrl+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
    }
  }, [searchOpen])

  const q = query.trim().toLowerCase()

  const cowResults = !q ? [] : cows.filter(c =>
    (c.id && c.id.toLowerCase().includes(q)) ||
    (c.status && c.status.includes(q)) ||
    (c.breed && c.breed.toLowerCase().includes(q))
  ).slice(0, 5)

  const calfResults = !q ? [] : births.filter(b =>
    (b.calfId && b.calfId.toLowerCase().includes(q)) ||
    (b.momId && b.momId.toLowerCase().includes(q)) ||
    (b.calfGender && b.calfGender.includes(q))
  ).slice(0, 4)

  const workerResults = !q ? [] : (workers || []).filter(w =>
    (w.name && w.name.toLowerCase().includes(q)) ||
    (w.role && w.role.toLowerCase().includes(q))
  ).slice(0, 3)

  const hasResults = cowResults.length + calfResults.length + workerResults.length > 0

  if (!searchOpen) return null

  return (
    <div
      className="search-overlay"
      onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false) }}
    >
      <div className="search-modal">
        <div className="search-bar">
          <span style={{ fontSize: 20, color: 'var(--subtext)' }}>🔍</span>
          <input
            ref={inputRef}
            className="search-global-input"
            placeholder="ابحث عن بقرة، عجل، عامل..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          <kbd className="search-esc" onClick={() => setSearchOpen(false)}>Esc</kbd>
        </div>

        <div className="search-results">
          {!q && (
            <div style={{ textAlign: 'center', color: 'var(--subtext)', padding: '30px 0', fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              ابدأ الكتابة للبحث في الأبقار، العجول، والعمال
            </div>
          )}

          {q && !hasResults && (
            <div style={{ textAlign: 'center', color: 'var(--subtext)', padding: '30px 0', fontSize:13 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>😕</div>
              لا توجد نتائج لـ «{query}»
            </div>
          )}

          {cowResults.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">🐄 الأبقار</div>
              {cowResults.map(c => (
                <button key={c.firestoreId} className="search-result-item" onClick={() => {
                  setSearchOpen(false)
                  // Navigate to cows page - use window event
                  window.dispatchEvent(new CustomEvent('farm-nav', { detail: 'cows' }))
                }}>
                  <span style={{
                    display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                    background: c.tagColor === 'أزرق' ? '#1e88e5' : '#eab308',
                    color: '#fff', textAlign: 'center', lineHeight: '32px', fontSize: 13,
                    fontWeight: 800, flexShrink: 0
                  }}>{c.id}</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>بقرة رقم {c.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{c.breed} · {c.status}</div>
                  </div>
                  <span className={`badge badge-${c.status === 'مريضة' ? 'red' : c.status === 'حامل' ? 'orange' : 'green'}`} style={{ fontSize: 10 }}>{c.status}</span>
                </button>
              ))}
            </div>
          )}

          {calfResults.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">🐣 العجول</div>
              {calfResults.map(b => (
                <button key={b.firestoreId} className="search-result-item" onClick={() => {
                  setSearchOpen(false)
                  window.dispatchEvent(new CustomEvent('farm-nav', { detail: 'births' }))
                }}>
                  <span style={{
                    display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                    background: (b.calfTagColor || b.tagColor) === 'أزرق' ? '#1e88e5' : '#eab308',
                    color: '#fff', textAlign: 'center', lineHeight: '32px', fontSize: 11,
                    fontWeight: 800, flexShrink: 0
                  }}>🐣</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>عجل #{b.calfId}</div>
                    <div style={{ fontSize: 11, color: 'var(--subtext)' }}>أم: #{b.momId} · {b.birthDate}</div>
                  </div>
                  <span className={`badge badge-${b.calfGender === 'أنثى' ? 'green' : 'blue'}`} style={{ fontSize: 10 }}>{b.calfGender}</span>
                </button>
              ))}
            </div>
          )}

          {workerResults.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">👷 العمال</div>
              {workerResults.map(w => (
                <button key={w.firestoreId} className="search-result-item" onClick={() => {
                  setSearchOpen(false)
                  window.dispatchEvent(new CustomEvent('farm-nav', { detail: 'workers' }))
                }}>
                  <span style={{
                    display: 'inline-block', width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--accent)', color: '#fff', textAlign: 'center',
                    lineHeight: '32px', fontSize: 16, flexShrink: 0
                  }}>👷</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{w.role} · {w.present ? 'حاضر ✅' : 'غائب ❌'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-footer">
          <span><kbd>↑↓</kbd> تنقل</span>
          <span><kbd>↵</kbd> فتح</span>
          <span><kbd>Esc</kbd> إغلاق</span>
          <span><kbd>Ctrl+K</kbd> بحث سريع</span>
        </div>
      </div>
    </div>
  )
}
