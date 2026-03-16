/**
 * MemberManagement — slide-over orchestrator for group member management.
 * Internal navigation: menu → members → member-detail → banned
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  UserPlus,
  Users,
  Ban,
  LogOut,
  Trash2,
  Crown,
  ShieldCheck,
  Shield,
  MoreVertical,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useTheme } from '@/lib/theming'
import { useAuth } from '@/components/auth/AuthContext'
import type { GroupMember, GroupAuthLevel, GroupPermissions } from '@/types/conversations'
import {
  listGroupMembers,
  removeMember,
  leaveGroup,
  deleteGroup,
  unbanMember,
} from '@/services/group.service'
import { MemberDetailView } from '@/components/chat/MemberDetailView'

type View = 'menu' | 'members' | 'member-detail' | 'banned'

const AUTH_LEVEL_LABELS: Record<GroupAuthLevel, string> = {
  0: 'Owner',
  1: 'Admin',
  3: 'Editor',
  5: 'Member',
}

function getRoleBadgeStyle(level: GroupAuthLevel, t: ReturnType<typeof import('@/lib/theming').useTheme>): string {
  switch (level) {
    case 0:
      return t.badgeWarning
    case 1:
      return t.badgeInfo
    case 3:
      return t.badgeSuccess
    default:
      return t.badgeDefault
  }
}

interface MemberManagementProps {
  conversationId: string
  currentUserPermissions: GroupPermissions
  currentUserAuthLevel: GroupAuthLevel
  onAddParticipant: () => void
  onClose: () => void
}

export function MemberManagement({
  conversationId,
  currentUserPermissions,
  currentUserAuthLevel,
  onAddParticipant,
  onClose,
}: MemberManagementProps) {
  const t = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState<View>('menu')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const isOwner = currentUserAuthLevel === 0

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listGroupMembers(conversationId)
      result.sort((a, b) => a.auth_level - b.auth_level)
      setMembers(result)
    } catch {
      // Error loading members
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (view === 'members' || view === 'banned') {
      loadMembers()
    }
  }, [view, loadMembers])

  const activeMembers = members.filter((m) => !m.is_banned)
  const bannedMembers = members.filter((m) => m.is_banned)

  function handleMemberClick(member: GroupMember) {
    setSelectedMember(member)
    setView('member-detail')
  }

  function handleMemberUpdated(updated: GroupMember) {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === updated.user_id ? updated : m)),
    )
    setSelectedMember(updated)
  }

  function handleMemberRemoved(userId: string) {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    setView('members')
    setSelectedMember(null)
  }

  async function handleLeaveGroup() {
    if (!user) return
    setActionLoading(true)
    try {
      await leaveGroup(conversationId, user.uid)
      onClose()
      navigate({ to: '/chat' })
    } catch (err) {
      console.error('Failed to leave group:', err)
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleDeleteGroup() {
    setActionLoading(true)
    try {
      await deleteGroup(conversationId)
      onClose()
      navigate({ to: '/chat' })
    } catch (err) {
      console.error('Failed to delete group:', err)
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleUnban(userId: string) {
    try {
      await unbanMember(conversationId, userId)
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId ? { ...m, is_banned: false } : m,
        ),
      )
    } catch (err) {
      console.error('Failed to unban member:', err)
    }
  }

  // Member Detail View
  if (view === 'member-detail' && selectedMember && user) {
    return (
      <MemberDetailView
        member={selectedMember}
        conversationId={conversationId}
        currentUser={{
          uid: user.uid,
          authLevel: currentUserAuthLevel,
          permissions: currentUserPermissions,
        }}
        onBack={() => setView('members')}
        onMemberUpdated={handleMemberUpdated}
        onMemberRemoved={handleMemberRemoved}
      />
    )
  }

  // Members list view
  if (view === 'members') {
    return (
      <div className="flex flex-col h-full">
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
          <button
            type="button"
            onClick={() => setView('menu')}
            className={`p-1.5 rounded-lg ${t.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${t.textPrimary}`}>
            Members ({activeMembers.length})
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className={`w-9 h-9 rounded-full ${t.elevated}`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3.5 w-24 rounded ${t.elevated}`} />
                  <div className={`h-3 w-16 rounded ${t.elevated}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {activeMembers.map((member) => {
              const isSelf = member.user_id === user?.uid
              return (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => handleMemberClick(member)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-left ${t.hover} transition-colors`}
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.display_name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.elevated}`}
                    >
                      <span className={`text-sm font-medium ${t.textSecondary}`}>
                        {member.display_name
                          ? member.display_name.charAt(0).toUpperCase()
                          : '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${t.textPrimary}`}>
                      {member.display_name || 'Unknown'}
                      {isSelf && (
                        <span className={`ml-1 text-xs ${t.textMuted}`}>(you)</span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getRoleBadgeStyle(member.auth_level, t)}`}
                    >
                      {AUTH_LEVEL_LABELS[member.auth_level]}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Banned members view
  if (view === 'banned') {
    return (
      <div className="flex flex-col h-full">
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
          <button
            type="button"
            onClick={() => setView('menu')}
            className={`p-1.5 rounded-lg ${t.buttonGhost}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${t.textPrimary}`}>
            Banned Members ({bannedMembers.length})
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <div className={`h-10 rounded animate-pulse ${t.elevated}`} />
          </div>
        ) : bannedMembers.length === 0 ? (
          <div className={`p-4 text-sm ${t.textMuted}`}>No banned members</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {bannedMembers.map((member) => (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-4 py-2.5 ${t.hover} transition-colors`}
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.display_name}
                    className="w-9 h-9 rounded-full object-cover shrink-0 opacity-50"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.elevated} opacity-50`}
                  >
                    <span className={`text-sm font-medium ${t.textSecondary}`}>
                      {member.display_name
                        ? member.display_name.charAt(0).toUpperCase()
                        : '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${t.textPrimary}`}>
                    {member.display_name || 'Unknown'}
                  </div>
                  <span className={`text-xs ${t.textMuted}`}>Banned</span>
                </div>
                {currentUserPermissions.can_ban && (
                  <button
                    type="button"
                    onClick={() => handleUnban(member.user_id)}
                    className={`px-2 py-1 rounded text-xs font-medium ${t.buttonGhost}`}
                  >
                    Unban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Menu view (default)
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
        <span className={`text-sm font-semibold ${t.textPrimary}`}>Group Settings</span>
      </div>

      <div className={`px-2 py-2 space-y-0.5 ${actionLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Add Member */}
        {currentUserPermissions.can_manage_members && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onAddParticipant()
            }}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}

        {/* Members */}
        <button
          type="button"
          onClick={() => setView('members')}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
        >
          <span className="flex items-center gap-3">
            <Users className="w-4 h-4" />
            Members
          </span>
          <span className={`text-xs ${t.textMuted}`}>{activeMembers.length || ''}</span>
        </button>

        {/* Banned Members */}
        {currentUserPermissions.can_ban && (
          <button
            type="button"
            onClick={() => setView('banned')}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
          >
            <span className="flex items-center gap-3">
              <Ban className="w-4 h-4" />
              Banned Members
            </span>
            <span className={`text-xs ${t.textMuted}`}>{bannedMembers.length || ''}</span>
          </button>
        )}

        {/* Divider */}
        <div className={`my-2 border-t ${t.border}`} />

        {/* Leave Group (non-owner) */}
        {!isOwner && confirmAction !== 'leave' && (
          <button
            type="button"
            onClick={() => setConfirmAction('leave')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-brand-danger ${t.hover} transition-colors`}
          >
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
        )}

        {confirmAction === 'leave' && (
          <div className={`rounded-lg border p-3 ${t.border}`}>
            <p className={`text-sm mb-2 ${t.textPrimary}`}>
              Leave this group? You will no longer receive messages.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLeaveGroup}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonDanger}`}
              >
                Leave
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonGhost}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Delete Group (owner only) */}
        {isOwner && confirmAction !== 'delete' && (
          <button
            type="button"
            onClick={() => setConfirmAction('delete')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-brand-danger ${t.hover} transition-colors`}
          >
            <Trash2 className="w-4 h-4" />
            Delete Group
          </button>
        )}

        {confirmAction === 'delete' && (
          <div className="rounded-lg border p-3 border-brand-danger/30">
            <p className={`text-sm mb-2 ${t.textPrimary}`}>
              Delete this group permanently? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteGroup}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonDanger}`}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonGhost}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
