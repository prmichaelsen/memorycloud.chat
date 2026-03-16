import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface HeaderContextValue {
  title: string | undefined
  headerActions: ReactNode | undefined
  onEllipsisPress: (() => void) | undefined
  setTitle: (title: string | undefined) => void
  setHeaderActions: (actions: ReactNode | undefined) => void
  setOnEllipsisPress: (handler: (() => void) | undefined) => void
}

const HeaderContext = createContext<HeaderContextValue>({
  title: undefined,
  headerActions: undefined,
  onEllipsisPress: undefined,
  setTitle: () => {},
  setHeaderActions: () => {},
  setOnEllipsisPress: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | undefined>()
  const [headerActions, setHeaderActions] = useState<ReactNode | undefined>()
  const [onEllipsisPress, setOnEllipsisPress] = useState<(() => void) | undefined>()

  return (
    <HeaderContext.Provider value={{ title, headerActions, onEllipsisPress, setTitle, setHeaderActions, setOnEllipsisPress }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  return useContext(HeaderContext)
}
