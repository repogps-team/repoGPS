import { flexRender } from '@tanstack/react-table'

const DataTableHeader = ({ table }) => {
  return (
    <thead>
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th
              key={header.id}
              className={header.column.getCanSort() ? 'sortable' : ''}
              onClick={header.column.getToggleSortingHandler()}
              style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
            >
              <div className="th-content">
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getCanSort() && (
                  <span className={`sort-indicator ${
                    header.column.getIsSorted() === 'asc' ? 'sort-asc' :
                    header.column.getIsSorted() === 'desc' ? 'sort-desc' : 'sort-none'
                  }`}>
                    {header.column.getIsSorted() === 'asc' ? (
                      <span className="material-icons" style={{ fontSize: '16px' }}>arrow_upward</span>
                    ) : header.column.getIsSorted() === 'desc' ? (
                      <span className="material-icons" style={{ fontSize: '16px' }}>arrow_downward</span>
                    ) : (
                      <span className="material-icons" style={{ fontSize: '16px', opacity: 0.4 }}>unfold_more</span>
                    )}
                  </span>
                )}
              </div>
            </th>
          ))}
        </tr>
      ))}
    </thead>
  )
}

export default DataTableHeader
