import { useState, useMemo } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, getExpandedRowModel, flexRender } from '@tanstack/react-table'
import DataTableHeader from './DataTableHeader'
import DataTableBody from './DataTableBody'
import DataTablePagination from './DataTablePagination'
import DataTableCardView from './DataTableCardView'
import DataTableEmpty from './DataTableEmpty'
import DataTableLoading from './DataTableLoading'
import { useIsMobile } from '../shared/useIsMobile'
import './styles.css'

const DataTable = ({
  data = [],
  columns = [],
  config = {},
  renderExpanded = null,
  getRowId = (row) => row.id
}) => {
  const {
    pageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    searchable = true,
    searchPlaceholder = 'Buscar...',
    sortable = true,
    pagination = true,
    cardMode = 'auto',
    cardBreakpoint = 768,
    onRowClick,
    rowClassName,
    loading = false,
    emptyMessage = 'No hay datos',
    striped = true,
    hoverable = true,
    className = '',
    enableExpanding = false,
    singleExpanding = false
  } = config

  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: pageSize
  })
  const [expanded, setExpanded] = useState({})

  const isMobile = useIsMobile(cardBreakpoint)
  const showCards = cardMode === 'always' || (cardMode === 'auto' && isMobile)

  const tableColumns = useMemo(() => columns, [columns])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      pagination: paginationState,
      globalFilter,
      expanded: enableExpanding ? expanded : undefined
    },
    onSortingChange: setSorting,
    onPaginationChange: setPaginationState,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: enableExpanding ? setExpanded : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: searchable ? getFilteredRowModel() : undefined,
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      return Object.values(row.original).some(value =>
        String(value).toLowerCase().includes(search)
      )
    },
    getRowId: getRowId,
    ...(singleExpanding && {
      onExpandedChange: (updater) => {
        const oldExpanded = typeof updater === 'function' ? updater(expanded) : updater
        const keys = Object.keys(oldExpanded)
        if (keys.length > 1) {
          const lastKey = keys[keys.length - 1]
          const newExpanded = { [lastKey]: oldExpanded[lastKey] }
          setExpanded(newExpanded)
        } else {
          setExpanded(oldExpanded)
        }
      }
    })
  })

  if (loading) {
    return <DataTableLoading />
  }

  if (data.length === 0) {
    return <DataTableEmpty message={emptyMessage} />
  }

  return (
    <div className={`data-table-container ${className}`}>
      {searchable && (
        <div className="data-table-search">
          <div className="search-wrapper">
            <span className="material-icons search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      {showCards ? (
        <DataTableCardView
          table={table}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
        />
      ) : (
        <div className="table-wrap">
          <table className={`data-table ${striped ? 'striped' : ''} ${hoverable ? 'hoverable' : ''}`}>
            <DataTableHeader table={table} />
            <DataTableBody
              table={table}
              onRowClick={onRowClick}
              rowClassName={rowClassName}
              renderExpanded={renderExpanded}
            />
          </table>
        </div>
      )}

      {pagination && (
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  )
}

export default DataTable
