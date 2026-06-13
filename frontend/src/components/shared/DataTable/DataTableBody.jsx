import { Fragment } from 'react'
import { flexRender } from '@tanstack/react-table'

const DataTableBody = ({ table, onRowClick, rowClassName, renderExpanded }) => {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={table.getAllColumns().length} className="empty-state">
            No hay datos para mostrar
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {rows.map(row => {
        const className = rowClassName ? rowClassName(row) : ''
        const isExpanded = row.getIsExpanded()
        return (
          <Fragment key={row.id}>
            <tr
              className={`${className} ${isExpanded ? 'expanded-row' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
            {isExpanded && renderExpanded && (
              <tr className="expanded-row-content">
                <td colSpan={row.getVisibleCells().length}>
                  {renderExpanded(row)}
                </td>
              </tr>
            )}
          </Fragment>
        )
      })}
    </tbody>
  )
}

export default DataTableBody
