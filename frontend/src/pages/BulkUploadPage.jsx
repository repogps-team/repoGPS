import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useBulkUpload } from '../hooks/useBulkUpload'
import { useApi } from '../hooks/useApi'

// =====================================================
// Columnas de la tabla
// =====================================================
const createColumns = (onDelete) => [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    size: 40,
  },
  {
    accessorKey: 'nombre_archivo',
    header: 'Nombre',
    cell: (info) => (
      <span className="bulk-filename" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  },
  {
    accessorKey: 'tamano_bytes',
    header: 'Tamaño',
    cell: (info) => formatBytes(info.getValue()),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'fecha_origen',
    header: 'Fecha origen',
    cell: (info) => info.getValue() ? new Date(info.getValue()).toLocaleDateString('es-CL') : '-',
  },
  {
    accessorKey: 'fecha_upload',
    header: 'Subido',
    cell: (info) => info.getValue() ? new Date(info.getValue()).toLocaleString('es-CL') : '-',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: (info) => {
      const val = info.getValue()
      const cls = val === 'completado' ? 'badge-ok' : val === 'error' ? 'badge-err' : 'badge-pend'
      return <span className={`badge ${cls}`}>{val}</span>
    },
  },
  {
    id: 'acciones',
    header: '',
    cell: ({ row }) => (
      <button
        className="bulk-btn-icon"
        onClick={() => onDelete(row.original.id)}
        title="Eliminar"
      >
        ×
      </button>
    ),
    size: 40,
  },
]

// =====================================================
// Helpers
// =====================================================
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// =====================================================
// Componente principal
// =====================================================
const BulkUploadPage = () => {
  const {
    documentos,
    stats,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadBatch,
    fetchDocumentos,
    fetchStats,
    deleteDocumento,
    deleteMultiple,
    asignarMasivo,
    clearError,
  } = useBulkUpload()

  const { get } = useApi()

  const [pendingFiles, setPendingFiles] = useState([])
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [expedienteId, setExpedienteId] = useState('')
  const [expedientes, setExpedientes] = useState([])
  const [expSearch, setExpSearch] = useState('')
  const [showExpDropdown, setShowExpDropdown] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  // Cargar documentos y expedientes al montar
  useEffect(() => {
    fetchDocumentos()
    fetchStats()
    // Cargar expedientes para el selector
    get('/api/expedientes').then(data => {
      if (Array.isArray(data)) setExpedientes(data)
    }).catch(() => {})
  }, [fetchDocumentos, fetchStats, get])

  // Dropzone para archivos pendientes
  const onDrop = useCallback((acceptedFiles) => {
    setPendingFiles(prev => [...prev, ...acceptedFiles])
    setUploadResult(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Aceptar .txt para el caso de uso actual, pero permitir todos
    noClick: false,
  })

  // Quitar archivo pendiente
  const removePending = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // Subir archivos pendientes al staging
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return
    const result = await uploadBatch(pendingFiles, {
      batchSize: 10,
      onFileComplete: () => {},
    })
    setPendingFiles([])
    setUploadResult(result)
    // Refrescar lista
    await fetchDocumentos()
    await fetchStats()
  }

  // Eliminar un documento del staging
  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar este documento del staging?')) return
    await deleteDocumento(id)
    await fetchStats()
  }, [deleteDocumento, fetchStats])

  // Eliminar seleccionados
  const handleDeleteSelected = async () => {
    const selectedIds = Object.keys(rowSelection).map(
      (idx) => documentos[parseInt(idx)]?.id
    ).filter(Boolean)
    if (selectedIds.length === 0) return
    if (!confirm(`¿Eliminar ${selectedIds.length} documentos seleccionados?`)) return
    await deleteMultiple(selectedIds)
    setRowSelection({})
    await fetchStats()
  }

  // Abrir modal de asignación
  const handleOpenAssign = () => {
    const selectedIds = Object.keys(rowSelection).map(
      (idx) => documentos[parseInt(idx)]?.id
    ).filter(Boolean)
    if (selectedIds.length === 0) {
      alert('Selecciona al menos un documento')
      return
    }
    setShowAssignModal(true)
  }

  // Asignar a expediente
  const handleAssign = async () => {
    if (!expedienteId) {
      alert('Selecciona un expediente')
      return
    }
    setAssigning(true)
    try {
      const selectedIds = Object.keys(rowSelection).map(
        (idx) => documentos[parseInt(idx)]?.id
      ).filter(Boolean)
      await asignarMasivo(parseInt(expedienteId), selectedIds)
      setRowSelection({})
      setShowAssignModal(false)
      setExpedienteId('')
      setExpSearch('')
      await fetchDocumentos()
      await fetchStats()
    } catch (err) {
      alert(`Error al asignar: ${err.message}`)
    } finally {
      setAssigning(false)
    }
  }

  // Expedientes filtrados por búsqueda
  const filteredExpedientes = useMemo(() => {
    if (!expSearch) return expedientes
    const q = expSearch.toLowerCase()
    return expedientes.filter(e =>
      e.titulo?.toLowerCase().includes(q) ||
      e.descripcion?.toLowerCase().includes(q) ||
      String(e.id).includes(q)
    )
  }, [expedientes, expSearch])

  // Expediente seleccionado
  const selectedExpediente = useMemo(() => {
    return expedientes.find(e => e.id === parseInt(expedienteId))
  }, [expedientes, expedienteId])

  // Columnas de la tabla
  const columns = useMemo(() => createColumns(handleDelete), [handleDelete])

  // Datos filtrados
  const filteredData = useMemo(() => {
    if (!search) return documentos
    const q = search.toLowerCase()
    return documentos.filter(d => d.nombre_archivo?.toLowerCase().includes(q))
  }, [documentos, search])

  // Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div className="bulk-page">
      <h1>Carga Masiva de Documentos</h1>
      <p className="bulk-subtitle">
        Sube archivos al staging, revisa la tabla, y asígnalos a un expediente.
      </p>

      {/* Stats bar */}
      <div className="bulk-stats">
        <div className="bulk-stat">
          <span className="bulk-stat-num">{stats.pendientes}</span>
          <span className="bulk-stat-label">Pendientes</span>
        </div>
        <div className="bulk-stat">
          <span className="bulk-stat-num">{stats.asignados}</span>
          <span className="bulk-stat-label">Asignados</span>
        </div>
        <div className="bulk-stat">
          <span className="bulk-stat-num">{formatBytes(stats.total_bytes_pendientes)}</span>
          <span className="bulk-stat-label">Almacenamiento</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bulk-error">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="bulk-result">
          <strong>Subida completada:</strong> {uploadResult.completed} de {uploadResult.total} archivos.
          {uploadResult.errors.length > 0 && (
            <span className="bulk-result-errors"> ({uploadResult.errors.length} errores)</span>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`bulk-dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="bulk-dropzone-content">
          <p className="bulk-dropzone-icon">📁</p>
          <p className="bulk-dropzone-title">
            {isDragActive
              ? 'Suelta los archivos aquí'
              : 'Arrastra archivos aquí o haz click para seleccionar'}
          </p>
          <p className="bulk-dropzone-hint">
            Cualquier tipo de archivo. Se subirán en ráfagas de 10.
          </p>
        </div>
      </div>

      {/* Pending files + Upload button */}
      {pendingFiles.length > 0 && (
        <div className="bulk-pending">
          <div className="bulk-pending-header">
            <strong>{pendingFiles.length} archivos seleccionados</strong>
            <button className="bulk-btn-secondary" onClick={() => setPendingFiles([])}>
              Limpiar
            </button>
          </div>
          <div className="bulk-pending-list">
            {pendingFiles.slice(0, 20).map((f, i) => (
              <div key={i} className="bulk-pending-item">
                <span className="bulk-pending-name">{f.name}</span>
                <span className="bulk-pending-size">{formatBytes(f.size)}</span>
                <button className="bulk-btn-icon" onClick={() => removePending(i)}>×</button>
              </div>
            ))}
            {pendingFiles.length > 20 && (
              <div className="bulk-pending-more">
                ... y {pendingFiles.length - 20} archivos más
              </div>
            )}
          </div>

          {uploading && (
            <div className="bulk-progress">
              <div className="bulk-progress-bar">
                <div
                  className="bulk-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="bulk-progress-text">{uploadProgress}%</span>
            </div>
          )}

          <button
            className="bulk-btn-primary"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? `Subiendo... ${uploadProgress}%` : 'Iniciar Carga'}
          </button>
        </div>
      )}

      {/* Toolbar: search + actions */}
      <div className="bulk-toolbar">
        <input
          className="bulk-search"
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="bulk-toolbar-actions">
          {selectedCount > 0 && (
            <>
              <span className="bulk-selected-count">{selectedCount} seleccionados</span>
              <button className="bulk-btn-secondary" onClick={handleDeleteSelected}>
                Eliminar seleccionados
              </button>
              <button className="bulk-btn-primary" onClick={handleOpenAssign}>
                Asignar a Expediente
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bulk-table-wrapper">
        {loading ? (
          <div className="bulk-loading">Cargando documentos...</div>
        ) : documentos.length === 0 ? (
          <div className="bulk-empty">
            <p>No hay documentos en el staging.</p>
            <p className="bulk-empty-hint">Arrastra archivos arriba para comenzar.</p>
          </div>
        ) : (
          <>
            <table className="bulk-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={header.column.getCanSort() ? 'sortable' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ▲',
                          desc: ' ▼',
                        }[header.column.getIsSorted()] ?? ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className={row.getIsSelected() ? 'selected' : ''}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bulk-pagination">
              <button
                className="bulk-btn-secondary"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                ← Anterior
              </button>
              <span>
                Página {table.getState().pagination.pageIndex + 1} de{' '}
                {table.getPageCount()}
              </span>
              <button
                className="bulk-btn-secondary"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de asignación */}
      {showAssignModal && (
        <div className="bulk-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="bulk-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Asignar a Expediente</h3>
            <p>
              Se asignarán <strong>{selectedCount} documentos</strong> al expediente.
            </p>
            <div className="bulk-modal-field">
              <label>Expediente</label>
              <div className="bulk-exp-selector">
                <input
                  type="text"
                  value={selectedExpediente ? `${selectedExpediente.titulo || selectedExpediente.descripcion || 'Expediente #' + selectedExpediente.id}` : expSearch}
                  onChange={(e) => {
                    setExpSearch(e.target.value)
                    setExpedienteId('')
                    setShowExpDropdown(true)
                  }}
                  onFocus={() => setShowExpDropdown(true)}
                  placeholder="Buscar por nombre o ID..."
                  disabled={assigning}
                  className="bulk-exp-input"
                />
                {showExpDropdown && expSearch && !expedienteId && (
                  <div className="bulk-exp-dropdown">
                    {filteredExpedientes.length === 0 ? (
                      <div className="bulk-exp-option empty">No se encontraron expedientes</div>
                    ) : (
                      filteredExpedientes.slice(0, 20).map(exp => (
                        <div
                          key={exp.id}
                          className="bulk-exp-option"
                          onClick={() => {
                            setExpedienteId(String(exp.id))
                            setExpSearch('')
                            setShowExpDropdown(false)
                          }}
                        >
                          <span className="bulk-exp-option-title">
                            {exp.titulo || exp.descripcion || `Expediente #${exp.id}`}
                          </span>
                          <span className="bulk-exp-option-id">ID: {exp.id}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedExpediente && (
                <div className="bulk-exp-selected">
                  <span>{selectedExpediente.titulo || selectedExpediente.descripcion || `Expediente #${selectedExpediente.id}`}</span>
                  <button
                    className="bulk-btn-icon"
                    onClick={() => { setExpedienteId(''); setExpSearch('') }}
                    disabled={assigning}
                  >×</button>
                </div>
              )}
            </div>
            <div className="bulk-modal-actions">
              <button
                className="bulk-btn-secondary"
                onClick={() => { setShowAssignModal(false); setExpSearch(''); setExpedienteId('') }}
                disabled={assigning}
              >
                Cancelar
              </button>
              <button
                className="bulk-btn-primary"
                onClick={handleAssign}
                disabled={assigning || !expedienteId}
              >
                {assigning ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bulk-page { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .bulk-page h1 { margin: 0 0 4px; font-size: 22px; color: var(--text-main, #1a1a2e); }
        .bulk-subtitle { margin: 0 0 20px; color: var(--text-muted, #666); font-size: 14px; }

        /* Stats */
        .bulk-stats { display: flex; gap: 16px; margin-bottom: 20px; }
        .bulk-stat { flex: 1; background: var(--bg-panel, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 14px 16px; text-align: center; }
        .bulk-stat-num { display: block; font-size: 20px; font-weight: 700; color: var(--text-main, #1a1a2e); }
        .bulk-stat-label { font-size: 12px; color: var(--text-muted, #666); }

        /* Dropzone */
        .bulk-dropzone { border: 2px dashed var(--border-color, #d1d5db); border-radius: 10px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; background: var(--bg-panel, #fff); }
        .bulk-dropzone.active { border-color: var(--primary-color, #2563eb); background: rgba(37, 99, 235, 0.04); }
        .bulk-dropzone-icon { font-size: 36px; margin: 0 0 8px; }
        .bulk-dropzone-title { margin: 0 0 4px; font-size: 15px; font-weight: 500; color: var(--text-main, #333); }
        .bulk-dropzone-hint { margin: 0; font-size: 12px; color: var(--text-muted, #999); }

        /* Pending files */
        .bulk-pending { background: var(--bg-panel, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .bulk-pending-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .bulk-pending-list { max-height: 200px; overflow-y: auto; }
        .bulk-pending-item { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border-color, #f3f4f6); font-size: 13px; }
        .bulk-pending-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-main, #333); }
        .bulk-pending-size { color: var(--text-muted, #999); font-size: 12px; min-width: 70px; text-align: right; }
        .bulk-pending-more { text-align: center; padding: 8px; color: var(--text-muted, #999); font-size: 13px; }

        /* Progress */
        .bulk-progress { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
        .bulk-progress-bar { flex: 1; height: 8px; background: var(--border-color, #e5e7eb); border-radius: 4px; overflow: hidden; }
        .bulk-progress-fill { height: 100%; background: var(--primary-color, #2563eb); transition: width 0.2s; }
        .bulk-progress-text { font-size: 13px; font-weight: 600; color: var(--text-main, #333); min-width: 40px; }

        /* Toolbar */
        .bulk-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
        .bulk-search { padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px; font-size: 14px; width: 280px; background: var(--bg-panel, #fff); color: var(--text-main, #333); }
        .bulk-toolbar-actions { display: flex; align-items: center; gap: 10px; }
        .bulk-selected-count { font-size: 13px; color: var(--text-muted, #666); }

        /* Table */
        .bulk-table-wrapper { background: var(--bg-panel, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; overflow: hidden; }
        .bulk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bulk-table th { padding: 10px 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted, #6b7280); background: var(--surface-alt, #f9fafb); border-bottom: 2px solid var(--border-color, #e5e7eb); white-space: nowrap; user-select: none; }
        .bulk-table th.sortable { cursor: pointer; }
        .bulk-table th.sortable:hover { color: var(--primary-color, #2563eb); }
        .bulk-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-color, #f3f4f6); color: var(--text-main, #333); }
        .bulk-table tr.selected td { background: rgba(37, 99, 235, 0.06); }
        .bulk-table tr:hover td { background: var(--surface-hover, #f9fafb); }
        .bulk-filename { display: block; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bulk-btn-icon { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted, #999); padding: 2px 6px; border-radius: 4px; }
        .bulk-btn-icon:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger-color, #ef4444); }

        /* Badges */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
        .badge-ok { background: rgba(16, 185, 129, 0.1); color: #065f46; }
        .badge-err { background: rgba(239, 68, 68, 0.1); color: #991b1b; }
        .badge-pend { background: rgba(245, 158, 11, 0.1); color: #92400e; }

        /* Buttons */
        .bulk-btn-primary { padding: 8px 18px; background: var(--primary-color, #2563eb); color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .bulk-btn-primary:hover:not(:disabled) { background: var(--primary-hover, #1d4ed8); }
        .bulk-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .bulk-btn-secondary { padding: 8px 14px; background: var(--bg-panel, #fff); border: 1px solid var(--border-color, #d1d5db); border-radius: 6px; font-size: 13px; cursor: pointer; color: var(--text-main, #333); }
        .bulk-btn-secondary:hover:not(:disabled) { background: var(--surface-hover, #f3f4f6); }
        .bulk-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Pagination */
        .bulk-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 12px; border-top: 1px solid var(--border-color, #e5e7eb); font-size: 13px; color: var(--text-muted, #666); }

        /* Loading / Empty */
        .bulk-loading, .bulk-empty { padding: 40px; text-align: center; color: var(--text-muted, #666); }
        .bulk-empty-hint { font-size: 13px; color: var(--text-muted, #999); }

        /* Error */
        .bulk-error { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #991b1b; margin-bottom: 16px; }

        /* Result */
        .bulk-result { padding: 12px 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; color: #065f46; margin-bottom: 16px; font-size: 14px; }
        .bulk-result-errors { color: #991b1b; }

        /* Modal */
        .bulk-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .bulk-modal { background: var(--bg-panel, #fff); border-radius: 10px; padding: 24px; width: 400px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .bulk-modal h3 { margin: 0 0 12px; font-size: 18px; color: var(--text-main, #1a1a2e); }
        .bulk-modal p { margin: 0 0 16px; font-size: 14px; color: var(--text-muted, #666); }
        .bulk-modal-field { margin-bottom: 16px; }
        .bulk-modal-field label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: var(--text-main, #333); }
        .bulk-modal-field input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px; font-size: 14px; background: var(--bg-panel, #fff); color: var(--text-main, #333); }
        .bulk-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

        /* Expediente selector */
        .bulk-exp-selector { position: relative; }
        .bulk-exp-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px; font-size: 14px; background: var(--bg-panel, #fff); color: var(--text-main, #333); box-sizing: border-box; }
        .bulk-exp-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-panel, #fff); border: 1px solid var(--border-color, #d1d5db); border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 4px; }
        .bulk-exp-option { padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid var(--border-color, #f3f4f6); }
        .bulk-exp-option:hover { background: var(--surface-hover, #f3f4f6); }
        .bulk-exp-option.empty { color: var(--text-muted, #999); cursor: default; justify-content: center; }
        .bulk-exp-option-title { color: var(--text-main, #333); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .bulk-exp-option-id { color: var(--text-muted, #999); font-size: 12px; margin-left: 8px; flex-shrink: 0; }
        .bulk-exp-selected { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding: 6px 10px; background: rgba(37, 99, 235, 0.08); border-radius: 6px; font-size: 13px; color: var(--text-main, #333); }
      `}</style>
    </div>
  )
}

export default BulkUploadPage
