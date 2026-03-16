import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface HeaderContextValue {
  title: string | undefined
  headerActions: ReactNode | undefined
  setTitle: (title: string | undefined) => void
  setHeaderActions: (actions: ReactNode | undefined) => void
}

const HeaderContext = createContext<HeaderContextValue>({
  title: undefined,
  headerActions: undefined,
  setTitle: () => {},
  setHeaderActions: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | undefined>()
  const [headerActions, setHeaderActions] = useState<ReactNode | undefined>()

  return (
    <HeaderContext.Provider value={{ title, headerActions, setTitle, setHeaderActions }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  return useContext(HeaderContext)
}
