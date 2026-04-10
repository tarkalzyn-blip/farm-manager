import { useFarm } from '../../context/FarmContext'

const TYPE_STYLES = {
  danger:  { btnClass: 'btn-danger',   headerBg: '#fff0f0', headerColor: '#8b1a1a', iconBg: '#fde8e8', border: '#e8a0a0' },
  warning: { btnClass: 'btn-warning',  headerBg: '#fff9f0', headerColor: '#7a3000', iconBg: '#fde9d9', border: '#f5c8a0' },
  primary: { btnClass: 'btn-primary',  headerBg: '#f0f8f0', headerColor: '#1a5c2e', iconBg: '#d5f5e3', border: '#82c99a' },
}

export default function ConfirmDialog() {
  const { confirmDialog, closeConfirm } = useFarm()

  if (!confirmDialog) return null

  const style = TYPE_STYLES[confirmDialog.type] || TYPE_STYLES.danger

  const handleConfirm = async () => {
    closeConfirm()
    await confirmDialog.onConfirm()
  }

  return (
    <div
      className="modal-overlay open"
      style={{ zIndex: 10500 }}
      onClick={e => { if (e.target === e.currentTarget) closeConfirm() }}
    >
      <div className="modal" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: style.headerBg, borderBottom: `1px solid ${style.border}` }}>
          <span className="modal-title" style={{ color: style.headerColor }}>
            {confirmDialog.icon} {confirmDialog.title}
          </span>
          <button className="modal-close" onClick={closeConfirm}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            background: style.iconBg,
            border: `2px solid ${style.border}`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 16px',
          }}>
            {confirmDialog.icon}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {confirmDialog.message}
          </div>
          {confirmDialog.detail && (
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 6 }}>
              {confirmDialog.detail}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            id="confirm-dialog-cancel"
            className="btn btn-outline"
            onClick={closeConfirm}
          >
            {confirmDialog.cancelLabel}
          </button>
          <button
            id="confirm-dialog-ok"
            className={`btn ${style.btnClass}`}
            onClick={handleConfirm}
          >
            {confirmDialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
