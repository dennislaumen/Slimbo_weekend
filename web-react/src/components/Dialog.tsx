import { useEffect, useRef, type ReactNode } from 'react'

/** A native modal <dialog> that opens on mount and focuses the element marked `data-autofocus`. Escape and the close button both end in `onClose`. */
export function Dialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d || d.open) return
    d.showModal()
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])
  return (
    <dialog ref={ref} onClose={onClose}>
      {children}
    </dialog>
  )
}

export function DialogHead(props: { title: string; onClose: () => void; action?: ReactNode }) {
  return (
    <div className="dhead">
      <button className="btn text" onClick={props.onClose} aria-label="Sluiten">✕</button>
      <h3>{props.title}</h3>
      {props.action}
    </div>
  )
}
