import { useTheme } from '@/lib/theming'

interface SignupCtaProps {
  message?: string
}

export function SignupCta({ message = 'Sign up to continue' }: SignupCtaProps) {
  const t = useTheme()

  const redirectUrl = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/'

  return (
    <div className={`px-4 py-3 ${t.border} border-t text-center`}>
      <p className={`text-sm ${t.textSecondary} mb-2`}>{message}</p>
      <a
        href={`/auth?mode=signup&redirect_url=${encodeURIComponent(redirectUrl)}`}
        className={`inline-block px-4 py-2 ${t.buttonPrimary} font-medium rounded-lg transition-all text-sm`}
      >
        Sign Up
      </a>
    </div>
  )
}
