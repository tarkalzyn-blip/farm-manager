import { useState } from 'react'
import { useFarm } from '../../context/FarmContext'
import CowProgressGauge from '../Cows/CowProgressGauge'

/**
 * GaugeColorSettings - واجهة تخصيص ألوان المؤشرات المئوية
 */
export default function GaugeColorSettings({ onBack }) {
    const { gaugeSettings, updateGaugeSettings, resetGaugeSettings } = useFarm()
    const [previewVal, setPreviewVal] = useState(65)

    const handleColorChange = (key, val) => {
        updateGaugeSettings({
            colors: { ...gaugeSettings.colors, [key]: val }
        })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                    onClick={onBack}
                    style={{
                        padding: '8px', border: 'none', borderRadius: '50%',
                        background: 'var(--hbg)', color: 'var(--text)', cursor: 'pointer'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div style={{ fontSize: 18, fontWeight: 900 }}>تخصيص ألوان المؤشر</div>
            </div>

            <div className="card" style={{ border: '2px solid var(--accent3)' }}>
                <div className="card-header" style={{ background: 'var(--accent3)' }}>
                    <span className="card-title">👁️ المعاينة المباشرة</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 30 }}>
                    <div style={{ transform: 'scale(1.2)' }}>
                        <CowProgressGauge 
                            value={previewVal} 
                            subtext="معاينة حية" 
                        />
                    </div>
                    
                    <div style={{ width: '100%', maxWidth: 300, marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>
                            <span>اختبار النسبة:</span>
                            <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{previewVal}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" value={previewVal}
                            onChange={(e) => setPreviewVal(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Visual Options */}
            <div className="card">
                <div className="card-header"><span className="card-title">✨ التأثيرات البصرية</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ToggleRow 
                        label="تدرج لوني (Gradient)" 
                        desc="يُعطي مظهراً احترافياً للمؤشر"
                        value={gaugeSettings.useGradient}
                        onChange={() => updateGaugeSettings({ useGradient: !gaugeSettings.useGradient })}
                    />
                    <ToggleRow 
                        label="تأثير التوهج (Glow)" 
                        desc="إضافة إضاءة خفيفة للمؤشر"
                        value={gaugeSettings.useGlow}
                        onChange={() => updateGaugeSettings({ useGlow: !gaugeSettings.useGlow })}
                    />
                    <ToggleRow 
                        label="سطوع ذكي" 
                        desc="يتغير السطوع بناءً على النسبة المئوية"
                        value={gaugeSettings.dynamicLightness}
                        onChange={() => updateGaugeSettings({ dynamicLightness: !gaugeSettings.dynamicLightness })}
                    />
                </div>
            </div>

            {/* Color Swatches */}
            <div className="card">
                <div className="card-header"><span className="card-title">🎨 ألوان الحالات</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <ColorPickerRow 
                        label="حامل" 
                        color={gaugeSettings.colors.pregnant} 
                        onChange={(c) => handleColorChange('pregnant', c)} 
                    />
                    <ColorPickerRow 
                        label="تحت الفحص" 
                        color={gaugeSettings.colors.check} 
                        onChange={(c) => handleColorChange('check', c)} 
                    />
                    <ColorPickerRow 
                        label="بعد الولادة" 
                        color={gaugeSettings.colors.afterBirth} 
                        onChange={(c) => handleColorChange('afterBirth', c)} 
                    />
                </div>
            </div>

            <button 
                className="btn btn-outline" 
                style={{ alignSelf: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={() => { if(window.confirm('هل تريد استعادة الألوان الأصلية؟')) resetGaugeSettings() }}
            >
                ↺ إعادة تعيين للوضع الافتراضي
            </button>
        </div>
    )
}

function ToggleRow({ label, desc, value, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>{desc}</div>
            </div>
            <div 
                className={`toggle-track ${value ? 'on' : ''}`} 
                onClick={onChange}
                style={{ cursor: 'pointer' }}
            />
        </div>
    )
}

function ColorPickerRow({ label, color, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--subtext)' }}>{color.toUpperCase()}</span>
                <div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: color, border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => onChange(e.target.value)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                </div>
            </div>
        </div>
    )
}
