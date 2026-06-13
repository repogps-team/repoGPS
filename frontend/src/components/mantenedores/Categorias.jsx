import { useState, useEffect, useMemo } from 'react'
import { useCategorias } from '../../hooks/useCategorias'
import DataTable from '../shared/DataTable'

const CategoriasPanel = () => {
  const {
    categorias,
    subtipos,
    cargarCategorias,
    cargarSubtipos,
    crearCategoria,
    actualizarCategoria,
    cambiarEstadoCategoria,
    crearSubtipo,
    actualizarSubtipo,
    cambiarEstadoSubtipo
  } = useCategorias()

  // Estados para categorías
  const [formCategoria, setFormCategoria] = useState({ nombre: '', descripcion: '' })
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null)
  const [tabCategorias, setTabCategorias] = useState('activos')

  // Estados para subtipos
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [formSubtipo, setFormSubtipo] = useState({ nombre: '', descripcion: '' })
  const [editandoSubtipoId, setEditandoSubtipoId] = useState(null)
  const [tabSubtipos, setTabSubtipos] = useState('activos')

  // Cargar datos iniciales
  useEffect(() => {
    cargarCategorias()
    cargarSubtipos()
  }, [cargarCategorias, cargarSubtipos])

  // Cargar subtipos cuando cambia la categoría seleccionada
  useEffect(() => {
    if (categoriaSeleccionada) {
      cargarSubtipos(categoriaSeleccionada)
    }
  }, [categoriaSeleccionada, cargarSubtipos])

  // ============================================
  // HANDLERS CATEGORÍAS
  // ============================================

  const limpiarFormCategoria = () => {
    setFormCategoria({ nombre: '', descripcion: '' })
    setEditandoCategoriaId(null)
  }

  const handleSubmitCategoria = async (e) => {
    e.preventDefault()
    try {
      if (editandoCategoriaId) {
        await actualizarCategoria(editandoCategoriaId, formCategoria)
      } else {
        await crearCategoria(formCategoria)
      }
      limpiarFormCategoria()
      cargarCategorias()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditarCategoria = (cat) => {
    setFormCategoria({
      nombre: cat.nombre,
      descripcion: cat.descripcion || ''
    })
    setEditandoCategoriaId(cat.id)
  }

  const handleCambiarEstadoCategoria = async (id, nuevoEstado) => {
    try {
      await cambiarEstadoCategoria(id, nuevoEstado)
      await cargarCategorias()
      if (categoriaSeleccionada && !nuevoEstado) {
        await cargarSubtipos(categoriaSeleccionada)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const filteredCategorias = useMemo(() => {
    return categorias.filter(c => tabCategorias === 'activos' ? c.estado_activo : !c.estado_activo)
  }, [categorias, tabCategorias])

  const categoriasColumns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Categoría',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: (info) => info.getValue() || '-',
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          <button className="btn-mini btn-edit" onClick={(e) => { e.stopPropagation(); handleEditarCategoria(info.row.original); }}>Editar</button>
          <button className="btn-mini btn-danger" onClick={(e) => { e.stopPropagation(); handleCambiarEstadoCategoria(info.row.original.id, !info.row.original.estado_activo); }}>
            {info.row.original.estado_activo ? 'Borrar' : 'Reactivar'}
          </button>
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [editandoCategoriaId])

  // ============================================
  // HANDLERS SUBTIPOS
  // ============================================

  const limpiarFormSubtipo = () => {
    setFormSubtipo({ nombre: '', descripcion: '' })
    setEditandoSubtipoId(null)
  }

  const handleSubmitSubtipo = async (e) => {
    e.preventDefault()
    if (!categoriaSeleccionada) {
      alert('Seleccione una categoría primero')
      return
    }
    try {
      if (editandoSubtipoId) {
        await actualizarSubtipo(editandoSubtipoId, {
          ...formSubtipo,
          categoria_id: categoriaSeleccionada
        })
      } else {
        await crearSubtipo({
          ...formSubtipo,
          categoria_id: categoriaSeleccionada
        })
      }
      limpiarFormSubtipo()
      cargarSubtipos(categoriaSeleccionada)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditarSubtipo = (sub) => {
    setFormSubtipo({
      nombre: sub.nombre,
      descripcion: sub.descripcion || ''
    })
    setEditandoSubtipoId(sub.id)
  }

  const handleCambiarEstadoSubtipo = async (id, nuevoEstado) => {
    try {
      await cambiarEstadoSubtipo(id, nuevoEstado)
      await cargarSubtipos(categoriaSeleccionada)
    } catch (err) {
      alert(err.message)
    }
  }

  const filteredSubtipos = useMemo(() => {
    return subtipos.filter(s => tabSubtipos === 'activos' ? s.estado_activo : !s.estado_activo)
  }, [subtipos, tabSubtipos])

  const subtiposColumns = useMemo(() => [
    {
      accessorKey: 'nombre',
      header: 'Subtipo',
      meta: { priority: 'high' }
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      cell: (info) => info.getValue() || '-',
      meta: { priority: 'medium' }
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: (info) => (
        <div className="actions-cell">
          <button className="btn-mini btn-edit" onClick={() => handleEditarSubtipo(info.row.original)}>Editar</button>
          <button className="btn-mini btn-danger" onClick={() => handleCambiarEstadoSubtipo(info.row.original.id, !info.row.original.estado_activo)}>
            {info.row.original.estado_activo ? 'Borrar' : 'Reactivar'}
          </button>
        </div>
      ),
      meta: { priority: 'high' }
    }
  ], [editandoSubtipoId])

  const getTituloCategoria = () => editandoCategoriaId ? 'Modificar' : 'Registrar'
  const getTituloSubtipo = () => editandoSubtipoId ? 'Modificar' : 'Registrar'

  return (
    <>
      {/* Panel de Categorías */}
      <section className="panel">
        <div className="panel-top">
          <h3>{getTituloCategoria()} Categoría</h3>
        </div>
        <form onSubmit={handleSubmitCategoria} className="form-grid">
          <div className="field">
            <label>Nombre de la Categoría</label>
            <input
              type="text"
              value={formCategoria.nombre}
              onChange={e => setFormCategoria({ ...formCategoria, nombre: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Descripción</label>
            <input
              type="text"
              value={formCategoria.descripcion}
              onChange={e => setFormCategoria({ ...formCategoria, descripcion: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editandoCategoriaId ? 'Actualizar' : 'Crear'}
            </button>
            {editandoCategoriaId && (
              <button type="button" className="btn btn-secondary" onClick={limpiarFormCategoria}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-top table-top">
          <div className="tabs">
            <button 
              className={`tab-btn ${tabCategorias === 'activos' ? 'active' : ''}`} 
              onClick={() => setTabCategorias('activos')}
            >
              Activos
            </button>
            <button 
              className={`tab-btn ${tabCategorias === 'inactivos' ? 'active' : ''}`} 
              onClick={() => setTabCategorias('inactivos')}
            >
              Inactivos
            </button>
          </div>
        </div>
        <div className="hint-bar">Click en una categoría para ver sus subtipos</div>
        <DataTable
          data={filteredCategorias}
          columns={categoriasColumns}
          config={{
            searchable: true,
            searchPlaceholder: 'Buscar categoría...',
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay categorías en esta categoría',
            onRowClick: (row) => setCategoriaSeleccionada(row.original.id),
            rowClassName: (row) => row.original.id === categoriaSeleccionada ? 'selected-row' : ''
          }}
        />
      </section>

      {/* Panel de Subtipos - Solo visible cuando hay una categoría seleccionada */}
      {categoriaSeleccionada && (
        <>
          <section className="panel">
            <div className="panel-top">
              <h3>{getTituloSubtipo()} Subtipo</h3>
              <span className="category-badge">
                Categoría: {categorias.find(c => c.id === categoriaSeleccionada)?.nombre}
              </span>
            </div>
            <form onSubmit={handleSubmitSubtipo} className="form-grid">
              <div className="field">
                <label>Nombre del Subtipo</label>
                <input
                  type="text"
                  value={formSubtipo.nombre}
                  onChange={e => setFormSubtipo({ ...formSubtipo, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formSubtipo.descripcion}
                  onChange={e => setFormSubtipo({ ...formSubtipo, descripcion: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editandoSubtipoId ? 'Actualizar' : 'Crear'}
                </button>
                {editandoSubtipoId && (
                  <button type="button" className="btn btn-secondary" onClick={limpiarFormSubtipo}>
                    Cancelar
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => { setCategoriaSeleccionada(null); limpiarFormSubtipo(); }}
                >
                  Cerrar
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-top table-top">
              <div className="tabs">
                <button 
                  className={`tab-btn ${tabSubtipos === 'activos' ? 'active' : ''}`} 
                  onClick={() => setTabSubtipos('activos')}
                >
                  Activos
                </button>
                <button 
                  className={`tab-btn ${tabSubtipos === 'inactivos' ? 'active' : ''}`} 
                  onClick={() => setTabSubtipos('inactivos')}
                >
                  Inactivos
                </button>
              </div>
            </div>
            <DataTable
              data={filteredSubtipos}
              columns={subtiposColumns}
              config={{
                searchable: true,
                searchPlaceholder: 'Buscar subtipo...',
                sortable: true,
                pagination: true,
                pageSize: 5,
                emptyMessage: 'No hay subtipos para esta categoría'
              }}
            />
          </section>
        </>
      )}
    </>
  )
}

export default CategoriasPanel
