import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'
import { DataTable } from './DataTable'
import { FormField } from './FormField'
import { LoadingState } from './LoadingState'
import { SelectField } from './SelectField'
import { StatusBadge } from './StatusBadge'
import { statusModifier } from './statusModifier'

describe('shared component accessibility markup', () => {
  it('binds field hints and errors to form controls', () => {
    const inputHtml = renderToStaticMarkup(
      <FormField
        label="Legal name"
        name="legalName"
        hint="Use the registered organization name."
        error="Legal name is required."
        required
      />,
    )
    const selectHtml = renderToStaticMarkup(
      <SelectField
        label="Deployment mode"
        name="deploymentMode"
        hint="Controls local deployment behavior."
        error="Select a deployment mode."
        options={[{ label: 'Standalone SME', value: 'standalone_sme' }]}
        required
      />,
    )

    expect(inputHtml).toContain('aria-describedby=')
    expect(inputHtml).toContain('aria-errormessage=')
    expect(inputHtml).toContain('role="alert"')
    expect(inputHtml).toContain('aria-required="true"')
    expect(selectHtml).toContain('aria-describedby=')
    expect(selectHtml).toContain('role="alert"')
  })

  it('renders data tables with table semantics and mobile cell labels', () => {
    const html = renderToStaticMarkup(
      <DataTable
        ariaLabel="Users table"
        emptyTitle="No users"
        rows={[{ id: 'user-1', name: 'Procurement Officer', role: 'Officer' }]}
        getRowKey={(row) => row.id}
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'role', header: 'Role', render: (row) => row.role },
        ]}
      />,
    )

    expect(html).toContain('role="table"')
    expect(html).toContain('aria-label="Users table"')
    expect(html).toContain('role="columnheader"')
    expect(html).toContain('data-label="Name"')
    expect(html).toContain('data-label="Role"')
    expect(html).toContain('role="cell"')
  })

  it('labels confirmation dialogs and loading states for assistive tech', () => {
    const dialogHtml = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete role"
        message="This action cannot be undone."
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )
    const loadingHtml = renderToStaticMarkup(
      <LoadingState message="Loading roles..." />,
    )

    expect(dialogHtml).toContain('role="dialog"')
    expect(dialogHtml).toContain('aria-modal="true"')
    expect(dialogHtml).toContain('aria-labelledby=')
    expect(dialogHtml).toContain('aria-describedby=')
    expect(loadingHtml).toContain('role="status"')
    expect(loadingHtml).toContain('aria-live="polite"')
  })

  it('sanitizes status badge class modifiers while keeping visible text', () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="Profit/Loss Pending" />,
    )

    expect(statusModifier('Profit/Loss Pending')).toBe('Profit-Loss-Pending')
    expect(html).toContain('status-tag--Profit-Loss-Pending')
    expect(html).toContain('Status: Profit/Loss Pending')
    expect(html).toContain('Profit/Loss Pending')
  })
})
