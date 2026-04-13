import { motion, animate, useInView, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { useFarm } from '../../context/FarmContext'

/**
 * CowProgressGauge — مؤشر دائري ديناميكي لدورة حياة البقرة
 * 
 * الاستخدام الموصى به: تمرير كائن phase من Worker مباشرة:
 *   <CowProgressGauge phase={cow.phase} />
 * 
 * أو تمرير قيم يدوية (للتوافق مع الكود القديم):
 *   <CowProgressGauge value={50} variant="yellow" subtext="..." />
 */
const CowProgressGauge = memo(function CowProgressGauge({
  // ── New API: phase object from Worker ──
  phase = null,
  // ── Legacy API: direct props (kept for backward compatibility) ──
  value = 0,
  variant = 'default',
  subtext = '',
}) {
    const { gaugeSettings } = useFarm()
    const containerRef = useRef(null)
    const isInView = useInView(containerRef, { once: true, margin: '-50px' })

    // ── Resolve values: phase object takes priority over legacy props ──
    const resolvedVariant = phase?.variant ?? variant
    const resolvedValue   = phase?.progress ?? value
    const resolvedLabel   = phase?.label   ?? subtext

    const progressMV = useMotionValue(0)
    const [displayValue, setDisplayValue] = useState(0)

    const radius = 65
    const strokeWidth = 24
    const circumference = Math.PI * radius
    const strokeOffset = useTransform(progressMV, [0, 100], [circumference, 0])

    // ── Color Map: one place for all phase colors ──
    const baseColor = useMemo(() => {
        switch (resolvedVariant) {
            case 'ready':       return '#16a34a'  // green — ready for insemination
            case 'post_birth':  return gaugeSettings.colors.afterBirth
            case 'yellow':      return gaugeSettings.colors.check   // pending insem check
            case 'dry':         return '#94a3b8'  // slate — dry period
            case 'near_birth':  return '#ef4444'  // red — near birth / overdue
            case 'default':     return gaugeSettings.colors.pregnant
            default:            return gaugeSettings.colors.pregnant
        }
    }, [resolvedVariant, gaugeSettings.colors])

    // ── Dynamic lightness adjustment ──
    const getDynamicColor = (hex, percent) => {
        if (!gaugeSettings.dynamicLightness || !hex.startsWith('#')) return hex
        let r = parseInt(hex.slice(1, 3), 16)
        let g = parseInt(hex.slice(3, 5), 16)
        let b = parseInt(hex.slice(5, 7), 16)
        const factor = 0.8 + (percent / 100) * 0.4
        r = Math.min(255, Math.floor(r * factor))
        g = Math.min(255, Math.floor(g * factor))
        b = Math.min(255, Math.floor(b * factor))
        return `rgb(${r}, ${g}, ${b})`
    }

    const currentColor = getDynamicColor(baseColor, displayValue)

    // ── Animation ──
    useEffect(() => {
        if (isInView) {
            const controls = animate(progressMV, resolvedValue, {
                duration: 1.3,
                delay: 0.2,
                ease: [0.33, 1, 0.68, 1],
                onUpdate: (latest) => setDisplayValue(Math.round(latest)),
            })
            return () => controls.stop()
        }
    }, [resolvedValue, isInView, progressMV])

    const gradientId = `grad-${resolvedVariant}-${baseColor.replace(/[^a-zA-Z0-9]/g, '')}`
    const glowId     = `glow-${resolvedVariant}`

    return (
        <div
            ref={containerRef}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
        >
            <div style={{ position: 'relative', width: 160, height: 100 }}>
                <svg width="160" height="100" viewBox="0 0 160 100">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={baseColor} stopOpacity={0.7} />
                            <stop offset="100%" stopColor={baseColor} />
                        </linearGradient>
                        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Background Track */}
                    <path
                        d="M 20 85 A 60 60 0 0 1 140 85"
                        fill="none"
                        stroke="var(--hbg)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        style={{ opacity: 0.5 }}
                    />

                    {/* Foreground Progress */}
                    <motion.path
                        d="M 20 85 A 60 60 0 0 1 140 85"
                        fill="none"
                        stroke={gaugeSettings.useGradient ? `url(#${gradientId})` : currentColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: strokeOffset,
                            filter: gaugeSettings.useGlow ? `url(#${glowId})` : 'none',
                            transition: 'stroke 0.3s ease',
                        }}
                    />
                </svg>

                {/* Percentage Number */}
                <div style={{
                    position: 'absolute',
                    top: '65%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 34,
                    fontWeight: 800,
                    color: 'var(--text)',
                    fontFamily: 'Cairo',
                }}>
                    {displayValue}%
                </div>
            </div>

            {/* Phase Label — shown below the gauge */}
            {resolvedLabel && (
                <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: baseColor,
                    marginTop: -2,
                    textAlign: 'center',
                    opacity: 0.95,
                    lineHeight: 1.4,
                    maxWidth: 150,
                }}>
                    {resolvedLabel}
                </div>
            )}
        </div>
    )
})

export default CowProgressGauge
