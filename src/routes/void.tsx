/**
 * The Void — public space feed.
 * Same layout as Memories tab but fetches from the_void space.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/lib/theming'
import { Globe } from 'lucide-react'
import { VoidFeed } from '@/components/void/VoidFeed'

export const Route = createFileRoute('/void')({
  component: VoidPage,
})

function VoidPage() {
  const t = useTheme()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-page/80 backdrop-blur-sm border-b border-border-default">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${t.textPrimary}`}>
                The Void
              </h1>
              <p className={`text-sm ${t.textMuted}`}>
                Public memories from the community
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <VoidFeed />
      </div>
    </div>
  )
}
