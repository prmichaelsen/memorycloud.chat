import { useState, useRef } from 'react'
import { useTheme } from '@/lib/theming'
import { MoreVertical, UserPlus, Users, Link } from 'lucide-react'

interface ConversationHeaderMenuProps {
  conversationId: string
  isGroup: boolean
  canManageMembers: boolean
  onAddParticipant: () => void
  onManageMembers: () => void
  onShareLink: () => void
}

export function ConversationHeaderMenu({
  isGroup,
  canManageMembers,
  onAddParticipant,
  onManageMembers,
  onShareLink,
}: ConversationHeaderMenuProps) {
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  if (!isGroup) return null

  function handleItem(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded-lg ${t.buttonGhost}`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div
            className={`absolute right-0 top-full mt-1 z-50 w-52 rounded-lg shadow-lg border ${t.card} ${t.border} py-1`}
          >
            {canManageMembers && (
              <button
                type="button"
                onClick={() => handleItem(onAddParticipant)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${t.textPrimary} hover:bg-bg-elevated transition-colors`}
              >
                <UserPlus className="w-4 h-4" />
                Add Participant
              </button>
            )}

            <button
              type="button"
              onClick={() => handleItem(onManageMembers)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${t.textPrimary} hover:bg-bg-elevated transition-colors`}
            >
              <Users className="w-4 h-4" />
              Manage Members
            </button>

            {canManageMembers && (
              <button
                type="button"
                onClick={() => handleItem(onShareLink)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${t.textPrimary} hover:bg-bg-elevated transition-colors`}
              >
                <Link className="w-4 h-4" />
                Share Invite Link
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
