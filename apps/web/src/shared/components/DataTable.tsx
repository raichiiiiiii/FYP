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
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowKey: (row: T) => string
  emptyTitle: string
  emptyDescription?: string
  variant?: string
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle}>{emptyDescription}</EmptyState>
  }

  return (
    <div
      className={['data-table', variant ? `data-table--${variant}` : '']
        .filter(Boolean)
        .join(' ')}
    >
      {rows.map((row) => (
        <article
          key={getRowKey(row)}
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((column, index) =>
            index === 0 ? (
              <strong key={column.key}>{column.render(row)}</strong>
            ) : (
              <span key={column.key}>{column.render(row)}</span>
            ),
          )}
        </article>
      ))}
    </div>
  )
}
