import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Mail,
  Repeat2,
  Settings,
  UserCircle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useAppSession } from '../../app/session'
import { apiRequest } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import type { InboxResponse } from '../../shared/types'
import { useAuth } from '../auth/useAuth'

export function AccountMenu() {
  const navigate = useNavigate()
  const { authSession, logout } = useAuth()
  const { session, authorization } = useAppSession()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const displayName = authSession?.displayName ?? 'Account'
  const profileImageUrl = authSession?.profileImageUrl
  const roleLabel = authorization.roleCodes[0]
    ? formatRoleLabel(authorization.roleCodes[0])
    : 'No role loaded'

  useEffect(() => {
    if (!session.organizationId || !session.actorUserId) {
      return undefined
    }

    let cancelled = false

    apiRequest<InboxResponse>(
      endpoints.inbox.list(session.organizationId, session.actorUserId),
    )
      .then((response) => {
        if (!cancelled) {
          setUnreadCount(response.unreadCount)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnreadCount(0)
        }
      })

    return () => {
      cancelled = true
    }
  }, [session.actorUserId, session.organizationId])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function leaveSession(target: '/login' | '/account/profile') {
    logout()
    navigate(target === '/login' ? '/login' : target)
  }

  const visibleUnreadCount =
    session.organizationId && session.actorUserId ? unreadCount : 0

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <AccountMenuAvatar
          displayName={displayName}
          profileImageUrl={profileImageUrl}
        />
        <span className="account-menu__summary">
          <strong>{displayName}</strong>
          <span>{roleLabel}</span>
        </span>
        {visibleUnreadCount > 0 ? (
          <span
            className="account-menu__badge"
            aria-label={`${visibleUnreadCount} unread inbox items`}
          >
            {visibleUnreadCount > 9 ? '9+' : visibleUnreadCount}
          </span>
        ) : null}
        <ChevronDown className="account-menu__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="account-menu__overlay" role="menu">
          <div className="account-menu__header">
            <UserCircle aria-hidden="true" />
            <div>
              <strong>{displayName}</strong>
              <span>{authSession?.email ?? 'No email loaded'}</span>
            </div>
          </div>
          <Link role="menuitem" to="/account/profile" onClick={() => setOpen(false)}>
            <Settings aria-hidden="true" />
            <span>Manage profile</span>
          </Link>
          <Link role="menuitem" to="/inbox" onClick={() => setOpen(false)}>
            <Mail aria-hidden="true" />
            <span>Inbox</span>
            {visibleUnreadCount > 0 ? <em>{visibleUnreadCount}</em> : null}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => leaveSession('/login')}
          >
            <Repeat2 aria-hidden="true" />
            <span>Switch account</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => leaveSession('/login')}
          >
            <LogOut aria-hidden="true" />
            <span>Logout</span>
          </button>
          <p>
            <Bell aria-hidden="true" />
            Requests sent from profile settings appear here for organization
            admins.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function getInitials(label: string) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function AccountMenuAvatar({
  displayName,
  profileImageUrl,
}: {
  displayName: string
  profileImageUrl?: string | null
}) {
  if (profileImageUrl) {
    return (
      <img
        className="sidebar-avatar account-menu__avatar account-menu__avatar-image"
        src={profileImageUrl}
        alt={`${displayName} profile`}
      />
    )
  }

  return (
    <span className="sidebar-avatar account-menu__avatar" aria-hidden="true">
      {getInitials(displayName)}
    </span>
  )
}

function formatRoleLabel(roleCode: string) {
  return roleCode
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
