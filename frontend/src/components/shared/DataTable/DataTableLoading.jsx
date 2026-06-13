const DataTableLoading = ({ message = 'Cargando...' }) => {
  return (
    <div className="data-table-loading">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  )
}

export default DataTableLoading
