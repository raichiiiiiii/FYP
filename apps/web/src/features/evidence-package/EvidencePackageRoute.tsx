import { useMemo, useState } from 'react'

import { PageHeader } from '../../layouts/PageHeader'
import { StatusBadge } from '../../shared/components/StatusBadge'
import {
  evidenceCategoryLabel,
  evidencePackageCategories,
  evidencePackageItems,
  type EvidencePackageCategory,
  type EvidencePackageStatus,
} from './evidencePackage.manifest'
import { formatEvidenceStatus } from './evidencePackage.model'

const allCategories = 'all'
const allStatuses = 'all'

type CategoryFilter = EvidencePackageCategory | typeof allCategories
type StatusFilter = EvidencePackageStatus | typeof allStatuses

const statusOptions: readonly EvidencePackageStatus[] = [
  'complete',
  'partial',
  'production-hardening',
  'resolved-blocker',
]

export function EvidencePackageRoute() {
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>(allCategories)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(allStatuses)

  const filteredItems = useMemo(
    () =>
      evidencePackageItems.filter((item) => {
        const categoryMatches =
          categoryFilter === allCategories || item.category === categoryFilter
        const statusMatches =
          statusFilter === allStatuses || item.status === statusFilter

        return categoryMatches && statusMatches
      }),
    [categoryFilter, statusFilter],
  )

  const groupedItems = evidencePackageCategories
    .map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <section className="evidence-package-route">
      <PageHeader
        eyebrow="Reviewer package"
        title="Evidence Package Browser"
      />
      <p className="evidence-package-intro">
        Curated implementation, deployment, UAT, screenshot, blocker, and
        hardening evidence. This page links committed sanitized artifacts only.
      </p>

      <section className="evidence-package-hero" aria-label="Evidence overview">
        <article>
          <span>Evidence items</span>
          <strong>{evidencePackageItems.length}</strong>
          <p>Curated links across roadmap, validation, deployment, QA, and screenshots.</p>
        </article>
        <article>
          <span>Safe-to-quote</span>
          <strong>
            {evidencePackageItems.filter((item) => item.safeToQuote).length}
          </strong>
          <p>Items marked safe still require normal review caution.</p>
        </article>
        <article>
          <span>Hardening gaps</span>
          <strong>
            {
              evidencePackageItems.filter(
                (item) => item.status === 'production-hardening',
              ).length
            }
          </strong>
          <p>Remaining work is labelled separately from FYP review scope.</p>
        </article>
      </section>

      <section className="evidence-package-filters" aria-label="Evidence filters">
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as CategoryFilter)
            }
          >
            <option value={allCategories}>All categories</option>
            {evidencePackageCategories.map((category) => (
              <option key={category} value={category}>
                {evidenceCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value={allStatuses}>All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {formatEvidenceStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {groupedItems.length ? (
        <div className="evidence-package-groups">
          {groupedItems.map((group) => (
            <section key={group.category} className="evidence-package-group">
              <div className="evidence-package-group__header">
                <span>{group.items.length} items</span>
                <h2>{evidenceCategoryLabel(group.category)}</h2>
              </div>
              <div className="evidence-package-grid">
                {group.items.map((item) => (
                  <article key={item.id} className="evidence-package-card">
                    <div className="evidence-package-card__header">
                      <div>
                        <span>{item.category}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <StatusBadge status={formatEvidenceStatus(item.status)} />
                    </div>
                    <p>{item.description}</p>
                    <p className="evidence-package-risk">{item.riskNote}</p>
                    <div className="evidence-package-card__footer">
                      <a href={`/${item.path}`} target="_blank" rel="noreferrer">
                        Open evidence
                      </a>
                      <span>{item.safeToQuote ? 'Safe to quote' : 'Review first'}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>No evidence items match these filters</h2>
          <p>Clear filters to review the full package.</p>
        </section>
      )}

      <section className="evidence-package-safety">
        <h2>Evidence safety rule</h2>
        <p>
          Do not paste raw secret material, generated runtime files, provider
          credentials, VM credentials, or raw provider logs into docs,
          screenshots, tests, or chat.
        </p>
      </section>
    </section>
  )
}
