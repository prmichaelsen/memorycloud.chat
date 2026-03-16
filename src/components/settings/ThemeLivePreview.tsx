import { useTheme } from '@/lib/theming'

export function ThemeLivePreview() {
  const t = useTheme()

  return (
    <div className={`${t.card} rounded-lg border border-border-default overflow-hidden`}>
      <div className="text-xs font-medium text-text-secondary px-3 py-2 border-b border-border-default">
        Live Preview
      </div>
      <div className="h-[28rem] overflow-auto">
        {/* Mock App Shell */}
        <div className="flex h-full">
          {/* Mock Sidebar */}
          <div className="w-28 shrink-0 bg-bg-sidebar border-r border-border-default flex flex-col">
            {/* Sidebar Header */}
            <div className="px-2 py-2 border-b border-border-subtle">
              <span className="text-xs font-bold text-brand-primary">Memory Cloud</span>
            </div>
            {/* Nav Items */}
            <nav className="flex flex-col gap-0.5 p-1.5">
              <div className="px-2 py-1 rounded text-[10px] font-medium bg-bg-active text-text-primary">
                Chat
              </div>
              <div className="px-2 py-1 rounded text-[10px] text-text-secondary hover:bg-bg-hover">
                Memories
              </div>
              <div className="px-2 py-1 rounded text-[10px] text-text-secondary hover:bg-bg-hover">
                Settings
              </div>
            </nav>
          </div>

          {/* Mock Main Content */}
          <div className="flex-1 flex flex-col bg-bg-page min-w-0">
            {/* Mock Header Bar */}
            <div className="px-3 py-2 border-b border-border-default bg-bg-card flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-brand-primary" />
              <span className="text-xs font-semibold text-text-primary">General</span>
            </div>

            {/* Mock Chat Messages */}
            <div className="flex-1 p-3 space-y-2 overflow-auto">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-brand-primary text-text-inverse text-[10px] px-2.5 py-1.5 rounded-lg max-w-[70%]">
                  Hello, how are you?
                </div>
              </div>
              {/* Agent Message */}
              <div className="flex justify-start">
                <div className="bg-bg-elevated text-text-primary text-[10px] px-2.5 py-1.5 rounded-lg max-w-[70%]">
                  I'm doing great! How can I help you today?
                </div>
              </div>
              {/* Another user message */}
              <div className="flex justify-end">
                <div className="bg-brand-primary text-text-inverse text-[10px] px-2.5 py-1.5 rounded-lg max-w-[70%]">
                  Show me my memories
                </div>
              </div>

              {/* Mock Card */}
              <div className="bg-bg-card border border-border-default rounded-lg p-2 mt-2">
                <div className="text-[10px] font-semibold text-text-primary mb-1">Recent Memory</div>
                <div className="text-[10px] text-text-secondary">
                  Theme customization preferences saved.
                </div>
                <div className="flex gap-1 mt-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-accent/20 text-brand-accent">
                    tag
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-info/20 text-brand-info">
                    info
                  </span>
                </div>
              </div>
            </div>

            {/* Mock Compose Input */}
            <div className="px-3 py-2 border-t border-border-default">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-bg-input border border-border-default rounded-lg px-2.5 py-1.5 text-[10px] text-text-muted">
                  Type a message...
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-brand-primary text-text-inverse"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
