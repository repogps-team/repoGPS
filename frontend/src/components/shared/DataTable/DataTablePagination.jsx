const DataTablePagination = ({ table, pageSizeOptions = [10, 25, 50, 100] }) => {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const totalRows = table.getFilteredRowModel().rows.length

  if (totalRows <= pageSizeOptions[0]) {
    return null
  }

  return (
    <div className="data-table-pagination">
      <div className="pagination-info">
        <span>
          Mostrando {pageIndex * pageSize + 1} a {Math.min((pageIndex + 1) * pageSize, totalRows)} de {totalRows} registros
        </span>
      </div>

      <div className="pagination-controls">
        <label>
          Filas por página:
          <select
            value={pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value))
            }}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="pagination-buttons">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <span className="page-info">
            Página {pageIndex + 1} de {pageCount}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTablePagination
