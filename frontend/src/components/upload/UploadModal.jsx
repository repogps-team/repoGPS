import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useDocumentos } from '../../hooks/useDocumentos'

export const UploadModal = ({ isOpen, onClose, expedienteId, documentoId, onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [offlineSuccess, setOfflineSuccess] = useState(null)
  const offlineTimerRef = useRef(null)
  const { uploadDocumento, crearVersion, uploading, uploadProgress, error, clearError } = useDocumentos()

  useEffect(() => {
    return () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current)
    }
  }, [])

  // modo 'nuevaVersion' =true cuando documentoId está presente
  const isNuevaVersion = !!documentoId

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      clearError()
    }
  }, [clearError])

  // Construction document extensions
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.dwg': ['.dwg'],
      'application/vnd.dxf': ['.dxf'],
      'application/x-rvt': ['.rvt'],
      'application/x-sketchup': ['.skp'],
      'application/x-ifc': ['.ifc'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif']
    },
    maxFiles: 1,
    disabled: uploading
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      let result
      if (isNuevaVersion && documentoId) {
        // Create new version for existing document
        result = await crearVersion(documentoId, selectedFile, descripcion, () => {
          // Progress is handled by the hook
        })
      } else if (expedienteId) {
        // Upload new document to expediente
        result = await uploadDocumento(expedienteId, selectedFile, descripcion, () => {
          // Progress is handled by the hook
        })
      } else {
        return
      }

      if (onUploadComplete) {
        onUploadComplete(result)
      }

      if (result?.offline) {
        // Offline queue — show success and auto-close
        setOfflineSuccess(`"${result.nombre}" guardado sin conexión. Se sincronizará automáticamente.`)
        offlineTimerRef.current = setTimeout(() => {
          setOfflineSuccess(null)
          setSelectedFile(null)
          setDescripcion('')
          onClose()
        }, 2500)
      } else {
        // Online upload — reset and close
        setSelectedFile(null)
        setDescripcion('')
        onClose()
      }
    } catch {
      // Error is handled by the hook
    }
  }

  const handleClose = () => {
    if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current)
    setOfflineSuccess(null)
    setSelectedFile(null)
    setDescripcion('')
    clearError()
    onClose()
  }

  if (!isOpen) return null

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="modal-overlay modal-overlay--upload" onClick={handleClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h3>{isNuevaVersion ? 'Nueva Versión' : 'Subir Documento'}</h3>
          <button className="upload-modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="upload-modal-body">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''} ${uploading ? 'disabled' : ''}`}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="upload-selected-file">
                <span className="upload-file-icon">📄</span>
                <div className="upload-file-info">
                  <p className="upload-file-name">{selectedFile.name}</p>
                  <p className="upload-file-size">{formatFileSize(selectedFile.size)}</p>
                </div>
                {!uploading && (
                  <button
                    className="upload-btn-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <div className="upload-dropzone-content">
                {uploading ? (
                  <p>Subiendo archivo...</p>
                ) : (
                  <>
                    <p className="upload-dropzone-title">
                      {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz click para seleccionar'}
                    </p>
                    <p className="upload-dropzone-hint">PDF, DWG, DXF, RVT, SKP, IFC, XLSX, DOC, DOCX, JPG, PNG, TIFF (max 50MB)</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="upload-progress-text">{uploadProgress}%</p>
            </div>
          )}

          {/* Description */}
          <div className="upload-form-group">
            <label>Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Agrega una descripción al documento..."
              disabled={uploading}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="upload-error-message">
              {error}
            </div>
          )}

          {/* Offline success */}
          {offlineSuccess && (
            <div className="upload-success-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{offlineSuccess}</span>
            </div>
          )}
        </div>

        <div className="upload-modal-footer">
          <button className="upload-btn-cancel" onClick={handleClose} disabled={uploading}>
            Cancelar
          </button>
          <button
            className="upload-btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Subiendo...' : (isNuevaVersion ? 'Crear Nueva Versión' : 'Subir Documento')}
          </button>
        </div>
      </div>

      <style>{`
        .upload-modal {
          background: var(--upload-bg, white);
          border-radius: 12px;
          width: 70vw;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .upload-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--upload-border, #eee);
          background: var(--surface-alt, #f8fafc);
          border-radius: 12px 12px 0 0;
        }

        .upload-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: var(--text-main, #333);
        }

        .upload-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-muted, #666);
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .upload-modal-close:hover {
          background: var(--surface-hover, #f1f5f9);
        }

        .upload-modal-body {
          padding: 20px;
        }

        .upload-dropzone {
          border: 2px dashed var(--upload-dropzone-border, #ddd);
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 16px;
          background: var(--bg-panel, white);
        }

        .upload-dropzone.active {
          border-color: var(--success-color, #4CAF50);
          background: var(--upload-dropzone-active, #f9fff9);
        }

        .upload-dropzone.reject {
          border-color: var(--danger-color, #f44336);
          background: #fff9f9;
        }

        .upload-dropzone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upload-dropzone-content {
          color: var(--upload-text-muted, #666);
        }

        .upload-dropzone-title {
          margin: 0 0 8px;
          font-size: 14px;
        }

        .upload-dropzone-hint {
          margin: 0;
          font-size: 12px;
          color: var(--upload-text-muted, #999);
        }

        .upload-selected-file {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .upload-file-icon {
          font-size: 32px;
        }

        .upload-file-info {
          flex: 1;
          text-align: left;
        }

        .upload-file-name {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-main, #333);
        }

        .upload-file-size {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--upload-text-muted, #999);
        }

        .upload-btn-remove {
          background: var(--danger-color, #f44336);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-progress {
          margin-bottom: 16px;
        }

        .upload-progress-bar {
          height: 8px;
          background: var(--surface-hover, #e0e0e0);
          border-radius: 4px;
          overflow: hidden;
        }

        .upload-progress-fill {
          height: 100%;
          background: var(--success-color, #4CAF50);
          transition: width 0.2s;
        }

        .upload-progress-text {
          text-align: center;
          margin: 8px 0 0;
          font-size: 12px;
          color: var(--upload-text-muted, #666);
        }

        .upload-form-group {
          margin-bottom: 16px;
        }

        .upload-form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-main, #333);
        }

        .upload-form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--upload-border, #ddd);
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          background: var(--bg-panel, white);
          color: var(--text-main, #333);
        }

        .upload-form-group textarea:disabled {
          background: var(--surface-hover, #f5f5f5);
        }

        .upload-form-group textarea:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          outline: none;
        }

        .upload-error-message {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: var(--danger-color, #c62828);
          font-size: 14px;
          margin-bottom: 16px;
        }

        .upload-success-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 6px;
          color: var(--success-color, #065f46);
          font-size: 14px;
          margin-bottom: 16px;
        }

        .upload-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--upload-border, #eee);
          background: var(--surface-alt, #f8fafc);
          border-radius: 0 0 12px 12px;
        }

        .upload-btn-cancel, .upload-btn-primary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-btn-cancel {
          background: var(--bg-panel, white);
          border: 1px solid var(--border-color, #ddd);
          color: var(--text-main, #666);
        }

        .upload-btn-cancel:hover:not(:disabled) {
          background: var(--surface-hover, #f5f5f5);
        }

        .upload-btn-primary {
          background: var(--upload-btn-primary-bg, var(--success-color, #4CAF50));
          border: none;
          color: white;
        }

        .upload-btn-primary:hover:not(:disabled) {
          background: var(--upload-btn-primary-hover, var(--success-hover, #45a049));
        }

        .upload-btn-primary:disabled, .upload-btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}