import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';

/* ── Shared Mini Components ── */
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
  );
}

export default function NotificationsTab({ showToast }) {
  const { 
    notifSettings, setNotifSettings, addNotification, pushToken,
    notifSound, setNotifSound, playNotifSound
  } = useFarm();
  
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      showToast('⚠️ المتصفح لا يدعم الإشعارات', 'error');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') showToast('✅ تم تفعيل الإشعارات بنجاح');
    else showToast('❌ لم يتم منح صلاحية الإشعارات', 'error');
  };

  const toggleNotification = (field) => {
    setNotifSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Platform Status ── */}
      <div className="card">
        <div className="card-header"><span className="card-title">📱 حالة الجهاز</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: pushToken ? 16 : 0 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>صلاحية إشعارات النظام</div>
              <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>
                {permission === 'granted' ? '✅ مسموحة' : (permission === 'denied' ? '❌ محظورة' : '⏳ بانتظار الموافقة')}
              </div>
            </div>
            {permission !== 'granted' && (
              <button className="btn btn-primary btn-sm" onClick={requestPermission}>🔔 طلب الصلاحية</button>
            )}
          </div>
          {pushToken && (
            <div style={{ padding: 12, background: 'var(--hbg)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>معرف الجهاز (FCM):</div>
              <div style={{ fontSize: 10, color: 'var(--subtext)', wordBreak: 'break-all', opacity: 0.7, fontFamily: 'monospace' }}>
                {pushToken}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── App Notification Settings ── */}
      <div className="card">
        <div className="card-header"><span className="card-title">⚙️ إدارة الإشعارات</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <ToggleRow
            icon="🔔" label="تفعيل الإشعارات بالكامل" desc="استلام التنبيهات داخل وخارج التطبيق"
            value={notifSettings.enabled} onChange={() => toggleNotification('enabled')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <ToggleRow
            icon="💉" label="تنبيهات اللقاحات" desc="مواعيد التطعيم والتحصين"
            value={notifSettings.vaccines} onChange={() => toggleNotification('vaccines')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <ToggleRow
            icon="🐣" label="تنبيهات الولادات" desc="تنبيهات اقتراب موعد الولادة"
            value={notifSettings.births} onChange={() => toggleNotification('births')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <ToggleRow
            icon="💰" label="تنبيهات المالية" desc="تنبيهات الصرف والتحصيل والتقارير"
            value={notifSettings.finance} onChange={() => toggleNotification('finance')}
          />
        </div>
      </div>

      {/* ── Notification Sound ── */}
      <div className="card">
        <div className="card-header"><span className="card-title">🎵 نغمة الإشعارات</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>صوت التنبيه الحالي</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>
                  {notifSound ? 'نغمة مخصصة' : 'نغمة النظام الافتراضية'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => playNotifSound()}
                  title="تجربة الصوت"
                >
                  ▶️
                </button>
                {notifSound && (
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => { setNotifSound(null); localStorage.removeItem('notifSound'); showToast('🔄 تم العودة للصوت الافتراضي') }}
                    title="حذف الصوت المخصص"
                    style={{ color: 'var(--red)' }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary btn-sm" 
              style={{ width: '100%', gap: 8 }}
              onClick={() => document.getElementById('notif-file-picker').click()}
            >
              📂 اختيار صوت من الجهاز
            </button>
            <input 
              id="notif-file-picker"
              type="file" 
              accept="audio/*" 
              style={{ display: 'none' }} 
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    showToast('⚠️ الملف كبير جداً (الأقصى 2MB)', 'error')
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    const base64 = event.target.result
                    setNotifSound(base64)
                    localStorage.setItem('notifSound', base64)
                    showToast('✅ تم حفظ نغمة التنبيه بنجاح')
                    // Play test
                    const audio = new Audio(base64)
                    audio.play()
                  }
                  reader.readAsDataURL(file)
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Test Notification ── */}
      <div className="card">
         <div className="card-body">
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', gap: 8, justifyContent: 'center' }}
              onClick={() => addNotification('إشعار تجريبي من نظام الإشعارات الذكي 🐄🌟', 'info')}
            >
              🚀 إرسال إشعار تجريبي
            </button>
         </div>
      </div>
    </div>
  );
}
