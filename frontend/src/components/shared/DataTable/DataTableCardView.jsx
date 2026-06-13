import { flexRender } from '@tanstack/react-table'

const DataTableCardView = ({ table, onRowClick, rowClassName }) => {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <div className="data-table-card-empty">
        No hay datos para mostrar
      </div>
    )
  }

  return (
    <div className="data-table-cards">
      {rows.map(row => {
        const className = rowClassName ? rowClassName(row) : ''
        return (
          <div
            key={row.id}
            className={`data-table-card ${className}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {row.getVisibleCells().map(cell => (
              <div key={cell.id} className="card-field">
                <span className="card-label">
                  {flexRender(cell.column.columnDef.header, cell.getContext())}
                </span>
                <span className="card-value">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default DataTableCardView
