import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { auth, db } from '../firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, where, getDocs
} from 'firebase/firestore'

const FarmContext = createContext(null)

export function FarmProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [farmName, setFarmName] = useState('مزرعة الأمل')
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'ل.س')
  const [toasts, setToasts]     = useState([])
  const [confirmDialog, setConfirmDialog] = useState(null)

  // ── Appearance Settings ──
  const [appTheme,    setAppTheme]    = useState(localStorage.getItem('appTheme')    || 'green')
  const [fontSize,    setFontSize]    = useState(parseInt(localStorage.getItem('fontSize'))    || 100)
  const [darkMode,    setDarkMode]    = useState(localStorage.getItem('darkMode')    === 'true')
  const [compactMode, setCompactMode] = useState(localStorage.getItem('compactMode') === 'true')
  const [isHeaderSwapped, setIsHeaderSwapped] = useState(localStorage.getItem('isHeaderSwapped') === 'true')

  // ── Top Navigation Bar (Customizable Tabs) ──
  const ALL_PAGES = [
    { page: 'dashboard', label: 'لوحة التحكم', emoji: '🏠' },
    { page: 'cows',      label: 'الأبقار',      emoji: '🐄' },
    { page: 'breeding',  label: 'التلقيح',      emoji: '💉' },
    { page: 'births',    label: 'الولادات',     emoji: '🐣' },
    { page: 'milk',      label: 'الحليب',       emoji: '🥛' },
    { page: 'health',    label: 'الصحة',        emoji: '🩺' },
    { page: 'feed',      label: 'التغذية',      emoji: '🌾' },
    { page: 'finance',   label: 'المالية',      emoji: '💰' },
    { page: 'workers',   label: 'العمال',       emoji: '👷' },
    { page: 'reports',   label: 'التقارير',     emoji: '📊' },
    { page: 'settings',  label: 'الإعدادات',   emoji: '⚙️' },
  ]

  const DEFAULT_TOP_TABS = ['dashboard', 'cows', 'breeding', 'births', 'milk']
  const MAX_TOP_TABS = 5

  const [topTabs, setTopTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('topNavTabs')
      if (saved) {
        const parsed = JSON.parse(saved)
        // validate — ensure all saved pages still exist
        const validPages = ALL_PAGES.map(p => p.page)
        const valid = parsed.filter(p => validPages.includes(p))
        if (valid.length > 0) return valid.slice(0, MAX_TOP_TABS)
      }
    } catch {}
    return DEFAULT_TOP_TABS
  })

  const updateTopTabs = useCallback((newTabs) => {
    const limited = newTabs.slice(0, MAX_TOP_TABS)
    setTopTabs(limited)
    localStorage.setItem('topNavTabs', JSON.stringify(limited))
  }, [])

  // ── Farm Settings (dryPeriodDays) ──
  const [dryPeriodDays, setDryPeriodDaysState] = useState(
    parseInt(localStorage.getItem('dryPeriodDays')) || 80
  )

  const setDryPeriodDays = useCallback((val) => {
    const n = parseInt(val) || 80
    setDryPeriodDaysState(n)
    localStorage.setItem('dryPeriodDays', n)
  }, [])

  // ── Notification Center ──
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('farmNotifs') || '[]') } catch { return [] }
  })
  const unreadCount = notifications.filter(n => !n.read).length
  const [notifOpen, setNotifOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // ── Network State ──
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // ── Notification Settings & Tokens ──
  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('farmNotifSettings')
      return saved ? JSON.parse(saved) : { enabled: true, vaccines: true, births: true, finance: true }
    } catch {
      return { enabled: true, vaccines: true, births: true, finance: true }
    }
  })
  const [pushToken, setPushToken] = useState(null)
  const [inAppBanner, setInAppBanner] = useState(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Persist notification settings
  useEffect(() => {
    localStorage.setItem('farmNotifSettings', JSON.stringify(notifSettings))
  }, [notifSettings])

  // ── Toast Notification (stacked, 1s) ──
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { msg, type, id }])
    // Add to notification center
    setNotifications(prev => [{ id, msg, type, time: new Date().toISOString(), read: false }, ...prev].slice(0, 100))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 1000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markAllNotifsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const addNotification = useCallback(async (msg, type = 'info', data = {}) => {
    const id = Date.now()
    const newNotif = { id, msg, type, time: new Date().toISOString(), read: false, ...data }
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 100))

    // If app is open, show in-app banner
    if (notifSettings.enabled) {
      setInAppBanner(newNotif)
      setTimeout(() => setInAppBanner(null), 5000)
    }

    // Capacitor Local Notification if needed
    if (notifSettings.enabled && window.Capacitor) {
       import('../services/notificationService').then(({ notificationService }) => {
         notificationService.scheduleLocal(id, 'تنبيه جديد', msg, Date.now() + 1000)
       })
    }
  }, [notifSettings])

  // Initialize Notification Service
  useEffect(() => {
    if (!user) return

    const initNotifs = async () => {
      const { notificationService } = await import('../services/notificationService')
      
      // Init platform-specific notifications
      if (window.Capacitor) {
        await notificationService.initCapacitor()
      } else {
        const token = await notificationService.init()
        if (token) setPushToken(token)
      }

      // Handle direct messages (Foreground)
      const unsub = notificationService.onMessageReceived((payload) => {
        const { title, body } = payload.notification
        addNotification(body, 'info', { title })
      })
      return unsub
    }

    const unsubPromise = initNotifs()
    return () => {
      unsubPromise.then(unsub => unsub && unsub())
    }
  }, [user, addNotification])
  useEffect(() => { localStorage.setItem('isHeaderSwapped', isHeaderSwapped) }, [isHeaderSwapped])
  useEffect(() => { localStorage.setItem('topNavTabs', JSON.stringify(topTabs)) }, [topTabs])
  useEffect(() => {
    try { localStorage.setItem('farmNotifs', JSON.stringify(notifications.slice(0, 100))) } catch {}
  }, [notifications])

  // ── Data State ──
  const [cows, setCows]           = useState([])
  const [milkRecords, setMilkRecords] = useState([])
  const [inseminations, setInseminations] = useState([])
  const [births, setBirths]       = useState([])
  const [healthRecords, setHealthRecords] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [finances, setFinances]   = useState([])
  const [workers, setWorkers]     = useState([])

  const [loading, setLoading] = useState({
    cows: true, milk: true, breeds: true, births: true,
    health: true, finance: true, workers: true,
    stats: true // newly added to track worker calculations
  })

  // ── Worker State ──
  const [activeCows, setActiveCows] = useState([])
  const [activeBirths, setActiveBirths] = useState([])
  const [stats, setStats] = useState({
    totalCows: 0, healthyCows: 0, sickCows: 0, milkingCows: 0, pregnantCows: 0,
    dryCows: 0, maleCalves: 0, femaleCalves: 0, checkCows: 0, failedCows: 0, pendingCows: 0,
    todayMilk: 0, totalRevenue: 0, totalExpenses: 0, totalBirths: 0,
    activeInseminations: [], upcomingVaccinations: [], soonBirths: [], pendingAlerts: [],
    needsInsemination: [], soldCowsCount: 0, soldCalvesCount: 0,
  })

  // ── Initialize Web Worker ──
  const workerRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('../workers/farmWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker
    
    worker.onmessage = (e) => {
      // Update state without blocking main thread interactions heavily
      setActiveCows(e.data.activeCows)
      setActiveBirths(e.data.activeBirths)
      setStats(e.data.stats)
      setLoading(l => ({ ...l, stats: false }))
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, []) // Run once on mount

  // Post message whenever data changes
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        cows, milkRecords, finances, births, inseminations, vaccinations, dryPeriodDays
      })
    }
  }, [cows, milkRecords, finances, births, inseminations, vaccinations, dryPeriodDays])


  // ── Global Confirm Dialog ──
  const showConfirm = useCallback((options) => {
    setConfirmDialog({
      title:        options.title        || 'تأكيد الإجراء',
      message:      options.message      || 'هل أنت متأكد من هذا الإجراء؟',
      confirmLabel: options.confirmLabel || 'تأكيد',
      cancelLabel:  options.cancelLabel  || 'إلغاء',
      type:         options.type         || 'danger',
      icon:         options.icon         || '⚠️',
      onConfirm:    options.onConfirm    || (() => {}),
    })
  }, [])

  const closeConfirm = useCallback(() => setConfirmDialog(null), [])

  // ── Auth Listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  // ── Realtime Listeners (when user is logged in) ──
  useEffect(() => {
    if (!user) return

    const uid   = user.uid
    const base  = (col) => collection(db, 'users', uid, col)
    const unsubs = []

    // Cows
    unsubs.push(onSnapshot(query(base('cows'), orderBy('createdAt', 'desc')), snap => {
      setCows(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, cows: false }))
    }))

    // Milk Records
    unsubs.push(onSnapshot(query(base('milk_records'), orderBy('date', 'desc')), snap => {
      setMilkRecords(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, milk: false }))
    }))

    // Inseminations
    unsubs.push(onSnapshot(query(base('inseminations'), orderBy('insemDate', 'desc')), snap => {
      setInseminations(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, breeds: false }))
    }))

    // Births
    unsubs.push(onSnapshot(query(base('births'), orderBy('birthDate', 'desc')), snap => {
      setBirths(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, births: false }))
    }))

    // Health Records
    unsubs.push(onSnapshot(query(base('health_records'), orderBy('createdAt', 'desc')), snap => {
      setHealthRecords(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, health: false }))
    }))

    // Vaccinations
    unsubs.push(onSnapshot(query(base('vaccinations'), orderBy('scheduledDate', 'asc')), snap => {
      setVaccinations(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
    }))

    // Finances
    unsubs.push(onSnapshot(query(base('finances'), orderBy('date', 'desc')), snap => {
      setFinances(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, finance: false }))
    }))

    // Workers
    unsubs.push(onSnapshot(base('workers'), snap => {
      setWorkers(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(l => ({ ...l, workers: false }))
    }))

    return () => unsubs.forEach(u => u())
  }, [user])

  // ── Auto-Confirm Pregnancy after 23 days + Auto-Dry based on dryPeriodDays ──
  useEffect(() => {
    if (!user || inseminations.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const dryThreshold = 280 - dryPeriodDays  // e.g. 280 - 80 = 200 days after insem

    const autoProcess = async () => {
      for (const insem of inseminations) {
        const days = Math.ceil((new Date(today) - new Date(insem.insemDate)) / 86400000)

        // ── Auto-Confirm at day 23 ──
        if (insem.status === 'pending' && days >= 23) {
          await updateDoc(doc(db, 'users', user.uid, 'inseminations', insem.firestoreId), { status: 'confirmed' })
          const cow = cows.find(c => c.firestoreId === insem.cowFirestoreId)
          if (cow) {
            await updateDoc(doc(db, 'users', user.uid, 'cows', cow.firestoreId), { status: 'حامل' })
          }
          showToast(`✅ تأكيد حمل تلقائي — بقرة رقم ${insem.cowId} (يوم ${days})`, 'success')
        }

        // ── Auto-Dry based on dryPeriodDays (when daysRemaining <= dryPeriodDays) ──
        if (insem.status === 'confirmed' && days >= dryThreshold) {
          const cow = cows.find(c => c.firestoreId === insem.cowFirestoreId)
          if (cow && cow.status === 'حامل' && (cow.milk || 0) > 0) {
            await updateDoc(doc(db, 'users', user.uid, 'cows', cow.firestoreId), { status: 'جافة', milk: 0 })
            showToast(`🌿 تنشيف تلقائي — بقرة رقم ${insem.cowId} — باقي ${dryPeriodDays} يوم للولادة`, 'success')
          }
        }
      }
    }
    autoProcess()
  }, [inseminations.length, user, dryPeriodDays])

  // ── Helper: Firestore path ──
  const col = (name) => collection(db, 'users', user.uid, name)
  const ref = (name, id) => doc(db, 'users', user.uid, name, id)

  // ══════════════════════════════════
  //  COW SERVICES
  // ══════════════════════════════════
  const addCow = async (data) => {
    await addDoc(col('cows'), { ...data, births: 0, createdAt: serverTimestamp() })
    showToast(`🐄 تمت إضافة البقرة رقم ${data.id}`)
  }

  const updateCow = async (firestoreId, data) => {
    await updateDoc(ref('cows', firestoreId), data)
    showToast(`✅ تم تحديث البيانات`)
  }

  const deleteCow = async (firestoreId, cowId) => {
    await deleteDoc(ref('cows', firestoreId))
    showToast(`🗑 تم حذف البقرة رقم ${cowId}`)
  }

  // ══════════════════════════════════
  //  MILK SERVICES
  // ══════════════════════════════════
  const addMilkRecord = async (data) => {
    await addDoc(col('milk_records'), { ...data, createdAt: serverTimestamp() })
    showToast(`🥛 تم تسجيل ${data.amount} لتر`)
  }

  const deleteMilkRecord = async (firestoreId) => {
    await deleteDoc(ref('milk_records', firestoreId))
    showToast('تم الحذف')
  }

  // ══════════════════════════════════
  //  SMART INSEMINATION SERVICES ⭐
  // ══════════════════════════════════
  const addInsemination = async ({ cowId, cowFirestoreId, insemDate, type, bullId }) => {
    const insemTs = new Date(insemDate).getTime()

    const existing = inseminations.filter(i =>
      (i.cowFirestoreId === cowFirestoreId) &&
      i.status === 'pending' &&
      Math.abs(insemTs - new Date(i.insemDate).getTime()) <= 23 * 86400000
    )

    for (const prev of existing) {
      await updateDoc(ref('inseminations', prev.firestoreId), { status: 'failed' })
    }

    const newInsem = {
      cowId, cowFirestoreId, insemDate,
      type: type || 'صناعي',
      bullId: bullId || '—',
      status: 'pending',
      expectedBirth: addDays(insemDate, 280),
      confirmDate: addDays(insemDate, 23),
      alertDate: addDays(insemDate, 20),
      createdAt: serverTimestamp(),
    }
    await addDoc(col('inseminations'), newInsem)

    if (cowFirestoreId) {
      await updateDoc(ref('cows', cowFirestoreId), {
        status: 'pending_insem',
        lastInsemDate: insemDate,
        currentInsemDate: insemDate
      })
    }

    showToast(`🐂 تم تسجيل تلقيح البقرة رقم ${cowId} — التأكيد خلال 23 يوم`)
  }

  const confirmPregnancy = async (insemFirestoreId, cowFirestoreId) => {
    await updateDoc(ref('inseminations', insemFirestoreId), { status: 'confirmed' })
    await updateDoc(ref('cows', cowFirestoreId), { status: 'حامل' })
    showToast('✅ تم تأكيد الحمل — البقرة تستمر في الحلب حتى التنشيف التلقائي')
  }

  const markInsemFailed = async (insemFirestoreId, cowFirestoreId) => {
    await updateDoc(ref('inseminations', insemFirestoreId), { status: 'failed' })
    const cow = cows.find(c => c.firestoreId === cowFirestoreId)
    if (cow) await updateDoc(ref('cows', cowFirestoreId), { status: 'سليمة', currentInsemDate: null })
    showToast('❌ تم تسجيل التلقيح كفاشل')
  }

  const updateInsemination = async (firestoreId, data) => {
    await updateDoc(ref('inseminations', firestoreId), data)
    showToast('✅ تم تحديث بيانات التلقيح')
  }

  const deleteInsemination = async (firestoreId, cowFirestoreId) => {
    await deleteDoc(ref('inseminations', firestoreId))
    const cow = cows.find(c => c.firestoreId === cowFirestoreId)
    if (cow && (cow.status === 'pending_insem' || cow.status === 'حامل')) {
      await updateDoc(ref('cows', cow.firestoreId), { status: 'سليمة', currentInsemDate: null })
    }
    showToast('🗑 تم حذف التلقيح')
  }

  // ══════════════════════════════════
  //  BIRTH SERVICES
  // ══════════════════════════════════
  const registerBirth = async ({ momFirestoreId, momId, birthDate, birthType,
    momStatusAfter, momMilkAfter, momWeightAfter,
    calfGender, calfWeight, calfStatus, calfId, calfTagColor, calfPlan, careNotes,
    insemFirestoreId, count }) => {

    const finalCalfId = calfId || generateCalfId()
    await addDoc(col('births'), {
      momFirestoreId,
      momId,
      birthDate, birthType: birthType || 'طبيعية',
      calfId: finalCalfId,
      tagColor: calfTagColor || 'أصفر',
      calfGender, calfWeight: calfWeight || 30,
      calfStatus: calfStatus || 'سليم',
      plan: calfPlan || (calfGender === 'أنثى' ? 'للقطيع' : 'تسمين'),
      careNotes: careNotes || '',
      count: count || 1,
      createdAt: serverTimestamp(),
    })

    const cow = cows.find(c => c.firestoreId === momFirestoreId)
    await updateDoc(ref('cows', momFirestoreId), {
      status: momStatusAfter || 'سليمة',
      milk: momStatusAfter === 'سليمة' ? (momMilkAfter || cow?.milk || 20) : 0,
      weight: momWeightAfter || cow?.weight || 0,
      births: (cow?.births || 0) + 1,
      lastBirthDate: birthDate,
      currentInsemDate: null,
      insem: null,
    })

    if (insemFirestoreId) {
      await updateDoc(ref('inseminations', insemFirestoreId), { status: 'completed' })
    }

    // If female calf → add to herd; male calf → add separately with gender flag
    if (calfGender === 'أنثى' && calfPlan === 'للقطيع') {
      await addDoc(col('cows'), {
        id: finalCalfId,
        tagColor: calfTagColor || 'أصفر',
        breed: cow?.breed || 'هولشتاين',
        gender: 'female',
        age: 0,
        birthDate: birthDate,
        weight: calfWeight || 30,
        status: 'سليمة',
        milk: 0,
        purchaseDate: birthDate,
        notes: `مولودة من رقم ${momId} — ${birthDate}`,
        source: 'من المزرعة',
        momId: momId,
        momTagColor: cow?.tagColor || 'أصفر',
        births: 0,
        createdAt: serverTimestamp(),
      })
    } else if (calfGender === 'ذكر' && calfPlan === 'للقطيع') {
      await addDoc(col('cows'), {
        id: finalCalfId,
        tagColor: calfTagColor || 'أصفر',
        breed: cow?.breed || 'هولشتاين',
        gender: 'male',
        age: 0,
        birthDate: birthDate,
        weight: calfWeight || 30,
        status: 'سليمة',
        milk: 0,
        purchaseDate: birthDate,
        notes: `مولود (ذكر) من رقم ${momId} — ${birthDate}`,
        source: 'من المزرعة',
        momId: momId,
        momTagColor: cow?.tagColor || 'أصفر',
        births: 0,
        createdAt: serverTimestamp(),
      })
    }

    showToast(`🐣 تم تسجيل ولادة البقرة رقم ${momId} ! مبروك 🎉`)
  }

  const deleteBirth = async (firestoreId, calfId) => {
    await deleteDoc(ref('births', firestoreId))
    showToast(`🗑 تم حذف سجل ولادة العجل رقم ${calfId || ''}`)
  }

  // ══════════════════════════════════
  //  HEALTH SERVICES
  // ══════════════════════════════════
  const addHealthRecord = async (data) => {
    await addDoc(col('health_records'), { ...data, status: 'under_treatment', createdAt: serverTimestamp() })
    const cowIdToUpdate = data.cowFirestoreId || data.cowId
    if (cowIdToUpdate) {
      await updateDoc(ref('cows', cowIdToUpdate), { status: 'مريضة', notes: data.disease })
    }
    showToast(`💉 تم تسجيل ${data.disease}`)
  }

  const markCowRecovered = async (recordFirestoreId, cowFirestoreId) => {
    await updateDoc(ref('health_records', recordFirestoreId), { status: 'recovered' })
    await updateDoc(ref('cows', cowFirestoreId), { status: 'سليمة', notes: '' })
    showToast('✅ تعافت البقرة')
  }

  const addVaccination = async (data) => {
    await addDoc(col('vaccinations'), { ...data, done: false, createdAt: serverTimestamp() })
    showToast(`💉 تمت جدولة: ${data.type}`)
  }

  const markVaccinationDone = async (firestoreId) => {
    await updateDoc(ref('vaccinations', firestoreId), { done: true, doneDate: new Date().toISOString().split('T')[0] })
    showToast('✅ تم التطعيم')
  }

  const deleteHealthRecord = async (firestoreId) => {
    await deleteDoc(ref('health_records', firestoreId))
    showToast('🗑 تم حذف السجل')
  }

  const deleteVaccination = async (firestoreId) => {
    await deleteDoc(ref('vaccinations', firestoreId))
    showToast('🗑 تم حذف التطعيم')
  }

  // ══════════════════════════════════
  //  FINANCE SERVICES
  // ══════════════════════════════════
  const addRevenue = async (data) => {
    await addDoc(col('finances'), { ...data, kind: 'revenue', createdAt: serverTimestamp() })
    showToast(`💵 إيراد: ${data.amount.toLocaleString()} ${currency}`)
  }

  const addExpense = async (data) => {
    await addDoc(col('finances'), { ...data, kind: 'expense', createdAt: serverTimestamp() })
    showToast(`💸 مصروف: ${data.amount.toLocaleString()} ${currency}`)
  }

  const deleteFinanceRecord = async (firestoreId) => {
    await deleteDoc(ref('finances', firestoreId))
    showToast('تم الحذف')
  }

  // ══════════════════════════════════
  //  WORKER SERVICES
  // ══════════════════════════════════
  const addWorker = async (data) => {
    await addDoc(col('workers'), { ...data, present: true, createdAt: serverTimestamp() })
    showToast(`👷 تمت إضافة ${data.name}`)
  }

  const toggleWorkerAttendance = async (firestoreId, current) => {
    await updateDoc(ref('workers', firestoreId), { present: !current })
    showToast(!current ? '✅ تسجيل حضور' : '❌ تسجيل غياب')
  }

  const deleteWorker = async (firestoreId, name) => {
    await deleteDoc(ref('workers', firestoreId))
    showToast(`🗑 تم حذف ${name}`)
  }

  // ══════════════════════════════════
  //  SALES & INTEGRATION SERVICES
  // ══════════════════════════════════
  const sellAnimal = async (animalType, firestoreId, animalId, animalName, price, party, date) => {
    const today = new Date().toISOString().split('T')[0]
    await addDoc(col('finances'), {
      type: animalType === 'cow' ? 'بيع بقرة' : 'بيع عجل',
      amount: parseInt(price),
      date: date || today,
      party: party || 'غير محدد',
      details: `رقم الحيوان: ${animalId} | الاسم: ${animalName}`,
      animalFirestoreId: firestoreId,
      animalType: animalType,
      animalId: animalId,
      animalName: animalName,
      kind: 'revenue',
      createdAt: serverTimestamp()
    })

    if (animalType === 'cow') {
      await updateDoc(ref('cows', firestoreId), { status: 'مباعة', isSold: true, sellPrice: parseInt(price), sellDate: date || today })
    } else {
      await updateDoc(ref('births', firestoreId), { plan: 'مباع', calfStatus: 'مباع', isSold: true, sellPrice: parseInt(price), sellDate: date || today })
      const existingInCows = cows.find(c => c.id === animalId)
      if (existingInCows) {
        await updateDoc(ref('cows', existingInCows.firestoreId), { status: 'مباعة', isSold: true, sellPrice: parseInt(price), sellDate: date || today })
      }
    }

    showToast(`✅ تم بيع ${animalName} وتسجيل الإيراد بنجاح`)
  }

  // ══════════════════════════════════
  //  COW CLASSIFICATION — MULTI-TAG 🎯
  // ══════════════════════════════════
  /**
   * classifyCow — returns string[] of tags.
   * A cow can have MULTIPLE tags at the same time.
   *
   * Possible tags:
   *   'maleCalf' | 'calf'   | 'sick'    | 'check'
   *   'failed'   | 'dry'    | 'pregnant'| 'milk'
   *   'noInsemination'
   *
   * Examples:
   *   Milking pregnant cow   → ["pregnant", "milk"]
   *   Dry pregnant cow       → ["pregnant", "dry"]
   *   Under insem watch      → ["check"]
   *   Failed insem           → ["failed"]
   */
  const classifyCow = useCallback((cow) => {
    const tags = []
    const today = new Date().toISOString().split('T')[0]
    const dryDays = dryPeriodDays || 80

    // ── Age in months ──
    const ageMonths = cow.birthDate
      ? Math.floor((new Date(today) - new Date(cow.birthDate)) / (86400000 * 30.44))
      : (parseFloat(cow.age) ? parseFloat(cow.age) * 12 : 9999)

    // ① عجل ذكر
    if (ageMonths < 6 && (cow.gender === 'male' || cow.gender === 'ذكر')) return ['maleCalf']

    // ② عجلة أنثى
    if (ageMonths < 6) return ['calf']

    // ③ مريضة
    if (cow.status === 'مريضة') tags.push('sick')

    // ④ فحص التلقيح
    const pendingInsem = inseminations.find(i =>
      (i.cowFirestoreId === cow.firestoreId) &&
      i.status === 'pending'
    )
    let hasCheckOrFailed = false
    if (pendingInsem) {
      const d = Math.ceil((new Date(today) - new Date(pendingInsem.insemDate)) / 86400000)
      tags.push(d < 23 ? 'check' : 'failed')
      hasCheckOrFailed = true
    }

    // ⑤ تحديد الحمل والتنشيف والحليب
    let isPregnant = false
    let isDry = false

    const confirmedInsem = inseminations.find(i =>
      (i.cowFirestoreId === cow.firestoreId) &&
      i.status === 'confirmed'
    )

    if (confirmedInsem) {
      isPregnant = true
      const exp = new Date(confirmedInsem.insemDate)
      exp.setDate(exp.getDate() + 280)
      const daysRemaining = Math.ceil((exp - new Date(today)) / 86400000)
      
      if (daysRemaining <= dryDays) {
        isDry = true
      }
    } else if (cow.status === 'حامل') {
      isPregnant = true
    } else if (cow.status === 'جافة') {
      isPregnant = true
      isDry = true
    }

    // ⑥ تطبيق قاعدة الحليب والتجفيف
    if (isPregnant) {
      tags.push('pregnant')
      if (isDry) {
        tags.push('dry')
      } else {
        tags.push('milk')
      }
    } else {
      const producesMilk = cow && typeof cow.milk !== 'undefined' && Number(cow.milk) > 0;
      if (ageMonths >= 21 || (hasCheckOrFailed && producesMilk)) {
        tags.push('milk');
      }
    }

    if (!isPregnant && !hasCheckOrFailed && ageMonths >= 21) {
      tags.push('noInsemination')
    }

    return tags
  }, [inseminations, dryPeriodDays])

  // ══════════════════════════════════
  //  DATE HELPERS — must be defined BEFORE stats useMemo
  // ══════════════════════════════════
  const daysBetween = useCallback((d1, d2) => {
    return Math.ceil((new Date(d2) - new Date(d1)) / 86400000)
  }, [])

  const addDays = useCallback((date, n) => {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }, [])

  const daysLeft = useCallback((insemDate) => {
    const today = new Date().toISOString().split('T')[0]
    const exp = addDays(insemDate, 280)
    return daysBetween(today, exp)
  }, [addDays, daysBetween])

  const generateCalfId = useCallback(() => {
    return `#C-${String(births.length + 1).padStart(3, '0')}`
  }, [births.length])

  // ══════════════════════════════════
  //  FORMAT AGE HELPER
  // ══════════════════════════════════
  function formatAge(birthDate, fallbackAge) {

    if (!birthDate) {
      const yrs = parseFloat(fallbackAge) || 0
      if (yrs === 0) return '—'
      return `${yrs} سنة`
    }
    const dob = new Date(birthDate)
    const now = new Date()
    if (isNaN(dob.getTime())) {
      const yrs = parseFloat(fallbackAge) || 0
      return yrs > 0 ? `${yrs} سنة` : '—'
    }

    let y = now.getFullYear() - dob.getFullYear()
    let m = now.getMonth()   - dob.getMonth()
    let d = now.getDate()    - dob.getDate()

    if (d < 0) {
      m--
      const prev = new Date(now.getFullYear(), now.getMonth(), 0)
      d += prev.getDate()
    }
    if (m < 0) { y--; m += 12 }

    if (y === 0 && m === 0 && d === 0) return '🐣 مولود جديد'
    if (y === 0 && m === 0) return `${d} يوم`

    const parts = []
    if (y > 0) parts.push(`${y} سنة`)
    if (m > 0) parts.push(`${m} شهر`)
    if (d > 0) parts.push(`${d} يوم`)
    return parts.join(' و ')
  }

  const value = useMemo(() => ({
    user, authLoading, farmName, setFarmName, currency, setCurrency,
    // Top Navigation
    topTabs, updateTopTabs, ALL_PAGES, MAX_TOP_TABS,
    // Farm Settings
    dryPeriodDays, setDryPeriodDays,
    // Toast
    toasts, showToast, dismissToast,
    // Confirm Dialog
    confirmDialog, showConfirm, closeConfirm,
    // Appearance
    appTheme, setAppTheme, fontSize, setFontSize, darkMode, setDarkMode, compactMode, setCompactMode,
    isHeaderSwapped, setIsHeaderSwapped,
    // Notifications
    notifications, unreadCount, notifOpen, setNotifOpen, searchOpen, setSearchOpen,
    markAllNotifsRead, markNotificationRead, deleteNotification, clearNotifications, addNotification,
    notifSettings, setNotifSettings, inAppBanner, setInAppBanner, pushToken,
    // Network
    isOnline,
    // Data
    cows: activeCows,
    allCows: cows,
    milkRecords, inseminations,
    births: activeBirths,
    allBirths: births,
    healthRecords, vaccinations, finances, workers,
    loading, stats,
    // Cow Classification
    classifyCow,
    // Cow actions
    addCow, updateCow, deleteCow,
    // Milk actions
    addMilkRecord, deleteMilkRecord,
    // Breeding actions
    addInsemination, confirmPregnancy, markInsemFailed, updateInsemination, deleteInsemination,
    // Birth actions
    registerBirth, deleteBirth,
    // Health actions
    addHealthRecord, markCowRecovered, addVaccination, markVaccinationDone, deleteHealthRecord, deleteVaccination,
    // Finance actions
    addRevenue, addExpense, deleteFinanceRecord,
    // Sale Action
    sellAnimal,
    // Worker actions
    addWorker, toggleWorkerAttendance, deleteWorker,
    // Helpers
    daysBetween, daysLeft, addDays, generateCalfId, formatAge,
  }), [
    user, authLoading, farmName, currency, toasts, confirmDialog,
    appTheme, fontSize, darkMode, compactMode, isHeaderSwapped,
    notifications, unreadCount, notifOpen, searchOpen,
    isOnline,
    dryPeriodDays,
    topTabs, updateTopTabs,
    activeCows, cows, milkRecords, inseminations, activeBirths, births, healthRecords, vaccinations, finances, workers, loading, stats,
    classifyCow, daysBetween, daysLeft, addDays, generateCalfId,
    showToast, showConfirm, closeConfirm, dismissToast, markAllNotifsRead, clearNotifications, addNotification
  ])

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export const useFarm = () => {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be inside FarmProvider')
  return ctx
}
