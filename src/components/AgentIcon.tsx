const maskStyle: React.CSSProperties = {
  maskImage: `url('/agentbase_icon.svg')`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskImage: `url('/agentbase_icon.svg')`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
}

interface AgentIconProps {
  className?: string
  size?: string
}

export function AgentIcon({ className, size }: AgentIconProps) {
  const hasBg = className?.includes('bg-')
  const hasSize = className?.includes('w-') || className?.includes('h-')
  const bgClass = hasBg ? '' : 'bg-current'
  const sizeClass = hasSize ? '' : (size ?? 'w-8 h-8')

  return (
    <div style={{transform: 'scale(1.5)'}}>
      <div className={`shrink-0 ${bgClass} ${sizeClass} ${className ?? ''}`} style={maskStyle} />
    </div>
  )
}
