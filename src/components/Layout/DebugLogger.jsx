import { useState, useEffect, useRef } from 'react'
import { auth } from '../../firebaseConfig'
import { useFarm } from '../../context/FarmContext'

export default function DebugLogger() {
  const farmCtx = useFarm() // Access context safely
  const [logs, setLogs] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    const addLog = (type, args) => {
      const msg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev.slice(-99), { type, msg, time: new Date().toLocaleTimeString() }])
    }

    console.log = (...args) => {
      originalLog(...args)
      addLog('log', args)
    }
    console.error = (...args) => {
      originalError(...args)
      addLog('error', args)
    }
    console.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const checkStatus = () => {
    console.log('🚀 Checking Current App State...')
    console.log('UID:', auth.currentUser?.uid || 'Not found')
    if (farmCtx) {
       console.log('--- Context State ---')
       console.log('Raw Data (Firestore):', farmCtx.rawCows?.length || 0)
       console.log('Processed Data (Worker):', farmCtx.processedCows?.length || 0)
       console.log('Visible in UI (Fallback):', farmCtx.cows?.length || 0)
       console.log('Loading Status:', farmCtx.loading)
    } else {
       console.log('❌ FarmContext not found!')
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 10, left: 10, zIndex: 999999,
          background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none',
          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold'
        }}
      >
        🛠️ Debug
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.95)', color: '#00ff00', zIndex: 999999,
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace', padding: 10
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #333', paddingBottom: 5 }}>
        <span style={{ fontWeight: 'bold' }}>Logs (Last 100)</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={checkStatus} style={{ background: '#225522', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4 }}>Check Status</button>
          <button onClick={() => setLogs([])} style={{ background: '#444', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4 }}>Clear</button>
          <button onClick={() => setIsOpen(false)} style={{ background: '#900', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4 }}>Close</button>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', fontSize: 11 }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: 4, borderBottom: '1px solid #222', paddingBottom: 2 }}>
            <span style={{ color: '#888' }}>[{log.time}]</span>{' '}
            <span style={{ color: log.type === 'error' ? '#ff5555' : log.type === 'warn' ? '#ffff55' : '#55ff55' }}>
              {log.type.toUpperCase()}:
            </span>{' '}
            <pre style={{ margin: 0, display: 'inline', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{log.msg}</pre>
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: '#888' }}>Debug Logger Initialized. Press "Check Status" to begin.</div>}
      </div>
    </div>
  )
}
