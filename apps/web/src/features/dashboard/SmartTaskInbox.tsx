import { Link } from 'react-router-dom'

import { EmptyState } from '../../shared/components/EmptyState'
import type { SmartTask } from './dashboard.types'

export function SmartTaskInbox({ tasks }: { tasks: SmartTask[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState title="No immediate tasks">
        This role has no open dashboard tasks in the current fixture data.
      </EmptyState>
    )
  }

  return (
    <section className="dashboard-task-list" aria-label="Smart task inbox">
      {tasks.map((task) => (
        <article
          key={task.id}
          className={`dashboard-task dashboard-task--${task.priority}`}
        >
          <div>
            <span>{task.priority}</span>
            <strong>{task.title}</strong>
            {task.description ? <p>{task.description}</p> : null}
          </div>
          <div className="dashboard-task-meta">
            <span className={`dashboard-status dashboard-status--${task.status}`}>
              {task.status.replace('_', ' ')}
            </span>
            {task.dueAt ? <small>Due {task.dueAt}</small> : null}
            <Link to={task.targetRoute}>Open</Link>
          </div>
        </article>
      ))}
    </section>
  )
}
