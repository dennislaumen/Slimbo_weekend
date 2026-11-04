import { createContext, useContext, useState, type ReactNode } from 'react'

const FoldContext = createContext<[Record<string, boolean>, (k: string, open: boolean) => void]>([{}, () => {}])

/** Remembers which folds are open while the user switches tabs. */
export function FoldProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return <FoldContext.Provider value={[open, (k, v) => setOpen((o) => ({ ...o, [k]: v }))]}>{children}</FoldContext.Provider>
}

export function Fold({ id, title, children, defaultOpen = false }: { id: string; title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, set] = useContext(FoldContext)
  return (
    <details className="fold" open={open[id] ?? defaultOpen} onToggle={(e) => set(id, e.currentTarget.open)}>
      <summary>{title}</summary>
      {children}
    </details>
  )
}
