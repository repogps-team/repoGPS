const Badge = ({ value, variant = 'default' }) => {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    default: 'badge-default',
  }
  return <span className={`badge ${variants[variant]}`}>{value}</span>
}

const StageBadge = ({ etapa }) => {
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

const SlaBadge = ({ dias, enPlazo }) => {
  return (
    <span className={`sla-tag ${enPlazo ? 'sla-ok' : 'sla-warn'}`}>
      {enPlazo ? `En plazo (${dias}d)` : `Atrasado (${Math.abs(dias)}d)`}
    </span>
  )
}

export { Badge, StageBadge, SlaBadge }
