import { useState } from 'react'
import { auth } from '../../firebaseConfig'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'

const provider = new GoogleAuthProvider()

function errMsg(code) {
  const map = {
    'auth/email-already-in-use':   'هذا البريد الإلكتروني مسجل مسبقاً.',
    'auth/invalid-email':          'البريد الإلكتروني غير صحيح.',
    'auth/weak-password':          'كلمة المرور ضعيفة جداً (6 أحرف على الأقل).',
    'auth/user-not-found':         'لا يوجد حساب بهذا البريد.',
    'auth/wrong-password':         'كلمة المرور غير صحيحة.',
    'auth/invalid-credential':     'البريد أو كلمة المرور غير صحيحة.',
    'auth/too-many-requests':      'تجاوزت عدد المحاولات. انتظر قليلاً.',
    'auth/popup-closed-by-user':   'تم إغلاق نافذة Google.',
    'auth/popup-blocked':          'يرجى السماح بالنوافذ المنبثقة.',
    'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت.',
  }
  return map[code] || `خطأ: ${code}`
}

export default function AuthPage() {
  const [tab, setTab]       = useState('login')
  const [loading, setLoading] = useState(false)
  const [alertL, setAlertL] = useState(null)
  const [alertS, setAlertS] = useState(null)

  // Login fields
  const [liEmail, setLiEmail] = useState('')
  const [liPwd,   setLiPwd]   = useState('')
  const [liErrors, setLiErrors] = useState({})
  const [showLiPwd, setShowLiPwd] = useState(false)

  // Signup fields
  const [suName,  setSuName]  = useState('')
  const [suFarm,  setSuFarm]  = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPwd,   setSuPwd]   = useState('')
  const [suPwd2,  setSuPwd2]  = useState('')
  const [suAgree, setSuAgree] = useState(false)
  const [suErrors, setSuErrors] = useState({})
  const [showSuPwd, setShowSuPwd] = useState(false)
  const [pwdScore, setPwdScore] = useState(0)

  const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const checkPwd = (pwd) => {
    const score = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[!@#$%^&*]/.test(pwd),
    ].filter(Boolean).length
    setPwdScore(score)
  }

  const doLogin = async () => {
    const errs = {}
    if (!liEmail)          errs.email = 'يرجى إدخال البريد الإلكتروني'
    else if(!isEmail(liEmail)) errs.email = 'صيغة البريد غير صحيحة'
    if (!liPwd)            errs.pwd = 'يرجى إدخال كلمة المرور'
    setLiErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true); setAlertL(null)
    try {
      await signInWithEmailAndPassword(auth, liEmail, liPwd)
    } catch(e) {
      setAlertL({ msg: errMsg(e.code), type: 'err' })
      setLoading(false)
    }
  }

  const doSignup = async () => {
    const errs = {}
    if (!suName)           errs.name = 'يرجى إدخال اسمك'
    if (!suFarm)           errs.farm = 'يرجى إدخال اسم المزرعة'
    if (!suEmail)          errs.email = 'يرجى إدخال البريد'
    else if(!isEmail(suEmail)) errs.email = 'صيغة البريد غير صحيحة'
    if (!suPwd)            errs.pwd = 'يرجى إدخال كلمة المرور'
    else if(suPwd.length < 8) errs.pwd = 'يجب أن تكون 8 أحرف على الأقل'
    if (suPwd !== suPwd2)  errs.pwd2 = 'كلمتا المرور غير متطابقتين'
    setSuErrors(errs)
    if (Object.keys(errs).length) return
    if (!suAgree) { setAlertS({ msg: 'يجب الموافقة على الشروط', type: 'err' }); return }

    setLoading(true); setAlertS(null)
    try {
      const cred = await createUserWithEmailAndPassword(auth, suEmail, suPwd)
      await updateProfile(cred.user, { displayName: suName })
      // Farm name stored in localStorage until Firestore settings doc is created
      localStorage.setItem('farmName', suFarm)
    } catch(e) {
      setAlertS({ msg: errMsg(e.code), type: 'err' })
      setLoading(false)
    }
  }

  const doGoogle = async () => {
    setLoading(true)
    try {
      await signInWithPopup(auth, provider)
    } catch(e) {
      const setter = tab === 'login' ? setAlertL : setAlertS
      setter({ msg: errMsg(e.code), type: 'err' })
      setLoading(false)
    }
  }

  const doForgot = async () => {
    const addr = liEmail || prompt('أدخل بريدك الإلكتروني:')
    if (!addr) return
    if (!isEmail(addr)) { setAlertL({ msg: 'صيغة البريد غير صحيحة', type: 'err' }); return }
    try {
      await sendPasswordResetEmail(auth, addr)
      setAlertL({ msg: `✅ تم إرسال رابط إعادة التعيين إلى ${addr}`, type: 'ok' })
    } catch(e) {
      setAlertL({ msg: errMsg(e.code), type: 'err' })
    }
  }

  const pwdColors  = ['#e0e0e0','#e53935','#ff7043','#fdd835','#43a047']
  const pwdLabels  = ['','ضعيفة جداً','ضعيفة','متوسطة','قوية']

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-icon">🐄</div>
          <div className="auth-brand-name">مزرعة الأمل</div>
          <div className="auth-brand-sub">نظام إدارة المزرعة المتكامل</div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={() => setTab('login')}>
            تسجيل الدخول
          </button>
          <button className={`auth-tab ${tab==='signup'?'active':''}`} onClick={() => setTab('signup')}>
            إنشاء حساب
          </button>
        </div>

        {/* ── LOGIN ─────────────────────── */}
        <div className={`auth-panel ${tab==='login'?'active':''}`}>
          {alertL && <div className={`auth-alert ${alertL.type} show`}>{alertL.msg}</div>}

          <div className="auth-field">
            <label>البريد الإلكتروني</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">📧</span>
              <input className={`auth-input${liErrors.email?' is-error':''}`}
                type="email" placeholder="example@email.com"
                value={liEmail} onChange={e => setLiEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && doLogin()} />
            </div>
            {liErrors.email && <div className="field-error show">{liErrors.email}</div>}
          </div>

          <div className="auth-field">
            <label>كلمة المرور</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔒</span>
              <input className={`auth-input${liErrors.pwd?' is-error':''}`}
                type={showLiPwd?'text':'password'} placeholder="أدخل كلمة المرور"
                value={liPwd} onChange={e => setLiPwd(e.target.value)}
                onKeyDown={e => e.key==='Enter' && doLogin()} />
              <button className="pwd-toggle" onClick={() => setShowLiPwd(p=>!p)}>
                {showLiPwd?'🙈':'👁'}
              </button>
            </div>
            {liErrors.pwd && <div className="field-error show">{liErrors.pwd}</div>}
            <button className="forgot-link" onClick={doForgot}>نسيت كلمة المرور؟</button>
          </div>

          <button className="auth-btn primary" onClick={doLogin} disabled={loading}>
            {loading ? <span className="spinner show" /> : null}
            {!loading && 'تسجيل الدخول'}
          </button>

          <div className="auth-divider"><span>أو الدخول بـ</span></div>
          <GoogleBtn onClick={doGoogle} loading={loading} />
        </div>

        {/* ── SIGNUP ────────────────────── */}
        <div className={`auth-panel ${tab==='signup'?'active':''}`}>
          {alertS && <div className={`auth-alert ${alertS.type} show`}>{alertS.msg}</div>}

          {[
            { label:'الاسم الكامل *', icon:'👤', val:suName, set:setSuName, err:suErrors.name, ph:'محمد أحمد' },
            { label:'اسم المزرعة *', icon:'🏡', val:suFarm, set:setSuFarm, err:suErrors.farm, ph:'مزرعة الأمل' },
            { label:'البريد الإلكتروني *', icon:'📧', val:suEmail, set:setSuEmail, err:suErrors.email, ph:'example@email.com', type:'email' },
          ].map(f => (
            <div className="auth-field" key={f.label}>
              <label>{f.label}</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">{f.icon}</span>
                <input className={`auth-input${f.err?' is-error':''}`}
                  type={f.type||'text'} placeholder={f.ph}
                  value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
              {f.err && <div className="field-error show">{f.err}</div>}
            </div>
          ))}

          <div className="auth-field">
            <label>كلمة المرور *</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔒</span>
              <input className={`auth-input${suErrors.pwd?' is-error':''}`}
                type={showSuPwd?'text':'password'} placeholder="8 أحرف على الأقل"
                value={suPwd} onChange={e => { setSuPwd(e.target.value); checkPwd(e.target.value) }} />
              <button className="pwd-toggle" onClick={() => setShowSuPwd(p=>!p)}>
                {showSuPwd?'🙈':'👁'}
              </button>
            </div>
            {suErrors.pwd && <div className="field-error show">{suErrors.pwd}</div>}
            {suPwd && (
              <div className="pwd-strength">
                <div className="pwd-strength-bar">
                  <div className="pwd-strength-fill" style={{ width:`${pwdScore*25}%`, background:pwdColors[pwdScore] }} />
                </div>
                <span className="pwd-strength-label" style={{ color:pwdColors[pwdScore] }}>{pwdLabels[pwdScore]}</span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label>تأكيد كلمة المرور *</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔐</span>
              <input className={`auth-input${suErrors.pwd2?' is-error':''}`}
                type="password" placeholder="أعد إدخال كلمة المرور"
                value={suPwd2} onChange={e => setSuPwd2(e.target.value)} />
            </div>
            {suErrors.pwd2 && <div className="field-error show">{suErrors.pwd2}</div>}
          </div>

          <div className="auth-agree">
            <input type="checkbox" id="agree" checked={suAgree} onChange={e=>setSuAgree(e.target.checked)} />
            <label htmlFor="agree">أوافق على <a href="#" onClick={e=>e.preventDefault()}>شروط الاستخدام</a></label>
          </div>

          <button className="auth-btn primary" onClick={doSignup} disabled={loading}>
            {loading ? <span className="spinner show" /> : 'إنشاء الحساب'}
          </button>
          <div className="auth-divider"><span>أو إنشاء حساب بـ</span></div>
          <GoogleBtn onClick={doGoogle} loading={loading} />
        </div>
      </div>
    </div>
  )
}

function GoogleBtn({ onClick, loading }) {
  return (
    <button className="auth-btn google" onClick={onClick} disabled={loading}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      المتابعة بحساب Google
    </button>
  )
}
