import { useState } from 'react'
import { useDocumentos } from '../../hooks/useDocumentos'

export const DocumentTimeline = ({ documentoId, documento }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [versiones, setVersiones] = useState([])
  const { getVersiones, loading, error, downloadAndSave } = useDocumentos()

  const loadVersiones = async () => {
    try {
      const data = await getVersiones(documentoId)
      setVersiones(data || [])
    } catch {
      console.error('Error loading versions')
    }
  }

  const handleToggle = () => {
    const willExpand = !isExpanded
    if (willExpand) {
      loadVersiones()
    }
    setIsExpanded(willExpand)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async (version) => {
    try {
      await downloadAndSave(documentoId, version.version, version.nombre_archivo)
    } catch (err) {
      console.error('Error downloading:', err)
    }
  }

  const currentVersion = documento?.version || 1
  const hasMultipleVersions = currentVersion > 1 || versiones.length > 1

  return (
    <div className="document-timeline">
      {hasMultipleVersions && (
        <>
          <button
            className="timeline-toggle"
            onClick={handleToggle}
          >
            <span className="material-icons toggle-icon" style={{ fontSize: '18px' }}>
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
            <span>Versiones ({versiones.length || currentVersion})</span>
          </button>

          {isExpanded && (
            <div className="timeline-content">
              {loading ? (
                <p className="loading-text">Cargando versiones...</p>
              ) : error ? (
                <p className="error-text">{error}</p>
              ) : (
                <div className="timeline-list">
                  {versiones.map((version) => (
                    <div
                      key={version.id || `v${version.version}`}
                      className={`timeline-item ${version.es_version_actual ? 'current' : ''}`}
                    >
                      <div className="timeline-dot">
                        {version.es_version_actual ? (
                          <span className="dot-current">●</span>
                        ) : (
                          <span className="dot-past">○</span>
                        )}
                      </div>

                      <div className="timeline-body">
                        <div className="version-header">
                          <span className="version-number">Versión {version.version}</span>
                          {version.es_version_actual && (
                            <span className="version-badge">Actual</span>
                          )}
                        </div>

                        <div className="version-meta">
                          <span className="meta-date">{formatDate(version.fecha_upload)}</span>
                          <span className="meta-size">{formatFileSize(version.tamano_bytes)}</span>
                          <span className="meta-type">{version.tipo_mime}</span>
                        </div>

                        <button
                          className="btn-download-version"
                          onClick={() => handleDownload(version)}
                        >
                          ↓ Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .document-timeline {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--timeline-border, #eee);
        }

        .timeline-toggle {
          background: none;
          border: none;
          color: var(--text-muted, #666);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
          transition: color 0.2s;
        }

        .timeline-toggle:hover {
          color: var(--success-color, #4CAF50);
        }

        .toggle-icon {
          font-size: 10px;
        }

        .timeline-content {
          margin-top: 12px;
          padding-left: 12px;
        }

        .loading-text, .error-text {
          font-size: 12px;
          color: var(--timeline-text-muted, #999);
          margin: 8px 0;
        }

        .error-text {
          color: var(--danger-color, #f44336);
        }

        .timeline-list {
          border-left: 2px solid var(--timeline-line, #e0e0e0);
          padding-left: 16px;
        }

        .timeline-item {
          position: relative;
          padding-bottom: 16px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-dot {
          position: absolute;
          left: -21px;
          top: 0;
        }

        .dot-current {
          color: var(--success-color, #4CAF50);
          font-size: 14px;
        }

        .dot-past {
          color: var(--timeline-text-muted, #bbb);
          font-size: 12px;
        }

        .timeline-body {
          background: var(--timeline-bg, #f9f9f9);
          border-radius: 6px;
          padding: 10px;
          border: 1px solid var(--timeline-border, #e0e0e0);
        }

        .timeline-item.current .timeline-body {
          background: var(--timeline-current-bg, #f1f8f1);
        }

        .version-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .version-number {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-main, #333);
        }

        .version-badge {
          background: var(--timeline-badge-bg, #4CAF50);
          color: var(--timeline-badge-text, white);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 500;
        }

        .version-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--timeline-text-muted, #999);
          margin-bottom: 8px;
        }

        .btn-download-version {
          background: var(--bg-panel, white);
          border: 1px solid var(--border-color, #ddd);
          color: var(--text-muted, #666);
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-download-version:hover {
          background: var(--surface-hover, #f5f5f5);
          border-color: var(--border-color, #ccc);
        }
      `}</style>
    </div>
  )
}