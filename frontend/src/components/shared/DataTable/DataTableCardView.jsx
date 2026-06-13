import { Fragment } from 'react'
import { flexRender } from '@tanstack/react-table'

const DataTableCardView = ({ table, onRowClick, rowClassName, renderExpanded }) => {
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
        const isExpanded = row.getIsExpanded()
        return (
          <Fragment key={row.id}>
            <div
              className={`data-table-card ${className} ${isExpanded ? 'expanded-card' : ''}`}
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
            {isExpanded && renderExpanded && (
              <div className="expanded-card-content">
                {renderExpanded(row)}
              </div>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export default DataTableCardView
