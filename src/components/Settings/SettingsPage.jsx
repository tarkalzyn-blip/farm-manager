import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFarm } from '../../context/FarmContext'
import NotificationsTab from './NotificationsTab'
import { auth } from '../../firebaseConfig'
import {
  signOut, updateProfile, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'

/* ─── Theme Definitions ─── */
const THEMES = [
  { id: 'green',  label: 'أخضر',    color: '#3d7a52', sidebar: '#1e3a2f' },
  { id: 'blue',   label: 'أزرق',    color: '#1a6fa8', sidebar: '#0f2d4a' },
  { id: 'purple', label: 'بنفسجي',  color: '#6b3fa0', sidebar: '#2d1a4a' },
  { id: 'brown',  label: 'بني',     color: '#8b5e3c', sidebar: '#3a1f0f' },
  { id: 'teal',   label: 'فيروزي', color: '#1a8a7a', sidebar: '#0f3a35' },
  { id: 'red',    label: 'أحمر',    color: '#b83232', sidebar: '#3a0f0f' },
]

/* ─── Section Tab IDs ─── */
const TABS = [
  { id: 'appearance',    icon: '🎨', label: 'المظهر' },
  { id: 'navigation',    icon: '📢', label: 'شريط التنقل' },
  { id: 'notifications', icon: '🔔', label: 'الإشعارات' },
  { id: 'account',       icon: '👤', label: 'الحساب' },
  { id: 'farm',          icon: '🏡', label: 'المزرعة' },
  { id: 'security',      icon: '🔐', label: 'الأمان' },
]

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function SettingsPage() {
  const {
    user, farmName, setFarmName, currency, setCurrency, showToast,
    appTheme, setAppTheme, fontSize, setFontSize, darkMode, setDarkMode,
    compactMode, setCompactMode, dryPeriodDays, setDryPeriodDays,
    topTabs, updateTopTabs, ALL_PAGES, MAX_TOP_TABS,
    isHeaderSwapped, setIsHeaderSwapped,
    showCowName, setShowCowName
  } = useFarm()

  const [activeTab, setActiveTab] = useState(null)
  const [showEmailModal,    setShowEmailModal]    = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  /* Farm state */
  const [localFarm,     setLocalFarm]     = useState(farmName)
  const [localCurrency, setLocalCurrency] = useState(currency)
  const [localDryDays,  setLocalDryDays]  = useState(dryPeriodDays)
  const [savingFarm, setSavingFarm]       = useState(false)

  /* Account state */
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [savingName,  setSavingName]  = useState(false)

  useEffect(() => { setDisplayName(user?.displayName || '') }, [user?.displayName])

  const saveFarm = () => {
    setSavingFarm(true)
    setFarmName(localFarm)
    setCurrency(localCurrency)
    setDryPeriodDays(localDryDays)
    localStorage.setItem('farmName', localFarm)
    localStorage.setItem('currency', localCurrency)
    setTimeout(() => { setSavingFarm(false); showToast('✅ تم حفظ إعدادات المزرعة') }, 400)
  }

  const saveName = async () => {
    if (!displayName.trim()) { showToast('⚠️ أدخل اسمك', 'error'); return }
    setSavingName(true)
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() })
      showToast('✅ تم تحديث الاسم بنجاح')
    } catch {
      showToast('❌ فشل تحديث الاسم', 'error')
    } finally { setSavingName(false) }
  }

  const doLogout = async () => {
    if (!window.confirm('هل تريد تسجيل الخروج من هذا الجهاز؟')) return
    await signOut(auth)
  }

  return (
    <div>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div>
          <div className="topbar-title">⚙️ الإعدادات</div>
          <div className="topbar-sub">إعدادات الحساب والمزرعة والمظهر</div>
        </div>
      </div>

      <div className="content">
        {/* ── Settings List OR Tab Header ── */}
        {!activeTab ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className="settings-menu-item"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px', border: '1px solid var(--border)', borderRadius: 14,
                  cursor: 'pointer', background: 'var(--card)', color: 'var(--text)',
                  width: '100%', textAlign: 'right', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              >
                <div style={{ 
                  width: 46, height: 46, borderRadius: 12, background: 'var(--hbg)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  flexShrink: 0
                }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{t.label}</div>
                </div>
                <div style={{ color: 'var(--subtext)', opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <button 
              onClick={() => setActiveTab(null)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', border: 'none', borderRadius: 20,
                background: 'var(--hbg)', color: 'var(--text)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: 12
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              القائمة السابقة
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {TABS.find(t => t.id === activeTab)?.icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
                {TABS.find(t => t.id === activeTab)?.label}
              </div>
            </div>
            <div style={{ height: 2, background: 'var(--border)', margin: '16px 0 0', borderRadius: 2 }} />
          </div>
        )}
        
        <div style={{ display: activeTab ? 'block' : 'none' }}>

        {/* ── APPEARANCE TAB ── */}
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Color Theme */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🎨 ثيم الألوان</span>
                <span style={{ fontSize: 12, color: 'var(--subtext)' }}>الثيم الحالي: {THEMES.find(t => t.id === appTheme)?.label}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAppTheme(t.id)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${t.sidebar}, ${t.color})`,
                        border: appTheme === t.id ? `3px solid ${t.color}` : '3px solid #e0e0e0',
                        boxShadow: appTheme === t.id ? `0 0 0 3px ${t.color}35, 0 4px 16px ${t.color}30` : '0 2px 8px rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: appTheme === t.id ? 'scale(1.12)' : 'scale(1)',
                        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                      }}>
                        {appTheme === t.id && <span style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: appTheme === t.id ? 800 : 500, color: appTheme === t.id ? t.color : 'var(--subtext)' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Font Size */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🔠 حجم الخط</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{fontSize}%</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--subtext)', width: 28, flexShrink: 0, textAlign: 'center' }}>أ</span>
                  <input
                    type="range" min={80} max={130} step={5} value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent)', height: 6 }}
                  />
                  <span style={{ fontSize: 17, color: 'var(--subtext)', width: 28, flexShrink: 0, textAlign: 'center' }}>أ</span>
                  <button className="btn btn-xs btn-outline" onClick={() => setFontSize(100)} style={{ flexShrink: 0 }}>↺ إعادة</button>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--hbg)', borderRadius: 10, fontSize: 13, color: 'var(--subtext)' }}>
                  <strong style={{ color: 'var(--text)' }}>معاينة:</strong> نظام إدارة مزرعة الأمل — يمكنك رعاية قطيعك بكفاءة عالية
                </div>
              </div>
            </div>

            {/* Dark + Compact Mode */}
            <div className="card">
              <div className="card-header"><span className="card-title">🌗 وضع العرض</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <ToggleRow
                  icon="🌙" label="الوضع المظلم" desc="خلفية داكنة تريح العينين في الليل"
                  value={darkMode} onChange={() => setDarkMode(v => !v)}
                />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <ToggleRow
                  icon="📐" label="الوضع المضغوط" desc="تقليل المسافات لعرض المزيد من البيانات"
                  value={compactMode} onChange={() => setCompactMode(v => !v)}
                />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <ToggleRow
                  icon="🏷️" label="إظهار هوية البقرة" desc="عرض أو إخفاء الاسم التعريفي داخل كروت الأبقار"
                  value={showCowName} onChange={() => setShowCowName(v => !v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── NAVIGATION TAB CUSTOMIZER ── */}
        {activeTab === 'navigation' && (
          <NavbarCustomizerTab
            topTabs={topTabs}
            updateTopTabs={updateTopTabs}
            ALL_PAGES={ALL_PAGES}
            MAX_TOP_TABS={MAX_TOP_TABS}
            showToast={showToast}
            isHeaderSwapped={isHeaderSwapped}
            setIsHeaderSwapped={setIsHeaderSwapped}
          />
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Profile Card */}
            <div className="card">
              <div className="card-header"><span className="card-title">👤 الملف الشخصي</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 900, color: '#fff', flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(61,122,82,0.3)',
                  }}>
                    {(user?.displayName || user?.email || '؟').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{user?.displayName || 'بدون اسم'}</div>
                    <div style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 2 }}>{user?.email}</div>
                    <span className="badge badge-green" style={{ marginTop: 6 }}>✅ حساب نشط</span>
                  </div>
                </div>

                {/* Edit Name */}
                <div className="form-group">
                  <label>الاسم الكامل</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-control" value={displayName}
                      placeholder="أدخل اسمك الكامل"
                      onChange={e => setDisplayName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={saveName} disabled={savingName} style={{ flexShrink: 0 }}>
                      {savingName ? '⏳' : '💾 حفظ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="card">
              <div className="card-header"><span className="card-title">📋 تفاصيل الحساب</span></div>
              <div className="card-body">
                <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <InfoBox label="📧 البريد الإلكتروني" value={user?.email} small />
                  <InfoBox label="🆔 معرف الحساب" value={`${user?.uid?.slice(0,12)}...`} small />
                  <InfoBox label="📅 تاريخ التسجيل" value={user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ar-SA') : '—'} />
                  <InfoBox label="🕐 آخر دخول" value={user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ar-SA') : '—'} />
                </div>
              </div>
            </div>

            {/* Email Change */}
            <div className="card">
              <div className="card-header"><span className="card-title">📧 البريد الإلكتروني</span></div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{user?.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>البريد المستخدم لتسجيل الدخول</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowEmailModal(true)}>
                  ✏️ تغيير البريد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FARM TAB ── */}
        {activeTab === 'farm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">🏡 معلومات المزرعة</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>🏷️ اسم المزرعة</label>
                    <input className="form-control" value={localFarm} onChange={e => setLocalFarm(e.target.value)} placeholder="اسم مزرعتك" />
                  </div>
                  <div className="form-group">
                    <label>💱 العملة الافتراضية</label>
                    <select className="form-control" value={localCurrency} onChange={e => setLocalCurrency(e.target.value)}>
                      <option value="ل.س">ليرة سورية (ل.س)</option>
                      <option value="ل.ت">ليرة تركية (ل.ت)</option>
                      <option value="$">دولار أمريكي ($)</option>
                      <option value="€">يورو (€)</option>
                      <option value="ر.س">ريال سعودي (ر.س)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">🌿 إعدادات الجفاف والولادة</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>
                    مدة الجفاف قبل الولادة
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--subtext)', marginRight: 6 }}>
                      — (تتحول البقرة لجافة عند باقي ≤ هذا العدد من الأيام)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="number" className="form-control" style={{ width: 120 }}
                      min={30} max={150} step={5} value={localDryDays}
                      onChange={e => setLocalDryDays(parseInt(e.target.value) || 80)}
                    />
                    <span style={{ color: 'var(--subtext)', fontSize: 13 }}>يوم قبل الولادة</span>
                    <button className="btn btn-xs btn-outline" onClick={() => setLocalDryDays(80)}>↺ إعادة (80 يوم)</button>
                  </div>
                </div>
                <div className="info-box" style={{ fontSize: 13 }}>
                  💡 البقرة الحامل التي تبقّى لها أقل من <strong>{localDryDays} يوم</strong> للولادة ستنتقل تلقائياً لحالة "جافة" وتوقف الإنتاج
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={saveFarm}
              disabled={savingFarm}
              style={{ alignSelf: 'flex-start' }}
            >
              {savingFarm ? '⏳ جاري الحفظ...' : '💾 حفظ إعدادات المزرعة'}
            </button>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <NotificationsTab showToast={showToast} />
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Change Password */}
            <div className="card">
              <div className="card-header"><span className="card-title">🔑 كلمة المرور</span></div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>••••••••••••</div>
                  <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>تغيير كلمة المرور الحالية</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowPasswordModal(true)}>
                  🔑 تغيير كلمة المرور
                </button>
              </div>
            </div>

            {/* Change Email */}
            <div className="card">
              <div className="card-header"><span className="card-title">📧 تغيير البريد الإلكتروني</span></div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{user?.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>سيتم إرسال رسالة تحقق للبريد الجديد</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setShowEmailModal(true)}>
                  ✏️ تغيير البريد
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="card" style={{ border: '1.5px solid var(--red)' }}>
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--red)' }}>⚠️ منطقة الخطر</span>
              </div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>تسجيل الخروج</div>
                  <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>ستحتاج إعادة تسجيل الدخول للوصول لبياناتك</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={doLogout}>⏻ تسجيل الخروج</button>
              </div>
            </div>
          </div>
        )}
        </div>

      </div>

      {/* ── MODALS ── */}
      {showEmailModal    && <EmailChangeModal onClose={() => setShowEmailModal(false)}    user={user} showToast={showToast} />}
      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} showToast={showToast} />}
    </div>
  )
}

/* ══════════════════════════════════════════════
   EMAIL CHANGE MODAL
══════════════════════════════════════════════ */
function EmailChangeModal({ onClose, user, showToast }) {
  const [step, setStep]           = useState(1) // 1=form, 2=sent
  const [newEmail, setNewEmail]   = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [errors, setErrors]       = useState({})
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef(null)

  const validate = () => {
    const e = {}
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!newEmail) e.newEmail = 'أدخل البريد الجديد'
    else if (!emailRe.test(newEmail)) e.newEmail = 'البريد الإلكتروني غير صحيح'
    else if (newEmail === user?.email) e.newEmail = 'البريد الجديد مطابق للبريد الحالي'
    if (!confirmEmail) e.confirmEmail = 'أكد البريد الجديد'
    else if (newEmail !== confirmEmail) e.confirmEmail = 'البريدان غير متطابقان'
    if (!password) e.password = 'أدخل كلمة مرورك الحالية'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail)
      setStep(2)
      startCooldown()
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrors({ password: 'كلمة المرور غير صحيحة' })
      } else if (err.code === 'auth/email-already-in-use') {
        setErrors({ newEmail: 'هذا البريد مستخدم من قبل حساب آخر' })
      } else {
        showToast('❌ حدث خطأ: ' + (err.message || 'حاول مرة أخرى'), 'error')
      }
    } finally { setLoading(false) }
  }

  const startCooldown = () => {
    setResendCooldown(60)
    timerRef.current = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0 } return c - 1 })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail)
      showToast('📧 تم إعادة إرسال رسالة التحقق')
      startCooldown()
    } catch {
      showToast('❌ فشل إعادة الإرسال', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return createPortal(
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">📧 تغيير البريد الإلكتروني</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Current Email (read-only) */}
              <div className="form-group">
                <label>📧 البريد الحالي</label>
                <input className="form-control" value={user?.email} readOnly
                  style={{ background: 'var(--hbg)', color: 'var(--subtext)', cursor: 'not-allowed' }} />
              </div>

              {/* New Email */}
              <div className="form-group">
                <label>🆕 البريد الجديد</label>
                <input
                  className={`form-control${errors.newEmail ? ' is-error' : ''}`}
                  type="email" placeholder="example@email.com"
                  value={newEmail} onChange={e => { setNewEmail(e.target.value); setErrors(p => ({ ...p, newEmail: '' })) }}
                  style={{ borderColor: errors.newEmail ? 'var(--red)' : '' }}
                />
                {errors.newEmail && <FieldError msg={errors.newEmail} />}
              </div>

              {/* Confirm Email */}
              <div className="form-group">
                <label>✅ تأكيد البريد الجديد</label>
                <input
                  className={`form-control${errors.confirmEmail ? ' is-error' : ''}`}
                  type="email" placeholder="أعد إدخال البريد الجديد"
                  value={confirmEmail} onChange={e => { setConfirmEmail(e.target.value); setErrors(p => ({ ...p, confirmEmail: '' })) }}
                  style={{ borderColor: errors.confirmEmail ? 'var(--red)' : '' }}
                />
                {errors.confirmEmail && <FieldError msg={errors.confirmEmail} />}
              </div>

              {/* Current Password */}
              <div className="form-group">
                <label>🔑 كلمة المرور الحالية</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={`form-control${errors.password ? ' is-error' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="أدخل كلمة مرورك للتأكيد"
                    value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                    style={{ paddingLeft: 40, borderColor: errors.password ? 'var(--red)' : '' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--subtext)' }}
                  >{showPwd ? '🙈' : '👁️'}</button>
                </div>
                {errors.password && <FieldError msg={errors.password} />}
              </div>

              <div className="info-box" style={{ fontSize: 12 }}>
                🔒 سيتم إرسال رسالة تحقق إلى <strong>{newEmail || 'البريد الجديد'}</strong> — يجب تأكيدها لتغيير البريد
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📨</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--accent)' }}>تم إرسال رسالة التحقق!</div>
              <div style={{ fontSize: 13, color: 'var(--subtext)', lineHeight: 1.7, marginBottom: 20 }}>
                تم إرسال رسالة تحقق إلى<br />
                <strong style={{ color: 'var(--text)' }}>{newEmail}</strong><br />
                افتح بريدك واضغط على رابط التحقق لإتمام التغيير
              </div>
              <div className="ok-box" style={{ textAlign: 'right', fontSize: 13, marginBottom: 16 }}>
                ✉️ تأكد من فحص مجلد الرسائل المهملة (Spam) إذا لم تصلك الرسالة
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
              >
                {loading ? '⏳ جاري الإرسال...' : resendCooldown > 0 ? `⏰ إعادة الإرسال بعد ${resendCooldown}ث` : '🔄 إعادة إرسال الرسالة'}
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          {step === 1 && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ جاري الإرسال...' : '📧 إرسال رسالة التحقق'}
            </button>
          )}
          {step === 2 && (
            <button className="btn btn-primary" onClick={onClose}>✅ إغلاق</button>
          )}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')
  )
}

/* ══════════════════════════════════════════════
   PASSWORD CHANGE MODAL
══════════════════════════════════════════════ */
function PasswordChangeModal({ onClose, showToast }) {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState({})
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    let s = 0
    if (newPwd.length >= 8) s++
    if (/[A-Z]/.test(newPwd)) s++
    if (/[0-9]/.test(newPwd)) s++
    if (/[^A-Za-z0-9]/.test(newPwd)) s++
    setStrength(s)
  }, [newPwd])

  const strengthLabel = ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'][strength]
  const strengthColor = ['', 'var(--red)', 'var(--orange)', 'var(--blue)', 'var(--green)'][strength]

  const validate = () => {
    const e = {}
    if (!currentPwd) e.currentPwd = 'أدخل كلمة المرور الحالية'
    if (!newPwd) e.newPwd = 'أدخل كلمة المرور الجديدة'
    else if (newPwd.length < 8) e.newPwd = 'يجب أن تكون 8 أحرف على الأقل'
    else if (newPwd === currentPwd) e.newPwd = 'كلمة المرور الجديدة مطابقة للحالية'
    if (!confirmPwd) e.confirmPwd = 'أكد كلمة المرور الجديدة'
    else if (newPwd !== confirmPwd) e.confirmPwd = 'كلمتا المرور غير متطابقتين'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPwd)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPwd)
      showToast('✅ تم تغيير كلمة المرور بنجاح')
      onClose()
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrors({ currentPwd: 'كلمة المرور الحالية غير صحيحة' })
      } else {
        showToast('❌ فشل تغيير كلمة المرور: ' + (err.message || ''), 'error')
      }
    } finally { setLoading(false) }
  }

  return createPortal(
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">🔑 تغيير كلمة المرور</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PwdField label="🔒 كلمة المرور الحالية" value={currentPwd} onChange={e => { setCurrentPwd(e.target.value); setErrors(p => ({...p, currentPwd:''})) }}
            show={showCurrent} onToggle={() => setShowCurrent(v=>!v)} error={errors.currentPwd} placeholder="كلمة مرورك الحالية" />

          <PwdField label="🆕 كلمة المرور الجديدة" value={newPwd} onChange={e => { setNewPwd(e.target.value); setErrors(p => ({...p, newPwd:''})) }}
            show={showNew} onToggle={() => setShowNew(v=>!v)} error={errors.newPwd} placeholder="8 أحرف على الأقل" />

          {newPwd.length > 0 && (
            <div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${strength * 25}%`, background: strengthColor, transition: 'width 0.4s, background 0.4s', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: strengthColor }}>{strengthLabel && `قوة كلمة المرور: ${strengthLabel}`}</div>
            </div>
          )}

          <div className="form-group">
            <label>✅ تأكيد كلمة المرور الجديدة</label>
            <div style={{ position: 'relative' }}>
              <input
                className={`form-control${errors.confirmPwd ? ' is-error' : ''}`}
                type="password" placeholder="أعد إدخال كلمة المرور الجديدة"
                value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setErrors(p => ({...p, confirmPwd:''})) }}
                style={{ borderColor: errors.confirmPwd ? 'var(--red)' : '' }}
              />
            </div>
            {errors.confirmPwd && <FieldError msg={errors.confirmPwd} />}
          </div>

          <div className="info-box" style={{ fontSize: 12 }}>
            🛡️ ننصح بكلمة مرور تحتوي حروفاً كبيرة وصغيرة وأرقام ورموز، بطول 8 أحرف على الأقل
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ جاري التغيير...' : '🔑 تغيير كلمة المرور'}
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')
  )
}



/* \u2500\u2500\u2500 Shared Mini Components \u2500\u2500\u2500 */
function ToggleRow({ icon, label, desc, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{icon} {label}</div>
        <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>{desc}</div>
      </div>
      <div
        className={`toggle-track${value ? ' on' : ''}`}
        onClick={onChange}
        style={{ flexShrink: 0, cursor: 'pointer' }}
      />
    </div>
  )
}

function InfoBox({ label, value, small }) {
  return (
    <div className="detail-box">
      <div className="detail-label">{label}</div>
      <div className="detail-value" style={{ fontSize: small ? 12 : undefined, wordBreak: 'break-all' }}>{value || '—'}</div>
    </div>
  )
}

function PwdField({ label, value, onChange, show, onToggle, error, placeholder }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className={`form-control${error ? ' is-error' : ''}`}
          type={show ? 'text' : 'password'}
          placeholder={placeholder} value={value} onChange={onChange}
          style={{ paddingLeft: 40, borderColor: error ? 'var(--red)' : '' }}
        />
        <button type="button" onClick={onToggle}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--subtext)' }}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <FieldError msg={error} />}
    </div>
  )
}

function FieldError({ msg }) {
  return <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>⚠️ {msg}</div>
}

/* ══════════════════════════════════════════════
   NAVBAR CUSTOMIZER TAB
══════════════════════════════════════════════ */
const TAB_ICON_PATHS_SETTINGS = {
  dashboard: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  cows:      ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z','M8 12h8','M12 8v8'],
  breeding:  ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  births:    ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  milk:      ['M8 2h8l1 8H7L8 2z','M7 10c0 6 10 6 10 0'],
  health:    ['M22 12h-4l-3 9L9 3l-3 9H2'],
  feed:      ['M12 2a10 10 0 0 1 10 10','M12 2v10l4.5 4.5'],
  finance:   ['M12 2v20','M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  workers:   ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  reports:   ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8'],
  settings:  ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
}

function MiniTabIcon({ page }) {
  const paths = TAB_ICON_PATHS_SETTINGS[page]
  if (!paths) return null
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(paths) ? paths.map((d, i) => <path key={i} d={d} />) : <path d={paths} />}
    </svg>
  )
}

function NavbarCustomizerTab({ topTabs, updateTopTabs, ALL_PAGES, MAX_TOP_TABS, showToast, isHeaderSwapped, setIsHeaderSwapped }) {
  // Local copy for editing
  const [localTabs, setLocalTabs] = useState([...topTabs])

  // Sync if external changes
  useEffect(() => { setLocalTabs([...topTabs]) }, [topTabs])

  const isEnabled = (page) => localTabs.includes(page)

  const togglePage = (page) => {
    if (isEnabled(page)) {
      // Remove — but keep at least 1
      if (localTabs.length <= 1) {
        showToast('⚠️ يجب إبقاء قسم واحد على الأقل في الشريط', 'error')
        return
      }
      setLocalTabs(prev => prev.filter(p => p !== page))
    } else {
      if (localTabs.length >= MAX_TOP_TABS) {
        showToast(`⚠️ الحد الأقصى ${MAX_TOP_TABS} أقسام في الشريط العلوي`, 'error')
        return
      }
      setLocalTabs(prev => [...prev, page])
    }
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...localTabs]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setLocalTabs(next)
  }

  const moveDown = (idx) => {
    if (idx === localTabs.length - 1) return
    const next = [...localTabs]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setLocalTabs(next)
  }

  const handleSave = () => {
    updateTopTabs(localTabs)
    showToast('✅ تم حفظ تخصيص شريط التنقل')
  }

  const handleReset = () => {
    const def = ['dashboard', 'cows', 'breeding', 'births', 'milk']
    setLocalTabs(def)
    updateTopTabs(def)
    setIsHeaderSwapped(false)
    showToast('🔄 تم استعادة الترتيب الافتراضي')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Preview Bar */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">👁️ معاينة الشريط (صفين)</span>
          <span style={{ fontSize: 12, color: 'var(--subtext)' }}>{localTabs.length}/{MAX_TOP_TABS}</span>
        </div>
        <div className="card-body">
          <div style={{
            display: 'flex', flexDirection: 'column', border: '1.5px solid var(--border)', borderRadius: 14,
            overflow: 'hidden', background: 'var(--card)', direction: 'rtl',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            {/* Row 1 Preview */}
            <div style={{
               display: 'flex', alignItems: 'center', height: 42, padding: '0 12px',
               borderBottom: '1px solid var(--border)', background: 'var(--hbg)',
               flexDirection: isHeaderSwapped ? 'row' : 'row-reverse'
            }}>
               <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
               </div>
               <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>⚙️ الإعدادات</div>
               <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
               </div>
            </div>

            {/* Row 2 Preview */}
            <div style={{ display: 'flex', height: 44 }}>
              {localTabs.map((page) => {
                const info = ALL_PAGES.find(p => p.page === page)
                if (!info) return null
                return (
                  <div key={page} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--accent)', borderBottom: '3px solid var(--accent)',
                  }}>
                    <MiniTabIcon page={page} />
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 8, textAlign: 'center' }}>
            💡 الصف العلوي يحتوي الأزرار والوسط، والصف الثاني يحتوي الأيقونات الـ 5 المخصصة
          </div>
        </div>
      </div>

      {/* Action Buttons Layout */}
      <div className="card">
        <div className="card-header"><span className="card-title">⚙️ تخصيص الأزرار العلوية</span></div>
        <div className="card-body">
           <ToggleRow
             icon="🔄"
             label="تبديل أماكن الأزرار"
             desc="تغيير مكان زر البحث وزر القائمة الجانبية"
             value={isHeaderSwapped}
             onChange={() => setIsHeaderSwapped(!isHeaderSwapped)}
           />
        </div>
      </div>

      {/* Active tabs — reorderable */}
      {localTabs.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">📌 الأقسام النشطة في الشريط</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {localTabs.map((page, idx) => {
              const info = ALL_PAGES.find(p => p.page === page)
              if (!info) return null
              return (
                <div key={page} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--accent3), rgba(61,122,82,0.04))',
                  border: '1.5px solid var(--accent)',
                  direction: 'rtl',
                }}>
                  {/* Drag handle / position */}
                  <span style={{ fontSize: 11, color: 'var(--subtext)', width: 18, textAlign: 'center', fontWeight: 700 }}>
                    {idx + 1}
                  </span>
                  <span style={{ color: 'var(--accent)', display: 'flex' }}>
                    <MiniTabIcon page={page} />
                  </span>
                  <span style={{ flex: 1, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                    {info.label}
                  </span>
                  {/* Move Up */}
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={{
                      width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--card)', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="نقل لليمين"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {/* Move Down */}
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === localTabs.length - 1}
                    style={{
                      width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--card)', cursor: idx === localTabs.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === localTabs.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="نقل لليسار"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  {/* Remove */}
                  <button
                    onClick={() => togglePage(page)}
                    style={{
                      width: 30, height: 30, border: '1px solid var(--red)', borderRadius: 8,
                      background: '#fde8e8', cursor: 'pointer', color: 'var(--red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="إزالة من الشريط"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All available pages — toggle on/off */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 جميع الأقسام المتاحة</span>
          <span style={{
            fontSize: 12, padding: '2px 10px', borderRadius: 20,
            background: localTabs.length >= MAX_TOP_TABS ? '#fde8e8' : 'var(--accent3)',
            color: localTabs.length >= MAX_TOP_TABS ? 'var(--red)' : 'var(--accent)',
            fontWeight: 700,
          }}>
            {localTabs.length >= MAX_TOP_TABS ? `⚠️ الحد الأقصى (${MAX_TOP_TABS})` : `${MAX_TOP_TABS - localTabs.length} متبقي`}
          </span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ALL_PAGES.map(({ page, label, emoji }) => {
            const active = isEnabled(page)
            const atMax = localTabs.length >= MAX_TOP_TABS
            return (
              <div
                key={page}
                onClick={() => togglePage(page)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: active ? 'var(--accent3)' : 'transparent',
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  opacity: !active && atMax ? 0.45 : 1,
                  transition: 'all 0.2s ease',
                  direction: 'rtl',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                <span style={{ flex: 1, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{label}</span>
                {/* Toggle indicator */}
                <div style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: active ? 'var(--accent)' : 'var(--border)',
                  position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 3,
                    right: active ? 3 : 'calc(100% - 21px)',
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'right 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save & Reset buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1, justifyContent: 'center' }}>
          💾 حفظ التخصيص
        </button>
        <button className="btn btn-outline" onClick={handleReset}>
          ↺ إعادة تعيين
        </button>
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--hbg)', fontSize: 12, color: 'var(--subtext)' }}>
        💡 التغييرات تُطبق فوراً بعد الحفظ — الشريط العلوي يتحدث تلقائياً
      </div>
    </div>
  )
}
