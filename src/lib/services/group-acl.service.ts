/**
 * GroupAclService — permission validation and preset management for group conversations.
 * Reuses agentbase.me's ACL pattern:
 *   auth_level: 0=owner, 1=admin, 3=editor, 5=member
 *   Granular can_* permissions per member
 */

import type {
  GroupMember,
  GroupPermissions,
  GroupAuthLevel,
} from '@/types/conversations'
import {
  OWNER_PRESET,
  ADMIN_PRESET,
  EDITOR_PRESET,
  MEMBER_PRESET,
} from '@/types/conversations'
import { getGroupMember, listGroupMembers } from '@/services/group.service'

/** Map from auth_level to its default permission preset */
export const AUTH_LEVEL_PRESETS: Record<GroupAuthLevel, GroupPermissions> = {
  0: OWNER_PRESET,
  1: ADMIN_PRESET,
  3: EDITOR_PRESET,
  5: MEMBER_PRESET,
}

/** Human-readable labels for each auth level */
export const AUTH_LEVEL_LABELS: Record<GroupAuthLevel, string> = {
  0: 'Owner',
  1: 'Admin',
  3: 'Editor',
  5: 'Member',
}

/**
 * Get the default permission preset for a given auth level.
 */
export function getPresetForLevel(authLevel: GroupAuthLevel): GroupPermissions {
  return AUTH_LEVEL_PRESETS[authLevel]
}

/**
 * Check whether a user has a specific permission in a group.
 * Returns false if the user is not a member.
 */
export async function hasPermission(
  conversationId: string,
  userId: string,
  permission: keyof GroupPermissions
): Promise<boolean> {
  const member = await getGroupMember(conversationId, userId)
  if (!member) return false
  return member.permissions[permission]
}

/**
 * Check whether a user is a member of the group at all.
 */
export async function isMember(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const member = await getGroupMember(conversationId, userId)
  return member !== null
}

/**
 * Check whether a user can read messages in the group.
 */
export async function canRead(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_read')
}

/**
 * Check whether a user can publish (send) messages in the group.
 */
export async function canPublish(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_publish')
}

/**
 * Check whether a user can manage members (invite/change roles).
 */
export async function canManageMembers(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_manage_members')
}

/**
 * Check whether a user can kick other members.
 */
export async function canKick(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_kick')
}

/**
 * Check whether a user can ban members from the group.
 */
export async function canBan(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_ban')
}

/**
 * Check whether a user can moderate content in the group.
 */
export async function canModerate(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return hasPermission(conversationId, userId, 'can_moderate')
}

/**
 * Validate that an actor has sufficient auth_level to modify a target member.
 * A user can only modify members with a strictly higher (numerically larger) auth_level.
 * Owner (0) can modify anyone. Admin (1) can modify editors (3) and members (5). etc.
 */
export async function canModifyMember(
  conversationId: string,
  actorId: string,
  targetId: string
): Promise<boolean> {
  const [actor, target] = await Promise.all([
    getGroupMember(conversationId, actorId),
    getGroupMember(conversationId, targetId),
  ])

  if (!actor || !target) return false

  // Cannot modify self (except owner transferring ownership, handled separately)
  if (actorId === targetId) return false

  // Cannot modify someone at same or higher (lower number) auth level
  if (actor.auth_level >= target.auth_level) return false

  return true
}

/**
 * Validate that a role change is allowed.
 * - Actor must have can_manage_members
 * - Actor must have lower auth_level than target
 * - Cannot set target to same or lower auth_level than actor
 * - Cannot demote the owner
 */
export async function canChangeRole(
  conversationId: string,
  actorId: string,
  targetId: string,
  newAuthLevel: GroupAuthLevel
): Promise<{ allowed: boolean; reason?: string }> {
  const actor = await getGroupMember(conversationId, actorId)
  if (!actor) return { allowed: false, reason: 'Actor is not a member' }

  if (!actor.permissions.can_manage_members) {
    return { allowed: false, reason: 'Insufficient permissions: cannot manage members' }
  }

  const target = await getGroupMember(conversationId, targetId)
  if (!target) return { allowed: false, reason: 'Target is not a member' }

  if (target.auth_level === 0) {
    return { allowed: false, reason: 'Cannot change the owner role' }
  }

  if (actorId === targetId) {
    return { allowed: false, reason: 'Cannot change your own role' }
  }

  // Actor must outrank the target
  if (actor.auth_level >= target.auth_level) {
    return { allowed: false, reason: 'Cannot modify a member of equal or higher rank' }
  }

  // Actor cannot promote someone to their own level or above
  if (newAuthLevel <= actor.auth_level) {
    return { allowed: false, reason: 'Cannot promote a member to your own rank or above' }
  }

  return { allowed: true }
}

/**
 * Get current user's permissions in a group, or null if not a member.
 */
export async function getUserPermissions(
  conversationId: string,
  userId: string
): Promise<{ authLevel: GroupAuthLevel; permissions: GroupPermissions } | null> {
  const member = await getGroupMember(conversationId, userId)
  if (!member) return null
  return {
    authLevel: member.auth_level,
    permissions: member.permissions,
  }
}

/**
 * Assert a permission, throwing an error if the user does not have it.
 */
export async function assertPermission(
  conversationId: string,
  userId: string,
  permission: keyof GroupPermissions,
  errorMessage?: string
): Promise<void> {
  const allowed = await hasPermission(conversationId, userId, permission)
  if (!allowed) {
    throw new Error(
      errorMessage ?? `Insufficient permissions: ${permission} is required`
    )
  }
}

/**
 * Assert that a user is a member of the group, throwing if not.
 */
export async function assertMember(
  conversationId: string,
  userId: string
): Promise<GroupMember> {
  const member = await getGroupMember(conversationId, userId)
  if (!member) {
    throw new Error('Access denied: user is not a member of this group')
  }
  return member
}
