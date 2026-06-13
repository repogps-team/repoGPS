// Formateo de fechas
export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CL')
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-CL')
}

// Formateo de tamaño de archivo
export const formatSize = (bytes) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

// Badge de estado
export const Badge = ({ value, variant = 'default' }) => {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    default: 'badge-default',
  }
  return <span className={`badge ${variants[variant]}`}>{value}</span>
}

// Badge de etapa
export const StageBadge = ({ etapa }) => {
  const colors = {
    'Borrador': 'info',
    'En Revisión': 'warning',
    'En Desarrollo': 'info',
    'Aprobado': 'success',
    'Rechazado': 'danger',
    'Terminado': 'success',
    'Pendiente': 'warning',
  }
  return <Badge value={etapa} variant={colors[etapa] || 'default'} />
}

// SLA Badge
export const SlaBadge = ({ dias, enPlazo }) => {
  return (
    <span className={`sla-tag ${enPlazo ? 'sla-ok' : 'sla-warn'}`}>
      {enPlazo ? `En plazo (${dias}d)` : `Atrasado (${Math.abs(dias)}d)`}
    </span>
  )
}

// Icono de archivo
export const FileIcon = ({ mimeType }) => {
  const icons = {
    'application/pdf': '📄',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  }
  return <span>{icons[mimeType] || '📎'}</span>
}
