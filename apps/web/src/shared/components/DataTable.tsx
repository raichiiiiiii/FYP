import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyTitle,
  emptyDescription,
  variant,
  ariaLabel,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowKey: (row: T) => string
  emptyTitle: string
  emptyDescription?: string
  variant?: string
  ariaLabel?: string
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle}>{emptyDescription}</EmptyState>
  }

  const gridTemplateColumns = `repeat(${columns.length}, minmax(0, 1fr))`

  return (
    <div
      className={['data-table', variant ? `data-table--${variant}` : '']
        .filter(Boolean)
        .join(' ')}
      role="table"
      aria-label={ariaLabel ?? emptyTitle}
    >
      <div
        className="data-table__header"
        role="row"
        style={{ gridTemplateColumns }}
      >
        {columns.map((column) => (
          <span key={column.key} role="columnheader">
            {column.header}
          </span>
        ))}
      </div>
      <div className="data-table__body" role="rowgroup">
        {rows.map((row) => (
          <article
            key={getRowKey(row)}
            role="row"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column, index) => (
              <div
                key={column.key}
                className={
                  index === 0
                    ? 'data-table__cell data-table__cell--primary'
                    : 'data-table__cell'
                }
                data-label={column.header}
                role="cell"
              >
                {renderCellContent(column.render(row), index)}
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  )
}

function renderCellContent(content: ReactNode, columnIndex: number) {
  if (
    columnIndex === 0 &&
    (typeof content === 'string' || typeof content === 'number')
  ) {
    return <strong>{content}</strong>
  }

  return content
}
