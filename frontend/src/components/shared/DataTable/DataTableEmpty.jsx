const DataTableEmpty = ({ message = 'No hay datos' }) => {
  return (
    <div className="data-table-empty">
      <p>{message}</p>
    </div>
  )
}

export default DataTableEmpty
