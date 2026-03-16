/**
 * MemberDetailView — per-member action panel with role editing, mute, ban, kick.
 * Permissions are gated by the current user's GroupPermissions + authority level.
 */

import { useState } from 'react'
import {
  ArrowLeft,
  Crown,
  ShieldCheck,
  Shield,
  VolumeX,
  Volume2,
  Ban,
  UserMinus,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from '@/lib/theming'
import type { GroupMember, GroupAuthLevel, GroupPermissions } from '@/types/conversations'
import {
  OWNER_PRESET,
  ADMIN_PRESET,
  EDITOR_PRESET,
  MEMBER_PRESET,
} from '@/types/conversations'
import {
  updateMemberRole,
  removeMember,
  muteMember,
  unmuteMember,
  banMember,
} from '@/services/group.service'

const AUTH_LEVEL_LABELS: Record<GroupAuthLevel, string> = {
  0: 'Owner',
  1: 'Admin',
  3: 'Editor',
  5: 'Member',
}

const AUTH_LEVEL_PRESETS: Record<GroupAuthLevel, GroupPermissions> = {
  0: OWNER_PRESET,
  1: ADMIN_PRESET,
  3: EDITOR_PRESET,
  5: MEMBER_PRESET,
}

function AuthLevelIcon({ level }: { level: GroupAuthLevel }) {
  switch (level) {
    case 0:
      return <Crown className="w-4 h-4" />
    case 1:
      return <ShieldCheck className="w-4 h-4" />
    case 3:
      return <Shield className="w-4 h-4" />
    default:
      return null
  }
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

interface MemberDetailViewProps {
  member: GroupMember
  conversationId: string
  currentUser: { uid: string; authLevel: GroupAuthLevel; permissions: GroupPermissions }
  onBack: () => void
  onMemberUpdated: (member: GroupMember) => void
  onMemberRemoved: (userId: string) => void
}

export function MemberDetailView({
  member,
  conversationId,
  currentUser,
  onBack,
  onMemberUpdated,
  onMemberRemoved,
}: MemberDetailViewProps) {
  const t = useTheme()
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'kick' | 'ban' | null>(null)
  const [loading, setLoading] = useState(false)

  const isSelf = member.user_id === currentUser.uid
  const canModify = !isSelf && currentUser.authLevel < member.auth_level
  const canEditRole = canModify && currentUser.permissions.can_manage_members
  const canMute = canModify && currentUser.permissions.can_moderate
  const canKick = canModify && currentUser.permissions.can_kick
  const canBanMember = canModify && currentUser.permissions.can_ban

  // Roles the current user can assign (must be strictly lower rank than actor)
  const assignableRoles = ([1, 3, 5] as GroupAuthLevel[]).filter(
    (level) => level > currentUser.authLevel,
  )

  async function handleRoleChange(newLevel: GroupAuthLevel) {
    setShowRoleDropdown(false)
    setLoading(true)
    try {
      const permissions = AUTH_LEVEL_PRESETS[newLevel]
      await updateMemberRole(conversationId, member.user_id, newLevel, permissions)
      onMemberUpdated({ ...member, auth_level: newLevel, permissions })
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMuteToggle() {
    setLoading(true)
    try {
      if (member.is_muted) {
        await unmuteMember(conversationId, member.user_id)
        onMemberUpdated({ ...member, is_muted: false })
      } else {
        await muteMember(conversationId, member.user_id)
        onMemberUpdated({ ...member, is_muted: true })
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleKick() {
    setLoading(true)
    try {
      await removeMember(conversationId, member.user_id)
      onMemberRemoved(member.user_id)
    } catch (err) {
      console.error('Failed to kick member:', err)
    } finally {
      setLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleBan() {
    setLoading(true)
    try {
      await banMember(conversationId, member.user_id)
      onMemberRemoved(member.user_id)
    } catch (err) {
      console.error('Failed to ban member:', err)
    } finally {
      setLoading(false)
      setConfirmAction(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${t.border}`}>
        <button
          type="button"
          onClick={onBack}
          className={`p-1.5 rounded-lg ${t.buttonGhost}`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className={`text-sm font-semibold ${t.textPrimary}`}>Member Details</span>
      </div>

      {/* Profile card */}
      <div className="flex flex-col items-center gap-3 px-4 py-6">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.display_name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${t.elevated}`}
          >
            <span className={`text-xl font-semibold ${t.textSecondary}`}>
              {member.display_name ? member.display_name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
        )}
        <div className="text-center">
          <div className={`text-sm font-semibold ${t.textPrimary}`}>
            {member.display_name || 'Unknown'}
            {isSelf && <span className={`ml-1 text-xs ${t.textMuted}`}>(you)</span>}
          </div>
          <span
            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeStyle(member.auth_level, t)}`}
          >
            <AuthLevelIcon level={member.auth_level} />
            {AUTH_LEVEL_LABELS[member.auth_level]}
          </span>
          {member.is_muted && (
            <span className={`inline-flex items-center gap-1 ml-1 mt-1 px-2 py-0.5 rounded text-xs font-medium ${t.badgeDanger}`}>
              <VolumeX className="w-3 h-3" />
              Muted
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={`px-4 space-y-1 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Edit Role */}
        {canEditRole && member.auth_level !== 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Edit Role
              </span>
              <span className="flex items-center gap-1">
                <span className={`text-xs ${t.textMuted}`}>{AUTH_LEVEL_LABELS[member.auth_level]}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {showRoleDropdown && (
              <div className={`mt-1 rounded-lg border overflow-hidden ${t.card} ${t.border}`}>
                {assignableRoles.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleRoleChange(level)}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${t.textPrimary} ${t.hover} transition-colors ${
                      member.auth_level === level ? 'font-semibold' : ''
                    }`}
                  >
                    <AuthLevelIcon level={level} />
                    {AUTH_LEVEL_LABELS[level]}
                    {member.auth_level === level && (
                      <span className={`ml-auto text-xs ${t.textMuted}`}>current</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mute/Unmute */}
        {canMute && (
          <button
            type="button"
            onClick={handleMuteToggle}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
          >
            {member.is_muted ? (
              <>
                <Volume2 className="w-4 h-4" />
                Unmute
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                Mute
              </>
            )}
          </button>
        )}

        {/* Kick */}
        {canKick && confirmAction !== 'kick' && (
          <button
            type="button"
            onClick={() => setConfirmAction('kick')}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm ${t.textPrimary} ${t.hover} transition-colors`}
          >
            <UserMinus className="w-4 h-4" />
            Kick
          </button>
        )}

        {confirmAction === 'kick' && (
          <div className={`rounded-lg border p-3 ${t.border}`}>
            <p className={`text-sm mb-2 ${t.textPrimary}`}>
              Remove <strong>{member.display_name || 'this member'}</strong> from the group?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleKick}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonDanger}`}
              >
                Confirm
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

        {/* Ban */}
        {canBanMember && confirmAction !== 'ban' && (
          <button
            type="button"
            onClick={() => setConfirmAction('ban')}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-brand-danger ${t.hover} transition-colors`}
          >
            <Ban className="w-4 h-4" />
            Ban
          </button>
        )}

        {confirmAction === 'ban' && (
          <div className={`rounded-lg border p-3 border-brand-danger/30`}>
            <p className={`text-sm mb-2 ${t.textPrimary}`}>
              Ban <strong>{member.display_name || 'this member'}</strong>? They will be removed and cannot rejoin.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBan}
                className={`flex-1 px-3 py-1.5 rounded text-sm font-medium ${t.buttonDanger}`}
              >
                Ban
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
